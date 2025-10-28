// client/src/editor/canvas/CanvasElements.tsx
import React from "react";
import type { UserBlock, Rect, LinePoint } from "./types";
import {
  LegacyImageBlock,
  TextBlockPrimitive,
  LinePrimitive,
  RectEllipsePrimitive,
} from "./CanvasPrimitives";
import {
  SectionImageBlock,
  SectionSeverityOverview,
  SectionFindingsTable,
} from "./CanvasSections";

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
  startLineDrag: (
    mode: "p1" | "p2" | "move" | "rotate",
    id: string,
    p1: LinePoint,
    p2: LinePoint,
    e: React.MouseEvent
  ) => void;
  startDrag: (
    mode: "move" | "resize-tl" | "resize-right",
    id: string,
    rect: Rect,
    e: React.MouseEvent
  ) => void;
}) {
  const pct = (n: number) => `${n}%`;
  const isActive = (id: string) => selectedUserBlockId === id;
  const zFor = (ub: UserBlock, i: number) =>
    (ub.type === "text" ? 1000 : 0) + ((((ub as any).z as number) ?? i) as number);

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

  const isDashed = (ub: any): boolean => {
    const dash = ub?.blockStyle?.stroke?.dash as unknown;
    if (Array.isArray(dash)) return dash.some((n) => Number(n) > 0);
    const n = Number(dash);
    return Number.isFinite(n) && n > 0;
  };

  const getSectionKind = (ub: any): string | null => {
    return ub?.blockStyle?.meta?.blockKind ?? null;
  };

  return (
    <>
      {userBlocks.map((ub, i) => {
        const active = isActive(ub.id);
        const zIndex = zFor(ub, i);

        if (ub.type === "image") {
          return (
            <LegacyImageBlock
              key={ub.id}
              ub={ub as any}
              active={active}
              zIndex={zIndex}
              pct={pct}
              onBlockMouseDown={handleBlockMouseDown}
              onUpdateBlock={onUpdateBlock}
              startDrag={startDrag}
            />
          );
        }

        if (ub.type === "text") {
          return (
            <TextBlockPrimitive
              key={ub.id}
              ub={ub as any}
              active={active}
              zIndex={zIndex}
              pct={pct}
              ctx={ctx}
              onBlockMouseDown={handleBlockMouseDown}
              onUpdateBlock={onUpdateBlock}
              startDrag={startDrag}
              renderBoxBadge={renderBoxBadge}
            />
          );
        }

        if (ub.type === "line") {
          return (
            <LinePrimitive
              key={ub.id}
              ub={ub as any}
              active={active}
              zIndex={zIndex}
              pct={pct}
              onBlockMouseDown={handleBlockMouseDown}
              startLineDrag={startLineDrag}
              renderLineBadge={renderLineBadge}
            />
          );
        }

        if (ub.type === "rect" || ub.type === "ellipse") {
          const kind = getSectionKind(ub);

          if (kind === "image") {
            return (
              <SectionImageBlock
                key={ub.id}
                ub={ub as any}
                active={active}
                zIndex={zIndex}
                pct={pct}
                onBlockMouseDown={handleBlockMouseDown}
                onUpdateBlock={onUpdateBlock}
                onSelectBlock={onSelectBlock}
                startRectDrag={startRectDrag}
                isDashed={isDashed}
              />
            );
          }

          if (kind === "severityOverview") {
            return (
              <SectionSeverityOverview
                key={ub.id}
                ub={ub as any}
                active={active}
                zIndex={zIndex}
                pct={pct}
                onBlockMouseDown={handleBlockMouseDown}
                startRectDrag={startRectDrag}
                isDashed={isDashed}
              />
            );
          }

          if (kind === "findingsTable") {
            return (
              <SectionFindingsTable
                key={ub.id}
                ub={ub as any}
                active={active}
                zIndex={zIndex}
                pct={pct}
                onBlockMouseDown={handleBlockMouseDown}
                startRectDrag={startRectDrag}
                isDashed={isDashed}
              />
            );
          }

          return (
            <RectEllipsePrimitive
              key={ub.id}
              ub={ub as any}
              active={active}
              zIndex={zIndex}
              pct={pct}
              onBlockMouseDown={handleBlockMouseDown}
              startRectDrag={startRectDrag}
              isDashed={isDashed}
            />
          );
        }

        return null;
      })}
    </>
  );
}
