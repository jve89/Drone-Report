import type { StateCreator } from "zustand";
import type { EditorState } from "./types";
import type { Draft, UserBlock, TextStyle } from "../../types/draft";
import type { Template } from "../../types/template";
import { getDraft, updateDraft } from "../../lib/api";
import { loadTemplate } from "../../templates/loader";

// --- local helpers (scoped to IO) ---------------------------------
const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  color: "#111827",
  lineHeight: 1.4,
  letterSpacing: 0,
};

function normalizeZ(blocks: UserBlock[]): UserBlock[] {
  const withIndex = (blocks || []).map((b, i) => ({
    ...(b as any),
    z: Number.isFinite((b as any).z) ? (b as any).z : i,
  })) as UserBlock[];
  withIndex.sort((a: any, b: any) => (a.z ?? 0) - (b.z ?? 0));
  return withIndex.map((b: any, i) => ({ ...b, z: i })) as UserBlock[];
}

function nowIso() { return new Date().toISOString(); }

// --- slice ---------------------------------------------------------
export type IOSlice = {
  loadDraft: (id: string) => Promise<void>;
  saveDebounced: () => void;
  saveNow: () => Promise<void>;
  setDraftTitle: (title: string) => Promise<void>;
};

export const createIOSlice: StateCreator<
  EditorState & IOSlice,
  [],
  [],
  IOSlice
> = (set, get, _store) => ({
  loadDraft: async (id: string) => {
    const d = await getDraft(id);

    const tplId =
      (d as any)?.payload?.meta?.templateId ||
      (d as any)?.templateId ||
      "";

    const t: Template | null = tplId ? await loadTemplate(tplId) : null;

    const payloadFindings: any[] = Array.isArray((d as any)?.payload?.findings)
      ? ((d as any).payload.findings as any[])
      : [];

    // Normalize userBlocks + default text styles
    if (Array.isArray((d as any)?.pageInstances)) {
      (d as any).pageInstances = (d as any).pageInstances.map((pi: any) => {
        const userBlocks = Array.isArray(pi.userBlocks) ? (pi.userBlocks as UserBlock[]) : [];
        const withDefaults = userBlocks.map((b) =>
          b.type === "text" ? ({ ...b, style: { ...DEFAULT_TEXT_STYLE, ...(b as any).style } } as UserBlock) : b
        );
        return { ...pi, userBlocks: normalizeZ(withDefaults) };
      });
    }

    // Compute guide steps from template
    const steps: { pageId: string; blockId: string; help?: string }[] = [];
    if (t) {
      for (const p of (t.pages || []) as any[]) {
        for (const b of ((p.blocks || []) as any[])) {
          if (typeof b.help === "string" && b.help.trim()) {
            steps.push({ pageId: p.id, blockId: b.id, help: b.help });
          }
        }
      }
    }

    set({
      draft: d as Draft,
      template: t,
      findings: payloadFindings,
      steps,
      guide: { enabled: false, stepIndex: 0 },
      selectedBlockId: null,
      selectedUserBlockId: null,
      tool: { mode: "idle" },
      dirty: false,
      saving: false,
      _saveTimer: null,
      lastSavedAt: (d as any)?.updatedAt || (d as any)?.updated_at || undefined,

      historyPast: [],
      historyFuture: [],
      lastMarkTs: 0,
      canUndo: false,
      canRedo: false,
    });

    // Clamp pageIndex within range after load
    const max = ((d as any)?.pageInstances?.length ?? 1) - 1;
    const clamped = Math.max(0, Math.min(get().pageIndex, Math.max(0, max)));
    if (clamped !== get().pageIndex) set({ pageIndex: clamped });
  },

  saveDebounced: () => {
    const { _saveTimer } = get();
    if (_saveTimer) window.clearTimeout(_saveTimer);
    const timer = window.setTimeout(async () => {
      await get().saveNow();
    }, 800);
    set({ _saveTimer: timer, dirty: true, saving: true });
  },

  saveNow: async () => {
    const st = get();
    const d = st.draft;
    if (!d) return;

    if (st._saveTimer) {
      window.clearTimeout(st._saveTimer);
      set({ _saveTimer: null });
    }

    set({ saving: true });
    try {
      const body: any = {
        pageInstances: d.pageInstances,
        media: d.media,
      };

      const currentPayload = ((d as any).payload ?? {}) as Record<string, unknown>;
      const payload = { ...currentPayload, findings: get().findings };
      body.payload = payload;

      if ((d as any).templateId) body.templateId = (d as any).templateId;

      // Persist root title
      const titleFromPayload =
        typeof (payload as any)?.meta?.title === "string"
          ? String((payload as any).meta.title).trim()
          : "";
      const rootTitle =
        titleFromPayload ||
        (typeof (d as any).title === "string" ? String((d as any).title).trim() : "");
      if (rootTitle) body.title = rootTitle;

      await updateDraft(d.id, body);
      set({ dirty: false, saving: false, lastSavedAt: nowIso() });
    } catch (e) {
      console.error("[saveNow] failed", e);
      set({ saving: false, dirty: true });
      throw e;
    }
  },

  setDraftTitle: async (title: string) => {
    const cur = get().draft;
    if (!cur) return;
    const t = title.trim();
    const currentTitle = String(
      (cur as any).title ?? (cur as any)?.payload?.meta?.title ?? ""
    ).trim();
    if (!t || t === currentTitle) return;

    (get() as any).mark?.();
    set((s) => {
      const d: Draft = structuredClone(s.draft!);
      const payload = ((d as any).payload ?? {}) as any;
      const meta = (payload.meta ?? {}) as any;
      meta.title = t;
      payload.meta = meta;
      (d as any).payload = payload;
      (d as any).title = t;
      return { draft: d, dirty: true } as Partial<EditorState>;
    });
    try { await get().saveNow(); } catch {}
  },
});
