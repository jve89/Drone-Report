import type { StateCreator } from "zustand";
import type { EditorState } from "./types";

export type MediaSlice = {
  insertImageAtPoint: (
    pageId: string,
    pointPct: { x: number; y: number },
    media: { id: string; url: string; filename?: string; kind?: string }
  ) => boolean;
  insertImageAppend: (
    pageId: string,
    media: { id: string; url: string; filename?: string; kind?: string }
  ) => boolean;
};

export const createMediaSlice: StateCreator<
  EditorState & MediaSlice,
  [],
  [],
  MediaSlice
> = (set, get, _store) => ({
  insertImageAtPoint: (pageId, pointPct, media) => {
    const s = get();
    const d = s.draft;
    const t = s.template as any;
    if (!d || !t) return false;

    const pi = d.pageInstances.find((p) => p.id === pageId);
    const tPage = t.pages.find((p: any) => p.id === pi?.templatePageId);
    if (!pi || !tPage) return false;

    const blocks = (tPage.blocks || []) as Array<{ id: string; type: string; rect: { x: number; y: number; w: number; h: number } }>;
    const contains = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
      x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;

    const under = blocks.filter((b) => b.type === "image_slot" && contains(b.rect, pointPct.x, pointPct.y));
    const target = under[0] || (blocks.find((b) => b.type === "image_slot") as any);
    if (!target) return false;

    (get() as any).mark?.();

    set((prev) => {
      const nd: any = structuredClone(prev.draft!);
      const npi = nd.pageInstances.find((p: any) => p.id === pageId)!;
      if (!npi.values) npi.values = {};
      npi.values[target.id] = media.url;

      const next: Partial<EditorState> = { draft: nd, selectedBlockId: target.id, dirty: true };

      if (prev.guide.enabled && prev.steps.length) {
        const cur = prev.steps[prev.guide.stepIndex];
        if (cur && cur.blockId === target.id) {
          const ni = Math.min(prev.guide.stepIndex + 1, prev.steps.length - 1);
          (next as any).guide = { enabled: true, stepIndex: ni };
          const tgt = prev.steps[ni];
          if (tgt) {
            const idx = nd.pageInstances.findIndex((p: any) => p.templatePageId === tgt.pageId);
            if (idx >= 0) (next as any).pageIndex = idx;
          }
        }
      }
      return next as any;
    });

    try { (get() as any).saveDebounced?.(); } catch {}
    return true;
  },

  insertImageAppend: (pageId, media) => {
    const s = get();
    const d = s.draft;
    const t = s.template as any;
    if (!d || !t) return false;

    const pi = d.pageInstances.find((p) => p.id === pageId);
    const tPage = t.pages.find((p: any) => p.id === pi?.templatePageId);
    if (!pi || !tPage) return false;

    const blocks = (tPage.blocks || []) as Array<{ id: string; type: string }>;
    const firstEmpty = blocks.find((b) => b.type === "image_slot" && !(pi.values as any)?.[b.id]);
    const target = firstEmpty || (blocks.find((b) => b.type === "image_slot") as any);
    if (!target) return false;

    (get() as any).mark?.();

    set((prev) => {
      const nd: any = structuredClone(prev.draft!);
      const npi = nd.pageInstances.find((p: any) => p.id === pageId)!;
      if (!npi.values) npi.values = {};
      npi.values[target.id] = media.url;

      const next: Partial<EditorState> = { draft: nd, selectedBlockId: target.id, dirty: true };

      if (prev.guide.enabled && prev.steps.length) {
        const cur = prev.steps[prev.guide.stepIndex];
        if (cur && cur.blockId === target.id) {
          const ni = Math.min(prev.guide.stepIndex + 1, prev.steps.length - 1);
          (next as any).guide = { enabled: true, stepIndex: ni };
          const tgt = prev.steps[ni];
          if (tgt) {
            const idx = nd.pageInstances.findIndex((p: any) => p.templatePageId === tgt.pageId);
            if (idx >= 0) (next as any).pageIndex = idx;
          }
        }
      }
      return next as any;
    });

    try { (get() as any).saveDebounced?.(); } catch {}
    return true;
  },
});
