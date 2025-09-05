// client/src/editor/annotations/Annotator.tsx
import { useEffect, useMemo, useRef, useState } from "react";

export type Annotation = {
  id: string;
  kind: "box";
  rect: { x: number; y: number; w: number; h: number }; // normalized 0..1
  index: number;
};

type MediaItem = { id: string; url: string; thumb?: string; filename?: string };

type Props = {
  photo: MediaItem;
  value: Annotation[];           // annotations for the current finding
  allForPhoto?: Annotation[];    // all annotations on this photo (other findings) for context
  onSave: (next: Annotation[]) => void;
  onCancel: () => void;
};

const ORANGE = "rgba(249,115,22,1)";     // tailwind orange-500
const ORANGE_GHOST = "rgba(249,115,22,0.3)";
const HANDLE = 8;

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function normRect(r: {x:number;y:number;w:number;h:number}) {
  let {x,y,w,h} = r;
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  x = clamp01(x); y = clamp01(y);
  w = clamp01(w); h = clamp01(h);
  if (x + w > 1) w = 1 - x;
  if (y + h > 1) h = 1 - y;
  return {x,y,w,h};
}

export default function Annotator({ photo, value, allForPhoto = [], onSave, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [rects, setRects] = useState<Annotation[]>(() => value.map(a => ({...a, rect: {...a.rect}})));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drag, setDrag] = useState<null | { kind: "new"|"move"|"resize", id?: string, ox:number, oy:number, rx:number, ry:number, rw:number, rh:number, handle?: string }>(null);

  // Scale helpers
  function toLocal(e: {clientX:number; clientY:number}) {
    const img = imgRef.current!;
    const r = img.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    return { x: clamp01(x), y: clamp01(y) };
  }
  function toScreen(r: {x:number;y:number;w:number;h:number}) {
    const img = imgRef.current!;
    const b = img.getBoundingClientRect();
    return { left: b.left + r.x*b.width, top: b.top + r.y*b.height, w: r.w*b.width, h: r.h*b.height };
  }

  // Start new rect
  function onMouseDownNew(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const p = toLocal(e);
    const id = crypto.randomUUID();
    const rect = normRect({ x: p.x, y: p.y, w: 0, h: 0 });
    setRects(rs => [...rs, { id, kind: "box", rect, index: (rs.length || 0) + 1 }]);
    setActiveId(id);
    setDrag({ kind: "new", id, ox: p.x, oy: p.y, rx: rect.x, ry: rect.y, rw: rect.w, rh: rect.h });
  }

  function onMouseMove(e: MouseEvent) {
    if (!drag) return;
    const p = toLocal(e as any);
    setRects(rs => {
      const i = rs.findIndex(r => r.id === drag.id);
      if (i < 0) return rs;
      const cur = rs[i];
      let rect = cur.rect;
      if (drag.kind === "new") {
        rect = normRect({ x: drag.ox, y: drag.oy, w: p.x - drag.ox, h: p.y - drag.oy });
      } else if (drag.kind === "move") {
        const dx = p.x - drag.ox, dy = p.y - drag.oy;
        rect = normRect({ x: drag.rx + dx, y: drag.ry + dy, w: drag.rw, h: drag.rh });
      } else if (drag.kind === "resize") {
        let { rx, ry, rw, rh } = drag;
        const right = rx + rw, bottom = ry + rh;
        switch (drag.handle) {
          case "nw": rect = normRect({ x: p.x, y: p.y, w: right - p.x, h: bottom - p.y }); break;
          case "ne": rect = normRect({ x: rx, y: p.y, w: p.x - rx, h: bottom - p.y }); break;
          case "sw": rect = normRect({ x: p.x, y: ry, w: right - p.x, h: p.y - ry }); break;
          case "se": rect = normRect({ x: rx, y: ry, w: p.x - rx, h: p.y - ry }); break;
        }
      }
      const next = [...rs];
      next[i] = { ...cur, rect };
      return next;
    });
  }
  function onMouseUp() { setDrag(null); }

  useEffect(() => {
    function mm(e: MouseEvent) { onMouseMove(e); }
    function mu() { onMouseUp(); }
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  });

  function beginMove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveId(id);
    const r = rects.find(x => x.id === id)!.rect;
    const p = toLocal(e);
    setDrag({ kind: "move", id, ox: p.x, oy: p.y, rx: r.x, ry: r.y, rw: r.w, rh: r.h });
  }
  function beginResize(id: string, handle: "nw"|"ne"|"sw"|"se", e: React.MouseEvent) {
    e.stopPropagation();
    setActiveId(id);
    const r = rects.find(x => x.id === id)!.rect;
    const p = toLocal(e);
    setDrag({ kind: "resize", id, ox: p.x, oy: p.y, rx: r.x, ry: r.y, rw: r.w, rh: r.h, handle });
  }
  function onDeleteActive() {
    if (!activeId) return;
    setRects(rs => rs.filter(r => r.id !== activeId));
    setActiveId(null);
  }

  // Keyboard delete
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDeleteActive();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Show other findings' boxes on the same photo as ghosts
  const ghosts = useMemo(() => {
    const mineIds = new Set(rects.map(r => r.id));
    return (allForPhoto || []).filter(g => !mineIds.has(g.id));
  }, [rects, allForPhoto]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="absolute inset-6 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <div className="font-medium text-sm truncate">{photo.filename || photo.id}</div>
          <div className="text-xs text-gray-500">Draw boxes. Click to select. Drag corners to resize. Del to remove.</div>
          <div className="ml-auto flex items-center gap-2">
            <button className="px-3 py-1 border rounded text-sm" onClick={() => onSave(rects)}>Save</button>
            <button className="px-3 py-1 border rounded text-sm" onClick={onCancel}>Cancel</button>
          </div>
        </div>

        <div ref={containerRef} className="relative flex-1 bg-black/5">
          <img
            ref={imgRef}
            src={photo.url}
            className="max-w-full max-h-full m-auto select-none"
            draggable={false}
            onMouseDown={onMouseDownNew}
          />
          {/* Ghosts */}
          {ghosts.map(g => {
            const s = imgRef.current ? toScreen(g.rect) : null;
            if (!s) return null;
            return (
              <div key={`ghost-${g.id}`} className="pointer-events-none absolute"
                   style={{ left: s.left, top: s.top, width: s.w, height: s.h, border: `2px solid ${ORANGE_GHOST}` }}>
                <div className="absolute -top-2 -left-2 text-[10px] bg-[rgba(249,115,22,0.7)] text-white rounded px-1">{g.index}</div>
              </div>
            );
          })}
          {/* Active rects */}
          {rects.map(r => {
            const s = imgRef.current ? toScreen(r.rect) : null;
            if (!s) return null;
            const active = r.id === activeId;
            return (
              <div
                key={r.id}
                className="absolute"
                style={{ left: s.left, top: s.top, width: s.w, height: s.h, border: `2px solid ${ORANGE}` }}
                onMouseDown={(e) => beginMove(r.id, e)}
                onClick={(e) => { e.stopPropagation(); setActiveId(r.id); }}
              >
                <div className="absolute -top-2 -left-2 text-[10px] bg-[rgba(249,115,22,1)] text-white rounded px-1">{r.index}</div>
                {active && (
                  <>
                    <Handle pos="nw" s={s} onMouseDown={(e) => beginResize(r.id, "nw", e)} />
                    <Handle pos="ne" s={s} onMouseDown={(e) => beginResize(r.id, "ne", e)} />
                    <Handle pos="sw" s={s} onMouseDown={(e) => beginResize(r.id, "sw", e)} />
                    <Handle pos="se" s={s} onMouseDown={(e) => beginResize(r.id, "se", e)} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Handle({ pos, s, onMouseDown }: { pos: "nw"|"ne"|"sw"|"se"; s: {left:number;top:number;w:number;h:number}; onMouseDown:(e:React.MouseEvent)=>void }) {
  let style: React.CSSProperties = {};
  if (pos === "nw") style = { left: -HANDLE/2, top: -HANDLE/2 };
  if (pos === "ne") style = { left: s.w - HANDLE/2, top: -HANDLE/2 };
  if (pos === "sw") style = { left: -HANDLE/2, top: s.h - HANDLE/2 };
  if (pos === "se") style = { left: s.w - HANDLE/2, top: s.h - HANDLE/2 };
  return (
    <div
      className="absolute w-2 h-2 bg-white border border-gray-600 rounded cursor-pointer"
      style={style}
      onMouseDown={onMouseDown}
    />
  );
}
