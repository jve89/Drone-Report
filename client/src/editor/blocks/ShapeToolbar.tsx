// client/src/editor/blocks/ShapeToolbar.tsx
import React from "react";
import { useEditor } from "../../state/editor";

type ShapeKind = "line" | "rect" | "ellipse";

type Props = {
  blockId: string;
  kind: ShapeKind;
  // Accept either legacy 'style' or the canonical 'blockStyle' coming from Canvas
  style?: any;
  /** When true, hide the dashed toggle (used for image user elements). */
  hideDashed?: boolean;
};

export default function ShapeToolbar({ blockId, kind, style, hideDashed }: Props) {
  const { updateUserBlock } = useEditor();

  // -------- Stroke normalization --------
  const strokeHex: string =
    style?.stroke?.color?.hex ??
    style?.strokeColor ??
    "#111827";

  const strokeW: number =
    Number.isFinite(style?.stroke?.width)
      ? style.stroke.width
      : Number.isFinite(style?.strokeWidth)
      ? style.strokeWidth
      : 2;

  // Dash is simplified to on/off (true if any dash > 0)
  const dashed: boolean =
    Array.isArray(style?.stroke?.dash)
      ? style.stroke.dash.some((n: any) => Number(n) > 0)
      : Number(style?.dash) > 0;

  // Compose a full stroke blockStyle so we don't clobber sibling keys
  const composeStroke = (patch: any) => {
    const prevStroke = style?.stroke ?? {};
    return {
      stroke: {
        ...prevStroke,
        width: strokeW,
        color: { hex: strokeHex },
        // Keep current dashed state unless overridden
        dash: dashed ? [6, 6] : [],
        ...patch,
      },
    };
  };

  // Setters that preserve the rest of blockStyle
  const setStrokeHex = (hex: string) =>
    updateUserBlock(blockId, { blockStyle: composeStroke({ color: { hex } }) } as any);

  const setStrokeW = (n: number) =>
    updateUserBlock(blockId, { blockStyle: composeStroke({ width: n }) } as any);

  const setDashed = (on: boolean) =>
    updateUserBlock(blockId, { blockStyle: composeStroke({ dash: on ? [6, 6] : [] }) } as any);

  // -------- Badge (tag) controls --------
  const badge = style?.meta?.badge ?? {};
  const badgeVisible: boolean = !!badge.visible;
  const badgeText: string = badge.text ?? "";

  const setBadge = (patch: { visible?: boolean; text?: string }) => {
    const prevMeta = style?.meta ?? {};
    const next = {
      ...prevMeta,
      badge: { ...(prevMeta.badge ?? {}), ...patch },
    };
    updateUserBlock(blockId, { blockStyle: { meta: next } } as any);
  };

  return (
    <div className="flex items-center gap-3 bg-white/95 border shadow-sm rounded px-2 py-1">
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

      {/* Dash on/off — hidden for image user elements via hideDashed */}
      {!hideDashed && (
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Dashed
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={dashed}
            onChange={(e) => setDashed(e.target.checked)}
            title="Dashed border"
          />
        </label>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Badge visibility */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        Show tag
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={badgeVisible}
          onChange={(e) => setBadge({ visible: e.target.checked })}
          title="Toggle tag badge"
        />
      </label>

      {/* Badge text */}
      <input
        type="text"
        className="border rounded px-2 py-1 text-sm w-28"
        placeholder="Tag ID"
        value={badgeText}
        onChange={(e) => setBadge({ text: e.target.value })}
        title="Tag text"
      />
    </div>
  );
}
