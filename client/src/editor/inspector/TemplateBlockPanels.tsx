// client/src/editor/inspector/TemplateBlockPanels.tsx
import React from "react";

/** Local types (mirror BlockViewer/Inspector originals) */
type Rect = { x: number; y: number; w: number; h: number };
type BlockBase = { id: string; type: string; rect: Rect; label?: string; placeholder?: string; options?: any };
type BlockText = BlockBase & { type: "text" };
type BlockImage = BlockBase & { type: "image_slot" };
type BlockTable = BlockBase & { type: "table"; options?: { columns?: { key: string; label: string }[] } };
type BlockBadge = BlockBase & { type: "badge"; options?: { palette?: string } };
type BlockRepeater = BlockBase & { type: "repeater"; options?: { previewCount?: number } };
type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater;

const isText = (b: BlockBase): b is BlockText => b.type === "text";
const isImage = (b: BlockBase): b is BlockImage => b.type === "image_slot";
const isTable = (b: BlockBase): b is BlockTable => b.type === "table";
const isBadge = (b: BlockBase): b is BlockBadge => b.type === "badge";
const isRepeater = (b: BlockBase): b is BlockRepeater => b.type === "repeater";

export function TemplateBlocksInspector({
  tPageBlocks, selectedBlockId, pageId, values,
  setSelectedBlock, setValue, guideEnabled, guideNext,
}: {
  tPageBlocks: BlockBase[];
  selectedBlockId: string | null;
  pageId: string;
  values: any;
  setSelectedBlock: (id: string | null) => void;
  setValue: (pageId: string, blockId: string, value: any) => void;
  guideEnabled: boolean;
  guideNext: () => void;
}) {
  const allBlocks = (tPageBlocks ?? []) as Block[];
  const targetBlocks = selectedBlockId ? allBlocks.filter((b) => b.id === selectedBlockId) : allBlocks;

  const advanceIfActive = (id: string) => {
    if (guideEnabled && selectedBlockId === id) guideNext();
  };

  return (
    <>
      {selectedBlockId && (
        <div className="text-[11px] text-gray-500 -mt-1">
          Editing block: <code>{selectedBlockId}</code>
        </div>
      )}

      {targetBlocks.map((b) => {
        const v = values?.[b.id];

        if (isText(b)) {
          return (
            <div key={b.id} className="space-y-1">
              <div className="text-xs text-gray-600">
                {b.label || "Text"} <span className="text-[10px] text-gray-400">(plain or <code>{"{{"}binding{"}}"}</code>)</span>
              </div>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={typeof v === "string" ? v : ""}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(pageId, b.id, e.target.value)}
                onBlur={() => advanceIfActive(b.id)}
                placeholder={b.placeholder || ""}
              />
            </div>
          );
        }

        if (isBadge(b)) {
          const val = v && typeof v === "object" ? (v as { label?: string; color?: string }) : {};
          const label = val.label ?? "";
          const color = val.color ?? "gray";
          return (
            <div key={b.id} className="space-y-1">
              <div className="text-xs text-gray-600">{b.label || "Badge"}</div>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={label}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(pageId, b.id, { ...val, label: e.target.value })}
                onBlur={() => advanceIfActive(b.id)}
                placeholder="Label"
              />
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={color}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(pageId, b.id, { ...val, color: e.target.value })}
                onBlur={() => advanceIfActive(b.id)}
              >
                <option value="gray">Gray</option>
                <option value="blue">Blue</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
                <option value="green">Green</option>
              </select>
            </div>
          );
        }

        if (isTable(b)) {
          const rows: any[] = Array.isArray(v) ? v : [];
          const cols = (b.options?.columns ?? []) as { key: string; label: string }[];
          return (
            <div key={b.id} className="space-y-1">
              <div className="text-xs text-gray-600">{b.label || "Table"}</div>
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {cols.map((c) => (
                        <th key={c.key} className="px-2 py-1 text-left border-b">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} className="border-b">
                        {cols.map((c) => (
                          <td key={c.key} className="px-2 py-1">
                            <input
                              className="w-full border rounded px-1 py-0.5"
                              value={r?.[c.key] ?? ""}
                              onFocus={() => setSelectedBlock(b.id)}
                              onChange={(e) => {
                                const next = rows.slice();
                                next[ri] = { ...(next[ri] || {}), [c.key]: e.target.value };
                                setValue(pageId, b.id, next);
                              }}
                              onBlur={() => advanceIfActive(b.id)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button className="px-2 py-1 border rounded text-xs" onClick={() => { setSelectedBlock(b.id); setValue(pageId, b.id, rows.concat({})); }}>
                  Add row
                </button>
                <button className="px-2 py-1 border rounded text-xs disabled:opacity-50" disabled={!rows.length}
                  onClick={() => { setSelectedBlock(b.id); setValue(pageId, b.id, rows.slice(0, -1)); }}>
                  Remove last
                </button>
              </div>
            </div>
          );
        }

        if (isRepeater(b)) {
          const val = v && typeof v === "object" ? (v as { count?: number }) : {};
          return (
            <div key={b.id} className="space-y-1">
              <div className="text-xs text-gray-600">{b.label || "Repeater"}</div>
              <label className="text-xs text-gray-500">Preview count</label>
              <input
                type="number" min={0}
                className="w-full border rounded px-2 py-1 text-sm"
                value={Number(val.count ?? 0)}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(pageId, b.id, { ...val, count: Number(e.target.value || 0) })}
                onBlur={() => advanceIfActive(b.id)}
              />
            </div>
          );
        }

        if (isImage(b)) {
          const val = typeof v === "string" ? v : "";
          return (
            <div key={b.id} className="space-y-2">
              <div className="text-xs text-gray-600">
                {b.label || "Image"} <span className="text-[10px] text-gray-400">(URL or <code>{"{{"}binding{"}}"}</code>)</span>
              </div>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={val}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(pageId, b.id, e.target.value)}
                onBlur={() => advanceIfActive(b.id)}
                placeholder="https://… or {{run.logoUrl}}"
              />
              <div className="text-[11px] text-gray-500">
                Tip: if the value contains <code>{"{{"}</code> it will render as a binding.
              </div>
            </div>
          );
        }

        return null;
      })}
    </>
  );
}
