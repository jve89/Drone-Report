// client/src/editor/Inspector.tsx
import { useEditor } from "../state/editorStore";

/** Local, file-scoped types to avoid mismatch with external unions */
type Rect = { x: number; y: number; w: number; h: number };
type BlockBase = { id: string; type: string; rect: Rect; label?: string; placeholder?: string; options?: any };
type BlockText = BlockBase & { type: "text" };
type BlockImage = BlockBase & { type: "image_slot" };
type BlockTable = BlockBase & { type: "table"; options?: { columns?: { key: string; label: string }[] } };
type BlockBadge = BlockBase & { type: "badge"; options?: { palette?: string } };
type BlockRepeater = BlockBase & { type: "repeater"; options?: { previewCount?: number } };
type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater;

/** User element type — flexible to cover shapes and text */
type UBCommon = {
  id: string;
  type: string; // "text" | "rect" | "ellipse" | "divider" | "line" | ...
  rect?: { x: number; y: number; w: number; h: number };
  points?: Array<{ x: number; y: number }>;
  rotation?: number;
  value?: string;
  style?: any;
  blockStyle?: any;
  z?: number;
};

/** Type guards */
function isText(b: BlockBase): b is BlockText { return b.type === "text"; }
function isImage(b: BlockBase): b is BlockImage { return b.type === "image_slot"; }
function isTable(b: BlockBase): b is BlockTable { return b.type === "table"; }
function isBadge(b: BlockBase): b is BlockBadge { return b.type === "badge"; }
function isRepeater(b: BlockBase): b is BlockRepeater { return b.type === "repeater"; }

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function Inspector() {
  const {
    draft, template, pageIndex,
    setValue, selectedBlockId, setSelectedBlock, guide, guideNext,
    // User elements
    selectedUserBlockId, selectUserBlock, updateUserBlock, deleteUserBlock,
    bringForward, sendBackward,
  } = useEditor();

  if (!draft || !template) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-gray-500">Select a template to edit properties.</div>
      </div>
    );
  }

  const page = draft.pageInstances[pageIndex];
  const tPage = template.pages.find((p: any) => p.id === page.templatePageId);
  if (!tPage) return null;

  // If a user element is selected, show its panel and short-circuit.
  if (selectedUserBlockId) {
    const list: UBCommon[] = Array.isArray((page as any).userBlocks) ? (page as any).userBlocks : [];
    const ub = list.find((b) => b.id === selectedUserBlockId);
    if (!ub) {
      // stale selection
      selectUserBlock(null);
    } else {
      const onDelete = () => { deleteUserBlock(ub.id); selectUserBlock(null); };
      const onBringFwd = () => bringForward(ub.id);
      const onSendBack = () => sendBackward(ub.id);

      return (
        <div className="p-3 space-y-3">
          <div className="text-sm font-medium">Inspector</div>
          <div className="text-[11px] text-gray-500 -mt-1">
            Editing element: <code>{ub.type}</code>
          </div>

          {/* Quick actions for any element */}
          <div className="flex gap-2 pt-1">
            <button
              className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
              onClick={onBringFwd}
              title="Bring forward"
            >
              Bring forward
            </button>
            <button
              className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
              onClick={onSendBack}
              title="Send backward"
            >
              Send backward
            </button>
            <div className="flex-1" />
            <button
              className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50"
              onClick={onDelete}
              title={`Delete ${titleCase(ub.type)}`}
            >
              Delete
            </button>
          </div>

          {/* Type-specific controls */}
          {ub.type === "text" && (
            <>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Text</div>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
                  value={ub.value || ""}
                  onChange={(e) => updateUserBlock(ub.id, { value: e.target.value })}
                  placeholder="Type here…"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <div key={k}>
                    <div className="text-[11px] text-gray-500 uppercase">{k}</div>
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1 text-sm"
                      min={0}
                      max={100}
                      value={Number(ub.rect?.[k] ?? 0).toString()}
                      onChange={(e) => {
                        const num = Number(e.target.value || 0);
                        updateUserBlock(ub.id, { rect: { ...(ub.rect || { x: 0, y: 0, w: 0, h: 0 }), [k]: num } });
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
  }

  // Template inspector as before
  const allBlocks = (tPage.blocks ?? []) as BlockBase[] as Block[];
  const targetBlocks =
    selectedBlockId ? allBlocks.filter((b) => b.id === selectedBlockId) : allBlocks;

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Inspector</div>

      {selectedBlockId && (
        <div className="text-[11px] text-gray-500 -mt-1">Editing block: <code>{selectedBlockId}</code></div>
      )}

      {targetBlocks.map((b) => {
        const v = (page.values as any)?.[b.id];
        const advanceIfActive = () => {
          if (guide?.enabled && selectedBlockId === b.id) guideNext();
        };

        if (isText(b)) {
          return (
            <div key={b.id} className="space-y-1">
              <div className="text-xs text-gray-600">{b.label || "Text"}</div>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={typeof v === "string" ? v : ""}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(page.id, b.id, e.target.value)}
                onBlur={advanceIfActive}
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
                onChange={(e) => setValue(page.id, b.id, { ...val, label: e.target.value })}
                onBlur={advanceIfActive}
                placeholder="Label"
              />
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={color}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(page.id, b.id, { ...val, color: e.target.value })}
                onBlur={advanceIfActive}
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
                                setValue(page.id, b.id, next);
                              }}
                              onBlur={advanceIfActive}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => { setSelectedBlock(b.id); setValue(page.id, b.id, rows.concat({})); }}
                >
                  Add row
                </button>
                <button
                  className="px-2 py-1 border rounded text-xs disabled:opacity-50"
                  disabled={!rows.length}
                  onClick={() => { setSelectedBlock(b.id); setValue(page.id, b.id, rows.slice(0, -1)); }}
                >
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
                onChange={(e) => setValue(page.id, b.id, { ...val, count: Number(e.target.value || 0) })}
                onBlur={advanceIfActive}
              />
            </div>
          );
        }

        // image_slot edited inline on canvas
        if (isImage(b)) return null;

        return null;
      })}
    </div>
  );
}
