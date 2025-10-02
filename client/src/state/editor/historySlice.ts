import type { StateCreator } from "zustand";
import type { EditorState } from "./types";

// Snapshot kept opaque here; reuse stacks from EditorState.
const HISTORY_LIMIT = 50;
const MARK_COALESCE_MS = 300;

function makeSnapshot(s: EditorState) {
  const d = s.draft;
  if (!d) return null;
  const payload = ((d as any).payload ?? {}) as any;
  const payloadMeta = (payload.meta ?? {}) as Record<string, unknown>;
  const payloadTheme = (payload.theme as any) ?? undefined;

  return {
    draftPart: {
      pageInstances: structuredClone(d.pageInstances),
      media: structuredClone(d.media),
      templateId: (d as any).templateId,
      payloadMeta: structuredClone(payloadMeta),
      payloadTheme: structuredClone(payloadTheme),
    },
    findings: structuredClone(s.findings),
    pageIndex: s.pageIndex,
    selectedBlockId: s.selectedBlockId,
    selectedUserBlockId: s.selectedUserBlockId,
  };
}

function applySnapshot(prev: EditorState, snap: any): Partial<EditorState> {
  if (!prev.draft) return {};
  const d: any = structuredClone(prev.draft);
  d.pageInstances = structuredClone(snap.draftPart.pageInstances);
  d.media = structuredClone(snap.draftPart.media);
  d.templateId = snap.draftPart.templateId;

  const payload = ((d.payload ?? {}) as any);
  payload.meta = { ...(payload.meta ?? {}), ...(snap.draftPart.payloadMeta ?? {}) };
  if (snap.draftPart.payloadTheme) payload.theme = snap.draftPart.payloadTheme;
  d.payload = payload;

  return {
    draft: d,
    findings: structuredClone(snap.findings),
    pageIndex: snap.pageIndex,
    selectedBlockId: snap.selectedBlockId,
    selectedUserBlockId: snap.selectedUserBlockId,
    dirty: true,
  };
}

export type HistorySlice = {
  mark: (opts?: { coalesce?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
};

export const createHistorySlice: StateCreator<
  EditorState & HistorySlice,
  [],
  [],
  HistorySlice
> = (set, get, _store) => ({
  mark: (opts) => {
    const coalesce = !!opts?.coalesce;
    const now = Date.now();
    set((s) => {
      if (!s.draft) return {};
      if (coalesce && s.lastMarkTs && now - s.lastMarkTs < MARK_COALESCE_MS) return {};
      const snap = makeSnapshot(s);
      if (!snap) return {};
      const past = [...s.historyPast, snap];
      if (past.length > HISTORY_LIMIT) past.shift();
      return {
        historyPast: past,
        historyFuture: [],
        lastMarkTs: now,
        canUndo: past.length > 0,
        canRedo: false,
      };
    });
  },

  undo: () => {
    const curSnap = makeSnapshot(get());
    set((s) => {
      if (!s.draft || s.historyPast.length === 0 || !curSnap) return {};
      const past = s.historyPast.slice(0, -1);
      const prevSnap = s.historyPast[s.historyPast.length - 1];
      const future = [curSnap, ...s.historyFuture];
      return {
        ...applySnapshot(s, prevSnap),
        historyPast: past,
        historyFuture: future,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
      };
    });
    try { (get() as any).saveDebounced?.(); } catch {}
  },

  redo: () => {
    const curSnap = makeSnapshot(get());
    set((s) => {
      if (!s.draft || s.historyFuture.length === 0 || !curSnap) return {};
      const [nextSnap, ...rest] = s.historyFuture;
      const past = [...s.historyPast, curSnap];
      if (past.length > HISTORY_LIMIT) past.shift();
      return {
        ...applySnapshot(s, nextSnap),
        historyPast: past,
        historyFuture: rest,
        canUndo: past.length > 0,
        canRedo: rest.length > 0,
      };
    });
    try { (get() as any).saveDebounced?.(); } catch {}
  },
});
