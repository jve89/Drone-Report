// client/src/state/editorStore.ts
import { create } from "zustand";
import type { Draft, PageInstance } from "../types/draft";
import type { Template } from "../types/template";
import { getDraft, updateDraft } from "../lib/api";
import { loadTemplate } from "../templates/loader";

/** Local copies of shared types to avoid cross-package TS import issues in the client. */
type Severity = 1 | 2 | 3 | 4 | 5;
type Annotation = {
  id: string;
  kind: "box";
  rect: { x: number; y: number; w: number; h: number }; // normalized 0..1
  index: number;
};
export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  category?: string;
  location?: string;
  description?: string;
  tags: string[];
  photoId: string;
  photoIds?: string[];
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
};

/** Whole-block text style. */
export type TextStyle = {
  fontFamily?: string;       // e.g. 'Inter, system-ui, sans-serif'
  fontSize?: number;         // px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;            // hex or rgb
  lineHeight?: number;       // unitless multiplier (e.g. 1.4)
  letterSpacing?: number;    // px
};

/** User-defined overlay elements placed by the editor. Percent units 0..100. */
export type UserBlock = {
  id: string;
  type: "text"; // future: "image_slot" | "checkbox" | ...
  rect: { x: number; y: number; w: number; h: number }; // 0–100
  value?: string;
  style?: TextStyle;
};

type GuideState = {
  enabled: boolean;
  stepIndex: number;
};

type Step = { pageId: string; blockId: string; help?: string };

/** Insert tool state for Elements panel. */
type ToolState =
  | { mode: "idle"; kind?: undefined }
  | { mode: "insert"; kind: "text" };

type EditorState = {
  draft: Draft | null;
  template: Template | null;
  pageIndex: number;
  zoom: number;
  _saveTimer: number | null;

  // Wizard + selection
  selectedBlockId: string | null; // template block selection
  selectedUserBlockId: string | null; // user overlay selection
  guide: GuideState;

  // Insert tool
  tool: ToolState;

  // Derived
  steps: Step[];

  findings: Finding[];

  setDraft: (d: Draft) => void;
  setTemplate: (t: Template | null) => void;
  setPageIndex: (i: number) => void;
  setZoom: (z: number) => void;

  setSelectedBlock: (blockId: string | null) => void; // template block select
  selectUserBlock: (id: string | null) => void; // user block select

  setValue: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage: (pageId: string) => void;
  repeatPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;

  // Drag/drop + click insert into template image slots
  insertImageAtPoint: (
    pageId: string,
    pointPct: { x: number; y: number },
    media: { id: string; url: string; filename?: string; kind?: string }
  ) => boolean;
  insertImageAppend: (
    pageId: string,
    media: { id: string; url: string; filename?: string; kind?: string }
  ) => boolean;

  // Findings CRUD
  setFindings: (f: Finding[]) => void;
  createFindingsFromPhotos: (photoIds: string[]) => void;
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  deleteFinding: (id: string) => void;
  reindexAnnotations: (photoId: string) => void;

  // Guide controls
  enableGuide: () => void;
  disableGuide: () => void;
  guidePrev: () => void;
  guideNext: () => void;
  guideSkip: () => void;
  setGuideStep: (i: number) => void;
  recomputeSteps: () => void;

  // Elements tool controls
  startInsert: (kind: "text") => void;
  cancelInsert: () => void;
  placeUserBlock: (rectPct: { x: number; y: number; w: number; h: number }) => string | null;
  updateUserBlock: (id: string, patch: Partial<UserBlock>) => void;
  deleteUserBlock: (id: string) => void;

  selectTemplate: (templateId: string) => Promise<void>;

  loadDraft: (id: string) => Promise<void>;
  saveDebounced: () => void;
};

function clampZoom(z: number) {
  const n = Number.isFinite(z) ? z : 1;
  return Math.min(2, Math.max(0.25, n));
}

function nowIso() {
  return new Date().toISOString();
}

function computeSteps(tpl: Template | null): Step[] {
  if (!tpl) return [];
  const out: Step[] = [];
  for (const p of tpl.pages || []) {
    for (const b of (p.blocks || []) as any[]) {
      if (typeof b.help === "string" && b.help.trim().length > 0) {
        out.push({ pageId: p.id, blockId: b.id, help: b.help });
      }
    }
  }
  return out;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(100, x));
}
function clampRectPct(r: { x: number; y: number; w: number; h: number }) {
  const w = clamp01(r.w);
  const h = clamp01(r.h);
  const x = clamp01(Math.min(r.x, 100 - w));
  const y = clamp01(Math.min(r.y, 100 - h));
  return { x, y, w, h };
}

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  color: "#111827", // gray-900
  lineHeight: 1.4,
  letterSpacing: 0,
};

export const useEditor = create<EditorState>((set, get) => ({
  draft: null,
  template: null,
  pageIndex: 0,
  zoom: 1,
  _saveTimer: null,

  selectedBlockId: null,
  selectedUserBlockId: null,
  guide: { enabled: false, stepIndex: 0 },
  tool: { mode: "idle" },
  steps: [],

  findings: [],

  setDraft: (draft) => set({ draft }),
  setTemplate: (template) =>
    set((s) => {
      const steps = computeSteps(template);
      const next: Partial<EditorState> = { template, steps };
      if (s.guide.enabled) {
        next.guide = { ...s.guide, stepIndex: Math.min(s.guide.stepIndex, Math.max(0, steps.length - 1)) };
      }
      return next as any;
    }),

  setPageIndex: (pageIndex) => {
    const d = get().draft;
    const max = (d?.pageInstances?.length ?? 1) - 1;
    const clamped = Math.max(0, Math.min(pageIndex, Math.max(0, max)));
    set({ pageIndex: clamped });
  },

  setZoom: (z) => set({ zoom: clampZoom(z) }),

  setSelectedBlock: (blockId) => set({ selectedBlockId: blockId }),
  selectUserBlock: (id) => set({ selectedUserBlockId: id }),

  setValue: (pageId, blockId, value) =>
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const pi = d.pageInstances.find((p: PageInstance) => p.id === pageId);
      if (!pi) return {};
      if (!pi.values) pi.values = {};
      (pi.values as Record<string, unknown>)[blockId] = value;

      const next: Partial<EditorState> = { draft: d, selectedBlockId: blockId };

      if (s.guide.enabled && s.steps.length) {
        const cur = s.steps[s.guide.stepIndex];
        if (cur && cur.blockId === blockId) {
          const nextIdx = Math.min(s.guide.stepIndex + 1, s.steps.length - 1);
          next.guide = { enabled: true, stepIndex: nextIdx };
          const target = s.steps[nextIdx];
          if (target && s.draft) {
            const idx = s.draft.pageInstances.findIndex((p) => p.templatePageId === target.pageId);
            if (idx >= 0) next.pageIndex = idx;
          }
        }
      }
      return next as any;
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

  deletePage: (pageId) =>
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const idx = d.pageInstances.findIndex((p) => p.id === pageId);
      if (idx < 0) return {};
      if (d.pageInstances.length <= 1) return {}; // keep at least one page
      d.pageInstances.splice(idx, 1);
      const nextIndex = Math.min(Math.max(0, idx - 1), d.pageInstances.length - 1);
      return { draft: d, pageIndex: nextIndex };
    }),

  // ---------- Insert helpers ----------
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

    set((prev) => {
      const nd: Draft = structuredClone(prev.draft!);
      const npi = nd.pageInstances.find((p) => p.id === pageId)!;
      if (!npi.values) npi.values = {};
      (npi.values as any)[target.id] = media.url;

      const next: Partial<EditorState> = { draft: nd, selectedBlockId: target.id };
      if (prev.guide.enabled && prev.steps.length) {
        const cur = prev.steps[prev.guide.stepIndex];
        if (cur && cur.blockId === target.id) {
          const ni = Math.min(prev.guide.stepIndex + 1, prev.steps.length - 1);
          next.guide = { enabled: true, stepIndex: ni };
          const tgt = prev.steps[ni];
          if (tgt) {
            const idx = nd.pageInstances.findIndex((p) => p.templatePageId === tgt.pageId);
            if (idx >= 0) next.pageIndex = idx;
          }
        }
      }
      return next as any;
    });
    s.saveDebounced();
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

    set((prev) => {
      const nd: Draft = structuredClone(prev.draft!);
      const npi = nd.pageInstances.find((p) => p.id === pageId)!;
      if (!npi.values) npi.values = {};
      (npi.values as any)[target.id] = media.url;

      const next: Partial<EditorState> = { draft: nd, selectedBlockId: target.id };
      if (prev.guide.enabled && prev.steps.length) {
        const cur = prev.steps[prev.guide.stepIndex];
        if (cur && cur.blockId === target.id) {
          const ni = Math.min(prev.guide.stepIndex + 1, prev.steps.length - 1);
          next.guide = { enabled: true, stepIndex: ni };
          const tgt = prev.steps[ni];
          if (tgt) {
            const idx = nd.pageInstances.findIndex((p) => p.templatePageId === tgt.pageId);
            if (idx >= 0) next.pageIndex = idx;
          }
        }
      }
      return next as any;
    });
    s.saveDebounced();
    return true;
  },

  // ---------- Findings ----------
  setFindings: (f) => set({ findings: f }),

  createFindingsFromPhotos: (photoIds) =>
    set((s) => {
      if (!s.draft || !photoIds?.length) return {};
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
      return { findings: [...s.findings, ...created] };
    }),

  updateFinding: (id, patch) =>
    set((s) => {
      const idx = s.findings.findIndex((f) => f.id === id);
      if (idx < 0) return {};
      const next = [...s.findings];
      next[idx] = { ...next[idx], ...patch, updatedAt: nowIso() };
      return { findings: next };
    }),

  deleteFinding: (id) =>
    set((s) => {
      const next = s.findings.filter((f) => f.id !== id);
      return { findings: next };
    }),

  reindexAnnotations: (photoId) =>
    set((s) => {
      const next = s.findings.map((f) => {
        if (f.photoId !== photoId) return f;
        const anns = [...f.annotations].sort((a, b) => a.index - b.index);
        return { ...f, annotations: anns };
      });

      const all = next
        .filter((f) => f.photoId === photoId)
        .flatMap((f) => f.annotations.map((a) => ({ fId: f.id, a })));

      all.forEach((entry, i) => {
        entry.a.index = i + 1;
      });

      const final = next.map((f) => {
        if (f.photoId !== photoId) return f;
        return { ...f, updatedAt: nowIso() };
      });
      return { findings: final };
    }),

  // ---------- Guide controls ----------
  enableGuide: () =>
    set((s) => {
      const steps = s.steps.length ? s.steps : computeSteps(s.template);
      const stepIndex = Math.min(s.guide.stepIndex, Math.max(0, steps.length - 1));
      const next: Partial<EditorState> = { guide: { enabled: true, stepIndex }, steps };
      const target = steps[stepIndex];
      if (target && s.draft) {
        const idx = s.draft.pageInstances.findIndex((p) => p.templatePageId === target.pageId);
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
        const idx = s.draft.pageInstances.findIndex((p) => p.templatePageId === target.pageId);
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
        const idx = s.draft.pageInstances.findIndex((p) => p.templatePageId === target.pageId);
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
        const idx = s.draft.pageInstances.findIndex((p) => p.templatePageId === target.pageId);
        if (idx >= 0) next.pageIndex = idx;
      }
      return next as any;
    }),

  recomputeSteps: () =>
    set((s) => {
      const steps = computeSteps(s.template);
      const next: Partial<EditorState> = { steps };
      if (s.guide.enabled) {
        next.guide = { enabled: true, stepIndex: Math.min(s.guide.stepIndex, Math.max(0, steps.length - 1)) };
      }
      return next as any;
    }),

  // ---------- Elements tool ----------
  startInsert: (kind) => set({ tool: { mode: "insert", kind }, selectedUserBlockId: null }),
  cancelInsert: () => set({ tool: { mode: "idle" } }),

  placeUserBlock: (rectPct) => {
    const s = get();
    if (!s.draft) return null;
    const pageIdx = s.pageIndex;
    const d: Draft = structuredClone(s.draft);
    const pi = d.pageInstances?.[pageIdx];
    if (!pi) return null;
    if (!Array.isArray((pi as any).userBlocks)) (pi as any).userBlocks = [];

    if (s.tool.mode !== "insert" || s.tool.kind !== "text") return null;

    const id = crypto.randomUUID();
    const rect = clampRectPct(rectPct);
    const block: UserBlock = {
      id,
      type: "text",
      rect,
      value: "",
      style: { ...DEFAULT_TEXT_STYLE },
    };

    (pi as any).userBlocks = [...(pi as any).userBlocks, block];

    set({ draft: d, tool: { mode: "idle" }, selectedUserBlockId: id });
    s.saveDebounced();
    return id;
  },

  updateUserBlock: (id, patch) => {
    const s = get();
    set((state) => {
      if (!state.draft) return {};
      const d: Draft = structuredClone(state.draft);
      const pi = d.pageInstances?.[state.pageIndex];
      if (!pi || !Array.isArray((pi as any).userBlocks)) return {};
      const list = (pi as any).userBlocks as UserBlock[];
      const i = list.findIndex((b) => b.id === id);
      if (i < 0) return {};
      const current = list[i];

      const nextRect = patch.rect
        ? clampRectPct({ ...(current.rect || { x: 0, y: 0, w: 0, h: 0 }), ...patch.rect })
        : current.rect;

      const nextStyle: TextStyle | undefined =
        patch.style ? { ...(current.style || {}), ...patch.style } : current.style;

      const updated: UserBlock = { ...current, ...patch, rect: nextRect, style: nextStyle };
      const nextList = [...list];
      nextList[i] = updated;
      (pi as any).userBlocks = nextList;
      return { draft: d };
    });
    s.saveDebounced();
  },

  deleteUserBlock: (id) =>
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const pi = d.pageInstances?.[s.pageIndex];
      if (!pi || !Array.isArray((pi as any).userBlocks)) return {};
      const nextList = (pi as any).userBlocks.filter((b: UserBlock) => b.id !== id);
      (pi as any).userBlocks = nextList;
      const next: Partial<EditorState> = { draft: d };
      if (s.selectedUserBlockId === id) next.selectedUserBlockId = null;
      return next as any;
    }),

  // ---------- Template selection ----------
  selectTemplate: async (templateId: string) => {
    const t = templateId ? await loadTemplate(templateId) : null;
    set({ template: (t as Template) ?? null });

    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);

      // sync payload meta
      const payload = ((d as any).payload ?? {}) as Record<string, unknown>;
      const meta = ((payload.meta as any) ?? {}) as Record<string, unknown>;
      meta.templateId = templateId || undefined;
      payload.meta = meta;
      if (!Array.isArray((payload as any).findings)) (payload as any).findings = [];
      (d as any).payload = payload;
      (d as any).templateId = templateId || undefined;

      // decide whether to rebuild pageInstances
      const newPageIds = new Set<string>((t as any)?.pages?.map((p: any) => p.id) ?? []);
      const hasMismatch =
        !Array.isArray(d.pageInstances) ||
        d.pageInstances.length === 0 ||
        d.pageInstances.some((pi: any) => !newPageIds.has(pi.templatePageId));

      if (hasMismatch && t && Array.isArray((t as any).pages)) {
        const pages = (t as any).pages as Array<{ id: string; blocks?: any[] }>;
        d.pageInstances = pages.map((p) => {
          const values: Record<string, unknown> = {};
          (p.blocks || []).forEach((b: any) => {
            switch (b.type) {
              case "text": values[b.id] = ""; break;
              case "image_slot": values[b.id] = ""; break;
              case "table": values[b.id] = []; break;
              case "badge": values[b.id] = { label: "", color: "gray" }; break;
              case "repeater": values[b.id] = { count: 0 }; break;
              default: values[b.id] = "";
            }
          });
          return { id: crypto.randomUUID(), templatePageId: p.id, values, userBlocks: [] };
        });
      } else {
        // keep existing instances but ensure userBlocks arrays and default styles exist
        d.pageInstances = d.pageInstances.map((pi: any) => {
          const userBlocks = Array.isArray(pi.userBlocks) ? pi.userBlocks : [];
          const withDefaults = userBlocks.map((b: UserBlock) =>
            b.type === "text" ? { ...b, style: { ...DEFAULT_TEXT_STYLE, ...(b.style || {}) } } : b
          );
          return { ...pi, userBlocks: withDefaults };
        });
      }

      // guide + selection init
      const steps = computeSteps(get().template);
      const guideEnabled = steps.length > 0;
      const next: Partial<EditorState> = {
        draft: d,
        pageIndex: 0,
        steps,
        guide: { enabled: guideEnabled, stepIndex: 0 },
        selectedBlockId: guideEnabled ? steps[0]?.blockId ?? null : null,
        selectedUserBlockId: null,
        tool: { mode: "idle" },
      };

      if (guideEnabled) {
        const first = steps[0];
        const idx = d.pageInstances.findIndex((p) => p.templatePageId === first.pageId);
        if (idx >= 0) next.pageIndex = idx;
      }

      return next as any;
    });

    get().saveDebounced();
  },

  // ---------- Draft IO ----------
  loadDraft: async (id: string) => {
    const d = await getDraft(id);
    const tplId =
      (d as any)?.payload?.meta?.templateId ||
      (d as any)?.templateId ||
      "";

    const t = tplId ? await loadTemplate(tplId) : null;

    const payloadFindings: Finding[] = Array.isArray((d as any)?.payload?.findings)
      ? ((d as any).payload.findings as Finding[])
      : [];

    const steps = computeSteps(t as Template | null);

    // Normalize userBlocks on each page instance + default styles
    if (Array.isArray((d as any)?.pageInstances)) {
      (d as any).pageInstances = (d as any).pageInstances.map((pi: any) => {
        const userBlocks = Array.isArray(pi.userBlocks) ? pi.userBlocks : [];
        const withDefaults = userBlocks.map((b: UserBlock) =>
          b.type === "text" ? { ...b, style: { ...DEFAULT_TEXT_STYLE, ...(b.style || {}) } } : b
        );
        return { ...pi, userBlocks: withDefaults };
      });
    }

    set({
      draft: d as Draft,
      template: (t as Template) ?? null,
      findings: payloadFindings,
      steps,
      guide: { enabled: false, stepIndex: 0 },
      selectedBlockId: null,
      selectedUserBlockId: null,
      tool: { mode: "idle" },
    });

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

        const currentPayload = ((d as any).payload ?? {}) as Record<string, unknown>;
        const payload = { ...currentPayload, findings: get().findings };
        body.payload = payload;

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
