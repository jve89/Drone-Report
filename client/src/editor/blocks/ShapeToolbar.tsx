// client/src/editor/blocks/ShapeToolbar.tsx
import React from "react";
import { useEditor } from "../../state/editorStore";

type ShapeKind = "line" | "rect" | "divider";

type Props = {
  blockId: string;
  kind: ShapeKind;
  style?: {
    strokeColor?: string;
    strokeWidth?: number; // px
    dash?: number;        // px gap (0 = solid)
    fillColor?: string;   // for rect
  };
};

export default function ShapeToolbar({ blockId, kind, style }: Props) {
  const { updateUserBlock } = useEditor();
  const s = style || {};

  const set = (patch: Partial<Props["style"]>) =>
    updateUserBlock(blockId, { style: { ...(style || {}), ...patch } as any });

  return (
    <div className="flex items-center gap-2 bg-white/95 border shadow-sm rounded px-2 py-1">
      {/* Stroke color */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        Stroke
        <input
          type="color"
          className="w-9 h-8 border rounded"
          value={(s.strokeColor as string) || "#111827"}
          onChange={(e) => set({ strokeColor: e.target.value })}
          title="Stroke color"
        />
      </label>

      {/* Stroke width */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        W
        <input
          type="number"
          min={1}
          max={20}
          className="w-16 border rounded px-2 py-1 text-sm"
          value={Number.isFinite(s.strokeWidth) ? s.strokeWidth : 2}
          onChange={(e) => set({ strokeWidth: Number(e.target.value || 2) })}
          title="Stroke width (px)"
        />
      </label>

      {/* Dash */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        Dash
        <input
          type="number"
          min={0}
          max={20}
          className="w-16 border rounded px-2 py-1 text-sm"
          value={Number.isFinite(s.dash) ? s.dash : 0}
          onChange={(e) => set({ dash: Number(e.target.value || 0) })}
          title="Dash pattern (0 = solid)"
        />
      </label>

      {/* Fill for rectangles */}
      {kind === "rect" && (
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Fill
          <input
            type="color"
            className="w-9 h-8 border rounded"
            value={(s.fillColor as string) || "#ffffff"}
            onChange={(e) => set({ fillColor: e.target.value })}
            title="Fill color"
          />
        </label>
      )}
    </div>
  );
}
