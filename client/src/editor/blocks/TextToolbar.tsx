// client/src/editor/blocks/TextToolbar.tsx
import React from "react";
import { useEditor } from "../../state/editor";

type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
};

type Props = {
  blockId: string;
  style?: TextStyle; // kept for backward compatibility; we also read the live block from the store
};

const families = [
  { label: "System", value: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, Cambria, 'Times New Roman', Times, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace" },
] as const;

export default function TextToolbar({ blockId, style }: Props) {
  const { updateUserBlock, draft, pageIndex } = useEditor();

  // Resolve the live user block to access blockStyle.meta.badge even if parent didn't pass it in props
  const page = (draft as any)?.pageInstances?.[pageIndex];
  const ub = Array.isArray(page?.userBlocks)
    ? page.userBlocks.find((b: any) => b?.id === blockId)
    : null;

  const liveStyle: TextStyle = (ub?.style as TextStyle) || style || {};
  const blockStyle = (ub as any)?.blockStyle || {};
  const meta = blockStyle?.meta ?? {};
  const badge = meta.badge ?? {};
  const badgeVisible: boolean = !!badge.visible;
  const badgeText: string = badge.text ?? "";

  // Merge patch into existing text style
  const setText = (patch: Partial<TextStyle>) =>
    updateUserBlock(blockId, { style: { ...(liveStyle || {}), ...patch } });

  // Update badge in blockStyle.meta
  const setBadge = (patch: { visible?: boolean; text?: string }) => {
    const nextMeta = { ...meta, badge: { ...(meta.badge ?? {}), ...patch } };
    updateUserBlock(blockId, { blockStyle: { ...blockStyle, meta: nextMeta } } as any);
  };

  return (
    <div className="flex items-center gap-2 bg-white/95 border shadow-sm rounded px-2 py-1 flex-wrap">
      {/* Font family */}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={liveStyle.fontFamily || families[0].value}
        onChange={(e) => setText({ fontFamily: e.target.value })}
        title="Font family"
      >
        {families.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Size */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="border rounded px-2 h-8"
          onClick={() => setText({ fontSize: Math.max(8, (liveStyle.fontSize || 14) - 1) })}
          title="Smaller"
        >
          −
        </button>
        <input
          type="number"
          min={8}
          max={96}
          className="w-14 border rounded px-2 py-1 text-sm"
          value={liveStyle.fontSize ?? 14}
          onChange={(e) => setText({ fontSize: Math.min(96, Math.max(8, Number(e.target.value || 14))) })}
          title="Font size (px)"
        />
        <button
          type="button"
          className="border rounded px-2 h-8"
          onClick={() => setText({ fontSize: Math.min(96, (liveStyle.fontSize || 14) + 1) })}
          title="Larger"
        >
          +
        </button>
      </div>

      {/* Color */}
      <input
        type="color"
        className="w-9 h-8 border rounded"
        value={liveStyle.color || "#111827"}
        onChange={(e) => setText({ color: e.target.value })}
        title="Text color"
      />

      {/* B / I / U */}
      <button
        type="button"
        className={`border rounded px-2 h-8 ${liveStyle.bold ? "bg-gray-100" : ""}`}
        onClick={() => setText({ bold: !liveStyle.bold })}
        title="Bold (Cmd/Ctrl+B)"
      >
        B
      </button>
      <button
        type="button"
        className={`border rounded px-2 h-8 italic ${liveStyle.italic ? "bg-gray-100" : ""}`}
        onClick={() => setText({ italic: !liveStyle.italic })}
        title="Italic (Cmd/Ctrl+I)"
      >
        I
      </button>
      <button
        type="button"
        className={`border rounded px-2 h-8 underline ${liveStyle.underline ? "bg-gray-100" : ""}`}
        onClick={() => setText({ underline: !liveStyle.underline })}
        title="Underline (Cmd/Ctrl+U)"
      >
        U
      </button>

      {/* Align */}
      <div className="flex items-center gap-1">
        {(["left", "center", "right", "justify"] as const).map((a) => (
          <button
            type="button"
            key={a}
            className={`border rounded px-2 h-8 ${liveStyle.align === a ? "bg-gray-100" : ""}`}
            onClick={() => setText({ align: a })}
            title={`Align ${a}`}
          >
            {a[0].toUpperCase()}
          </button>
        ))}
      </div>

      {/* Line height */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        LH
        <input
          type="number"
          step="0.1"
          min={0.8}
          max={3}
          className="w-16 border rounded px-2 py-1 text-sm"
          value={liveStyle.lineHeight ?? 1.4}
          onChange={(e) => setText({ lineHeight: Number(e.target.value || 1.4) })}
          title="Line height"
        />
      </label>

      {/* Letter spacing */}
      <label className="flex items-center gap-1 text-xs text-gray-600">
        LS
        <input
          type="number"
          step="0.5"
          min={-2}
          max={10}
          className="w-16 border rounded px-2 py-1 text-sm"
          value={liveStyle.letterSpacing ?? 0}
          onChange={(e) => setText({ letterSpacing: Number(e.target.value || 0) })}
          title="Letter spacing (px)"
        />
      </label>

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
