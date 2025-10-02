// client/src/state/editor/findingsSlice.ts
import type { StateCreator } from "zustand";
import type { EditorState, Finding } from "./types";

function nowIso() { return new Date().toISOString(); }

export type FindingsSlice = {
  setFindings: (f: Finding[]) => void;
  createFindingsFromPhotos: (photoIds: string[]) => void;
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  deleteFinding: (id: string) => void;
  reindexAnnotations: (photoId: string) => void;
};

export const createFindingsSlice: StateCreator<
  EditorState & FindingsSlice,
  [],
  [],
  FindingsSlice
> = (set, get, _store) => ({
  setFindings: (f) => {
    get().mark?.();
    set({ findings: f, dirty: true });
  },

  createFindingsFromPhotos: (photoIds) => {
    if (!photoIds?.length) return;
    get().mark?.();
    set((s) => {
      const created: Finding[] = photoIds.map((pid) => ({
        id: crypto.randomUUID(),
        title: "",
        severity: 3,
        category: undefined,
        location: undefined,
        description: "",
        tags: [],
        photoId: pid,
        photoIds: undefined,
        annotations: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }));
      return { findings: [...(s.findings || []), ...created], dirty: true };
    });
  },

  updateFinding: (id, patch) => {
    get().mark?.({ coalesce: true });
    set((s) => {
      const idx = s.findings.findIndex((f) => f.id === id);
      if (idx < 0) return {};
      const next = [...s.findings];
      next[idx] = { ...next[idx], ...patch, updatedAt: nowIso() };
      return { findings: next, dirty: true };
    });
  },

  deleteFinding: (id) => {
    get().mark?.();
    set((s) => ({ findings: s.findings.filter((f) => f.id !== id), dirty: true }));
  },

  reindexAnnotations: (photoId) => {
    get().mark?.();
    set((s) => {
      const next = s.findings.map((f) => {
        if (f.photoId !== photoId) return f;
        const anns = [...f.annotations].sort((a, b) => a.index - b.index);
        return { ...f, annotations: anns };
      });
      const all = next
        .filter((f) => f.photoId === photoId)
        .flatMap((f) => f.annotations.map((a) => ({ fId: f.id, a })));
      all.forEach((entry, i) => { entry.a.index = i + 1; });
      const final = next.map((f) => (f.photoId !== photoId ? f : { ...f, updatedAt: nowIso() }));
      return { findings: final, dirty: true };
    });
  },
});
