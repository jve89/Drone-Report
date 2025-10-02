import type { StateCreator } from "zustand";
import type { EditorState } from "./types";
import type { Template } from "../../types/template";

function computeSteps(tpl: Template | null | undefined) {
  if (!tpl) return [] as Array<{ pageId: string; blockId: string; help?: string }>;
  const out: Array<{ pageId: string; blockId: string; help?: string }> = [];
  for (const p of tpl.pages || []) {
    for (const b of ((p as any).blocks || []) as any[]) {
      if (typeof b.help === "string" && b.help.trim()) {
        out.push({ pageId: p.id, blockId: b.id, help: b.help });
      }
    }
  }
  return out;
}

export type GuideSlice = {
  enableGuide: () => void;
  disableGuide: () => void;
  guidePrev: () => void;
  guideNext: () => void;
  guideSkip: () => void;
  setGuideStep: (i: number) => void;
  recomputeSteps: () => void;
};

export const createGuideSlice: StateCreator<
  EditorState & GuideSlice,
  [],
  [],
  GuideSlice
> = (set, get, _store) => ({
  enableGuide: () =>
    set((s) => {
      const steps = s.steps.length ? s.steps : computeSteps(s.template as any);
      const stepIndex = Math.min(s.guide.stepIndex, Math.max(0, steps.length - 1));
      const next: Partial<EditorState> = { guide: { enabled: true, stepIndex }, steps };
      const target = steps[stepIndex];
      if (target && s.draft) {
        const idx = s.draft.pageInstances?.findIndex((p) => p.templatePageId === target.pageId) ?? -1;
        if (idx >= 0) next.pageIndex = idx;
      }
      return next as any;
    }),

  disableGuide: () => set({ guide: { enabled: false, stepIndex: 0 }, selectedBlockId: null }),

  guidePrev: () =>
    set((s) => {
      if (!s.steps.length) return {};
      const i = Math.max(0, s.guide.stepIndex - 1);
      const next: Partial<EditorState> = { guide: { enabled: s.guide.enabled, stepIndex: i } };
      const target = s.steps[i];
      if (target && s.draft) {
        const idx = s.draft.pageInstances?.findIndex((p) => p.templatePageId === target.pageId) ?? -1;
        if (idx >= 0) next.pageIndex = idx;
      }
      return next as any;
    }),

  guideNext: () =>
    set((s) => {
      if (!s.steps.length) return {};
      const i = Math.min(s.steps.length - 1, s.guide.stepIndex + 1);
      const next: Partial<EditorState> = { guide: { enabled: s.guide.enabled, stepIndex: i } };
      const target = s.steps[i];
      if (target && s.draft) {
        const idx = s.draft.pageInstances?.findIndex((p) => p.templatePageId === target.pageId) ?? -1;
        if (idx >= 0) next.pageIndex = idx;
      }
      return next as any;
    }),

  guideSkip: () => get().guideNext(),

  setGuideStep: (i) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(i, Math.max(0, s.steps.length - 1)));
      const next: Partial<EditorState> = { guide: { enabled: s.guide.enabled, stepIndex: clamped } };
      const target = s.steps[clamped];
      if (target && s.draft) {
        const idx = s.draft.pageInstances?.findIndex((p) => p.templatePageId === target.pageId) ?? -1;
        if (idx >= 0) next.pageIndex = idx;
      }
      return next as any;
    }),

  recomputeSteps: () =>
    set((s) => {
      const steps = computeSteps(s.template as any);
      const next: Partial<EditorState> = { steps };
      if (s.guide.enabled) {
        next.guide = { enabled: true, stepIndex: Math.min(s.guide.stepIndex, Math.max(0, steps.length - 1)) };
      }
      return next as any;
    }),
});
