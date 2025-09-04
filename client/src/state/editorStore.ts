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

  _saveTimer: number | null;

  setDraft: (d: Draft) => void;
  setTemplate: (t: Template | null) => void;
  setPageIndex: (i: number) => void;

  setValue: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage: (pageId: string) => void;
  repeatPage: (pageId: string) => void;

  selectTemplate: (templateId: string) => Promise<void>;

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

  repeatPage: (pageId) => get().duplicatePage(pageId),

  selectTemplate: async (templateId: string) => {
    const t = templateId ? await loadTemplate(templateId) : null;
    set({ template: (t as Template) ?? null });

    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);

      const payload = ((d as any).payload ?? {}) as Record<string, unknown>;
      const meta = ((payload.meta as any) ?? {}) as Record<string, unknown>;
      meta.templateId = templateId || undefined;
      payload.meta = meta;
      (d as any).payload = payload;
      (d as any).templateId = templateId || undefined;

      if ((!d.pageInstances || d.pageInstances.length === 0) && t && Array.isArray((t as any).pages)) {
        const pages = (t as any).pages as Array<{ id: string }>;
        d.pageInstances = pages.map((p) => ({
          id: crypto.randomUUID(),
          templatePageId: p.id,
          values: {},
          userBlocks: [],
        }));
      }

      return { draft: d, pageIndex: 0 };
    });

    get().saveDebounced();
  },

  loadDraft: async (id: string) => {
    const d = await getDraft(id);
    const tplId =
      (d as any)?.payload?.meta?.templateId ||
      (d as any)?.templateId ||
      "";

    const t = tplId ? await loadTemplate(tplId) : null;

    set({ draft: d as Draft, template: (t as Template) ?? null });

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
        const body: any = {
          pageInstances: d.pageInstances,
          media: d.media,
        };
        if ((d as any).payload) body.payload = (d as any).payload;
        if ((d as any).templateId) body.templateId = (d as any).templateId;

        await updateDraft(d.id, body);
      } catch (e) {
        console.error("[autosave] failed", e);
      } finally {
        set({ _saveTimer: null });
      }
    }, 800);
    set({ _saveTimer: timer });
  },
}));
