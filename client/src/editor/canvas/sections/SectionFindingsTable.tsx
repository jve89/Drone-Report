// client/src/editor/canvas/sections/SectionFindingsTable.tsx
import React from "react";
import type { Rect } from "../types";

type Pct = (n: number) => string;

export function SectionFindingsTable({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  startRectDrag,
  isDashed,
  renderBoxBadge,
}: {
  ub: any;
  active: boolean;
  zIndex: number;
  pct: Pct;
  onBlockMouseDown: (e: React.MouseEvent, id: string) => void;
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
  const legacy = (ub as any).style || {};
  const stroke = bs.stroke?.color?.hex ?? legacy.strokeColor ?? "#111827";
  const strokeW =
    (Number.isFinite(bs.stroke?.width) ? bs.stroke?.width : legacy.strokeWidth) ?? 1;
  const dashed = isDashed(ub);

  const r = ub.rect;
  const rotation = (ub as any).rotation || 0;

  const meta = bs.meta || {};
  const ftProps = {
    pageSize: Number.isFinite(meta?.props?.pageSize) ? meta.props.pageSize : 6,
    showSeverityIcons: !!(meta?.props?.showSeverityIcons ?? false),
  };
  const ftRows: Array<{ title: string; location?: string; category?: string }> =
    Array.isArray(meta?.payload?.rows) ? meta.payload.rows : [];

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
        borderRadius: 4 as any,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        zIndex,
        overflow: "visible",
      }}
      onMouseDown={(e) => onBlockMouseDown(e, ub.id)}
    >
      {renderBoxBadge(ub, 0, 0)}
      <div className="absolute inset-0" style={{ overflow: "hidden", borderRadius: 4 as any }}>
        <div className="w-full h-full overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0">
              <tr className="bg-slate-100 border-b border-slate-200">
                {ftProps.showSeverityIcons && <th className="text-left px-2 py-1 w-6">S</th>}
                <th className="text-left px-2 py-1">Title</th>
                <th className="text-left px-2 py-1">Location</th>
                <th className="text-left px-2 py-1">Category</th>
              </tr>
            </thead>
            <tbody>
              {(ftRows || []).slice(0, Math.max(1, ftProps.pageSize)).map((row, idx) => (
                <tr key={idx} className={idx % 2 ? "bg-white" : "bg-slate-50"}>
                  {ftProps.showSeverityIcons && (
                    <td className="px-2 py-1 align-top">
                      <span className="inline-block w-3 h-3 rounded-full bg-slate-400" />
                    </td>
                  )}
                  <td className="px-2 py-1 align-top">{row?.title || <span className="text-slate-400">—</span>}</td>
                  <td className="px-2 py-1 align-top">{row?.location || <span className="text-slate-400">—</span>}</td>
                  <td className="px-2 py-1 align-top">{row?.category || <span className="text-slate-400">—</span>}</td>
                </tr>
              ))}
              {(!ftRows || ftRows.length === 0) && (
                <tr>
                  <td className="px-2 py-2 text-slate-400" colSpan={ftProps.showSeverityIcons ? 4 : 3}>
                    No rows yet. Use the Inspector to add rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
}
