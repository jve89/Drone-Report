import type { StateCreator } from "zustand";
import type { EditorState, Rect } from "./types";
import type { UserBlock, TextStyle, BlockStyle } from "../../types/draft";

// --- helpers -------------------------------------------------
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

function clamp01(x: number) { return Math.max(0, Math.min(100, x)); }
function clampRectPct(r: Rect): Rect {
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
    .map((b, i) => ({ ...b, z: Number.isFinite((b as any).z) ? (b as any).z as number : i }));
  withIndex.sort((a, b) => ((a as any).z ?? 0) - ((b as any).z ?? 0));
  return withIndex.map((b, i) => ({ ...b, z: i } as UserBlock));
}

// --- slice ---------------------------------------------------
export type UserBlocksSlice = {
  placeUserBlock: (rectPct: Rect) => string | null;
  updateUserBlock: (id: string, patch: Partial<UserBlock>) => void;
  deleteUserBlock: (id: string) => void;

  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  nudgeSelected: (dxPct: number, dyPct: number) => void;

  setLinePoints: (id: string, pts: Array<{ x: number; y: number }>) => void;
  setTextStyle: (id: string, patch: Partial<TextStyle>) => void;
  setBlockFill: (id: string, fill: BlockStyle["fill"]) => void;
  setBlockStroke: (id: string, stroke: Partial<NonNullable<BlockStyle["stroke"]>>) => void;
  setBlockRadius: (id: string, r: number) => void;
  setBlockOpacity: (id: string, o: number) => void;

  updateBlockProps: (id: string, patch: Record<string, unknown>) => void;
};

export const createUserBlocksSlice: StateCreator<
  EditorState & UserBlocksSlice,
  [],
  [],
  UserBlocksSlice
> = (set, get, _store) => ({
  placeUserBlock: (rectPct) => {
    const s = get();
    if (!s.draft) return null;
    if (s.tool.mode !== "insert") return null;

    const pageIdx = s.pageIndex;
    const d: any = structuredClone(s.draft);
    const pi = d.pageInstances?.[pageIdx];
    if (!pi) return null;
    if (!Array.isArray(pi.userBlocks)) pi.userBlocks = [];

    const id = crypto.randomUUID();
    const rect = clampRectPct(rectPct);
    const kind = s.tool.kind!;

    (get() as any).mark?.();

    let block: UserBlock | null = null;
    if (kind === "text") {
      block = { id, type: "text", rect, value: "", style: { ...DEFAULT_TEXT_STYLE }, z: pi.userBlocks.length } as any;
    } else if (kind === "rect") {
      block = { id, type: "rect", rect, rotation: 0, blockStyle: { fill: { token: "surface" }, stroke: { width: 1 } }, z: pi.userBlocks.length } as any;
    } else if (kind === "ellipse") {
      block = { id, type: "ellipse", rect, blockStyle: { fill: { token: "surface" }, stroke: { width: 1 } }, z: pi.userBlocks.length } as any;
    } else if (kind === "line") {
      // Treat rectPct.x/y as the click CENTER. If w/h are 0, use a default half-length.
      const cx = clamp01(rectPct.w === 0 && rectPct.h === 0 ? rectPct.x : rectPct.x + rectPct.w / 2);
      const cy = clamp01(rectPct.w === 0 && rectPct.h === 0 ? rectPct.y : rectPct.y + rectPct.h / 2);
      const L = 10; // half-length in percent
      const p1 = { x: clamp01(cx - L), y: cy };
      const p2 = { x: clamp01(cx + L), y: cy };
      block = { id, type: "line", points: clampPointsPct([p1, p2]), blockStyle: { stroke: { width: 2 } }, z: pi.userBlocks.length } as any;
    }

    if (!block) return null;

    pi.userBlocks = normalizeZ([...(pi.userBlocks || []), block]);
    set({ draft: d as any, tool: { mode: "idle" }, selectedUserBlockId: id, dirty: true });
    try { (get() as any).saveDebounced?.(); } catch {}
    return id;
  },

  updateUserBlock: (id, patch) => {
    const s = get();
    (get() as any).mark?.({ coalesce: true });

    set((state) => {
      if (!state.draft) return {};
      const d: any = structuredClone(state.draft);
      const pi = d.pageInstances?.[state.pageIndex];
      if (!pi) return {};

      const list: UserBlock[] = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks as UserBlock[]) : [];
      const i = list.findIndex((b) => (b as any).id === id);
      if (i < 0) return {};

      const current = list[i] as any;
      const isLine = current.type === "line";

      const nextRect =
        patch.rect && !isLine
          ? clampRectPct({ ...(current.rect || { x: 0, y: 0, w: 0, h: 0 }), ...patch.rect } as Rect)
          : current.rect;

      const nextPoints =
        (patch as any).points && isLine
          ? clampPointsPct((patch as any).points)
          : current.points;

      const mergedBlockStyle: BlockStyle | undefined = (patch as any).blockStyle
        ? {
            ...(current.blockStyle || {}),
            ...(patch as any).blockStyle,
            stroke: {
              ...(current.blockStyle?.stroke || {}),
              ...((patch as any).blockStyle?.stroke || {}),
            },
          }
        : current.blockStyle;

      const mergedTextStyle: TextStyle | undefined =
        (patch as any).style ? { ...(current.style || {}), ...(patch as any).style } : current.style;

      const nextZ = Number.isFinite((patch as any).z) ? (patch as any).z : current.z;

      const updated: UserBlock = {
        ...current,
        ...(patch as any),
        rect: nextRect,
        points: nextPoints,
        style: mergedTextStyle,
        blockStyle: mergedBlockStyle,
        z: nextZ,
      };

      const nextList = [...list];
      nextList[i] = updated;
      pi.userBlocks = normalizeZ(nextList);
      return { draft: d as any, dirty: true };
    });

    try { s.saveDebounced?.(); } catch {}
  },

  deleteUserBlock: (id) => {
    (get() as any).mark?.();
    set((s) => {
      if (!s.draft) return {};
      const d: any = structuredClone(s.draft);
      const pi = d.pageInstances?.[s.pageIndex];
      if (!pi) return {};
      const list: UserBlock[] = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks as UserBlock[]) : [];
      const nextList = list.filter((b: any) => b.id !== id);
      pi.userBlocks = normalizeZ(nextList);
      const next: Partial<EditorState> = { draft: d, dirty: true };
      if (s.selectedUserBlockId === id) next.selectedUserBlockId = null;
      return next as any;
    });
  },

  bringForward: (id) => {
    const s = get();
    (get() as any).mark?.();
    set((st) => {
      if (!st.draft) return {};
      const d: any = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list: UserBlock[] = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks as UserBlock[]) : [];
      const i = list.findIndex((b: any) => b.id === id);
      if (i < 0 || i === list.length - 1) return {};
      const tmp = list[i];
      list[i] = list[i + 1];
      list[i + 1] = tmp;
      pi.userBlocks = normalizeZ(list);
      return { draft: d as any, dirty: true };
    });
    try { s.saveDebounced?.(); } catch {}
  },

  sendBackward: (id) => {
    const s = get();
    (get() as any).mark?.();
    set((st) => {
      if (!st.draft) return {};
      const d: any = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list: UserBlock[] = Array.isArray(pi.userBlocks) ? normalizeZ(pi.userBlocks as UserBlock[]) : [];
      const i = list.findIndex((b: any) => b.id === id);
      if (i <= 0) return {};
      const tmp = list[i];
      list[i] = list[i - 1];
      list[i - 1] = tmp;
      pi.userBlocks = normalizeZ(list);
      return { draft: d as any, dirty: true };
    });
    try { s.saveDebounced?.(); } catch {}
  },

  nudgeSelected: (dxPct, dyPct) => {
    const s = get();
    const id = s.selectedUserBlockId;
    if (!id || !s.draft) return;
    (get() as any).mark?.({ coalesce: true });

    set((st) => {
      if (!st.draft) return {};
      const d: any = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list: UserBlock[] = Array.isArray(pi.userBlocks) ? (pi.userBlocks as UserBlock[]).slice() : [];
      const i = list.findIndex((b: any) => b.id === id);
      if (i < 0) return {};
      const b: any = list[i];

      if (b.type === "line" && Array.isArray(b.points)) {
        const moved = clampPointsPct(b.points.map((p: any) => ({ x: p.x + dxPct, y: p.y + dyPct })));
        list[i] = { ...b, points: moved } as UserBlock;
      } else if (b.rect) {
        list[i] = { ...b, rect: clampRectPct({ ...b.rect, x: b.rect.x + dxPct, y: b.rect.y + dyPct }) } as UserBlock;
      }

      pi.userBlocks = normalizeZ(list);
      return { draft: d as any, dirty: true };
    });

    try { s.saveDebounced?.(); } catch {}
  },

  setLinePoints: (id, pts) => {
    get().updateUserBlock(id, { points: clampPointsPct(pts) } as Partial<UserBlock>);
  },

  setTextStyle: (id, patch) => {
    get().updateUserBlock(id, { style: patch } as Partial<UserBlock>);
  },
  setBlockFill: (id, fill) => {
    get().updateUserBlock(id, { blockStyle: { fill } } as Partial<UserBlock>);
  },
  setBlockStroke: (id, stroke) => {
    get().updateUserBlock(id, { blockStyle: { stroke } } as Partial<UserBlock>);
  },
  setBlockRadius: (id, r) => {
    get().updateUserBlock(id, { blockStyle: { radius: r } } as Partial<UserBlock>);
  },
  setBlockOpacity: (id, o) => {
    get().updateUserBlock(id, { blockStyle: { opacity: o } } as Partial<UserBlock>);
  },

  updateBlockProps: (id, patch) => {
    const s = get();
    (get() as any).mark?.({ coalesce: true });
    set((st) => {
      if (!st.draft) return {};
      const d: any = structuredClone(st.draft);
      const pi = d.pageInstances?.[st.pageIndex];
      if (!pi) return {};
      const list: UserBlock[] = Array.isArray(pi.userBlocks) ? (pi.userBlocks as UserBlock[]).slice() : [];
      const i = list.findIndex((b: any) => b.id === id);
      if (i < 0) return {};

      const cur: any = list[i];
      const curMeta = (cur.blockStyle?.meta ?? {}) as any;
      const curProps = (curMeta.props ?? {}) as Record<string, unknown>;
      const nextMeta = { ...curMeta, props: { ...curProps, ...(patch || {}) } };

      list[i] = {
        ...cur,
        blockStyle: {
          ...(cur.blockStyle || {}),
          meta: nextMeta,
        },
      } as any;

      pi.userBlocks = normalizeZ(list);
      return { draft: d as any, dirty: true };
    });
    try { s.saveDebounced?.(); } catch {}
  },
});
