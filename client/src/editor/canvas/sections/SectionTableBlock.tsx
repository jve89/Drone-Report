// client/src/editor/canvas/sections/SectionTableBlock.tsx
import React from "react";
import type { Rect } from "../types";
import { TableBlock } from "../../blocks/primitives/TableBlock";

type Pct = (n: number) => string;

export function SectionTableBlock({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  onUpdateBlock,
  startRectDrag,
  isDashed,
  renderBoxBadge,
}: {
  ub: any;
  active: boolean;
  zIndex: number;
  pct: Pct;
  onBlockMouseDown: (e: React.MouseEvent, id: string) => void;
  onUpdateBlock: (id: string, updates: any) => void;
  startRectDrag: (
    mode:
      | "move"
      | "rotate"
      | "n"
      | "s"
      | "e"
      | "w"
      | "ne"
      | "nw"
      | "se"
      | "sw",
    id: string,
    rect: Rect,
    rotation: number,
    e: React.MouseEvent
  ) => void;
  isDashed: (ub: any) => boolean;
  renderBoxBadge: (ub: any, xPct: number, yPct: number) => React.ReactNode;
}) {
  const bs = (ub as any).blockStyle || {};
  const stroke = bs.stroke?.color?.hex ?? "#111827";
  const strokeW = Number.isFinite(bs.stroke?.width) ? bs.stroke?.width : 1;
  const dashed = isDashed(ub);
  const rect = ub.rect;
  const rotation = (ub as any).rotation || 0;
  const { meta } = bs || {};
  const payload = meta?.payload || { data: [[""]] };

  const commitTable = (nextData: string[][]) => {
    onUpdateBlock(ub.id, {
      blockStyle: {
        ...bs,
        meta: { ...meta, payload: { ...(payload || {}), data: nextData } },
      },
    });
  };

  return (
    <div
      data-user-block
      style={{
        position: "absolute",
        left: pct(rect.x),
        top: pct(rect.y),
        width: pct(rect.w),
        height: pct(rect.h),
        borderWidth: strokeW,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: stroke,
        background: "rgba(255,255,255,0.95)",
        borderRadius: 4,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        zIndex,
        overflow: "visible",
      }}
      onMouseDown={(e) => onBlockMouseDown(e, ub.id)}
    >
      {renderBoxBadge(ub, 0, 0)}

      <div className="absolute inset-0" style={{ overflow: "hidden", borderRadius: 4 }}>
        <TableBlock data={payload.data} onChange={commitTable} />
      </div>

      {active && (
        <>
          {/* 4 corner handles */}
          {(["nw", "ne", "sw", "se"] as const).map((dir) => (
            <div
              key={dir}
              onMouseDown={(e) => startRectDrag(dir, ub.id, rect, rotation, e)}
              className="absolute w-3 h-3 bg-white border border-slate-400"
              style={{
                ...(dir === "nw" && { left: -6, top: -6, cursor: "nwse-resize" }),
                ...(dir === "ne" && { right: -6, top: -6, cursor: "nesw-resize" }),
                ...(dir === "sw" && { left: -6, bottom: -6, cursor: "nesw-resize" }),
                ...(dir === "se" && { right: -6, bottom: -6, cursor: "nwse-resize" }),
              }}
            />
          ))}

          {/* Move handle (bottom-center) */}
          <div
            onMouseDown={(e) => startRectDrag("move", ub.id, rect, rotation, e)}
            className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-move text-sm"
          >
            ⤧
          </div>

          {/* Rotate handle (top-center) */}
          <div
            onMouseDown={(e) => startRectDrag("rotate", ub.id, rect, rotation, e)}
            className="absolute left-1/2 -top-10 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-slate-400 grid place-items-center cursor-grab text-sm"
          >
            ↻
          </div>
        </>
      )}
    </div>
  );
}
