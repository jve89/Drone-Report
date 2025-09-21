// client/src/editor/Canvas.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../state/editorStore";
import { renderString, select } from "../templates/bindings";
import TextToolbar from "./blocks/TextToolbar";
import ShapeToolbar from "./blocks/ShapeToolbar";

const DR_MEDIA_MIME = "application/x-dr-media";

/** Local types (template blocks) */
type Rect = { x: number; y: number; w: number; h: number };
type BlockBase = { id: string; type: string; rect: Rect; label?: string; placeholder?: string; options?: any };
type BlockText = BlockBase & { type: "text"; value?: string };
type BlockImage = BlockBase & { type: "image_slot"; source?: string };
type BlockTable = BlockBase & { type: "table"; options?: { columns?: { key: string; label: string }[] } };
type BlockBadge = BlockBase & { type: "badge"; options?: { palette?: string } };
type BlockRepeater = BlockBase & {
  type: "repeater";
  bind?: string;
  options?: { previewCount?: number };
  children?: Array<BlockText | BlockImage | BlockBadge>;
};
type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater;

/** User element type mirrors store shape */
type LinePoint = { x: number; y: number };
type UserBlock =
  | {
      id: string;
      type: "text";
      rect: Rect; // 0–100
      value?: string;
      style?: {
        fontFamily?: string;
        fontSize?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        align?: "left" | "center" | "right" | "justify";
        color?: string;
        lineHeight?: number;
        letterSpacing?: number;
      };
      blockStyle?: any;
    }
  | {
      id: string;
      type: "line";
      points: LinePoint[]; // uses points for geometry
      style?: {
        strokeColor?: string;
        strokeWidth?: number;
        dash?: number;
      };
      blockStyle?: any;
    }
  | {
      id: string;
      type: "divider";
      rect: Rect; // divider uses rect height as thickness
      style?: {
        strokeColor?: string;
        strokeWidth?: number;
        dash?: number;
      };
      blockStyle?: any;
    }
  | {
      id: string;
      type: "rect" | "ellipse";
      rect: Rect;
      rotation?: number;
      style?: {
        strokeColor?: string;
        strokeWidth?: number;
        dash?: number;
        fillColor?: string;
      };
      blockStyle?: any;
    };

function pct(n: number) {
  return `${n}%`;
}

function Frame({
  rect, active, children, overflowVisible = false,
}: { rect: Rect; active: boolean; children: React.ReactNode; overflowVisible?: boolean }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x), top: pct(rect.y),
    width: pct(rect.w), height: pct(rect.h),
    border: active ? "2px solid #3b82f6" : "1px dashed #e5e7eb",
    boxShadow: active ? "0 0 0 3px rgba(59,130,246,0.2)" : undefined,
    padding: 8,
    overflow: overflowVisible ? "visible" : "hidden",
    background: "rgba(255,255,255,0.9)",
    borderRadius: 4,
  };
  return <div style={style}>{children}</div>;
}

export default function Canvas() {
  const {
    draft,
    template,
    pageIndex,
    setValue,
    zoom,
    findings,
    insertImageAtPoint,
    guide,
    selectedBlockId,
    setSelectedBlock,
    guideNext,
    // history
    undo, redo,
    // Elements tool + user blocks
    tool,
    placeUserBlock,
    selectUserBlock,
    selectedUserBlockId,
    updateUserBlock,
    setLinePoints,
    deleteUserBlock,
    cancelInsert,
  } = useEditor();

  const pageRef = useRef<HTMLDivElement>(null);

  // Sticky toolbars, avoid header overlap (dynamic)
  const getHeaderH = () =>
    (document.querySelector("[data-app-header]") as HTMLElement)?.offsetHeight ?? 56;

  const TOOLBAR_GAP = 0; // px gap below header/page top
  const [toolbarTop, setToolbarTop] = useState(getHeaderH() + TOOLBAR_GAP);

  useEffect(() => {
    const updateTop = () => {
      const headerH = getHeaderH();
      const pageTop = pageRef.current?.getBoundingClientRect().top ?? 0;
      setToolbarTop(Math.max(headerH + TOOLBAR_GAP, pageTop + TOOLBAR_GAP));
    };
    updateTop();
    window.addEventListener("scroll", updateTop, { passive: true });
    window.addEventListener("resize", updateTop);
    return () => {
      window.removeEventListener("scroll", updateTop);
      window.removeEventListener("resize", updateTop);
    };
  }, []);

  // drag state for simple text boxes (legacy)
  const dragRef = useRef<{
    mode: "move" | "resize-tl" | "resize-right";
    id: string;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);
  const prevCursorRef = useRef<string>("");

  // rotation HUD state (generic target)
  const [rotHUD, setRotHUD] = useState<{
    active: boolean;
    deg: number;
    cursor: { x: number; y: number };
    targetId?: string;
  }>({ active: false, deg: 0, cursor: { x: 0, y: 0 }, targetId: undefined });

  // track per-block image load errors so we can show a placeholder
  const imgErrorRef = useRef<Record<string, boolean>>({});
  const [, forceRepaint] = useState(0); // simple re-render trigger

  // hover gate so lines don't steal focus when over text
  const [overText, setOverText] = useState(false);

  // line drag state
  const lineDragRef = useRef<{
    id: string;
    mode: "p1" | "p2" | "move" | "rotate";
    startX: number;
    startY: number;
    startP1: LinePoint;
    startP2: LinePoint;
    center: LinePoint;
    startCursorAngle?: number;
  } | null>(null);

  // rect drag state (move / resize / rotate in local coordinates)
  const rectDragRef = useRef<{
    id: string;
    mode:
      | "move"
      | "rotate"
      | "n" | "s" | "e" | "w"
      | "ne" | "nw" | "se" | "sw";
    startX: number;
    startY: number;
    startRect: Rect;
    startRotation: number; // degrees
    center: { x: number; y: number }; // in %
    startCursorAngle?: number; // radians
  } | null>(null);

  const PAGE_W = 820;
  const PAGE_H = 1160;
  const MIN_W = 6; // %
  const MIN_H = 6; // %

  // Binding context
  const ctx = useMemo(
    () => ({
      run: (draft as any)?.payload?.meta ?? {},
      draft: draft as any,
      findings: (findings as any[]) ?? [],
    }),
    [draft, findings]
  );

  // DEV: expose live binding context for console testing
  useEffect(() => {
    (window as any).__dr = {
      draft,
      findings,
      run: (draft as any)?.payload?.meta ?? {},
    };
  }, [draft, findings]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DR_MEDIA_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!pageRef.current) return;
      const raw = e.dataTransfer.getData(DR_MEDIA_MIME);
      if (!raw) return;
      e.preventDefault();

      let payload: { draftId: string; id: string; url: string; filename?: string; kind?: string } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
      if (!payload) return;
      if (!draft?.id || payload.draftId !== draft.id) return;

      const rect = pageRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const nx = Math.max(0, Math.min(100, (px / PAGE_W) * 100));
      const ny = Math.max(0, Math.min(100, (py / PAGE_H) * 100));

      const pageInstance = draft.pageInstances?.[pageIndex];
      if (!pageInstance) return;

      const ok = insertImageAtPoint?.(pageInstance.id, { x: nx, y: ny }, { id: payload.id, url: payload.url, filename: payload.filename || "", kind: payload.kind || "image" });
      if (!ok) {
        const tPage = template?.pages.find((p: { id: string }) => p.id === pageInstance.templatePageId);
        const firstImg = (tPage?.blocks || []).find((b: any) => b.type === "image_slot") as BlockImage | undefined;
        if (firstImg) {
          setValue(pageInstance.id, firstImg.id, payload.url);
          if (guide?.enabled && selectedBlockId === firstImg.id) guideNext();
        }
      }
    },
    [draft?.id, pageIndex, insertImageAtPoint, setValue, template?.pages, guide?.enabled, selectedBlockId, guideNext]
  );

  // Click-to-place for Elements insert mode
  const onCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool.mode !== "insert") return;
      if (!pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const nx = Math.max(0, Math.min(100, (px / rect.width) * 100));
      const ny = Math.max(0, Math.min(100, (py / rect.height) * 100));

      // Default size for text box (shapes will be wired once store supports them)
      const w = 40;
      const h = 8;
      const x = Math.min(nx, 100 - w);
      const y = Math.min(ny, 100 - h);

      placeUserBlock({ x, y, w, h });
    },
    [tool.mode, placeUserBlock]
  );

  const onCanvasBackgroundMouseDown = useCallback(
    () => {
      if (tool.mode === "insert") return;
      selectUserBlock(null);
    },
    [tool.mode, selectUserBlock]
  );

  // Global key handlers
  useEffect(() => {
    function isTypingInEditable(): boolean {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA";
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (tool.mode === "insert") {
          e.preventDefault();
          cancelInsert();
        } else if (selectedUserBlockId) {
          selectUserBlock(null);
        }
        return;
      }

      if (isTypingInEditable()) return;

      // Global Undo / Redo
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !e.metaKey && !e.ctrlKey) {
        if (selectedUserBlockId) {
          e.preventDefault();
          deleteUserBlock(selectedUserBlockId);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool.mode, selectedUserBlockId, cancelInsert, selectUserBlock, deleteUserBlock, undo, redo]);

  // Drag engine for legacy text block moves/resizes
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d || !pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - d.startY) / rect.height) * 100;

      let { x, y, w, h } = d.startRect;

      if (d.mode === "move") {
        x = x + dxPct;
        y = y + dyPct;
      } else if (d.mode === "resize-right") {
        w = w + dxPct;
      } else if (d.mode === "resize-tl") {
        // anchor bottom-right
        x = x + dxPct;
        y = y + dyPct;
        w = w - dxPct;
        h = h - dyPct;
      }

      // enforce min sizes and bounds
      w = Math.max(MIN_W, w);
      h = Math.max(MIN_H, h);
      if (x < 0) {
        w += x; x = 0;
      }
      if (y < 0) {
        h += y; y = 0;
      }
      if (x + w > 100) w = 100 - x;
      if (y + h > 100) h = 100 - y;
      w = Math.max(MIN_W, w);
      h = Math.max(MIN_H, h);

      updateUserBlock(d.id, { rect: { x, y, w, h } });
    }

    function onUp() {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = prevCursorRef.current || "";
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateUserBlock]);

  function normalizeDeg(deg: number) {
    let d = ((deg + 180) % 360 + 360) % 360 - 180; // [-180,180)
    if (d === -180) d = 180;
    return d;
  }
  function snapDeg(deg: number) {
    // smart snap to 0 / ±90 within 2°
    const targets = [0, 90, -90];
    for (const t of targets) {
      if (Math.abs(deg - t) < 2) return t;
    }
    return deg;
  }

  // Drag engine for line endpoints / move / rotate
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = lineDragRef.current;
      if (!d || !pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - d.startY) / rect.height) * 100;

      const { id, mode, startP1, startP2, center } = d;

      if (mode === "p1" || mode === "p2") {
        const np1 = mode === "p1" ? { x: startP1.x + dxPct, y: startP1.y + dyPct } : startP1;
        const np2 = mode === "p2" ? { x: startP2.x + dxPct, y: startP2.y + dyPct } : startP2;
        setLinePoints(id, [np1, np2]);
        return;
      }

      if (mode === "move") {
        setLinePoints(id, [
          { x: startP1.x + dxPct, y: startP1.y + dyPct },
          { x: startP2.x + dxPct, y: startP2.y + dyPct },
        ]);
        return;
      }

      if (mode === "rotate") {
        // compute current cursor angle around center in % space
        const nxPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const nyPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const curAngle = Math.atan2(nyPct - center.y, nxPct - center.x);
        const delta = curAngle - (d.startCursorAngle || 0);

        // rotate original endpoints by delta
        const cos = Math.cos(delta);
        const sin = Math.sin(delta);
        const rot = (pt: LinePoint): LinePoint => {
          const dx = pt.x - center.x;
          const dy = pt.y - center.y;
          return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
        };
        let np1 = rot(startP1);
        let np2 = rot(startP2);

        // compute angle of new line for HUD
        let deg = Math.atan2(np2.y - np1.y, np2.x - np1.x) * (180 / Math.PI);
        deg = normalizeDeg(deg);

        // snapping
        if (e.shiftKey) {
          const snapped15 = Math.round(deg / 15) * 15;
          let desired = snapDeg(snapped15);
          desired = normalizeDeg(desired);
          // adjust points to match desired exactly
          const diffRad = (desired - deg) * (Math.PI / 180);
          const c2 = Math.cos(diffRad);
          const s2 = Math.sin(diffRad);
          const rot2 = (pt: LinePoint): LinePoint => {
            const dx = pt.x - center.x;
            const dy = pt.y - center.y;
            return { x: center.x + dx * c2 - dy * s2, y: center.y + dx * s2 + dy * c2 };
          };
          np1 = rot2(np1);
          np2 = rot2(np2);
          deg = desired;
        }

        setLinePoints(id, [np1, np2]);

        // update rotation HUD near cursor inside page
        setRotHUD({
          active: true,
          deg: Math.round(deg),
          cursor: { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 },
          targetId: id,
        });
      }
    }

    function onUp() {
      if (lineDragRef.current) {
        const wasRotate = lineDragRef.current.mode === "rotate";
        lineDragRef.current = null;
        document.body.style.cursor = prevCursorRef.current || "";
        if (wasRotate) setRotHUD((s) => ({ ...s, active: false, targetId: undefined }));
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setLinePoints]);

  function startDrag(mode: "move" | "resize-tl" | "resize-right", id: string, rect: Rect, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, id, startX: e.clientX, startY: e.clientY, startRect: rect };
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = mode === "move" ? "move" : mode === "resize-right" ? "ew-resize" : "nwse-resize";
    selectUserBlock(id);
  }

  function startLineDrag(
    mode: "p1" | "p2" | "move" | "rotate",
    id: string,
    p1: LinePoint,
    p2: LinePoint,
    e: React.MouseEvent
  ) {
    e.preventDefault();
    e.stopPropagation();
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    lineDragRef.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startP1: { ...p1 },
      startP2: { ...p2 },
      center,
      startCursorAngle:
        mode === "rotate"
          ? Math.atan2(
              // current cursor vs center in %
              (() => {
                const r = pageRef.current!.getBoundingClientRect();
                const ny = ((e.clientY - r.top) / r.height) * 100 - center.y;
                return ny;
              })(),
              (() => {
                const r = pageRef.current!.getBoundingClientRect();
                const nx = ((e.clientX - r.left) / r.width) * 100 - center.x;
                return nx;
              })()
            )
          : undefined,
    };
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = mode === "rotate" ? "grabbing" : "move";
    selectUserBlock(id);

    if (mode === "rotate") {
      // seed HUD with current angle
      const deg0 = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
      if (pageRef.current) {
        const rect = pageRef.current.getBoundingClientRect();
        setRotHUD({
          active: true,
          deg: Math.round(normalizeDeg(deg0)),
          cursor: { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 },
          targetId: id,
        });
      }
    }
  }

  // helpers for rect drag
  function startRectDrag(
    mode: "move" | "rotate" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
    id: string,
    rect: Rect,
    rotation: number,
    e: React.MouseEvent
  ) {
    e.preventDefault();
    e.stopPropagation();
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    rectDragRef.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...rect },
      startRotation: rotation || 0,
      center,
      startCursorAngle:
        mode === "rotate"
          ? (() => {
              const r = pageRef.current!.getBoundingClientRect();
              const nx = ((e.clientX - r.left) / r.width) * 100;
              const ny = ((e.clientY - r.top) / r.height) * 100;
              return Math.atan2(ny - center.y, nx - center.x);
            })()
          : undefined,
    };
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = mode === "rotate" ? "grabbing" : mode === "move" ? "move" : "nwse-resize";
    selectUserBlock(id);

    if (mode === "rotate") {
      if (pageRef.current) {
        const r = pageRef.current.getBoundingClientRect();
        setRotHUD({
          active: true,
          deg: Math.round(normalizeDeg(rotation || 0)),
          cursor: { x: e.clientX - r.left + 12, y: e.clientY - r.top + 12 },
          targetId: id,
        });
      }
    }
  }

  function renderBoundText(raw?: string) {
    if (!raw) return "";
    try {
      return renderString(raw, ctx);
    } catch {
      return "";
    }
  }

  function renderRepeater(b: BlockRepeater) {
    const rows = b.bind ? select(b.bind, ctx) : [];
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) {
      const count = Number((b.options?.previewCount ?? 0) as number);
      if (!count) return <div className="text-gray-400">No items.</div>;
      return (
        <div className="w-full h-full overflow-auto space-y-2 text-xs text-gray-600">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="border rounded p-2">
              Repeater preview #{i + 1}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="w-full h-full overflow-auto space-y-3">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="border rounded p-2">
            {(b.children || []).map((ch, ci) => {
              if (ch.type === "text") {
                const v = renderString(ch.value || "", { ...ctx, item });
                return (
                  <div key={ci} className="text-xs mb-1 whitespace-pre-wrap">
                    {v}
                  </div>
                );
              }
              if (ch.type === "image_slot") {
                const src = renderString((ch as any).source || "", { ...ctx, item });
                return src ? (
                  <img key={ci} src={src} className="w-full h-40 object-contain border rounded" />
                ) : (
                  <div key={ci} className="text-xs text-gray-400 border rounded h-40 grid place-items-center">
                    No image
                  </div>
                );
              }
              if (ch.type === "badge") {
                const lbl = renderString((ch as any).label || "", { ...ctx, item });
                return (
                  <span key={ci} className="inline-block px-2 py-1 rounded text-[11px] bg-amber-200 text-amber-900 mr-2">
                    {lbl}
                  </span>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
    );
  }

  // Rect drag engine (move / resize / rotate)
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = rectDragRef.current;
      if (!d || !pageRef.current) return;

      const rectEl = pageRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - d.startX) / rectEl.width) * 100;
      const dyPct = ((e.clientY - d.startY) / rectEl.height) * 100;

      const { id, mode, startRect, startRotation, center } = d;

      // Helpers
      const clamp01 = (v: number) => Math.max(0, Math.min(100, v));
      const clampRect = (r: Rect): Rect => {
        let x = clamp01(r.x);
        let y = clamp01(r.y);
        let w = Math.max(MIN_W, r.w);
        let h = Math.max(MIN_H, r.h);
        if (x + w > 100) w = 100 - x;
        if (y + h > 100) h = 100 - y;
        return { x, y, w, h };
      };

      if (mode === "move") {
        const nx = startRect.x + dxPct;
        const ny = startRect.y + dyPct;
        updateUserBlock(id, { rect: clampRect({ x: nx, y: ny, w: startRect.w, h: startRect.h }) });
        return;
      }

      if (mode === "rotate") {
        // current cursor angle in % space
        const nxPct = Math.max(0, Math.min(100, ((e.clientX - rectEl.left) / rectEl.width) * 100));
        const nyPct = Math.max(0, Math.min(100, ((e.clientY - rectEl.top) / rectEl.height) * 100));
        const curAngle = Math.atan2(nyPct - center.y, nxPct - center.x);
        const startAngle = d.startCursorAngle || 0;
        let deg = (startRotation + (curAngle - startAngle) * (180 / Math.PI));

        // snap if Shift: to 0/15/30... and encourage 0/±90
        if (e.shiftKey) {
          let snapped = Math.round(deg / 15) * 15;
          // subtle snap to 0 / ±90 within 2°
          const specials = [0, 90, -90, 180, -180];
          for (const s of specials) {
            if (Math.abs(snapped - s) < 2) snapped = s;
          }
          deg = snapped;
        }

        const norm = ((deg + 180) % 360 + 360) % 360 - 180;
        setRotHUD({
          active: true,
          deg: Math.round(norm),
          cursor: { x: e.clientX - rectEl.left + 12, y: e.clientY - rectEl.top + 12 },
          targetId: id,
        });
        updateUserBlock(id, { rotation: norm as unknown as any }); // rotation is stored on block
        return;
      }

      // Resize in canvas axes (axis-aligned). Simpler MVP.
      let x = startRect.x;
      let y = startRect.y;
      let w = startRect.w;
      let h = startRect.h;

      const hasN = mode === "n" || mode === "ne" || mode === "nw";
      const hasS = mode === "s" || mode === "se" || mode === "sw";
      const hasE = mode === "e" || mode === "ne" || mode === "se";
      const hasW = mode === "w" || mode === "nw" || mode === "sw";

      if (hasE) w = startRect.w + dxPct;
      if (hasS) h = startRect.h + dyPct;
      if (hasW) { x = startRect.x + dxPct; w = startRect.w - dxPct; }
      if (hasN) { y = startRect.y + dyPct; h = startRect.h - dyPct; }

      // enforce minimums by pinning the moving edge
      if (w < MIN_W) {
        if (hasW) x = x - (MIN_W - w);
        w = MIN_W;
      }
      if (h < MIN_H) {
        if (hasN) y = y - (MIN_H - h);
        h = MIN_H;
      }

      updateUserBlock(id, { rect: clampRect({ x, y, w, h }) });
    }

    function onUp() {
      if (rectDragRef.current) {
        const wasRotate = rectDragRef.current.mode === "rotate";
        rectDragRef.current = null;
        document.body.style.cursor = prevCursorRef.current || "";
        if (wasRotate) setRotHUD((s) => ({ ...s, active: false, targetId: undefined }));
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateUserBlock]);

  // -------- Render branches --------
  if (!draft) return <div className="p-6 text-gray-500">Loading editor…</div>;

  if (!template) {
    function openTemplateDropdown() {
      window.dispatchEvent(new CustomEvent("open-template-dropdown"));
    }
    return (
      <div className="w-full flex items-center justify-center bg-neutral-100 p-12">
        <div className="bg-white border rounded shadow-sm p-6 max-w-xl text-center">
          <div className="text-lg font-medium mb-2">Select a template to start</div>
          <p className="text-sm text-gray-600 mb-4">The workspace will populate with the template’s page stack.</p>
          <div className="flex items-center justify-center">
            <button onClick={openTemplateDropdown} className="px-3 py-2 border rounded hover:bg-gray-50">
              Pick a template
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">You can change templates later.</p>
        </div>
      </div>
    );
  }

  const pageInstance = draft.pageInstances?.[pageIndex];
  if (!pageInstance) return <div className="p-6 text-gray-500">No page to display</div>;

  const tPage = template.pages.find((p: any) => p.id === pageInstance.templatePageId);
  if (!tPage) return <div className="p-6 text-gray-500">Template page not found</div>;

  const blocks = (tPage.blocks ?? []) as Block[];
  const userBlocks: UserBlock[] = Array.isArray((pageInstance as any).userBlocks)
    ? ((pageInstance as any).userBlocks as UserBlock[])
    : [];

  const activeTextBlock =
    selectedUserBlockId
      ? (userBlocks.find(b => b.id === selectedUserBlockId && b.type === "text") as Extract<UserBlock, { type: "text" }> | undefined)
      : undefined;

  const activeShapeBlock =
    selectedUserBlockId
      ? (userBlocks.find(b =>
          b.id === selectedUserBlockId && (b.type === "line" || b.type === "rect" || b.type === "ellipse" || b.type === "divider")
        ) as Extract<UserBlock, { type: "line" | "rect" | "ellipse" | "divider" }> | undefined)
      : undefined;

  // Reserve vertical space when a toolbar is visible (no longer used for layout; kept for reference)
  const showToolbar = !!activeTextBlock || !!activeShapeBlock;

  return (
    <div className="w-full flex items-start justify-center bg-neutral-100 p-6">
      <div
        className="relative"
        style={{
          width: PAGE_W * zoom,
          height: PAGE_H * zoom,
        }}
      >
        {/* Sticky (fixed) toolbars */}
        {activeTextBlock && (
          <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ top: toolbarTop }}>
            <TextToolbar blockId={activeTextBlock.id} style={activeTextBlock.style || {}} />
          </div>
        )}
        {activeShapeBlock && (
          <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ top: toolbarTop }}>
            <ShapeToolbar
              blockId={activeShapeBlock.id}
              kind={activeShapeBlock.type as "line" | "rect" | "ellipse" | "divider"}
              style={(activeShapeBlock as any).blockStyle ?? (activeShapeBlock as any).style}
            />
          </div>
        )}
        <div
          ref={pageRef}
          className="relative bg-white shadow"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            cursor: tool.mode === "insert" ? "crosshair" : "default",
          }}
          onMouseDown={onCanvasBackgroundMouseDown}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onCanvasClick}
          onMouseLeave={() => setOverText(false)}
        >
          {/* Rotation HUD */}
          {rotHUD.active && (
            <div
              style={{
                position: "absolute",
                left: rotHUD.cursor.x,
                top: rotHUD.cursor.y,
                padding: "4px 6px",
                fontSize: 12,
                borderRadius: 6,
                background: "rgba(17,24,39,0.92)",
                color: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                pointerEvents: "none",
                zIndex: 40,
              }}
            >
              {rotHUD.deg}°
            </div>
          )}

          {/* Template blocks */}
          {blocks.map((b: Block) => {
            const v = (pageInstance.values as any)?.[b.id];
            const active = !!guide?.enabled && selectedBlockId === b.id;

            switch (b.type) {
              case "image_slot": {
                const boundSrc = (b as BlockImage).source ? renderBoundText((b as BlockImage).source) : "";
                const vStr = typeof v === "string" ? v : "";
                const boundFromValue = vStr.includes("{{") ? renderBoundText(vStr) : "";
                const url = boundSrc || boundFromValue || vStr;

                const isBinding = !!((b as BlockImage).source) || vStr.includes("{{");
                const failed = !!imgErrorRef.current[b.id];

                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    {url && !failed ? (
                      <img
                        src={url}
                        alt={b.id}
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedBlock(b.id)}
                        onLoad={() => {
                          if (imgErrorRef.current[b.id]) {
                            delete imgErrorRef.current[b.id];
                            forceRepaint((n) => n + 1);
                          }
                        }}
                        onError={() => {
                          imgErrorRef.current[b.id] = true;
                          forceRepaint((n) => n + 1);
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full grid place-items-center text-center text-sm text-gray-500 cursor-pointer"
                        onClick={() => setSelectedBlock(b.id)}
                        style={{
                          background:
                            "repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 16px 16px",
                          borderRadius: 4,
                        }}
                      >
                        <div>
                          <div className="font-medium mb-1">
                            {failed ? "Image failed to load" : isBinding ? "No image (binding empty)" : "Click to add image"}
                          </div>
                          <label className="inline-block mt-1 px-2 py-1 border rounded hover:bg-gray-50">
                            Upload…
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const localUrl = URL.createObjectURL(file);
                                setValue(pageInstance.id, b.id, localUrl);
                                if (active) guideNext();
                                if (imgErrorRef.current[b.id]) {
                                  delete imgErrorRef.current[b.id];
                                  forceRepaint((n) => n + 1);
                                }
                              }}
                            />
                          </label>
                          {isBinding && (
                            <div className="text-[11px] text-gray-400 mt-2">
                              Value comes from <code>{"{{"}</code>binding<code>{"}}"}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Frame>
                );
              }

              case "text": {
                const vStr = typeof v === "string" ? v : "";
                const tplBinding = typeof (b as BlockText).value === "string" ? (b as BlockText).value : "";
                const runtimeBinding = vStr.includes("{{") ? vStr : "";
                const hasBinding = !!tplBinding || !!runtimeBinding;
                const content = hasBinding
                  ? renderBoundText(tplBinding || runtimeBinding)
                  : (vStr || b.placeholder || "");
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    {hasBinding ? (
                      <div className="w-full h-full text-sm whitespace-pre-wrap" onClick={() => setSelectedBlock(b.id)}>
                        {content}
                      </div>
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full h-full outline-none"
                        onFocus={() => setSelectedBlock(b.id)}
                        onBlur={(e) => {
                          setValue(pageInstance.id, b.id, e.currentTarget.textContent || "");
                          if (active) guideNext();
                        }}
                      >
                        {content}
                      </div>
                    )}
                  </Frame>
                );
              }

              case "badge": {
                const val = v && typeof v === "object" ? (v as { label?: string; color?: string }) : {};
                const color = val.color || "gray";
                const label = val.label || "Badge";
                const palette: Record<string, string> = {
                  gray: "bg-gray-200 text-gray-800",
                  blue: "bg-blue-200 text-blue-800",
                  amber: "bg-amber-200 text-amber-900",
                  red: "bg-red-200 text-red-800",
                  green: "bg-green-200 text-green-800",
                };
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    <span className={`inline-block px-2 py-1 rounded text-xs ${palette[color] || palette.gray}`}>{label}</span>
                  </Frame>
                );
              }

              case "table": {
                const rows: any[] = Array.isArray(v) ? v : [];
                const cols = (b.options?.columns ?? []) as { key: string; label: string }[];
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    <div className="overflow-auto w-full h-full">
                      <table className="min-w-full text-xs border">
                        <thead className="bg-gray-50">
                          <tr>{cols.map((c) => (<th key={c.key} className="px-2 py-1 text-left border-b">{c.label}</th>))}</tr>
                        </thead>
                        <tbody>
                          {rows.map((r, ri) => (
                            <tr key={ri} className="border-b align-top">
                              {cols.map((c) => (<td key={c.key} className="px-2 py-1">{r?.[c.key] ?? ""}</td>))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Frame>
                );
              }

              case "repeater": {
                return (
                  <Frame key={b.id} rect={b.rect} active={active}>
                    {renderRepeater(b as BlockRepeater)}
                  </Frame>
                );
              }
            }
            return null;
          })}

          {/* User elements with move + resize handles */}
          {userBlocks.map((ub, i) => {
            const active = selectedUserBlockId === ub.id;
            
            // Text always above shapes; keep per-type z within its lane
            const baseZ = ub.type === "text" ? 1000 : 0;
            const zIndex = baseZ + ((ub as any).z ?? i);

            if (ub.type === "text") {
              const st = (ub as any).style || {};
              const textareaStyle: React.CSSProperties = {
                color: st.color,
                fontFamily: st.fontFamily,
                fontSize: st.fontSize ? `${st.fontSize}px` : undefined,
                fontWeight: st.bold ? (700 as React.CSSProperties["fontWeight"]) : 400,
                fontStyle: st.italic ? "italic" : "normal",
                textDecoration: st.underline ? "underline" : "none",
                lineHeight: st.lineHeight ? String(st.lineHeight) : undefined,
                letterSpacing: st.letterSpacing != null ? `${st.letterSpacing}px` : undefined,
                textAlign: st.align || "left",
                unicodeBidi: "plaintext",
              };

              const rawVal = typeof (ub as any).value === "string" ? (ub as any).value : "";
              const isBinding = rawVal.includes("{{");
              const displayVal = isBinding ? renderString(rawVal, ctx) : rawVal;

              return (
                <Frame key={ub.id} rect={(ub as any).rect} active={active} overflowVisible>
                  <div
                    style={{ position: "relative", width: "100%", height: "100%", zIndex }}
                    onMouseEnter={() => setOverText(true)}
                    onMouseLeave={() => setOverText(false)}
                  >
                    <textarea
                      className="w-full h-full outline-none resize-none bg-transparent"
                      dir="ltr"
                      style={textareaStyle}
                      value={displayVal}
                      readOnly={isBinding}
                      onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                      onFocus={() => selectUserBlock(ub.id)}
                      onChange={(e) => {
                        if (isBinding) return;
                        updateUserBlock(ub.id, { value: e.target.value });
                      }}
                      title={isBinding ? "Bound: resolves from context" : undefined}
                    />
                    {active && (
                      <>
                        <div
                          title="Resize"
                          onMouseDown={(e) => startDrag("resize-tl", ub.id, (ub as any).rect, e)}
                          style={{
                            position: "absolute", left: -10, top: -10,
                            width: 16, height: 16, borderRadius: 9999,
                            background: "#fff", border: "1px solid #94a3b8",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            cursor: "nwse-resize", zIndex: zIndex + 1,
                          }}
                        />
                        <div
                          title="Resize width"
                          onMouseDown={(e) => startDrag("resize-right", ub.id, (ub as any).rect, e as any)}
                          style={{
                            position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
                            width: 12, height: 20, borderRadius: 4,
                            background: "#fff", border: "1px solid #94a3b8",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            cursor: "ew-resize", zIndex: zIndex + 1,
                          }}
                        />
                        <div
                          title="Move"
                          onMouseDown={(e) => startDrag("move", ub.id, (ub as any).rect, e as any)}
                          style={{
                            position: "absolute", left: "50%", bottom: -28, transform: "translateX(-50%)",
                            width: 28, height: 28, borderRadius: 9999,
                            background: "#fff", border: "1px solid #94a3b8",
                            display: "grid", placeItems: "center",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            cursor: "move", userSelect: "none", fontSize: 14,
                            zIndex: zIndex + 1,
                          }}
                        >⤧</div>
                      </>
                    )}
                  </div>
                </Frame>
              );
            }

            if (ub.type === "line") {
              const bs = ((ub as any).blockStyle || {}) as any;
              const st = (ub as any).style || {};
              const stroke = bs?.stroke?.color?.hex || st.strokeColor || "#111827";
              const strokeW = Number.isFinite(bs?.stroke?.width) ? bs.stroke.width : Number.isFinite(st.strokeWidth) ? st.strokeWidth : 2;
              const dashArr = Array.isArray(bs?.stroke?.dash) ? bs.stroke.dash : (Number.isFinite(st.dash) && st.dash > 0 ? [st.dash, st.dash] : []);
              const p = Array.isArray((ub as any).points) ? ((ub as any).points as LinePoint[]) : [];
              const isActive = selectedUserBlockId === ub.id;
              const isRotatingThis = rotHUD.active && rotHUD.targetId === ub.id;

              if (p.length < 2) {
                return (
                  <div
                    key={ub.id}
                    style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", zIndex }}
                    onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                  />
                );
              }

              const p1 = p[0];
              const p2 = p[p.length - 1];
              const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

              return (
                <React.Fragment key={ub.id}>
                  <svg
                    style={{
                      position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
                      zIndex,
                      pointerEvents: overText ? "none" : "auto",
                    }}
                  >
                    <line
                      x1={pct(p1.x)} y1={pct(p1.y)}
                      x2={pct(p2.x)} y2={pct(p2.y)}
                      stroke="black"
                      strokeOpacity={0}
                      pointerEvents="stroke"
                      strokeWidth={Math.max(16, strokeW * 3)}
                      onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                    />
                    <line
                      x1={pct(p1.x)} y1={pct(p1.y)}
                      x2={pct(p2.x)} y2={pct(p2.y)}
                      stroke={stroke}
                      strokeWidth={strokeW}
                      strokeDasharray={dashArr && dashArr.length ? dashArr.join(",") : undefined}
                      strokeLinecap="round"
                      style={{ pointerEvents: "none" }}
                    />
                    {isActive && !isRotatingThis && (
                      <>
                        <circle
                          cx={pct(p1.x)} cy={pct(p1.y)} r={8}
                          fill="#fff" stroke="#94a3b8"
                          onMouseDown={(e) => startLineDrag("p1", ub.id, p1, p2, e)}
                          style={{ cursor: "grab" }}
                        />
                        <circle
                          cx={pct(p2.x)} cy={pct(p2.y)} r={8}
                          fill="#fff" stroke="#94a3b8"
                          onMouseDown={(e) => startLineDrag("p2", ub.id, p1, p2, e)}
                          style={{ cursor: "grab" }}
                        />
                      </>
                    )}
                  </svg>
                  {isActive && !isRotatingThis && (
                    <div
                      style={{
                        position: "absolute", left: pct(mid.x), top: `calc(${pct(mid.y)} + 22px)`,
                        transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: zIndex + 1,
                      }}
                    >
                      <div
                        title="Rotate"
                        onMouseDown={(e) => startLineDrag("rotate", ub.id, p1, p2, e)}
                        style={{
                          width: 28, height: 28, borderRadius: 9999,
                          background: "#fff", border: "1px solid #94a3b8",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          display: "grid", placeItems: "center", cursor: "grab",
                          userSelect: "none", fontSize: 14,
                        }}
                      >↻</div>
                      <div
                        title="Move"
                        onMouseDown={(e) => startLineDrag("move", ub.id, p1, p2, e)}
                        style={{
                          width: 28, height: 28, borderRadius: 9999,
                          background: "#fff", border: "1px solid #94a3b8",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          display: "grid", placeItems: "center", cursor: "move",
                          userSelect: "none", fontSize: 14,
                        }}
                      >⤧</div>
                    </div>
                  )}
                </React.Fragment>
              );
            }

            if (ub.type === "divider") {
              const bs = ((ub as any).blockStyle || {}) as any;
              const st = (ub as any).style || {};
              const stroke = bs?.stroke?.color?.hex || st.strokeColor || "#111827";
              const strokeW = Number.isFinite(bs?.stroke?.width) ? bs.stroke.width : Number.isFinite(st.strokeWidth) ? st.strokeWidth : 2;
              const dash = Array.isArray(bs?.stroke?.dash) && bs.stroke.dash.length ? bs.stroke.dash[0] : (Number.isFinite(st.dash) ? st.dash : 0);
              const r = (ub as any).rect as Rect;
              return (
                <div
                  key={ub.id}
                  style={{
                    position: "absolute", left: pct(r.x),
                    top: pct(r.y + r.h / 2 - (strokeW / PAGE_H) * 50),
                    width: pct(r.w), height: Math.max(1, strokeW),
                    background: dash ? "transparent" : stroke,
                    borderTop: dash ? `${strokeW}px dashed ${stroke}` : undefined,
                    cursor: "default", zIndex,
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                />
              );
            }

            if (ub.type === "rect" || ub.type === "ellipse") {
              const bs = ((ub as any).blockStyle || {}) as any;
              const st = (ub as any).style || {};
              const stroke = (bs?.stroke?.color?.hex as string) || st.strokeColor || "#111827";
              const strokeW = Number.isFinite(bs?.stroke?.width) ? bs.stroke.width : Number.isFinite(st.strokeWidth) ? st.strokeWidth : 1;
              const dash = Array.isArray(bs?.stroke?.dash) && bs.stroke.dash.length ? bs.stroke.dash[0] : (Number.isFinite(st.dash) ? st.dash : 0);
              const fill = (bs?.fill?.hex as string) || st.fillColor || "transparent";
              const r = (ub as any).rect as Rect;
              const rotation = (ub as any).rotation || 0;
              const isRotatingThis = rotHUD.active && rotHUD.targetId === ub.id;

              return (
                <div
                  key={ub.id}
                  style={{
                    position: "absolute", left: pct(r.x), top: pct(r.y),
                    width: pct(r.w), height: pct(r.h),
                    border: `${strokeW}px ${dash ? "dashed" : "solid"} ${stroke}`,
                    background: fill,
                    borderRadius: ub.type === "ellipse" ? "50%" : 4,
                    transform: `rotate(${rotation}deg)`, transformOrigin: "center",
                    cursor: "default", zIndex,
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); selectUserBlock(ub.id); }}
                >
                  {active && !isRotatingThis && (
                    <>
                      {["nw","ne","sw","se","n","s","e","w"].map((dir) => (
                        <div
                          key={dir}
                          onMouseDown={(e) => startRectDrag(dir as any, ub.id, r, rotation, e)}
                          style={{
                            position: "absolute", width: 12, height: 12,
                            background: "#fff", border: "1px solid #94a3b8", borderRadius: 2,
                            zIndex: zIndex + 1,
                            ...(dir==="nw" ? { left: -8, top: -8, cursor: "nwse-resize"} :
                              dir==="ne" ? { right: -8, top: -8, cursor: "nesw-resize"} :
                              dir==="sw" ? { left: -8, bottom: -8, cursor: "nesw-resize"} :
                              dir==="se" ? { right: -8, bottom: -8, cursor: "nwse-resize"} :
                              dir==="n" ? { top: -8, left: "50%", transform:"translateX(-50%)", cursor:"ns-resize"} :
                              dir==="s" ? { bottom: -8, left: "50%", transform:"translateX(-50%)", cursor:"ns-resize"} :
                              dir==="e" ? { right: -8, top:"50%", transform:"translateY(-50%)", cursor:"ew-resize"} :
                              { left: -8, top:"50%", transform:"translateY(-50%)", cursor:"ew-resize"})
                          }}
                        />
                      ))}
                      <div
                        onMouseDown={(e)=>startRectDrag("move",ub.id,r,rotation,e)}
                        style={{
                          position:"absolute", left:"50%", bottom:-28, transform:"translateX(-50%)",
                          width:28, height:28, borderRadius:9999, background:"#fff", border:"1px solid #94a3b8",
                          display:"grid", placeItems:"center", boxShadow:"0 1px 2px rgba(0,0,0,0.08)", cursor:"move",
                          userSelect:"none", fontSize:14, zIndex: zIndex + 1,
                        }}
                      >⤧</div>
                      <div
                        onMouseDown={(e)=>startRectDrag("rotate",ub.id,r,rotation,e)}
                        style={{
                          position:"absolute", left:"50%", top:-40, transform:"translateX(-50%)",
                          width:28, height:28, borderRadius:9999, background:"#fff", border:"1px solid #94a3b8",
                          display:"grid", placeItems:"center", boxShadow:"0 1px 2px rgba(0,0,0,0.08)", cursor:"grab",
                          userSelect:"none", fontSize:14, zIndex: zIndex + 1,
                        }}
                      >↻</div>
                    </>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
