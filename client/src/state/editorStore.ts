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
  index: number; // visible label per photo
};
export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  category?: string;
  location?: string;
  description?: string;
  tags: string[];
  photoId: string;           // primary photo
  photoIds?: string[];       // optional extra photos (future)
  annotations: Annotation[]; // v1 uses primary photo only
  createdAt: string;         // ISO
  updatedAt: string;         // ISO
};

type EditorState = {
  draft: Draft | null;
  template: Template | null;
  pageIndex: number;
  zoom: number; // 0.25–2
  _saveTimer: number | null;

  // Findings
  findings: Finding[];

  setDraft: (d: Draft) => void;
  setTemplate: (t: Template | null) => void;
  setPageIndex: (i: number) => void;
  setZoom: (z: number) => void;

  setValue: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage: (pageId: string) => void;
  repeatPage: (pageId: string) => void;

  // Findings CRUD
  setFindings: (f: Finding[]) => void;
  createFindingsFromPhotos: (photoIds: string[]) => void;
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  deleteFinding: (id: string) => void;
  reindexAnnotations: (photoId: string) => void;

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

export const useEditor = create<EditorState>((set, get) => ({
  draft: null,
  template: null,
  pageIndex: 0,
  zoom: 1,
  _saveTimer: null,

  findings: [],

  setDraft: (draft) => set({ draft }),
  setTemplate: (template) => set({ template }),
  setPageIndex: (pageIndex) => {
    const d = get().draft;
    const max = (d?.pageInstances?.length ?? 1) - 1;
    const clamped = Math.max(0, Math.min(pageIndex, Math.max(0, max)));
    set({ pageIndex: clamped });
  },
  setZoom: (z) => set({ zoom: clampZoom(z) }),

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
        annotations: [], // boxes added later
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

  // Recompute sequential indices for annotations on a given photo
  reindexAnnotations: (photoId) =>
    set((s) => {
      const next = s.findings.map((f) => {
        if (f.photoId !== photoId) return f;
        const anns = [...f.annotations].sort((a, b) => a.index - b.index);
        // Flatten all annotation indices across *all* findings for this photo.
        // We will renumber in a second pass.
        return { ...f, annotations: anns };
      });

      // Collect all annotations for this photo to renumber 1..N
      const all = next
        .filter((f) => f.photoId === photoId)
        .flatMap((f) => f.annotations.map((a) => ({ fId: f.id, a })));

      all.forEach((entry, i) => {
        entry.a.index = i + 1;
      });

      // Write back mutated indices
      const final = next.map((f) => {
        if (f.photoId !== photoId) return f;
        return { ...f, updatedAt: nowIso() };
      });
      return { findings: final };
    }),

  // ---------- Template selection ----------
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
      // ensure findings array exists in payload
      if (!Array.isArray((payload as any).findings)) {
        (payload as any).findings = [];
      }
      (d as any).payload = payload;
      (d as any).templateId = templateId || undefined;

      // Initialize page instances and default values per block
      if ((!d.pageInstances || d.pageInstances.length === 0) && t && Array.isArray((t as any).pages)) {
        const pages = (t as any).pages as Array<{ id: string; blocks?: any[] }>;
        d.pageInstances = pages.map((p) => {
          const values: Record<string, unknown> = {};
          (p.blocks || []).forEach((b: any) => {
            switch (b.type) {
              case "text":
                values[b.id] = "";
                break;
              case "image_slot":
                values[b.id] = "";
                break;
              case "table":
                values[b.id] = [];
                break;
              case "badge":
                values[b.id] = { label: "", color: "gray" };
                break;
              case "repeater":
                values[b.id] = { count: 0 };
                break;
              default:
                values[b.id] = "";
            }
          });
          return {
            id: crypto.randomUUID(),
            templatePageId: p.id,
            values,
            userBlocks: [],
          };
        });
      }

      return { draft: d, pageIndex: 0 };
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

    // Pull findings from payload if present
    const payloadFindings: Finding[] = Array.isArray((d as any)?.payload?.findings)
      ? ((d as any).payload.findings as Finding[])
      : [];

    set({
      draft: d as Draft,
      template: (t as Template) ?? null,
      findings: payloadFindings,
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

        // Merge payload with findings
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
