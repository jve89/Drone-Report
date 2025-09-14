// client/src/editor/blocks/TextToolbar.tsx
import React from "react";
import { useEditor } from "../../state/editorStore";

type Props = {
  blockId: string;
  style: {
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
};

const families = [
  { label: "System", value: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, Cambria, 'Times New Roman', Times, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace" },
];

export default function TextToolbar({ blockId, style }: Props) {
  const { updateUserBlock } = useEditor();
  const s = style || {};

  const set = (patch: Partial<Props["style"]>) =>
    updateUserBlock(blockId, { style: patch });

  return (
    <div className="flex items-center gap-2 bg-white/95 border shadow-sm rounded px-2 py-1">
      {/* Font family */}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={s.fontFamily || families[0].value}
        onChange={(e) => set({ fontFamily: e.target.value })}
        title="Font family"
      >
        {families.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>

      {/* Size */}
      <div className="flex items-center gap-1">
        <button className="border rounded px-2 h-8" onClick={() => set({ fontSize: Math.max(8, (s.fontSize || 14) - 1) })} title="Smaller">−</button>
        <input
          type="number"
          className="w-14 border rounded px-2 py-1 text-sm"
          value={s.fontSize ?? 14}
          onChange={(e) => set({ fontSize: Number(e.target.value || 14) })}
          title="Font size (px)"
        />
        <button className="border rounded px-2 h-8" onClick={() => set({ fontSize: Math.min(96, (s.fontSize || 14) + 1) })} title="Larger">+</button>
      </div>

      {/* Color */}
      <input
        type="color"
        className="w-9 h-8 border rounded"
        value={s.color || "#111827"}
        onChange={(e) => set({ color: e.target.value })}
        title="Text color"
      />

      {/* B / I / U */}
      <button className={`border rounded px-2 h-8 ${s.bold ? "bg-gray-100" : ""}`} onClick={() => set({ bold: !s.bold })} title="Bold (Cmd/Ctrl+B)">B</button>
      <button className={`border rounded px-2 h-8 italic ${s.italic ? "bg-gray-100" : ""}`} onClick={() => set({ italic: !s.italic })} title="Italic (Cmd/Ctrl+I)">I</button>
      <button className={`border rounded px-2 h-8 underline ${s.underline ? "bg-gray-100" : ""}`} onClick={() => set({ underline: !s.underline })} title="Underline (Cmd/Ctrl+U)">U</button>

      {/* Align */}
      <div className="flex items-center gap-1">
        {(["left","center","right","justify"] as const).map(a => (
          <button
            key={a}
            className={`border rounded px-2 h-8 ${s.align === a ? "bg-gray-100" : ""}`}
            onClick={() => set({ align: a })}
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
          value={s.lineHeight ?? 1.4}
          onChange={(e) => set({ lineHeight: Number(e.target.value || 1.4) })}
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
          value={s.letterSpacing ?? 0}
          onChange={(e) => set({ letterSpacing: Number(e.target.value || 0) })}
          title="Letter spacing (px)"
        />
      </label>
    </div>
  );
}
