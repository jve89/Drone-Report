// client/src/state/editorStore.ts
import { create } from "zustand";
import type { Draft, PageInstance } from "../types/draft";
import type { Template } from "../types/template";
import { getDraft, updateDraft } from "../lib/api";
import { loadTemplate } from "../templates/loader";

type EditorState = {
  draft: Draft | null;
  template: Template | null;
  pageIndex: number;

  // internal debounce timer
  _saveTimer: number | null;

  // setters
  setDraft: (d: Draft) => void;
  setTemplate: (t: Template) => void;
  setPageIndex: (i: number) => void;

  // mutations
  setValue: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage: (pageId: string) => void;
  repeatPage: (pageId: string) => void; // alias

  // side-effects
  loadDraft: (id: string) => Promise<void>;
  saveDebounced: () => void;
};

export const useEditor = create<EditorState>((set, get) => ({
  draft: null,
  template: null,
  pageIndex: 0,
  _saveTimer: null,

  setDraft: (draft) => set({ draft }),
  setTemplate: (template) => set({ template }),
  setPageIndex: (pageIndex) => {
    const d = get().draft;
    const max = (d?.pageInstances?.length ?? 1) - 1;
    const clamped = Math.max(0, Math.min(pageIndex, Math.max(0, max)));
    set({ pageIndex: clamped });
  },

  setValue: (pageId, blockId, value) =>
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const pi = d.pageInstances.find((p: PageInstance) => p.id === pageId);
      if (!pi) return {};
      if (!pi.values) pi.values = {};
      (pi.values as Record<string, unknown>)[blockId] = value;
      return { draft: d };
    }),

  duplicatePage: (pageId) =>
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const idx = d.pageInstances.findIndex((p) => p.id === pageId);
      if (idx < 0) return {};
      const src = d.pageInstances[idx];
      const clone: PageInstance = {
        id: crypto.randomUUID(),
        templatePageId: src.templatePageId,
        values: {},
        userBlocks: [],
      };
      d.pageInstances.splice(idx + 1, 0, clone);
      const nextIndex = Math.min(idx + 1, d.pageInstances.length - 1);
      return { draft: d, pageIndex: nextIndex };
    }),

  // legacy alias
  repeatPage: (pageId) => get().duplicatePage(pageId),

  loadDraft: async (id: string) => {
    const d = await getDraft(id);
    const tplId =
      (d as any)?.payload?.meta?.templateId ||
      (d as any)?.templateId ||
      "";
    const t = await loadTemplate(tplId);
    set({ draft: d as Draft, template: t as Template });

    // ensure pageIndex is valid for the loaded draft
    const max = (d.pageInstances?.length ?? 1) - 1;
    const clamped = Math.max(0, Math.min(get().pageIndex, Math.max(0, max)));
    if (clamped !== get().pageIndex) set({ pageIndex: clamped });
  },

  saveDebounced: () => {
    const { _saveTimer } = get();
    if (_saveTimer) window.clearTimeout(_saveTimer);
    const timer = window.setTimeout(async () => {
      const d = get().draft;
      if (!d) return;
      try {
        await updateDraft(d.id, {
          pageInstances: d.pageInstances,
          media: d.media,
        });
      } catch (e) {
        // swallow; UI can add toast later
        console.error("[autosave] failed", e);
      } finally {
        set({ _saveTimer: null });
      }
    }, 800);
    set({ _saveTimer: timer });
  },
}));
