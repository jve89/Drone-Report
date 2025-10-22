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
  /** legacy inline style */
  style?: any;
  /** canonical style container used by canvas & toolbars */
  blockStyle?: any;
  z?: number;
};

/** Type guards for template blocks */
function isText(b: BlockBase): b is BlockText { return b.type === "text"; }
function isImage(b: BlockBase): b is BlockImage { return b.type === "image_slot"; }
function isTable(b: BlockBase): b is BlockTable { return b.type === "table"; }
function isBadge(b: BlockBase): b is BlockBadge { return b.type === "badge"; }
function isRepeater(b: BlockBase): b is BlockRepeater { return b.type === "repeater"; }

/** Small helpers */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const numOr = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Read helpers for blockStyle (shapes & image) */
function readStroke(style: any) {
  const color = style?.stroke?.color?.hex ?? style?.strokeColor ?? "#111827";
  const width = Number.isFinite(style?.stroke?.width)
    ? style.stroke.width
    : Number.isFinite(style?.strokeWidth)
    ? style.strokeWidth
    : 2;
  const dashArr: number[] = Array.isArray(style?.stroke?.dash)
    ? style.stroke.dash.map(Number).filter((n: any) => Number.isFinite(n))
    : Number.isFinite(style?.dash)
    ? [Number(style.dash), Number(style.dash)]
    : [];
  const dashed = dashArr.some((n) => n > 0);
  const dashLength = dashed ? (dashArr[0] ?? 6) : 6;
  return { color, width, dashed, dashLength };
}

function readFill(style: any) {
  const hex = style?.fill?.color?.hex ?? style?.fillColor ?? "#ffffff";
  return { hex };
}

function readOpacity(style: any) {
  const o = style?.opacity;
  if (typeof o === "number" && o >= 0 && o <= 1) return o;
  if (typeof o === "number" && o > 1 && o <= 100) return clamp(o / 100, 0, 1);
  return 1;
}

function readRadius(style: any) {
  const r = style?.radius ?? style?.borderRadius ?? 0;
  return numOr(r, 0);
}

/** Compose helpers (never clobber siblings) */
function composeBlockStyle(prev: any, patch: any) {
  return { ...(prev || {}), ...patch };
}

function composeStroke(prevStyle: any, patch: any) {
  const prevStroke = prevStyle?.stroke ?? {};
  return composeBlockStyle(prevStyle, {
    stroke: { ...prevStroke, ...patch },
  });
}

function composeFill(prevStyle: any, hex: string | null) {
  if (!hex) return composeBlockStyle(prevStyle, { fill: undefined });
  const prevFill = prevStyle?.fill ?? {};
  return composeBlockStyle(prevStyle, {
    fill: { ...prevFill, color: { hex } },
  });
}

function composeOpacity(prevStyle: any, opacity01: number) {
  return composeBlockStyle(prevStyle, { opacity: clamp(opacity01, 0, 1) });
}

function composeRadius(prevStyle: any, r: number) {
  return composeBlockStyle(prevStyle, { radius: Math.max(0, Math.round(r)) });
}

/** Image meta helpers */
function readImageMeta(ub: UBCommon) {
  const meta = (ub as any)?.blockStyle?.meta ?? {};
  const props = meta.props ?? {};
  const fit: "contain" | "cover" | "scale-down" = (props.fit as any) || "contain";
  const zoom = clamp(numOr(props.zoom, 100), 10, 500); // percent for UX
  return { meta, props, fit, zoom };
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

  const page = (draft.pageInstances?.[pageIndex] as any) || null;
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

  /** ---------- USER ELEMENTS (Text / Line / Rect / Ellipse / Image) ---------- */
  if (selectedUserBlockId) {
    const list: UBCommon[] = Array.isArray(page.userBlocks) ? page.userBlocks : [];
    const ub = list.find((b) => b.id === selectedUserBlockId) as UBCommon | undefined;
    if (!ub) {
      // stale selection
      selectUserBlock(null);
    } else {
      const onDelete = () => { deleteUserBlock(ub.id); selectUserBlock(null); };
      const onBringFwd = () => bringForward(ub.id);
      const onSendBack = () => sendBackward(ub.id);

      const blockStyle = (ub as any).blockStyle ?? (ub as any).style ?? {};
      const isImageUserElement = (blockStyle?.meta?.blockKind === "image");

      /** --- IMAGE FIRST: short-circuit if image user element --- */
      if (isImageUserElement) {
        const { meta, props, fit, zoom } = readImageMeta(ub);

        // Read current values from meta.props (source of truth for Canvas)
        const oPct = clamp(numOr(props.opacity, 100), 0, 100);
        const rpx = numOr(props.borderRadius, 0);

        const setFit = (next: "contain" | "cover" | "scale-down") =>
          updateUserBlock(
            ub.id,
            {
              blockStyle: composeBlockStyle(blockStyle, {
                meta: {
                  ...(blockStyle?.meta ?? {}),
                  props: { ...(blockStyle?.meta?.props ?? {}), fit: next },
                },
              }),
            } as any
          );

        const setZoom = (pct: number) =>
          updateUserBlock(
            ub.id,
            {
              blockStyle: composeBlockStyle(blockStyle, {
                meta: {
                  ...(blockStyle?.meta ?? {}),
                  props: { ...(blockStyle?.meta?.props ?? {}), zoom: clamp(Math.round(pct), 10, 500) },
                },
              }),
            } as any
          );

        const resetZoom = () =>
          updateUserBlock(
            ub.id,
            {
              blockStyle: composeBlockStyle(blockStyle, {
                meta: {
                  ...(blockStyle?.meta ?? {}),
                  props: { ...(blockStyle?.meta?.props ?? {}), zoom: 100 },
                },
              }),
            } as any
          );

        // WRITE to meta.props.opacity (0–100)
        const setImgOpacity = (pct: number) =>
          updateUserBlock(
            ub.id,
            {
              blockStyle: composeBlockStyle(blockStyle, {
                meta: {
                  ...(blockStyle?.meta ?? {}),
                  props: { ...(blockStyle?.meta?.props ?? {}), opacity: clamp(Math.round(pct), 0, 100) },
                },
              }),
            } as any
          );

        // WRITE to meta.props.borderRadius (px)
        const setImgRadius = (n: number) =>
          updateUserBlock(
            ub.id,
            {
              blockStyle: composeBlockStyle(blockStyle, {
                meta: {
                  ...(blockStyle?.meta ?? {}),
                  props: { ...(blockStyle?.meta?.props ?? {}), borderRadius: Math.max(0, Math.round(n)) },
                },
              }),
            } as any
          );

        return (
          <div className="p-3 space-y-4">
            <div className="text-sm font-medium">Inspector</div>

            {/* Fit */}
            <div>
              <div className="text-xs text-gray-600">Object fit</div>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={fit}
                onChange={(e) => setFit(e.target.value as any)}
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="scale-down">Scale down</option>
              </select>
            </div>

            {/* Zoom */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600">Zoom</div>
                <div className="text-[11px] text-gray-500 ml-auto">{zoom}%</div>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={1}
                className="w-full"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value || 100))}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
                  onClick={resetZoom}
                >
                  Reset
                </button>
                <div className="text-[11px] text-gray-500">
                  Tip: When zoom &gt; 100%, drag the image to pan.
                </div>
              </div>
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
                  value={oPct}
                  onChange={(e) => setImgOpacity(Number(e.target.value || 100))}
                />
                <div className="text-[11px] text-gray-500 mt-0.5">{oPct}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Border radius (px)</div>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={rpx}
                  onChange={(e) => setImgRadius(Number(e.target.value || 0))}
                />
              </div>
            </div>

            {/* z-order + delete */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
              <div className="flex-1" />
              <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
            </div>
          </div>
        );
      }

      /** --- TEXT --- */
      if (ub.type === "text") {
        const tStyle = (ub.style || {}) as {
          fontSize?: number;
          bold?: boolean; italic?: boolean; underline?: boolean;
          align?: "left" | "center" | "right" | "justify";
          color?: string; lineHeight?: number; letterSpacing?: number;
        };
        const setText = (patch: Partial<typeof tStyle>) =>
          updateUserBlock(ub.id, { style: { ...(tStyle || {}), ...patch } });

        return (
          <div className="p-3 space-y-4">
            <div className="text-sm font-medium">Inspector</div>

            {/* Content */}
            <div className="space-y-1">
              <div className="text-xs text-gray-600">Text</div>
              <textarea
                className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
                value={(ub as any).value || ""}
                onChange={(e) => updateUserBlock(ub.id, { value: e.target.value })}
                placeholder="Type here…"
              />
            </div>

            {/* Typography */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-600">Font size (px)</div>
                <input
                  type="number"
                  min={8}
                  max={96}
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={tStyle.fontSize ?? 14}
                  onChange={(e) =>
                    setText({ fontSize: clamp(Number(e.target.value || 14), 8, 96) })
                  }
                />
              </div>
              <div>
                <div className="text-xs text-gray-600">Color</div>
                <input
                  type="color"
                  className="w-full h-9 border rounded"
                  value={tStyle.color || "#111827"}
                  onChange={(e) => setText({ color: e.target.value })}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600">Line height</div>
                <input
                  type="number"
                  step={0.1}
                  min={0.8}
                  max={3}
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={tStyle.lineHeight ?? 1.4}
                  onChange={(e) => setText({ lineHeight: Number(e.target.value || 1.4) })}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600">Letter spacing (px)</div>
                <input
                  type="number"
                  step={0.5}
                  min={-2}
                  max={10}
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={tStyle.letterSpacing ?? 0}
                  onChange={(e) => setText({ letterSpacing: Number(e.target.value || 0) })}
                />
              </div>
            </div>

            {/* B / I / U + Align */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`border rounded px-2 h-8 ${tStyle.bold ? "bg-gray-100" : ""}`}
                onClick={() => setText({ bold: !tStyle.bold })}
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                className={`border rounded px-2 h-8 italic ${tStyle.italic ? "bg-gray-100" : ""}`}
                onClick={() => setText({ italic: !tStyle.italic })}
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                className={`border rounded px-2 h-8 underline ${tStyle.underline ? "bg-gray-100" : ""}`}
                onClick={() => setText({ underline: !tStyle.underline })}
                title="Underline"
              >
                U
              </button>

              <div className="ml-2 flex flex-wrap items-center gap-1">
                {(["left", "center", "right", "justify"] as const).map((a) => (
                  <button
                    type="button"
                    key={a}
                    className={`border rounded px-2 h-8 ${tStyle.align === a ? "bg-gray-100" : ""}`}
                    onClick={() => setText({ align: a })}
                    title={`Align ${a}`}
                  >
                    {a[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* z-order + delete */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
              <div className="flex-1" />
              <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
            </div>
          </div>
        );
      }

      /** --- SHAPES: LINE / RECT / ELLIPSE --- */
      const stroke = readStroke(blockStyle);
      const fill = readFill(blockStyle);
      const radius = readRadius(blockStyle);
      const opacity01 = readOpacity(blockStyle);

      const setStrokeHex = (hex: string) =>
        updateUserBlock(ub.id, { blockStyle: composeStroke(blockStyle, { color: { hex } }) } as any);

      const setStrokeW = (n: number) =>
        updateUserBlock(ub.id, { blockStyle: composeStroke(blockStyle, { width: clamp(n, 1, 64) }) } as any);

      const setDashed = (on: boolean) =>
        updateUserBlock(ub.id, {
          blockStyle: composeStroke(blockStyle, { dash: on ? [stroke.dashLength, stroke.dashLength] : [] }),
        } as any);

      const setDashLength = (n: number) =>
        updateUserBlock(ub.id, {
          blockStyle: composeStroke(blockStyle, {
            dash: stroke.dashed ? [clamp(n, 1, 64), clamp(n, 1, 64)] : [],
          }),
        } as any);

      const setFillHex = (hex: string | null) =>
        updateUserBlock(ub.id, { blockStyle: composeFill(blockStyle, hex) } as any);

      const setOpacity = (pct: number) =>
        updateUserBlock(ub.id, { blockStyle: composeOpacity(blockStyle, clamp(pct / 100, 0, 1)) } as any);

      const setRadius = (r: number) =>
        updateUserBlock(ub.id, { blockStyle: composeRadius(blockStyle, r) } as any);

      if (ub.type === "line") {
        return (
          <div className="p-3 space-y-4">
            <div className="text-sm font-medium">Inspector</div>

            {/* Stroke */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-600">Stroke color</div>
                <input type="color" className="w-full h-9 border rounded" value={stroke.color} onChange={(e) => setStrokeHex(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-gray-600">Stroke width (px)</div>
                <input type="number" min={1} max={64} className="w-full border rounded px-2 py-1 text-sm" value={stroke.width} onChange={(e) => setStrokeW(Number(e.target.value || 1))} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" className="w-4 h-4" checked={stroke.dashed} onChange={(e) => setDashed(e.target.checked)} />
                  Dashed
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min={1}
                  max={64}
                  value={stroke.dashLength}
                  onChange={(e) => setDashLength(Number(e.target.value || stroke.dashLength))}
                  disabled={!stroke.dashed}
                  title="Dash length"
                />
              </div>
            </div>

            {/* z-order + delete */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
              <div className="flex-1" />
              <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
            </div>
          </div>
        );
      }

      if (ub.type === "rect") {
        return (
          <div className="p-3 space-y-4">
            <div className="text-sm font-medium">Inspector</div>

            {/* Fill / Stroke */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-600">Fill</div>
                <input type="color" className="w-full h-9 border rounded" value={fill.hex} onChange={(e) => setFillHex(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-gray-600">Stroke</div>
                <input type="color" className="w-full h-9 border rounded" value={stroke.color} onChange={(e) => setStrokeHex(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-gray-600">Stroke width (px)</div>
                <input type="number" min={0} max={64} className="w-full border rounded px-2 py-1 text-sm" value={stroke.width} onChange={(e) => setStrokeW(Number(e.target.value || 0))} />
              </div>
            </div>

            {/* Dash, radius, opacity */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" className="w-4 h-4" checked={stroke.dashed} onChange={(e) => setDashed(e.target.checked)} />
                  Dashed
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min={1}
                  max={64}
                  value={stroke.dashLength}
                  onChange={(e) => setDashLength(Number(e.target.value || stroke.dashLength))}
                  disabled={!stroke.dashed}
                  title="Dash length"
                />
              </div>
              <div>
                <div className="text-xs text-gray-600">Corner radius (px)</div>
                <input type="number" min={0} className="w-full border rounded px-2 py-1 text-sm" value={radius} onChange={(e) => setRadius(Number(e.target.value || 0))} />
              </div>
              <div>
                <div className="text-xs text-gray-600">Opacity (%)</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  value={Math.round(opacity01 * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value || 100))}
                />
                <div className="text-[11px] text-gray-500 mt-0.5">{Math.round(opacity01 * 100)}%</div>
              </div>
            </div>

            {/* z-order + delete */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
              <div className="flex-1" />
              <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
            </div>
          </div>
        );
      }

      if (ub.type === "ellipse") {
        return (
          <div className="p-3 space-y-4">
            <div className="text-sm font-medium">Inspector</div>

            {/* Fill / Stroke */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-600">Fill</div>
                <input type="color" className="w-full h-9 border rounded" value={fill.hex} onChange={(e) => setFillHex(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-gray-600">Stroke</div>
                <input type="color" className="w-full h-9 border rounded" value={stroke.color} onChange={(e) => setStrokeHex(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-gray-600">Stroke width (px)</div>
                <input type="number" min={0} max={64} className="w-full border rounded px-2 py-1 text-sm" value={stroke.width} onChange={(e) => setStrokeW(Number(e.target.value || 0))} />
              </div>
            </div>

            {/* Dash, opacity */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" className="w-4 h-4" checked={stroke.dashed} onChange={(e) => setDashed(e.target.checked)} />
                  Dashed
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min={1}
                  max={64}
                  value={stroke.dashLength}
                  onChange={(e) => setDashLength(Number(e.target.value || stroke.dashLength))}
                  disabled={!stroke.dashed}
                  title="Dash length"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <div className="text-xs text-gray-600">Opacity (%)</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  value={Math.round(opacity01 * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value || 100))}
                />
                <div className="text-[11px] text-gray-500 mt-0.5">{Math.round(opacity01 * 100)}%</div>
              </div>
            </div>

            {/* z-order + delete */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
              <div className="flex-1" />
              <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
            </div>
          </div>
        );
      }

      /** Fallback: unknown primitive */
      return (
        <div className="p-3 space-y-3">
          <div className="text-sm font-medium">Inspector</div>
          <div className="text-[11px] text-gray-500 -mt-1">
            Editing element: <code>{ub.type}</code>
          </div>

          {/* z-order + delete */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onBringFwd}>Bring forward</button>
            <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={onSendBack}>Send backward</button>
            <div className="flex-1" />
            <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={onDelete}>Delete</button>
          </div>
        </div>
      );
    }
  }

  /** ---------- TEMPLATE BLOCKS (existing behavior) ---------- */
  const allBlocks = (tPage.blocks ?? []) as BlockBase[] as Block[];
  const targetBlocks = selectedBlockId ? allBlocks.filter((b) => b.id === selectedBlockId) : allBlocks;

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
          // Simplified image field (URL or binding), no pan inputs here.
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
