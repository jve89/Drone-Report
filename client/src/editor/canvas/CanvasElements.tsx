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

  const handleBlockMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectBlock(id);
  };

  const renderBoxBadge = (ub: any, xPct: number, yPct: number) => {
    const badge = ub?.blockStyle?.meta?.badge;
    if (!badge?.visible || !badge.text) return null;
    return (
      <div
        className="absolute px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-500 text-white select-none"
        style={{
          left: pct(xPct),
          top: pct(yPct),
          transform: "translate(-50%, calc(-100% - 6px))",
          pointerEvents: "none",
        }}
      >
        {badge.text}
      </div>
    );
  };

  const renderLineBadge = (ub: any, mid: { x: number; y: number }) => {
    const badge = ub?.blockStyle?.meta?.badge;
    if (!badge?.visible || !badge.text) return null;
    return (
      <foreignObject
        x={`calc(${pct(mid.x)} - 100px)`}
        y={`calc(${pct(mid.y)} - 30px)`}
        width="200"
        height="40"
        pointerEvents="none"
      >
        <div
          className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-500 text-white select-none"
          style={{ width: "fit-content", margin: "0 auto" }}
        >
          {badge.text}
        </div>
      </foreignObject>
    );
  };

  function isDashed(ub: any): boolean {
    const dash = ub?.blockStyle?.stroke?.dash as unknown;
    if (Array.isArray(dash)) return dash.some((n) => Number(n) > 0);
    const n = Number(dash);
    return Number.isFinite(n) && n > 0;
  }

  return (
    <>
      {userBlocks.map((ub, i) => {
        const active = selectedUserBlockId === ub.id;
        const baseZ = ub.type === "text" ? 1000 : 0;
        const zIndex = baseZ + ((ub as any).z ?? i);

      if (ub.type === "image") {
      const r = ub.rect;
      const src =
        (ub as any).src ??
        (ub as any).url ??
        (ub as any).media?.url ??
        (ub as any).image?.url ??
        null;

      const hasImage = Boolean(src);

      // mime used elsewhere in the app for media drag/drop
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
          const payload = JSON.parse(raw); // { url, ... }
          if (payload?.url) onUpdateBlock(ub.id, { src: payload.url, url: payload.url, media: { url: payload.url } });
        } catch { /* ignore */ }
      };

      const onPickLocal = (file: File | null) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        onUpdateBlock(ub.id, { src: url, url, media: { url } });
      };

      return (
        <div
          key={ub.id}
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
          onMouseDown={(e) => handleBlockMouseDown(e, ub.id)}
          onDragOver={onImgDragOver}
          onDrop={onImgDrop}
        >
          {/* Show image when present */}
          {hasImage && (
            <img
              src={src as string}
              alt="image"
              className="w-full h-full object-contain bg-white rounded"
              draggable={false}
            />
          )}

          {/* Always-visible dashed frame when empty (same pattern as text block) */}
          {!hasImage && (
            <>
              <div className="absolute inset-0 rounded border border-dashed border-slate-400 pointer-events-none" />
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <label
                  className="px-3 py-1.5 text-sm rounded border bg-white shadow-sm cursor-pointer pointer-events-auto"
                >
                  Add image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickLocal(e.target.files?.[0] ?? null)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
                <div className="mt-2 text-xs text-slate-500 pointer-events-none">
                  or drag from Media
                </div>
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
    }

        if (ub.type === "text") {
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
              key={ub.id}
              data-user-block
              className="absolute"
              style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h), zIndex }}
              onMouseDown={(e) => handleBlockMouseDown(e, ub.id)}
            >
              {renderBoxBadge(ub, 0, 0)}
              {active && (
                <div className="absolute inset-0 rounded border border-dashed border-slate-400 pointer-events-none" />
              )}
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
        }

        if (ub.type === "line") {
          const bs = (ub as any).blockStyle || {};
          const strokeHex =
            bs.stroke?.color?.hex ?? (ub as any).style?.strokeColor ?? "#111827";
          const strokeW = Number.isFinite(bs.stroke?.width)
            ? bs.stroke.width
            : (ub as any).style?.strokeWidth ?? 2;
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
            <svg
              key={ub.id}
              data-user-block
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex, width: "100%", height: "100%" }}
            >
              <line
                x1={pct(p1.x)}
                y1={pct(p1.y)}
                x2={pct(p2.x)}
                y2={pct(p2.y)}
                stroke="rgba(0,0,0,0.001)"
                strokeWidth={hitW}
                pointerEvents="stroke"
                onMouseDown={(e) => {
                  handleBlockMouseDown(e, ub.id);
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
                  handleBlockMouseDown(e, ub.id);
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
                  <foreignObject
                    x={pct(mid.x)}
                    y={`calc(${pct(mid.y)} + 20px)`}
                    width="40"
                    height="40"
                  >
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
        }

        if (ub.type === "rect" || ub.type === "ellipse") {
          const bs = (ub as any).blockStyle || {};
          const legacy = (ub as any).style || {};
          const stroke = bs.stroke?.color?.hex ?? legacy.strokeColor ?? "#111827";
          const strokeW = (Number.isFinite(bs.stroke?.width) ? bs.stroke?.width : legacy.strokeWidth) ?? 1;

          const dashed = isDashed(ub);
          const r = ub.rect;
          const rotation = (ub as any).rotation || 0;

          // --- image block detection & props ---
          const meta = bs.meta || {};
          const isImageBlock = meta?.blockKind === "image";
          const imgSrc =
            meta?.payload?.src ||
            meta?.payload?.url ||
            (ub as any).src ||
            (ub as any).url ||
            null;

          // drag/drop from Media panel
          const DR_MEDIA_MIME = "application/x-dr-media";
          const onImgDragOver = (e: React.DragEvent) => {
            if (!isImageBlock) return;
            if (e.dataTransfer.types.includes(DR_MEDIA_MIME)) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
            }
          };
          const updateImageSrc = (url: string) => {
            const curBS = (ub as any).blockStyle || {};
            const curMeta = curBS.meta || {};
            const payload = { ...(curMeta.payload || {}), src: url, url };
            onUpdateBlock(ub.id, { blockStyle: { ...curBS, meta: { ...curMeta, payload } } });
          };
          const onImgDrop = (e: React.DragEvent) => {
            if (!isImageBlock) return;
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
            if (!isImageBlock || !file) return;
            const url = URL.createObjectURL(file);
            updateImageSrc(url);
          };

          // base border/background:
          const showEmptyImgFrame = isImageBlock && !imgSrc;

          return (
            <div
              key={ub.id}
              data-user-block
              style={{
                position: "absolute",
                left: pct(r.x),
                top: pct(r.y),
                width: pct(r.w),
                height: pct(r.h),
                // shapes default border
                borderWidth: showEmptyImgFrame ? 1 : strokeW,
                borderStyle: showEmptyImgFrame ? "dashed" : (dashed ? "dashed" : "solid"),
                borderColor: showEmptyImgFrame ? "#94a3b8" : stroke,
                background: showEmptyImgFrame ? "rgba(148,163,184,0.08)" : "transparent",
                borderRadius: ub.type === "ellipse" ? "50%" : 4,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "center",
                zIndex,
              }}
              onMouseDown={(e) => handleBlockMouseDown(e, ub.id)}
              onDragOver={onImgDragOver}
              onDrop={onImgDrop}
            >
              {renderBoxBadge(ub, 0, 0)}

              {isImageBlock ? (
                imgSrc ? (
                  <img
                    src={imgSrc as string}
                    alt="image"
                    className="w-full h-full object-contain bg-white"
                    draggable={false}
                  />
                ) : (
                  // empty state with button
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
                    <div className="mt-2 text-xs text-slate-500 pointer-events-none">
                      or drag from Media
                    </div>
                  </div>
                )
              ) : null}

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

        return null;
      })}
    </>
  );
}
