// client/src/state/editorStore.ts
import { create } from "zustand";
import type {
  Draft,
  PageInstance,
  UserBlock,
  TextStyle,
  BlockStyle,
  PageStyle,
  Theme,
} from "../types/draft";
import type { Template } from "../types/template";
import { getDraft, updateDraft } from "../lib/api";
import { loadTemplate } from "../templates/loader";

/** Local-only Finding types kept here to avoid coupling. */
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

type GuideState = {
  enabled: boolean;
  stepIndex: number;
};

type Step = { pageId: string; blockId: string; help?: string };

type InsertKind = "text" | "line" | "rect" | "ellipse" | "divider";

type ToolState =
  | { mode: "idle"; kind?: undefined }
  | { mode: "insert"; kind: InsertKind };

/** ---- Undo/Redo ---- */
type Snapshot = {
  draftPart: {
    pageInstances: Draft["pageInstances"];
    media: Draft["media"];
    templateId?: string;
    payloadMeta?: Record<string, unknown>;
    payloadTheme?: Theme | undefined;
  };
  findings: Finding[];
  pageIndex: number;
  selectedBlockId: string | null;
  selectedUserBlockId: string | null;
};

const HISTORY_LIMIT = 50;
const MARK_COALESCE_MS = 300;

/** ---- Defaults + helpers ---- */
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

function clampZoom(z: number) {
  const n = Number.isFinite(z) ? z : 1;
  return Math.min(2, Math.max(0.25, n));
}
function clampPreviewZoom(z: number) {
  const n = Number.isFinite(z) ? z : 1;
  return Math.min(2, Math.max(0.6, n));
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
function clampPointsPct(points: Array<{ x: number; y: number }>) {
  return points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }));
}
function normalizeZ(blocks: UserBlock[]): UserBlock[] {
  const withIndex = blocks
    .slice()
    .map((b, i) => ({ ...b, z: Number.isFinite(b.z as any) ? (b.z as number) : i }));
  withIndex.sort((a, b) => (a.z! - b.z!));
  return withIndex.map((b, i) => ({ ...b, z: i }));
}
function getSelectedUserBlock(d: Draft, pageIndex: number, id: string | null): { list: UserBlock[]; i: number } | null {
  const pi = d.pageInstances?.[pageIndex];
  if (!pi || !Array.isArray(pi.userBlocks)) return null;
  const list = normalizeZ(pi.userBlocks);
  if (!id) return { list, i: -1 };
  const i = list.findIndex((b) => b.id === id);
  return { list, i };
}

/** Build a compact snapshot of current state. */
function makeSnapshot(s: EditorState): Snapshot | null {
  const d = s.draft;
  if (!d) return null;
  const payload = ((d as any).payload ?? {}) as any;
  const payloadMeta = ((payload.meta ?? {}) as Record<string, unknown>);
  const payloadTheme = (payload.theme as Theme | undefined) ?? undefined;
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

/** Restore fields from a snapshot into state. */
function applySnapshot(prev: EditorState, snap: Snapshot): Partial<EditorState> {
  if (!prev.draft) return {};
  const d: Draft = structuredClone(prev.draft);
  d.pageInstances = structuredClone(snap.draftPart.pageInstances);
  d.media = structuredClone(snap.draftPart.media);
  (d as any).templateId = snap.draftPart.templateId;

  const payload = ((d as any).payload ?? {}) as any;
  payload.meta = { ...(payload.meta ?? {}), ...(snap.draftPart.payloadMeta ?? {}) };
  if (snap.draftPart.payloadTheme) payload.theme = snap.draftPart.payloadTheme;
  (d as any).payload = payload;

  return {
    draft: d,
    findings: structuredClone(snap.findings),
    pageIndex: snap.pageIndex,
    selectedBlockId: snap.selectedBlockId,
    selectedUserBlockId: snap.selectedUserBlockId,
    dirty: true,
  };
}

type EditorState = {
  draft: Draft | null;
  template: Template | null;
  pageIndex: number;
  zoom: number;

  // save state
  _saveTimer: number | null;
  saving: boolean;
  dirty: boolean;
  lastSavedAt?: string;

  // Wizard + selection
  selectedBlockId: string | null;
  selectedUserBlockId: string | null;
  guide: GuideState;

  // Insert tool
  tool: ToolState;

  // Derived
  steps: Step[];

  findings: Finding[];

  // Preview modal
  previewOpen: boolean;
  previewZoom: number;
  openPreview: () => void;
  closePreview: () => void;
  setPreviewZoom: (z: number) => void;

  // Undo/Redo
  historyPast: Snapshot[];
  historyFuture: Snapshot[];
  lastMarkTs: number;
  canUndo: boolean;
  canRedo: boolean;
  mark: (opts?: { coalesce?: boolean }) => void;
  undo: () => void;
  redo: () => void;

  // Core setters
  setDraft: (d: Draft) => void;
  setTemplate: (t: Template | null) => void;
  setPageIndex: (i: number) => void;
  setZoom: (z: number) => void;

  setSelectedBlock: (blockId: string | null) => void;
  selectUserBlock: (id: string | null) => void;

  setValue: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage: (pageId: string) => void;
  repeatPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;

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
  startInsert: (kind: InsertKind) => void;
  cancelInsert: () => void;
  placeUserBlock: (rectPct: { x: number; y: number; w: number; h: number }) => string | null;
  updateUserBlock: (id: string, patch: Partial<UserBlock>) => void;
  deleteUserBlock: (id: string) => void;

  // New formatting + geometry ops
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  nudgeSelected: (dxPct: number, dyPct: number) => void;
  setTextStyle: (id: string, patch: Partial<TextStyle>) => void;
  setBlockFill: (id: string, fill: BlockStyle["fill"]) => void;
  setBlockStroke: (id: string, stroke: Partial<NonNullable<BlockStyle["stroke"]>>) => void;
  setBlockRadius: (id: string, r: number) => void;
  setBlockOpacity: (id: string, o: number) => void;
  setLinePoints: (id: string, points: Array<{ x: number; y: number }>) => void;

  // Page + theme
  setPageStyle: (pageIndex: number, patch: Partial<PageStyle>) => void;
  setTheme: (patch: Partial<Theme>) => void;
  setThemeColorToken: (key: string, ref: { token?: string; hex?: string }) => void;

  selectTemplate: (templateId: string) => Promise<void>;

  loadDraft: (id: string) => Promise<void>;
  saveDebounced: () => void;
  saveNow: () => Promise<void>;
  setDraftTitle: (title: string) => Promise<void>;
};

export const useEditor = create<EditorState>((set, get) => ({
  draft: null,
  template: null,
  pageIndex: 0,
  zoom: 1,

  _saveTimer: null,
  saving: false,
  dirty: false,
  lastSavedAt: undefined,

  selectedBlockId: null,
  selectedUserBlockId: null,
  guide: { enabled: false, stepIndex: 0 },
  tool: { mode: "idle" },
  steps: [],

  findings: [],

  // Preview modal
  previewOpen: false,
  previewZoom: 1,
  openPreview: () => set({ previewOpen: true, previewZoom: 1 }),
  closePreview: () => set({ previewOpen: false }),
  setPreviewZoom: (z) => set({ previewZoom: clampPreviewZoom(z) }),

  // Undo/Redo state
  historyPast: [],
  historyFuture: [],
  lastMarkTs: 0,
  canUndo: false,
  canRedo: false,

  mark: (opts) => {
    const coalesce = !!opts?.coalesce;
    const now = Date.now();
    set((s) => {
      if (!s.draft) return {};
      if (coalesce && s.lastMarkTs && now - s.lastMarkTs < MARK_COALESCE_MS) {
        return {};
      }
      const snap = makeSnapshot(s as unknown as EditorState);
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
        ...applySnapshot(s as unknown as EditorState, prevSnap),
        historyPast: past,
        historyFuture: future,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
      } as Partial<EditorState>;
    });
    get().saveDebounced();
  },

  redo: () => {
    const curSnap = makeSnapshot(get());
    set((s) => {
      if (!s.draft || s.historyFuture.length === 0 || !curSnap) return {};
      const [nextSnap, ...restFuture] = s.historyFuture;
      const past = [...s.historyPast, curSnap];
      if (past.length > HISTORY_LIMIT) past.shift();
      return {
        ...applySnapshot(s as unknown as EditorState, nextSnap),
        historyPast: past,
        historyFuture: restFuture,
        canUndo: past.length > 0,
        canRedo: restFuture.length > 0,
      } as Partial<EditorState>;
    });
    get().saveDebounced();
  },

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

  setValue: (pageId, blockId, value) => {
    get().mark({ coalesce: true });
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
            if (idx >= 0) next.pageIndex = idx;
          }
        }
      }
      return next as any;
    });
  },

  duplicatePage: (pageId) => {
    get().mark();
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
      return { draft: d, pageIndex: nextIndex, dirty: true };
    });
  },

  repeatPage: (pageId) => get().duplicatePage(pageId),

  deletePage: (pageId) => {
    get().mark();
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const idx = d.pageInstances.findIndex((p) => p.id === pageId);
      if (idx < 0) return {};
      if (d.pageInstances.length <= 1) return {};
      d.pageInstances.splice(idx, 1);
      const nextIndex = Math.min(Math.max(0, idx - 1), d.pageInstances.length - 1);
      return { draft: d, pageIndex: nextIndex, dirty: true };
    });
  },

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

    get().mark();
    set((prev) => {
      const nd: Draft = structuredClone(prev.draft!);
      const npi = nd.pageInstances.find((p) => p.id === pageId)!;
      if (!npi.values) npi.values = {};
      (npi.values as any)[target.id] = media.url;

      const next: Partial<EditorState> = { draft: nd, selectedBlockId: target.id, dirty: true };
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
    get().saveDebounced();
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

    get().mark();
    set((prev) => {
      const nd: Draft = structuredClone(prev.draft!);
      const npi = nd.pageInstances.find((p) => p.id === pageId)!;
      if (!npi.values) npi.values = {};
      (npi.values as any)[target.id] = media.url;

      const next: Partial<EditorState> = { draft: nd, selectedBlockId: target.id, dirty: true };
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
    get().saveDebounced();
    return true;
  },

  // ---------- Findings ----------
  setFindings: (f) => {
    get().mark();
    set({ findings: f, dirty: true });
  },
  createFindingsFromPhotos: (photoIds) => {
    get().mark();
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
      return { findings: [...s.findings, ...created], dirty: true } as Partial<EditorState>;
    });
  },
  updateFinding: (id, patch) => {
    get().mark({ coalesce: true });
    set((s) => {
      const idx = s.findings.findIndex((f) => f.id === id);
      if (idx < 0) return {};
      const next = [...s.findings];
      next[idx] = { ...next[idx], ...patch, updatedAt: nowIso() };
      return { findings: next, dirty: true };
    });
  },
  deleteFinding: (id) => {
    get().mark();
    set((s) => {
      const next = s.findings.filter((f) => f.id !== id);
      return { findings: next, dirty: true };
    });
  },
  reindexAnnotations: (photoId) => {
    get().mark();
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
    if (!Array.isArray(pi.userBlocks)) pi.userBlocks = [];

    if (s.tool.mode !== "insert") return null;
    const id = crypto.randomUUID();

    get().mark();

    const kind = s.tool.kind!;
    const rect = clampRectPct(rectPct);

    let block: UserBlock | null = null;
    if (kind === "text") {
      block = {
        id, type: "text", rect,
        value: "",
        style: { ...DEFAULT_TEXT_STYLE },
        z: (pi.userBlocks?.length ?? 0),
      };
    } else if (kind === "rect") {
      block = {
        id, type: "rect", rect,
        blockStyle: { fill: { token: "surface" }, stroke: { width: 1 } },
        z: (pi.userBlocks?.length ?? 0),
      };
    } else if (kind === "ellipse") {
      block = {
        id, type: "ellipse", rect,
        blockStyle: { fill: { token: "surface" }, stroke: { width: 1 } },
        z: (pi.userBlocks?.length ?? 0),
      } as UserBlock;
    } else if (kind === "divider") {
      const thin = { ...rect, h: Math.max(0.4, Math.min(rect.h, 2)) };
      block = {
        id, type: "divider", rect: thin,
        blockStyle: { stroke: { width: 1 } },
        z: (pi.userBlocks?.length ?? 0),
      };
    } else if (kind === "line") {
      const p1 = { x: rect.x, y: rect.y };
      const p2 = { x: rect.x + rect.w, y: rect.y + rect.h };
      block = {
        id, type: "line",
        points: clampPointsPct([p1, p2]),
        blockStyle: { stroke: { width: 2 } },
        z: (pi.userBlocks?.length ?? 0),
      } as UserBlock;
    }

    if (!block) return null;

    pi.userBlocks = normalizeZ([...(pi.userBlocks || []), block]);
    set({ draft: d, tool: { mode: "idle" }, selectedUserBlockId: id, dirty: true });
    s.saveDebounced();
    return id;
  },

  updateUserBlock: (id, patch) => {
    const s = get();
    get().mark({ coalesce: true });
    set((state) => {
      if (!state.draft) return {};
      const d: Draft = structuredClone(state.draft);
      const pi = d.pageInstances?.[state.pageIndex];
      if (!pi) return {};
      const list = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks) : [];
      const i = list.findIndex((b) => b.id === id);
      if (i < 0) return {};

      const current = list[i];
      const isLine = current.type === "line";
      const nextRect =
        patch.rect && !isLine
          ? clampRectPct({ ...(current.rect || { x: 0, y: 0, w: 0, h: 0 }), ...patch.rect })
          : current.rect;
      const nextPoints = patch.points && isLine ? clampPointsPct(patch.points) : current.points;

      const mergedBlockStyle: BlockStyle | undefined = patch.blockStyle
        ? {
            ...(current.blockStyle || {}),
            ...patch.blockStyle,
            stroke: {
              ...(current.blockStyle?.stroke || {}),
              ...(patch.blockStyle.stroke || {}),
            },
          }
        : current.blockStyle;

      const mergedTextStyle: TextStyle | undefined =
        patch.style ? { ...(current.style || {}), ...patch.style } : current.style;

      const nextZ = Number.isFinite((patch as any).z) ? (patch as any).z : current.z;

      const updated: UserBlock = {
        ...current,
        ...patch,
        rect: nextRect,
        points: nextPoints,
        style: mergedTextStyle,
        blockStyle: mergedBlockStyle,
        z: nextZ,
      };

      const nextList = [...list];
      nextList[i] = updated;
      pi.userBlocks = normalizeZ(nextList);
      return { draft: d, dirty: true };
    });
    s.saveDebounced();
  },

  deleteUserBlock: (id) => {
    get().mark();
    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);
      const pi = d.pageInstances?.[s.pageIndex];
      if (!pi) return {};
      const list = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks) : [];
      const nextList = list.filter((b) => b.id !== id);
      pi.userBlocks = normalizeZ(nextList);
      const next: Partial<EditorState> = { draft: d, dirty: true };
      if (s.selectedUserBlockId === id) next.selectedUserBlockId = null;
      return next as any;
    });
  },

  // Z-order operations
  bringForward: (id) => {
    const s = get();
    get().mark();
    set((st) => {
      if (!st.draft) return {};
      const d: Draft = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks) : [];
      const i = list.findIndex((b) => b.id === id);
      if (i < 0 || i === list.length - 1) return {};
      const tmp = list[i];
      list[i] = list[i + 1];
      list[i + 1] = tmp;
      pi.userBlocks = normalizeZ(list);
      return { draft: d, dirty: true };
    });
    s.saveDebounced();
  },
  sendBackward: (id) => {
    const s = get();
    get().mark();
    set((st) => {
      if (!st.draft) return {};
      const d: Draft = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks) : [];
      const i = list.findIndex((b) => b.id === id);
      if (i <= 0) return {};
      const tmp = list[i];
      list[i] = list[i - 1];
      list[i - 1] = tmp;
      pi.userBlocks = normalizeZ(list);
      return { draft: d, dirty: true };
    });
    s.saveDebounced();
  },

  // Geometry + styling
  nudgeSelected: (dxPct, dyPct) => {
    const s = get();
    const id = s.selectedUserBlockId;
    if (!id || !s.draft) return;
    get().mark({ coalesce: true });
    set((st) => {
      if (!st.draft) return {};
      const d: Draft = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list = Array.isArray(pi.userBlocks) ? pi.userBlocks.slice() : [];
      const i = list.findIndex((b) => b.id === id);
      if (i < 0) return {};
      const b = list[i];
      if (b.type === "line" && Array.isArray(b.points)) {
        const moved = clampPointsPct(b.points.map((p) => ({ x: p.x + dxPct, y: p.y + dyPct })));
        list[i] = { ...b, points: moved } as UserBlock;
      } else if (b.rect) {
        list[i] = { ...b, rect: clampRectPct({ ...b.rect, x: b.rect.x + dxPct, y: b.rect.y + dyPct }) } as UserBlock;
      }
      pi.userBlocks = normalizeZ(list as UserBlock[]);
      return { draft: d, dirty: true };
    });
    s.saveDebounced();
  },

  setTextStyle: (id, patch) => {
    const s = get();
    s.updateUserBlock(id, { style: patch } as Partial<UserBlock>);
  },
  setBlockFill: (id, fill) => {
    const s = get();
    s.updateUserBlock(id, { blockStyle: { fill } } as Partial<UserBlock>);
  },
  setBlockStroke: (id, stroke) => {
    const s = get();
    s.updateUserBlock(id, { blockStyle: { stroke } } as Partial<UserBlock>);
  },
  setBlockRadius: (id, r) => {
    const s = get();
    s.updateUserBlock(id, { blockStyle: { radius: r } } as Partial<UserBlock>);
  },
  setBlockOpacity: (id, o) => {
    const s = get();
    s.updateUserBlock(id, { blockStyle: { opacity: o } } as Partial<UserBlock>);
  },
  setLinePoints: (id, points) => {
    const s = get();
    s.updateUserBlock(id, { points: clampPointsPct(points) } as Partial<UserBlock>);
  },

  // ---------- Template selection ----------
  selectTemplate: async (templateId: string) => {
    get().mark();
    const t = templateId ? await loadTemplate(templateId) : null;
    set({ template: (t as Template) ?? null });

    set((s) => {
      if (!s.draft) return {};
      const d: Draft = structuredClone(s.draft);

      // sync payload meta
      const payload = ((d as any).payload ?? {}) as any;
      const meta = ((payload.meta ?? {}) as any);
      meta.templateId = templateId || undefined;
      payload.meta = meta;
      if (!Array.isArray(payload.findings)) payload.findings = [];
      (d as any).payload = payload;
      (d as any).templateId = templateId || undefined;

      // rebuild or normalize
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
        d.pageInstances = d.pageInstances.map((pi: any) => {
          const userBlocks = Array.isArray(pi.userBlocks) ? pi.userBlocks : [];
          const withDefaults = userBlocks.map((b: UserBlock) =>
            b.type === "text" ? { ...b, style: { ...DEFAULT_TEXT_STYLE, ...(b.style || {}) } } : b
          );
          return { ...pi, userBlocks: normalizeZ(withDefaults as UserBlock[]) };
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
        dirty: true,
      };

      if (guideEnabled) {
        const first = steps[0];
        const idx = d.pageInstances.findIndex((p) => p.templatePageId === first.pageId);
        if (idx >= 0) next.pageIndex = idx;
      }

      return next as any;
    });

    await get().saveNow();
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
        return { ...pi, userBlocks: normalizeZ(withDefaults as UserBlock[]) };
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
      dirty: false,
      saving: false,
      _saveTimer: null,
      lastSavedAt: (d as any)?.updatedAt || (d as any)?.updated_at || undefined,

      // clear history on load
      historyPast: [],
      historyFuture: [],
      lastMarkTs: 0,
      canUndo: false,
      canRedo: false,
    });

    const max = (d.pageInstances?.length ?? 1) - 1;
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

      // persist root title so lists show renamed value
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

    get().mark();
    set((s) => {
      const d: Draft = structuredClone(s.draft!);
      const payload = ((d as any).payload ?? {}) as any;
      const meta = ((payload.meta ?? {}) as any);
      meta.title = t;
      payload.meta = meta;
      (d as any).payload = payload;
      (d as any).title = t;
      return { draft: d, dirty: true } as Partial<EditorState>;
    });
    await get().saveNow();
  },

  // ---------- Page + Theme ----------
  setPageStyle: (pageIndex, patch) => {
    const s = get();
    if (!s.draft) return;
    get().mark({ coalesce: true });
    set((st) => {
      if (!st.draft) return {};
      const d: Draft = structuredClone(st.draft);
      const pi = d.pageInstances?.[pageIndex];
      if (!pi) return {};
      pi.pageStyle = { ...(pi.pageStyle || {}), ...(patch || {}) };
      return { draft: d, dirty: true };
    });
    s.saveDebounced();
  },
  setTheme: (patch) => {
    const s = get();
    if (!s.draft) return;
    get().mark({ coalesce: true });
    set((st) => {
      if (!st.draft) return {};
      const d: Draft = structuredClone(st.draft);
      const payload = ((d as any).payload ?? {}) as any;
      const theme = (payload.theme as Theme) || {};
      payload.theme = {
        ...theme,
        ...patch,
        colors: { ...(theme.colors || {}), ...(patch.colors || {}) },
        textVariants: { ...(theme.textVariants || {}), ...(patch.textVariants || {}) },
        page: { ...(theme.page || {}), ...(patch.page || {}) },
      };
      (d as any).payload = payload;
      return { draft: d, dirty: true };
    });
    s.saveDebounced();
  },
  setThemeColorToken: (key, ref) => {
    const s = get();
    s.setTheme({ colors: { [key]: { ...(ref.token ? { token: ref.token } : {}), ...(ref.hex ? { hex: ref.hex } : {}) } } });
  },
}));
