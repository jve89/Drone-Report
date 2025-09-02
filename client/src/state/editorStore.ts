// client/src/state/editorStore.ts
import { create } from "zustand";

type EditorState = {
  draft: any | null;
  template: any | null;
  pageIndex: number;
  setDraft: (d: any) => void;
  setTemplate: (t: any) => void;
  setPageIndex: (i: number) => void;
  setValue: (pageId: string, blockId: string, value: any) => void;
  repeatPage: (pageId: string) => void;
};

export const useEditor = create<EditorState>((set, get) => ({
  draft: null,
  template: null,
  pageIndex: 0,
  setDraft: draft => set({ draft }),
  setTemplate: template => set({ template }),
  setPageIndex: pageIndex => set({ pageIndex }),
  setValue: (pageId, blockId, value) =>
    set(s => {
      const d = structuredClone(s.draft);
      const pi = d.pageInstances.find((p: any) => p.id === pageId);
      if (!pi.values) pi.values = {};
      pi.values[blockId] = value;
      return { draft: d };
    }),
  repeatPage: pageId =>
    set(s => {
      const d = structuredClone(s.draft);
      const idx = d.pageInstances.findIndex((p: any) => p.id === pageId);
      const src = d.pageInstances[idx];
      const clone = { id: crypto.randomUUID(), templatePageId: src.templatePageId, values: {}, userBlocks: [] };
      d.pageInstances.splice(idx + 1, 0, clone);
      return { draft: d, pageIndex: Math.min(idx + 1, d.pageInstances.length - 1) };
    })
}));
