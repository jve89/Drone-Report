// client/src/editor/blocks/ShapeToolbar.tsx
import React from "react";
import { useEditor } from "../../state/editorStore";

type ShapeKind = "line" | "rect" | "ellipse" | "divider";

type Props = {
  blockId: string;
  kind: ShapeKind;
  // Accept either legacy 'style' or the canonical 'blockStyle' coming from Canvas
  style?: any;
};

export default function ShapeToolbar({ blockId, kind, style }: Props) {
  const { updateUserBlock } = useEditor();

  // Normalize incoming style to a uniform view
  const strokeHex: string =
    style?.stroke?.color?.hex ??
    style?.strokeColor ??
    "#111827";
  const strokeW: number =
    Number.isFinite(style?.stroke?.width)
      ? style.stroke.width
      : Number.isFinite(style?.strokeWidth)
      ? style.strokeWidth
      : kind === "divider"
      ? 2
      : 2;
  const dashVal: number =
    Array.isArray(style?.stroke?.dash) && style.stroke.dash.length
      ? Number(style.stroke.dash[0])
      : Number.isFinite(style?.dash)
      ? Number(style.dash)
      : 0;
  const fillHex: string =
    style?.fill?.hex ??
    style?.fillColor ??
    (kind === "rect" || kind === "ellipse" ? "#ffffff" : "#ffffff");

  // Write into canonical blockStyle
  const setStrokeHex = (hex: string) =>
    updateUserBlock(blockId, {
      blockStyle: {
        stroke: { color: { hex } },
      } as any,
    });

  const setStrokeW = (n: number) =>
    updateUserBlock(blockId, {
      blockStyle: {
        stroke: { width: n },
      } as any,
    });

  const setDash = (n: number) =>
    updateUserBlock(blockId, {
      blockStyle: {
        stroke: { dash: n > 0 ? [n, n] : [] },
      } as any,
    });

  const setFillHex = (hex: string) =>
    updateUserBlock(blockId, {
      blockStyle: {
        fill: { hex },
      } as any,
    });

  return (
    <div className="flex items-center gap-2 bg-white/95 border shadow-sm rounded px-2 py-1">
      {/* Stroke color */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        Stroke
        <input
          type="color"
          className="w-9 h-8 border rounded"
          value={strokeHex}
          onChange={(e) => setStrokeHex(e.target.value)}
          title="Stroke color"
        />
      </label>

      {/* Stroke width */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        W
        <input
          type="number"
          min={1}
          max={32}
          className="w-16 border rounded px-2 py-1 text-sm"
          value={strokeW}
          onChange={(e) => setStrokeW(Math.max(1, Number(e.target.value || 1)))}
          title="Stroke width (px)"
        />
      </label>

      {/* Dash */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        Dash
        <input
          type="number"
          min={0}
          max={40}
          className="w-16 border rounded px-2 py-1 text-sm"
          value={dashVal}
          onChange={(e) => setDash(Math.max(0, Number(e.target.value || 0)))}
          title="Dash pattern (0 = solid)"
        />
      </label>

      {/* Fill for rectangles/ellipses */}
      {(kind === "rect" || kind === "ellipse") && (
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Fill
          <input
            type="color"
            className="w-9 h-8 border rounded"
            value={fillHex}
            onChange={(e) => setFillHex(e.target.value)}
            title="Fill color"
          />
        </label>
      )}
    </div>
  );
}
