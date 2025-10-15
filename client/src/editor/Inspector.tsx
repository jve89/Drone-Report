// client/src/editor/Inspector.tsx
import { useEditor } from "../state/editor";
import { BLOCK_DEFS, BlockKind } from "./blocks/defs";

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
    bringForward, sendBackward, updateBlockProps,
  } = useEditor();

  if (!draft || !template) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-gray-500">Select a template to edit properties.</div>
      </div>
    );
  }

  const page = draft.pageInstances?.[pageIndex];
  if (!page) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-gray-500">No page selected.</div>
      </div>
    );
  }

  const tPage = (template.pages || []).find((p: any) => p.id === page.templatePageId);
  if (!tPage) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-red-600">Template page not found.</div>
      </div>
    );
  }

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
      const meta = (ub as any)?.blockStyle?.meta as { blockKind?: BlockKind; payload?: any; props?: any } | undefined;

      // Section blocks (editable props)
      if (meta?.blockKind) {
        const kind = meta.blockKind as keyof typeof BLOCK_DEFS;
        const def = BLOCK_DEFS[kind];
        if (!def) {
          return (
            <div className="p-3 space-y-3">
              <div className="text-sm font-medium">Inspector</div>
              <div className="text-[11px] text-gray-500 -mt-1">
                Section block: <code>{String(kind)}</code>
              </div>
              <div className="text-xs text-red-600">Unknown block kind.</div>
              <div className="flex gap-2 pt-1">
                <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
                <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
                <div className="flex-1" />
                <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
              </div>
            </div>
          );
        }

        // Merge defaults with saved props
        const props = { ...(def.defaultProps ?? {}), ...(meta.props ?? {}) } as Record<string, any>;

        // --- Simplified, user-friendly inspector for IMAGE section blocks -----------
        if (kind === "image") {
          const p = props;
          // Prefer the first non-empty string across props, payload, or legacy fields.
          // Avoid `??` here because `""` is *not* a usable image and would stop the chain.
          const pickFirstString = (...vals: any[]) =>
            vals.find((s) => typeof s === "string" && s.trim().length > 0) || "";

          const currentSrc = pickFirstString(
            p.src,
            p.url,
            meta?.payload?.src,
            meta?.payload?.url,
            (ub as any).src,
            (ub as any).url,
            (ub as any).media?.url
          ) as string;

          // When uploading from the inspector, write to BOTH places to keep things in sync.
          const onPickLocal = (file: File | null) => {
            if (!file) return;
            const url = URL.createObjectURL(file);
            // write BOTH keys (src & url) so whichever the renderer reads will match
            updateBlockProps(ub.id, { src: url, url }); // props
            updateUserBlock(ub.id, {
              src: url,
              url,
              media: { url },
              blockStyle: {
                ...(ub as any).blockStyle,
                meta: {
                  ...(meta ?? {}),
                  payload: { ...(meta?.payload ?? {}), src: url, url },
                  props:   { ...(meta?.props   ?? {}), src: url, url },
                },
              },
            } as any);
          };

          const onClearImage = () => {
            updateUserBlock(
              ub.id,
              {
                src: "",
                url: "",
                media: undefined,
                blockStyle: {
                  ...(ub as any).blockStyle,
                  meta: {
                    ...(meta ?? {}),
                    payload: { ...(meta?.payload ?? {}), src: "", url: "" },
                    props:   { ...(meta?.props   ?? {}), src: "", url: "" },
                  },
                },
              } as any
            );
          };

          return (
            <div className="p-3 space-y-4">
              <div className="text-sm font-medium">Inspector</div>
              <div className="text-[11px] text-gray-500 -mt-1">Image block</div>

              {/* Image picker */}
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Image</div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 cursor-pointer">
                    {currentSrc ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickLocal(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-50"
                    onClick={onClearImage}
                    disabled={!currentSrc}
                    title="Remove image"
                  >
                    Remove
                  </button>

                  {currentSrc ? (
                    <span className="text-[11px] text-gray-500 truncate max-w-[140px]">Selected</span>
                  ) : (
                    <span className="text-[11px] text-gray-400">No image selected</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  Tip: You can also drag an image from the Media panel onto the block.
                </div>
              </div>

              {/* Fit */}
              <div>
                <div className="text-xs text-gray-600">Object fit</div>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={p.fit ?? "contain"}
                  onChange={(e) => updateBlockProps(ub.id, { fit: e.target.value })}
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="scale-down">Scale down</option>
                </select>
              </div>

              {/* Style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-600">Opacity (%)</div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                    value={Number.isFinite(p.opacity) ? p.opacity : 100}
                    onChange={(e) =>
                      updateBlockProps(ub.id, {
                        opacity: Math.max(0, Math.min(100, Number(e.target.value || 0))),
                      })
                    }
                  />
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {Number.isFinite(p.opacity) ? p.opacity : 100}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Border radius (px)</div>
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={Number.isFinite(p.borderRadius) ? p.borderRadius : 0}
                    onChange={(e) =>
                      updateBlockProps(ub.id, { borderRadius: Math.max(0, Number(e.target.value || 0)) })
                    }
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>
                  Bring forward
                </button>
                <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>
                  Send backward
                </button>
                <div className="flex-1" />
                <button
                  className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50"
                  onClick={onDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        }
        // ---------------------------------------------------------------------------

        return (
          <div className="p-3 space-y-3">
            <div className="text-sm font-medium">Inspector</div>
            <div className="text-[11px] text-gray-500 -mt-1">
              Section block: <code>{String(kind)}</code>
            </div>

            {/* Dynamic props form */}
            <div className="space-y-2">
              {def.inspectorFields.map((f) => {
                if (f.type === "checkbox") {
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!props[f.key]}
                        onChange={(e) => updateBlockProps(ub.id, { [f.key]: e.target.checked })}
                      />
                      <span>{f.label}</span>
                    </label>
                  );
                }
                if (f.type === "number") {
                  return (
                    <div key={f.key}>
                      <div className="text-xs text-gray-600">{f.label}</div>
                      <input
                        type="number"
                        className="w-full border rounded px-2 py-1 text-sm"
                        min={f.min ?? 0}
                        max={f.max ?? 999}
                        step={f.step ?? 1}
                        value={Number.isFinite(Number(props[f.key])) ? Number(props[f.key]) : 0}
                        onChange={(e) =>
                          updateBlockProps(ub.id, {
                            [f.key]: Math.max(
                              f.min ?? -Infinity,
                              Math.min(f.max ?? Infinity, Number(e.target.value || 0))
                            ),
                          })
                        }
                      />
                    </div>
                  );
                }
                if (f.type === "text") {
                  return (
                    <div key={f.key}>
                      <div className="text-xs text-gray-600">{f.label}</div>
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={props[f.key] ?? ""}
                        onChange={(e) => updateBlockProps(ub.id, { [f.key]: e.target.value })}
                      />
                    </div>
                  );
                }
                if ((f as any).type === "select") {
                  const rawOpts = (f as any).options;
                  const opts = Array.isArray(rawOpts) ? rawOpts : (rawOpts ? [rawOpts] : []);
                  const current = props[f.key] ?? (opts[0]?.value ?? "");
                  return (
                    <div key={f.key}>
                      <div className="text-xs text-gray-600">{f.label}</div>
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={current}
                        onChange={(e) => updateBlockProps(ub.id, { [f.key]: e.target.value })}
                      >
                        {opts.map((o: any) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Summary */}
            <div>
              <div className="text-xs text-gray-600">Summary</div>
              <pre className="text-[11px] bg-gray-50 border rounded p-2 overflow-auto max-h-40">
              {JSON.stringify({ payload: meta.payload ?? {}, props }, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2">
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
              <div className="flex-1" />
              <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
            </div>
          </div>
        );
      }

      // Primitive element panel
      return (
        <div className="p-3 space-y-3">
          <div className="text-sm font-medium">Inspector</div>
          <div className="text-[11px] text-gray-500 -mt-1">
            Editing element: <code>{ub.type}</code>
          </div>

          <div className="flex gap-2 pt-1">
            <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd} title="Bring forward">Bring forward</button>
            <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack} title="Send backward">Send backward</button>
            <div className="flex-1" />
            <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete} title={`Delete ${titleCase(ub.type)}`}>Delete</button>
          </div>

          {ub.type === "text" && (
            <>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Text</div>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
                  value={(ub as any).value || ""}
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
                      value={Number((ub as any).rect?.[k] ?? 0).toString()}
                      onChange={(e) => {
                        const num = Number(e.target.value || 0);
                        updateUserBlock(ub.id, { rect: { ...((ub as any).rect || { x: 0, y: 0, w: 0, h: 0 }), [k]: num } as any });
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
              <div className="text-xs text-gray-600">
                {b.label || "Text"} <span className="text-[10px] text-gray-400">(plain or <code>{"{{"}binding{"}}"}</code>)</span>
              </div>
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

        if (isImage(b)) {
          const val = typeof v === "string" ? v : "";
          return (
            <div key={b.id} className="space-y-1">
              <div className="text-xs text-gray-600">
                {b.label || "Image"} <span className="text-[10px] text-gray-400">(URL or <code>{"{{"}binding{"}}"}</code>)</span>
              </div>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={val}
                onFocus={() => setSelectedBlock(b.id)}
                onChange={(e) => setValue(page.id, b.id, e.target.value)}
                onBlur={advanceIfActive}
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
    </div>
  );
}
