// client/src/editor/canvas/useCanvasEvents.ts
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };
type LinePoint = { x: number; y: number };

const DR_MEDIA_MIME = "application/x-dr-media";
const MIN_W = 6;
const MIN_H = 6;

function clamp01(n: number) { return Math.max(0, Math.min(100, n)); }
function normDeg(deg: number) { let d = ((deg + 180) % 360 + 360) % 360 - 180; return d === -180 ? 180 : d; }

export function useCanvasEvents(opts: {
  pageRef: RefObject<HTMLDivElement>;
  draft: any;
  template: any;
  pageIndex: number;
  insertImageAtPoint: any;
  setValue: any;
  guide: any;
  selectedBlockId: string | null;
  guideNext: any;
  tool: any;
  placeUserBlock: any;
  selectUserBlock: (id: string | null) => void;
  selectedUserBlockId: string | null;
  updateUserBlock: (id: string, patch: any) => void;
  setLinePoints: (id: string, pts: LinePoint[]) => void;
  deleteUserBlock: (id: string) => void;
  cancelInsert: () => void;
  undo: () => void;
  redo: () => void;
}) {
  const {
    pageRef, draft, template, pageIndex, insertImageAtPoint, setValue,
    guide, selectedBlockId, guideNext, tool, placeUserBlock, selectUserBlock,
    selectedUserBlockId, updateUserBlock, setLinePoints, deleteUserBlock, cancelInsert, undo, redo,
  } = opts;

  const dragRef = useRef<{
    mode: "move" | "resize-tl" | "resize-right"; id: string; startX: number; startY: number; startRect: Rect;
  } | null>(null);
  const lineDragRef = useRef<{
    id: string; mode: "p1" | "p2" | "move" | "rotate"; startX: number; startY: number;
    startP1: LinePoint; startP2: LinePoint; center: LinePoint; startCursorAngle?: number;
  } | null>(null);
  const rectDragRef = useRef<{
    id: string; mode: "move" | "rotate" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startX: number; startY: number; startRect: Rect; startRotation: number; center: { x: number; y: number };
    startCursorAngle?: number;
  } | null>(null);
  const prevCursorRef = useRef<string>("");

  const [rotHUD, setRotHUD] = useState({ active: false, deg: 0, cursor: { x: 0, y: 0 }, targetId: undefined as string | undefined });

  // Allow drop for our custom payload
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DR_MEDIA_MIME)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  // Drop handler
  const onDrop = useCallback((e: React.DragEvent) => {
    if (!pageRef.current) return;
    const raw = e.dataTransfer.getData(DR_MEDIA_MIME);
    if (!raw) return;

    e.preventDefault();
    e.stopPropagation();

    let payload: { draftId: string; id: string; url: string; filename?: string; kind?: string } | null = null;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    if (!payload) return;
    if (!draft?.id || payload.draftId !== draft.id) return;

    const rect = pageRef.current.getBoundingClientRect();
    const nx = clamp01(((e.clientX - rect.left) / rect.width) * 100);
    const ny = clamp01(((e.clientY - rect.top) / rect.height) * 100);

    const pageInstance = draft.pageInstances?.[pageIndex];
    if (!pageInstance) return;

    const ok = insertImageAtPoint?.(
      pageInstance.id,
      { x: nx, y: ny },
      { id: payload.id, url: payload.url, filename: payload.filename || "", kind: payload.kind || "image" }
    );

    if (!ok) {
      const tPage = template?.pages?.find((p: any) => p.id === pageInstance.templatePageId);
      const firstImg = (tPage?.blocks || []).find((b: any) => b.type === "image_slot");
      if (firstImg) {
        setValue(pageInstance.id, firstImg.id, payload.url);
        if (guide?.enabled && selectedBlockId === firstImg.id) guideNext();
      }
    }
  }, [draft?.id, pageIndex, insertImageAtPoint, setValue, template?.pages, guide?.enabled, selectedBlockId, guideNext, pageRef]);

  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (tool.mode !== "insert" || !pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const nx = clamp01(((e.clientX - rect.left) / rect.width) * 100);
    const ny = clamp01(((e.clientY - rect.top) / rect.height) * 100);

    // Lines: treat click as the center point. Do not pre-clamp to keep a rect inside.
    if (tool.kind === "line") {
      placeUserBlock({ x: nx, y: ny, w: 0, h: 0 });
      return;
    }

    // Other elements: use a sensible default box placed at click, clamped to fit.
    const w = 40, h = 8;
    placeUserBlock({ x: Math.min(nx, 100 - w), y: Math.min(ny, 100 - h), w, h });
  }, [tool.mode, tool.kind, placeUserBlock, pageRef]);

  const onCanvasBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    // Only deselect if the click target IS the background element itself
    if (e.currentTarget !== e.target) return;
    if (tool.mode === "insert") return;
    selectUserBlock(null);
  }, [tool.mode, selectUserBlock]);

  // Keyboard shortcuts
  useEffect(() => {
    function isTyping(): boolean {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { if (tool.mode === "insert") { e.preventDefault(); cancelInsert(); } else if (selectedUserBlockId) { selectUserBlock(null); } return; }
      if (isTyping()) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && !e.metaKey && !e.ctrlKey) {
        if (selectedUserBlockId) { e.preventDefault(); deleteUserBlock(selectedUserBlockId); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool.mode, selectedUserBlockId, cancelInsert, selectUserBlock, deleteUserBlock, undo, redo]);

  // Drag: simple blocks
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rect.width) * 100;
      const dy = ((e.clientY - d.startY) / rect.height) * 100;

      let { x, y, w, h } = d.startRect;
      if (d.mode === "move") { x += dx; y += dy; }
      else if (d.mode === "resize-right") { w += dx; }
      else if (d.mode === "resize-tl") { x += dx; y += dy; w -= dx; h -= dy; }

      w = Math.max(MIN_H, Math.max(MIN_W, w));
      h = Math.max(MIN_H, h);
      if (x < 0) { w += x; x = 0; }
      if (y < 0) { h += y; y = 0; }
      if (x + w > 100) w = 100 - x;
      if (y + h > 100) h = 100 - y;

      updateUserBlock(d.id, { rect: { x, y, w, h } });
    }
    function onUp() { if (dragRef.current) { dragRef.current = null; document.body.style.cursor = prevCursorRef.current || ""; } }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [updateUserBlock, pageRef]);

  // Drag: line
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = lineDragRef.current;
      if (!d || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rect.width) * 100;
      const dy = ((e.clientY - d.startY) / rect.height) * 100;

      const { id, mode, startP1, startP2, center } = d;

      if (mode === "p1" || mode === "p2") {
        const np1 = mode === "p1" ? { x: startP1.x + dx, y: startP1.y + dy } : startP1;
        const np2 = mode === "p2" ? { x: startP2.x + dx, y: startP2.y + dy } : startP2;
        setLinePoints(id, [np1, np2]); return;
      }

      if (mode === "move") {
        setLinePoints(id, [
          { x: startP1.x + dx, y: startP1.y + dy },
          { x: startP2.x + dx, y: startP2.y + dy },
        ]); return;
      }

      if (mode === "rotate") {
        const nx = clamp01(((e.clientX - rect.left) / rect.width) * 100);
        const ny = clamp01(((e.clientY - rect.top) / rect.height) * 100);
        const cur = Math.atan2(ny - center.y, nx - center.x);
        const delta = cur - (d.startCursorAngle || 0);

        const cos = Math.cos(delta), sin = Math.sin(delta);
        const rot = (pt: LinePoint): LinePoint => {
          const dx2 = pt.x - center.x, dy2 = pt.y - center.y;
          return { x: center.x + dx2 * cos - dy2 * sin, y: center.y + dx2 * sin + dy2 * cos };
        };
        let np1 = rot(startP1), np2 = rot(startP2);

        let deg = Math.atan2(np2.y - np1.y, np2.x - np1.x) * (180 / Math.PI);
        deg = normDeg(deg);

        if (e.shiftKey) {
          const snapped15 = Math.round(deg / 15) * 15;
          const specials = [0, 90, -90];
          let desired = specials.find((s) => Math.abs(snapped15 - s) < 2) ?? snapped15;
          const diffRad = (desired - deg) * (Math.PI / 180);
          const c2 = Math.cos(diffRad), s2 = Math.sin(diffRad);
          const rot2 = (pt: LinePoint): LinePoint => {
            const dx3 = pt.x - center.x, dy3 = pt.y - center.y;
            return { x: center.x + dx3 * c2 - dy3 * s2, y: center.y + dx3 * s2 + dy3 * c2 };
          };
          np1 = rot2(np1); np2 = rot2(np2); deg = desired;
        }

        setLinePoints(id, [np1, np2]);
        setRotHUD({ active: true, deg: Math.round(deg), cursor: { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 }, targetId: id });
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
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [setLinePoints, pageRef]);

  // Drag: rect/ellipse with rotation
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = rectDragRef.current;
      if (!d || !pageRef.current) return;
      const rEl = pageRef.current.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rEl.width) * 100;
      const dy = ((e.clientY - d.startY) / rEl.height) * 100;

      const { id, mode, startRect, startRotation, center } = d;

      const clampRect = (r: Rect): Rect => {
        let x = clamp01(r.x), y = clamp01(r.y), w = Math.max(MIN_W, r.w), h = Math.max(MIN_H, r.h);
        if (x + w > 100) w = 100 - x;
        if (y + h > 100) h = 100 - y;
        return { x, y, w, h };
      };

      if (mode === "move") {
        return void updateUserBlock(id, { rect: clampRect({ x: startRect.x + dx, y: startRect.y + dy, w: startRect.w, h: startRect.h }) });
      }

      if (mode === "rotate") {
        const nx = clamp01(((e.clientX - rEl.left) / rEl.width) * 100);
        const ny = clamp01(((e.clientY - rEl.top) / rEl.height) * 100);
        const cur = Math.atan2(ny - center.y, nx - center.x);
        const startA = d.startCursorAngle || 0;
        let deg = startRotation + (cur - startA) * (180 / Math.PI);

        if (e.shiftKey) {
          let snapped = Math.round(deg / 15) * 15;
          const specials = [0, 90, -90, 180, -180];
          for (const s of specials) if (Math.abs(snapped - s) < 2) snapped = s;
          deg = snapped;
        }

        const norm = normDeg(deg);
        setRotHUD({ active: true, deg: Math.round(norm), cursor: { x: e.clientX - rEl.left + 12, y: e.clientY - rEl.top + 12 }, targetId: id });
        return void updateUserBlock(id, { rotation: norm as any });
      }

      let x = startRect.x, y = startRect.y, w = startRect.w, h = startRect.h;
      const hasN = mode === "n" || mode === "ne" || mode === "nw";
      const hasS = mode === "s" || mode === "se" || mode === "sw";
      const hasE = mode === "e" || mode === "ne" || mode === "se";
      const hasW = mode === "w" || mode === "nw" || mode === "sw";

      if (hasE) w = startRect.w + dx;
      if (hasS) h = startRect.h + dy;
      if (hasW) { x = startRect.x + dx; w = startRect.w - dx; }
      if (hasN) { y = startRect.y + dy; h = startRect.h - dy; }

      if (w < MIN_W) { if (hasW) x -= (MIN_W - w); w = MIN_W; }
      if (h < MIN_H) { if (hasN) y -= (MIN_H - h); h = MIN_H; }

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
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [updateUserBlock, pageRef]);

  function startDrag(mode: "move" | "resize-tl" | "resize-right", id: string, rect: Rect, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { mode, id, startX: e.clientX, startY: e.clientY, startRect: rect };
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = mode === "move" ? "move" : mode === "resize-right" ? "ew-resize" : "nwse-resize";
    selectUserBlock(id);
  }

  function startLineDrag(mode: "p1" | "p2" | "move" | "rotate", id: string, p1: LinePoint, p2: LinePoint, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    lineDragRef.current = {
      id, mode, startX: e.clientX, startY: e.clientY, startP1: { ...p1 }, startP2: { ...p2 }, center,
      startCursorAngle: mode === "rotate" && pageRef.current
        ? (() => {
            const r = pageRef.current!.getBoundingClientRect();
            const nx = ((e.clientX - r.left) / r.width) * 100 - center.x;
            const ny = ((e.clientY - r.top) / r.height) * 100 - center.y;
            return Math.atan2(ny, nx);
          })()
        : undefined,
    };
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = mode === "rotate" ? "grabbing" : "move";
    selectUserBlock(id);
    if (mode === "rotate" && pageRef.current) {
      const r = pageRef.current.getBoundingClientRect();
      const deg0 = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
      setRotHUD({ active: true, deg: Math.round(normDeg(deg0)), cursor: { x: e.clientX - r.left + 12, y: e.clientY - r.top + 12 }, targetId: id });
    }
  }

  function startRectDrag(mode: "move" | "rotate" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw", id: string, rect: Rect, rotation: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    rectDragRef.current = {
      id, mode, startX: e.clientX, startY: e.clientY, startRect: { ...rect }, startRotation: rotation || 0, center,
      startCursorAngle: mode === "rotate" && pageRef.current
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
    if (mode === "rotate" && pageRef.current) {
      const r = pageRef.current.getBoundingClientRect();
      setRotHUD({ active: true, deg: Math.round(normDeg(rotation || 0)), cursor: { x: e.clientX - r.left + 12, y: e.clientY - r.top + 12 }, targetId: id });
    }
  }

  return { onDragOver, onDrop, onCanvasClick, onCanvasBackgroundMouseDown, startDrag, startLineDrag, startRectDrag, rotHUD, setRotHUD };
}
