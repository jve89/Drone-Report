// client/src/editor/canvas/CanvasSections.tsx
import React from "react";
import type { Rect } from "./types";
import SeverityOverviewBlock from "../blocks/SeverityOverviewBlock";

type Pct = (n: number) => string;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function outerRadiusFor(ub: any, imgBorderRadius?: number | string) {
  if (ub?.type === "ellipse") return "50%";
  if (typeof imgBorderRadius === "number") return `${imgBorderRadius}px`;
  return 4;
}

export function SectionImageBlock({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  onUpdateBlock,
  onSelectBlock,
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
  onSelectBlock: (id: string | null) => void;
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
  const imgSrc =
    meta?.payload?.src ||
    meta?.payload?.url ||
    (meta?.props?.src as string) ||
    (meta?.props?.url as string) ||
    (ub as any).src ||
    (ub as any).url ||
    null;

  const defaultImgProps = {
    fit: "contain" as const,
    opacity: 100,
    borderRadius: 0,
    zoom: 100,
    panX: 0,
    panY: 0,
  };

  const iProps = {
    ...defaultImgProps,
    ...(meta?.props || {}),
  } as {
    fit: "contain" | "cover" | "scale-down";
    opacity: number;
    borderRadius: number;
    zoom: number;
    panX: number;
    panY: number;
  };

  const DR_MEDIA_MIME = "application/x-dr-media";

  const updateImageSrc = (url: string) => {
    const curBS = (ub as any).blockStyle || {};
    const curMeta = curBS.meta || {};
    const payload = { ...(curMeta.payload || {}), src: url, url };
    onUpdateBlock(ub.id, { blockStyle: { ...curBS, meta: { ...curMeta, payload } } });
  };

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
      if (payload?.url) updateImageSrc(payload.url);
    } catch {}
  };

  const onPickLocal = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateImageSrc(url);
  };

  const showEmptyImgFrame = !imgSrc;
  const maxPanPct =
    iProps.zoom > 100 ? ((iProps.zoom - 100) / (2 * iProps.zoom)) * 100 : 0;

  let containerEl: HTMLDivElement | null = null;

  const pushImgProps = (patch: Partial<typeof iProps>) => {
    const curBS = (ub as any).blockStyle || {};
    const curMeta = curBS.meta || {};
    const curProps = curMeta.props || {};
    const next = { ...curProps, ...patch };
    onUpdateBlock(ub.id, { blockStyle: { ...curBS, meta: { ...curMeta, props: next } } });
  };

  const onPanMouseDown = (e: React.MouseEvent) => {
    if (iProps.zoom <= 100) return;

    e.preventDefault();
    e.stopPropagation();
    onSelectBlock(ub.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = iProps.panX || 0;
    const startPanY = iProps.panY || 0;

    const el = containerEl;
    if (!el) return;
    const rectPx = el.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const dxPct = ((ev.clientX - startX) / rectPx.width) * 100;
      const dyPct = ((ev.clientY - startY) / rectPx.height) * 100;
      const nextX = clamp(startPanX + dxPct, -maxPanPct, maxPanPct);
      const nextY = clamp(startPanY + dyPct, -maxPanPct, maxPanPct);
      pushImgProps({ panX: nextX, panY: nextY });
      document.body.style.cursor = "grabbing";
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "grabbing";
  };

  const outerBorderRadius = outerRadiusFor(ub, iProps.borderRadius);

  return (
    <div
      data-user-block
      ref={(r) => {
        containerEl = r;
      }}
      style={{
        position: "absolute",
        left: pct(r.x),
        top: pct(r.y),
        width: pct(r.w),
        height: pct(r.h),
        borderWidth: showEmptyImgFrame ? 1 : strokeW,
        borderStyle: showEmptyImgFrame ? "dashed" : dashed ? "dashed" : "solid",
        borderColor: showEmptyImgFrame ? "#94a3b8" : stroke,
        background: showEmptyImgFrame ? "rgba(148,163,184,0.08)" : "transparent",
        borderRadius: outerBorderRadius as any,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        zIndex,
        overflow: "visible",
      }}
      onMouseDown={(e) => onBlockMouseDown(e, ub.id)}
      onDragOver={onImgDragOver}
      onDrop={onImgDrop}
    >
      {renderBoxBadge(ub, 0, 0)}

      <div
        className="absolute inset-0"
        style={{
          overflow: "hidden",
          borderRadius: outerBorderRadius as any,
          background: imgSrc ? "transparent" : "transparent",
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc as string}
            alt="image"
            className="w-full h-full select-none"
            style={{
              objectFit: iProps.fit,
              opacity: clamp(iProps.opacity, 0, 100) / 100,
              transformOrigin: "center center",
              transform:
                iProps.zoom !== 100 || iProps.panX || iProps.panY
                  ? `translate(${clamp(iProps.panX, -maxPanPct, maxPanPct)}%, ${clamp(
                      iProps.panY,
                      -maxPanPct,
                      maxPanPct
                    )}%) scale(${iProps.zoom / 100})`
                  : "none",
              cursor: iProps.zoom > 100 ? "grab" : "default",
              borderRadius: `${iProps.borderRadius}px`,
            }}
            draggable={false}
            onMouseDown={onPanMouseDown}
          />
        ) : (
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
        )}
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

export function SectionSeverityOverview({
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

  const sevCounts: number[] = Array.isArray(bs?.meta?.payload?.counts)
    ? bs.meta.payload.counts
    : [0, 0, 0, 0, 0];
  const sevShowIcons: boolean = !!(bs?.meta?.props?.showIcons ?? true);

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
        <SeverityOverviewBlock counts={sevCounts} showIcons={sevShowIcons} />
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
