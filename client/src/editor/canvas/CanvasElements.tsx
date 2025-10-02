// client/src/editor/canvas/CanvasElements.tsx
import React from "react";
import { Frame } from "./RenderHelpers";
import { renderString } from "../../templates/bindings";
import type { UserBlock, Rect, LinePoint } from "./types";

export function CanvasElements({
  userBlocks,
  selectedUserBlockId,
  ctx,
  onUpdateBlock,
  onSelectBlock,
  startRectDrag,
  startLineDrag,
  startDrag,
}: {
  userBlocks: UserBlock[];
  selectedUserBlockId: string | null;
  ctx: any;
  onUpdateBlock: (id: string, updates: any) => void;
  onSelectBlock: (id: string | null) => void;
  startRectDrag: (
    mode: "move" | "rotate" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
    id: string,
    rect: Rect,
    rotation: number,
    e: React.MouseEvent
  ) => void;
  startLineDrag: (
    mode: "p1" | "p2" | "move" | "rotate",
    id: string,
    p1: LinePoint,
    p2: LinePoint,
    e: React.MouseEvent
  ) => void;
  startDrag: (mode: "move" | "resize-tl" | "resize-right", id: string, rect: Rect, e: React.MouseEvent) => void;
}) {
  const pct = (n: number) => `${n}%`;

  return (
    <>
      {userBlocks.map((ub, i) => {
        const active = selectedUserBlockId === ub.id;
        const baseZ = ub.type === "text" ? 1000 : 0;
        const zIndex = baseZ + ((ub as any).z ?? i);

        if (ub.type === "image") {
          const r = ub.rect;
          return (
            <div
              key={ub.id}
              className="absolute"
              style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h), zIndex }}
              onMouseDown={(e) => { e.stopPropagation(); onSelectBlock(ub.id); }}
            >
              <img
                src={(ub as any).src}
                alt="image"
                className="w-full h-full object-contain border rounded bg-white"
                draggable={false}
              />
              {active && (
                <>
                  <div onMouseDown={(e) => startDrag("resize-tl", ub.id, r, e)} className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-white border border-slate-400 cursor-nwse-resize" />
                  <div onMouseDown={(e) => startDrag("resize-right", ub.id, r, e)} className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-5 rounded bg-white border border-slate-400 cursor-ew-resize" />
                  <div onMouseDown={(e) => startDrag("move", ub.id, r, e)} className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm">⤧</div>
                </>
              )}
            </div>
          );
        }

        if (ub.type === "text") {
          const st = ub.style || {};
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
            <Frame key={ub.id} rect={ub.rect} active={active} overflowVisible>
              <textarea
                className="w-full h-full outline-none resize-none bg-transparent"
                style={textareaStyle}
                value={displayVal}
                readOnly={isBinding}
                onMouseDown={(e) => { e.stopPropagation(); onSelectBlock(ub.id); }}
                onChange={(e) => { if (!isBinding) onUpdateBlock(ub.id, { value: e.target.value }); }}
              />
              {active && (
                <>
                  <div onMouseDown={(e) => startDrag("resize-tl", ub.id, ub.rect, e)} className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-white border border-slate-400 cursor-nwse-resize" />
                  <div onMouseDown={(e) => startDrag("resize-right", ub.id, ub.rect, e)} className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-5 rounded bg-white border border-slate-400 cursor-ew-resize" />
                  <div onMouseDown={(e) => startDrag("move", ub.id, ub.rect, e)} className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm">⤧</div>
                </>
              )}
            </Frame>
          );
        }

        if (ub.type === "line") {
          const st = ub.style || {};
          const stroke = st.strokeColor || "#111827";
          const strokeW = st.strokeWidth ?? 2;
          const dashArr = st.dash ? [st.dash, st.dash] : [];
          const points = ub.points || [];
          if (points.length < 2) return null;
          const p1 = points[0];
          const p2 = points[points.length - 1];
          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

          return (
            <svg key={ub.id} className="absolute inset-0" style={{ zIndex }}>
              <line x1={pct(p1.x)} y1={pct(p1.y)} x2={pct(p2.x)} y2={pct(p2.y)} stroke={stroke} strokeWidth={strokeW} strokeDasharray={dashArr.length ? dashArr.join(",") : undefined} strokeLinecap="round" />
              {active && (
                <>
                  <circle cx={pct(p1.x)} cy={pct(p1.y)} r={6} className="fill-white stroke-slate-400 cursor-grab" onMouseDown={(e) => startLineDrag("p1", ub.id, p1, p2, e)} />
                  <circle cx={pct(p2.x)} cy={pct(p2.y)} r={6} className="fill-white stroke-slate-400 cursor-grab" onMouseDown={(e) => startLineDrag("p2", ub.id, p1, p2, e)} />
                  <foreignObject x={pct(mid.x)} y={`calc(${pct(mid.y)} + 20px)`} width="40" height="40">
                    <div className="flex gap-2">
                      <div onMouseDown={(e) => startLineDrag("rotate", ub.id, p1, p2, e)} className="w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-grab text-sm">↻</div>
                      <div onMouseDown={(e) => startLineDrag("move", ub.id, p1, p2, e)} className="w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm">⤧</div>
                    </div>
                  </foreignObject>
                </>
              )}
            </svg>
          );
        }

        if (ub.type === "divider") {
          const st = ub.style || {};
          const stroke = st.strokeColor || "#111827";
          const strokeW = st.strokeWidth ?? 2;
          const r = ub.rect;
          return (
            <div
              key={ub.id}
              className="absolute"
              style={{ left: pct(r.x), top: pct(r.y + r.h / 2 - (strokeW / 1160) * 50), width: pct(r.w), height: strokeW, background: stroke, zIndex }}
              onMouseDown={(e) => { e.stopPropagation(); onSelectBlock(ub.id); }}
            />
          );
        }

        if (ub.type === "rect" || ub.type === "ellipse") {
          const st = ub.style || {};
          const stroke = st.strokeColor || "#111827";
          const strokeW = st.strokeWidth ?? 1;
          const fill = st.fillColor || "transparent";
          const r = ub.rect;
          const rotation = (ub as any).rotation || 0;

          return (
            <div
              key={ub.id}
              style={{
                position: "absolute",
                left: pct(r.x), top: pct(r.y),
                width: pct(r.w), height: pct(r.h),
                border: `${strokeW}px solid ${stroke}`,
                background: fill,
                borderRadius: ub.type === "ellipse" ? "50%" : 4,
                transform: `rotate(${rotation}deg)`, transformOrigin: "center",
                zIndex,
              }}
              onMouseDown={(e) => { e.stopPropagation(); onSelectBlock(ub.id); }}
            >
              {active && (
                <>
                  {["nw", "ne", "sw", "se"].map((dir) => (
                    <div
                      key={dir}
                      onMouseDown={(e) => startRectDrag(dir as any, ub.id, r, rotation, e)}
                      className="absolute w-3 h-3 bg-white border border-slate-400"
                      style={{
                        ...(dir === "nw" && { left: -6, top: -6, cursor: "nwse-resize" }),
                        ...(dir === "ne" && { right: -6, top: -6, cursor: "nesw-resize" }),
                        ...(dir === "sw" && { left: -6, bottom: -6, cursor: "nesw-resize" }),
                        ...(dir === "se" && { right: -6, bottom: -6, cursor: "nwse-resize" }),
                      }}
                    />
                  ))}
                  <div onMouseDown={(e) => startRectDrag("move", ub.id, r, rotation, e)} className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm">⤧</div>
                  <div onMouseDown={(e) => startRectDrag("rotate", ub.id, r, rotation, e)} className="absolute left-1/2 -top-10 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-grab text-sm">↻</div>
                </>
              )}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}
