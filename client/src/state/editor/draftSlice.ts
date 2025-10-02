import type { StateCreator } from "zustand";
import type { EditorState } from "./types";
import type { Draft, PageInstance, Theme } from "../../types/draft";
import type { Template } from "../../types/template";
import { loadTemplate } from "../../templates/loader";

type Step = { pageId: string; blockId: string; help?: string };

// --- robust clamps -------------------------------------------------
function clamp(v: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function clampZoom(z: number) {
  const n = Number(z);
  if (!Number.isFinite(n)) return 1;
  return clamp(n, 0.25, 2);
}
function clampPreviewZoom(z: number) {
  const n = Number(z);
  if (!Number.isFinite(n)) return 1;
  return clamp(n, 0.5, 3);
}

function computeSteps(tpl: Template | null | undefined): Step[] {
  if (!tpl) return [];
  const out: Step[] = [];
  for (const p of tpl.pages || []) {
    for (const b of ((p as any).blocks || []) as any[]) {
      if (typeof b.help === "string" && b.help.trim()) out.push({ pageId: p.id, blockId: b.id, help: b.help });
    }
  }
  return out;
}

export type DraftSlice = {
  setDraft: (d: Draft) => void;
  setTemplate: (t: Template | null) => void;
  setPageIndex: (i: number) => void;
  setZoom: (z: number) => void;

  setSelectedBlock: (blockId: string | null) => void;
  selectUserBlock: (id: string | null) => void;

  // preview modal
  openPreview: () => void;
  closePreview: () => void;
  setPreviewZoom: (z: number) => void;

  // values + page ops
  setValue: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage: (pageId: string) => void;
  repeatPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;

  // template switch
  selectTemplate: (templateId: string) => Promise<void>;
};

export const createDraftSlice: StateCreator<
  EditorState & DraftSlice,
  [],
  [],
  DraftSlice
> = (set, get, _store) => ({
  setDraft: (draft) => set({ draft }),

  setTemplate: (template) =>
    set((s) => {
      const steps = computeSteps(template || null);
      const next: Partial<EditorState> = { template, steps };
      if (s.guide.enabled) {
        next.guide = { enabled: true, stepIndex: Math.min(s.guide.stepIndex, Math.max(0, steps.length - 1)) };
      }
      // keep pageIndex valid if pages changed
      if (s.draft && s.pageIndex != null) {
        const max = Math.max(0, ((s.draft.pageInstances?.length ?? 1) - 1));
        const safe = clamp(Number(s.pageIndex), 0, max);
        next.pageIndex = safe;
      }
      return next as any;
    }),

  setPageIndex: (pageIndex) => {
    const d = get().draft;
    const max = Math.max(0, (d?.pageInstances?.length ?? 1) - 1);
    const safe = clamp(Number(pageIndex), 0, max);
    set({ pageIndex: safe });
  },

  setZoom: (z) => set({ zoom: clampZoom(z) }),

  setSelectedBlock: (blockId) => set({ selectedBlockId: blockId }),
  selectUserBlock: (id) => set({ selectedUserBlockId: id }),

  openPreview: () => set({ previewOpen: true, previewZoom: 1 }),
  closePreview: () => set({ previewOpen: false }),
  setPreviewZoom: (z) => set({ previewZoom: clampPreviewZoom(z) }),

  setValue: (pageId, blockId, value) => {
    (get() as any).mark?.({ coalesce: true });
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const pi = d.pageInstances.find((p: PageInstance) => p.id === pageId);
      if (!pi) return {};
      if (!pi.values) pi.values = {};
      (pi.values as Record<string, unknown>)[blockId] = value;

      const next: Partial<EditorState> = { draft: d, selectedBlockId: blockId, dirty: true };

      if (s.guide.enabled && s.steps.length) {
        const cur = s.steps[s.guide.stepIndex];
        if (cur && cur.blockId === blockId) {
          const nextIdx = Math.min(s.guide.stepIndex + 1, s.steps.length - 1);
          next.guide = { enabled: true, stepIndex: nextIdx };
          const target = s.steps[nextIdx];
          if (target && s.draft) {
            const idx = s.draft.pageInstances.findIndex((p) => p.templatePageId === target.pageId);
            if (idx >= 0) next.pageIndex = clamp(idx, 0, Math.max(0, d.pageInstances.length - 1));
          }
        }
      }
      return next as any;
    });
    try { (get() as any).saveDebounced?.(); } catch {}
  },

  duplicatePage: (pageId) => {
    (get() as any).mark?.();
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
      return { draft: d, pageIndex: clamp(nextIndex, 0, d.pageInstances.length - 1), dirty: true };
    });
    try { (get() as any).saveDebounced?.(); } catch {}
  },

  repeatPage: (pageId) => get().duplicatePage(pageId),

  deletePage: (pageId) => {
    (get() as any).mark?.();
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const idx = d.pageInstances.findIndex((p) => p.id === pageId);
      if (idx < 0 || d.pageInstances.length <= 1) return {};
      d.pageInstances.splice(idx, 1);
      const nextIndex = Math.min(Math.max(0, idx - 1), d.pageInstances.length - 1);
      return { draft: d, pageIndex: clamp(nextIndex, 0, d.pageInstances.length - 1), dirty: true };
    });
    try { (get() as any).saveDebounced?.(); } catch {}
  },

  selectTemplate: async (templateId: string) => {
    (get() as any).mark?.();
    const t = templateId ? await loadTemplate(templateId) : null;
    const stepsFromTemplate = computeSteps(t as Template | null);
    set({ template: (t as Template) ?? null });

    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);

      const payload = ((d as any).payload ?? {}) as any;
      const meta = (payload.meta ?? {}) as any;
      meta.templateId = templateId || undefined;
      payload.meta = meta;
      if (!Array.isArray(payload.findings)) payload.findings = [];
      (d as any).payload = payload;
      (d as any).templateId = templateId || undefined;

      const newPageIds = new Set<string>((t as any)?.pages?.map((p: any) => p.id) ?? []);
      const mismatch =
        !Array.isArray(d.pageInstances) ||
        d.pageInstances.length === 0 ||
        d.pageInstances.some((pi: any) => !newPageIds.has(pi.templatePageId));

      if (mismatch && t && Array.isArray((t as any).pages)) {
        const pages = (t as any).pages as Array<{ id: string; blocks?: any[] }>;
        d.pageInstances = pages.map((p) => {
          const values: Record<string, unknown> = {};
          (p.blocks || []).forEach((b: any) => {
            switch (b.type) {
              case "text": values[b.id] = ""; break;
              case "divider": values[b.id] = ""; break;
              case "line": values[b.id] = ""; break;
              case "rect": values[b.id] = ""; break;
              case "ellipse": values[b.id] = ""; break;
              case "image_slot": values[b.id] = ""; break;
              case "table": values[b.id] = []; break;
              case "badge": values[b.id] = { label: "", color: "gray" }; break;
              case "repeater": values[b.id] = { count: 0 }; break;
              case "section": values[b.id] = { kind: (b as any)?.options?.kind || "" }; break;
              default: values[b.id] = "";
            }
          });
          return { id: crypto.randomUUID(), templatePageId: p.id, values, userBlocks: [] };
        });
      }

      const steps = stepsFromTemplate;
      const guideEnabled = steps.length > 0;
      const next: Partial<EditorState> = {
        draft: d,
        pageIndex: 0,
        steps,
        guide: { enabled: guideEnabled, stepIndex: 0 },
        selectedBlockId: guideEnabled ? steps[0]?.blockId ?? null : null,
        selectedUserBlockId: null,
        tool: { mode: "idle" },
        dirty: true,
      };

      if (guideEnabled) {
        const first = steps[0];
        const idx = d.pageInstances.findIndex((p) => p.templatePageId === first.pageId);
        if (idx >= 0) next.pageIndex = clamp(idx, 0, Math.max(0, d.pageInstances.length - 1));
      }

      return next as any;
    });

    try { await (get() as any).saveNow?.(); } catch {}
  },
});
