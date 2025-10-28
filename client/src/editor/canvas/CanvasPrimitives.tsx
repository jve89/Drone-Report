// client/src/editor/canvas/CanvasPrimitives.tsx
import React from "react";
import { renderString } from "../../templates/bindings";
import type { Rect, LinePoint } from "./types";

type Pct = (n: number) => string;

/* ----------------------------- Legacy Image ----------------------------- */

const LegacyImageBlockImpl = ({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  onUpdateBlock,
  startDrag,
}: {
  ub: any;
  active: boolean;
  zIndex: number;
  pct: Pct;
  onBlockMouseDown: (e: React.MouseEvent, id: string) => void;
  onUpdateBlock: (id: string, updates: any) => void;
  startDrag: (mode: "move" | "resize-tl" | "resize-right", id: string, rect: Rect, e: React.MouseEvent) => void;
}) => {
  const r = ub.rect;
  const src = ub?.src ?? ub?.url ?? ub?.media?.url ?? ub?.image?.url ?? null;
  const hasImage = Boolean(src);
  const DR_MEDIA_MIME = "application/x-dr-media";

  const onImgDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DR_MEDIA_MIME)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onImgDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(DR_MEDIA_MIME);
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(raw);
      if (payload?.url) onUpdateBlock(ub.id, { src: payload.url, url: payload.url, media: { url: payload.url } });
    } catch {}
  };

  const onPickLocal = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdateBlock(ub.id, { src: url, url, media: { url } });
  };

  return (
    <div
      data-user-block
      className="absolute"
      style={{
        left: pct(r.x),
        top: pct(r.y),
        width: pct(r.w),
        height: pct(r.h),
        zIndex,
        borderRadius: 4,
        background: hasImage ? "transparent" : "rgba(148,163,184,0.08)",
      }}
      onMouseDown={(e) => onBlockMouseDown(e, ub.id)}
      onDragOver={onImgDragOver}
      onDrop={onImgDrop}
    >
      {hasImage ? (
        <img src={src as string} alt="image" className="w-full h-full object-contain bg-white rounded" draggable={false} />
      ) : (
        <>
          <div className="absolute inset-0 rounded border border-dashed border-slate-400 pointer-events-none" />
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <label className="px-3 py-1.5 text-sm rounded border bg-white shadow-sm cursor-pointer pointer-events-auto">
              Add image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickLocal(e.target.files?.[0] ?? null)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
            <div className="mt-2 text-xs text-slate-500 pointer-events-none">or drag from Media</div>
          </div>
        </>
      )}

      {active && (
        <>
          <div
            onMouseDown={(e) => startDrag("resize-tl", ub.id, r, e)}
            className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-white border border-slate-400 cursor-nwse-resize"
          />
          <div
            onMouseDown={(e) => startDrag("resize-right", ub.id, r, e)}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-5 rounded bg-white border border-slate-400 cursor-ew-resize"
          />
          <div
            onMouseDown={(e) => startDrag("move", ub.id, r, e)}
            className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm"
          >
            ⤧
          </div>
        </>
      )}
    </div>
  );
};

export const LegacyImageBlock = React.memo(LegacyImageBlockImpl);

/* ---------------------------------- Text --------------------------------- */

export const TextBlockPrimitive = ({
  ub,
  active,
  zIndex,
  pct,
  ctx,
  onBlockMouseDown,
  onUpdateBlock,
  startDrag,
  renderBoxBadge,
}: {
  ub: any;
  active: boolean;
  zIndex: number;
  pct: Pct;
  ctx: any;
  onBlockMouseDown: (e: React.MouseEvent, id: string) => void;
  onUpdateBlock: (id: string, updates: any) => void;
  startDrag: (mode: "move" | "resize-tl" | "resize-right", id: string, rect: Rect, e: React.MouseEvent) => void;
  renderBoxBadge: (ub: any, xPct: number, yPct: number) => React.ReactNode;
}) => {
  const st = ub.style || {};
  const r = ub.rect;
  const textareaStyle: React.CSSProperties = {
    color: st.color,
    fontFamily: st.fontFamily,
    fontSize: st.fontSize ? `${st.fontSize}px` : undefined,
    fontWeight: st.bold ? 700 : 400,
    fontStyle: st.italic ? "italic" : "normal",
    textDecoration: st.underline ? "underline" : "none",
    lineHeight: st.lineHeight ? String(st.lineHeight) : undefined,
    letterSpacing: st.letterSpacing != null ? `${st.letterSpacing}px` : undefined,
    textAlign: st.align || "left",
  };

  const rawVal = typeof ub.value === "string" ? ub.value : "";
  const isBinding = rawVal.includes("{{");
  const displayVal = isBinding ? renderString(rawVal, ctx) : rawVal;

  return (
    <div
      data-user-block
      className="absolute"
      style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h), zIndex }}
      onMouseDown={(e) => onBlockMouseDown(e, ub.id)}
    >
      {renderBoxBadge(ub, 0, 0)}
      {active && <div className="absolute inset-0 rounded border border-dashed border-slate-400 pointer-events-none" />}
      <textarea
        className="w-full h-full outline-none resize-none bg-transparent"
        style={textareaStyle}
        value={displayVal}
        readOnly={isBinding}
        onChange={(e) => {
          if (!isBinding) onUpdateBlock(ub.id, { value: e.target.value });
        }}
      />
      {active && (
        <>
          <div
            onMouseDown={(e) => startDrag("resize-tl", ub.id, r, e)}
            className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-white border border-slate-400 cursor-nwse-resize"
          />
          <div
            onMouseDown={(e) => startDrag("resize-right", ub.id, r, e)}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-5 rounded bg-white border border-slate-400 cursor-ew-resize"
          />
          <div
            onMouseDown={(e) => startDrag("move", ub.id, r, e)}
            className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm"
          >
            ⤧
          </div>
        </>
      )}
    </div>
  );
};

/* ---------------------------------- Line --------------------------------- */

export const LinePrimitive = ({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  startLineDrag,
  renderLineBadge,
}: {
  ub: any;
  active: boolean;
  zIndex: number;
  pct: Pct;
  onBlockMouseDown: (e: React.MouseEvent, id: string) => void;
  startLineDrag: (mode: "p1" | "p2" | "move" | "rotate", id: string, p1: LinePoint, p2: LinePoint, e: React.MouseEvent) => void;
  renderLineBadge: (ub: any, mid: { x: number; y: number }) => React.ReactNode;
}) => {
  const bs = (ub as any).blockStyle || {};
  const strokeHex = bs.stroke?.color?.hex ?? (ub as any).style?.strokeColor ?? "#111827";
  const strokeW = Number.isFinite(bs.stroke?.width) ? bs.stroke.width : (ub as any).style?.strokeWidth ?? 2;
  const dashArr =
    Array.isArray(bs.stroke?.dash) && bs.stroke.dash.length
      ? bs.stroke.dash
      : (ub as any).style?.dash
      ? [(ub as any).style.dash, (ub as any).style.dash]
      : [];

  const points = ub.points || [];
  if (points.length < 2) return null;
  const p1 = points[0];
  const p2 = points[points.length - 1];
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const hitW = Math.max(12, Number(strokeW) || 2);

  return (
    <svg data-user-block className="absolute inset-0 pointer-events-none" style={{ zIndex, width: "100%", height: "100%" }}>
      <line
        x1={pct(p1.x)}
        y1={pct(p1.y)}
        x2={pct(p2.x)}
        y2={pct(p2.y)}
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={hitW}
        pointerEvents="stroke"
        onMouseDown={(e) => {
          onBlockMouseDown(e, ub.id);
          startLineDrag("move", ub.id, p1, p2, e);
        }}
      />
      <line
        x1={pct(p1.x)}
        y1={pct(p1.y)}
        x2={pct(p2.x)}
        y2={pct(p2.y)}
        stroke={strokeHex}
        strokeWidth={strokeW}
        strokeDasharray={dashArr.length ? dashArr.join(",") : undefined}
        strokeLinecap="round"
        pointerEvents="stroke"
        onMouseDown={(e) => {
          onBlockMouseDown(e, ub.id);
          startLineDrag("move", ub.id, p1, p2, e);
        }}
      />
      {renderLineBadge(ub, mid)}
      {active && (
        <>
          <circle
            cx={pct(p1.x)}
            cy={pct(p1.y)}
            r={6}
            className="fill-white stroke-slate-400 cursor-grab"
            onMouseDown={(e) => startLineDrag("p1", ub.id, p1, p2, e)}
          />
          <circle
            cx={pct(p2.x)}
            cy={pct(p2.y)}
            r={6}
            className="fill-white stroke-slate-400 cursor-grab"
            onMouseDown={(e) => startLineDrag("p2", ub.id, p1, p2, e)}
          />
          <foreignObject x={pct(mid.x)} y={`calc(${pct(mid.y)} + 20px)`} width="40" height="40">
            <div className="flex gap-2">
              <div
                onMouseDown={(e) => startLineDrag("rotate", ub.id, p1, p2, e)}
                className="w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-grab text-sm"
              >
                ↻
              </div>
              <div
                onMouseDown={(e) => startLineDrag("move", ub.id, p1, p2, e)}
                className="w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm"
              >
                ⤧
              </div>
            </div>
          </foreignObject>
        </>
      )}
    </svg>
  );
};

/* ---------------------------- Rect / Ellipse ----------------------------- */

export const RectEllipsePrimitive = ({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  startRectDrag,
  isDashed,
}: {
  ub: any;
  active: boolean;
  zIndex: number;
  pct: Pct;
  onBlockMouseDown: (e: React.MouseEvent, id: string) => void;
  startRectDrag: (
    mode: "move" | "rotate" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
    id: string,
    rect: Rect,
    rotation: number,
    e: React.MouseEvent
  ) => void;
  isDashed: (ub: any) => boolean;
}) => {
  const bs = (ub as any).blockStyle || {};
  const legacy = (ub as any).style || {};
  const stroke = bs.stroke?.color?.hex ?? legacy.strokeColor ?? "#111827";
  const strokeW = (Number.isFinite(bs.stroke?.width) ? bs.stroke?.width : legacy.strokeWidth) ?? 1;
  const dashed = isDashed(ub);

  const r = ub.rect;
  const rotation = (ub as any).rotation || 0;
  const outerBorderRadius = ub.type === "ellipse" ? "50%" : 4;

  return (
    <div
      data-user-block
      style={{
        position: "absolute",
        left: pct(r.x),
        top: pct(r.y),
        width: pct(r.w),
        height: pct(r.h),
        borderWidth: strokeW,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: stroke,
        background: "transparent",
        borderRadius: outerBorderRadius as any,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        zIndex,
        overflow: "visible",
      }}
      onMouseDown={(e) => onBlockMouseDown(e, ub.id)}
    >
      <div className="absolute inset-0" style={{ overflow: "hidden", borderRadius: outerBorderRadius as any }} />
      {active && (
        <>
          {(["nw", "ne", "sw", "se"] as const).map((dir) => (
            <div
              key={dir}
              onMouseDown={(e) => startRectDrag(dir, ub.id, r, rotation, e)}
              className="absolute w-3 h-3 bg-white border border-slate-400"
              style={{
                ...(dir === "nw" && { left: -6, top: -6, cursor: "nwse-resize" }),
                ...(dir === "ne" && { right: -6, top: -6, cursor: "nesw-resize" }),
                ...(dir === "sw" && { left: -6, bottom: -6, cursor: "nesw-resize" }),
                ...(dir === "se" && { right: -6, bottom: -6, cursor: "nwse-resize" }),
              }}
            />
          ))}
          <div
            onMouseDown={(e) => startRectDrag("move", ub.id, r, rotation, e)}
            className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm"
          >
            ⤧
          </div>
          <div
            onMouseDown={(e) => startRectDrag("rotate", ub.id, r, rotation, e)}
            className="absolute left-1/2 -top-10 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-grab text-sm"
          >
            ↻
          </div>
        </>
      )}
    </div>
  );
};
