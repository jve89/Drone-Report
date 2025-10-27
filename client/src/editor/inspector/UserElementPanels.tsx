// client/src/editor/inspector/UserElementPanels.tsx
import React from "react";
import * as Shared from "./shared";
import { SectionInspector } from "./SectionPanels";

type Cbs = {
  updateUserBlock: (id: string, patch: any) => void;
  deleteUserBlock: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
};

export function UserElementInspector({
  ub, updateUserBlock, deleteUserBlock, bringForward, sendBackward,
}: { ub: Shared.UBCommon } & Cbs) {
  const blockStyle = (ub as any).blockStyle ?? (ub as any).style ?? {};
  const metaKind = blockStyle?.meta?.blockKind as string | undefined;

  // Section-style user block? hand off to SectionInspector
  if (metaKind) {
    return (
      <SectionInspector
        ub={ub}
        blockStyle={blockStyle}
        updateUserBlock={updateUserBlock}
        deleteUserBlock={deleteUserBlock}
        bringForward={bringForward}
        sendBackward={sendBackward}
      />
    );
  }

  if (ub.type === "text") return <TextPanel ub={ub} {...{ updateUserBlock, deleteUserBlock, bringForward, sendBackward }} />;
  if (ub.type === "line") return <LinePanel ub={ub} {...{ updateUserBlock, deleteUserBlock, bringForward, sendBackward }} />;
  if (ub.type === "rect") return <RectPanel ub={ub} {...{ updateUserBlock, deleteUserBlock, bringForward, sendBackward }} />;
  if (ub.type === "ellipse") return <EllipsePanel ub={ub} {...{ updateUserBlock, deleteUserBlock, bringForward, sendBackward }} />;

  // Fallback
  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Inspector</div>
      <div className="text-[11px] text-gray-500 -mt-1">
        Editing element: <code>{ub.type}</code>
      </div>
      <ZOrderDelete {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

/** ---------- Text ---------- */
function TextPanel({ ub, updateUserBlock, deleteUserBlock, bringForward, sendBackward }: { ub: Shared.UBCommon } & Cbs) {
  const tStyle = (ub.style || {}) as {
    fontSize?: number; bold?: boolean; italic?: boolean; underline?: boolean;
    align?: "left" | "center" | "right" | "justify";
    color?: string; lineHeight?: number; letterSpacing?: number;
  };
  const setText = (patch: Partial<typeof tStyle>) =>
    updateUserBlock(ub.id, { style: { ...(tStyle || {}), ...patch } });

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>
      <div className="space-y-1">
        <div className="text-xs text-gray-600">Text</div>
        <textarea
          className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
          value={(ub as any).value || ""}
          onChange={(e) => updateUserBlock(ub.id, { value: e.target.value })}
          placeholder="Type here…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-600">Font size (px)</div>
          <input
            type="number"
            min={8}
            max={96}
            className="w-full border rounded px-2 py-1 text-sm"
            value={tStyle.fontSize ?? 14}
            onChange={(e) => setText({ fontSize: Shared.clamp(Number(e.target.value || 14), 8, 96) })}
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

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`border rounded px-2 h-8 ${tStyle.bold ? "bg-gray-100" : ""}`} onClick={() => setText({ bold: !tStyle.bold })} title="Bold">B</button>
        <button type="button" className={`border rounded px-2 h-8 italic ${tStyle.italic ? "bg-gray-100" : ""}`} onClick={() => setText({ italic: !tStyle.italic })} title="Italic">I</button>
        <button type="button" className={`border rounded px-2 h-8 underline ${tStyle.underline ? "bg-gray-100" : ""}`} onClick={() => setText({ underline: !tStyle.underline })} title="Underline">U</button>
        <div className="ml-2 flex flex-wrap items-center gap-1">
          {(["left", "center", "right", "justify"] as const).map((a) => (
            <button key={a} type="button" className={`border rounded px-2 h-8 ${tStyle.align === a ? "bg-gray-100" : ""}`} onClick={() => setText({ align: a })} title={`Align ${a}`}>
              {a[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <ZOrderDelete {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

/** ---------- Line / Rect / Ellipse ---------- */
function LinePanel({ ub, updateUserBlock, deleteUserBlock, bringForward, sendBackward }: { ub: Shared.UBCommon } & Cbs) {
  const style = (ub as any).blockStyle ?? (ub as any).style ?? {};
  const stroke = Shared.readStroke(style);

  const setStrokeHex = (hex: string) =>
    updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { color: { hex } }) } as any);
  const setStrokeW = (n: number) =>
    updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { width: Shared.clamp(n, 1, 64) }) } as any);
  const setDashed = (on: boolean) =>
    updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { dash: on ? [stroke.dashLength, stroke.dashLength] : [] }) } as any);
  const setDashLength = (n: number) =>
    updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { dash: stroke.dashed ? [Shared.clamp(n, 1, 64), Shared.clamp(n, 1, 64)] : [] }) } as any);

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>
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
          <input type="number" className="w-full border rounded px-2 py-1 text-sm" min={1} max={64} value={stroke.dashLength} onChange={(e) => setDashLength(Number(e.target.value || stroke.dashLength))} disabled={!stroke.dashed} title="Dash length" />
        </div>
      </div>
      <ZOrderDelete {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

function RectPanel({ ub, updateUserBlock, deleteUserBlock, bringForward, sendBackward }: { ub: Shared.UBCommon } & Cbs) {
  const style = (ub as any).blockStyle ?? (ub as any).style ?? {};
  const stroke = Shared.readStroke(style);
  const fill = Shared.readFill(style);
  const radius = Shared.readRadius(style);
  const opacity01 = Shared.readOpacity(style);

  const setStrokeHex = (hex: string) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { color: { hex } }) } as any);
  const setStrokeW = (n: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { width: Shared.clamp(n, 0, 64) }) } as any);
  const setDashed = (on: boolean) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { dash: on ? [6, 6] : [] }) } as any);
  const setDashLength = (n: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { dash: stroke.dashed ? [Shared.clamp(n,1,64), Shared.clamp(n,1,64)] : [] }) } as any);
  const setFillHex = (hex: string | null) => updateUserBlock(ub.id, { blockStyle: Shared.composeFill(style, hex) } as any);
  const setOpacity = (pct: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeOpacity(style, Shared.clamp(pct/100, 0, 1)) } as any);
  const setRadius = (r: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeRadius(style, r) } as any);

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" className="w-4 h-4" checked={stroke.dashed} onChange={(e) => setDashed(e.target.checked)} />
            Dashed
          </label>
          <input type="number" className="w-full border rounded px-2 py-1 text-sm" min={1} max={64} value={stroke.dashLength} onChange={(e) => setDashLength(Number(e.target.value || stroke.dashLength))} disabled={!stroke.dashed} title="Dash length" />
        </div>
        <div>
          <div className="text-xs text-gray-600">Corner radius (px)</div>
          <input type="number" min={0} className="w-full border rounded px-2 py-1 text-sm" value={radius} onChange={(e) => setRadius(Number(e.target.value || 0))} />
        </div>
        <div>
          <div className="text-xs text-gray-600">Opacity (%)</div>
          <input type="range" min={0} max={100} step={1} className="w-full" value={Math.round(opacity01 * 100)} onChange={(e) => setOpacity(Number(e.target.value || 100))} />
          <div className="text-[11px] text-gray-500 mt-0.5">{Math.round(opacity01 * 100)}%</div>
        </div>
      </div>

      <ZOrderDelete {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

function EllipsePanel({ ub, updateUserBlock, deleteUserBlock, bringForward, sendBackward }: { ub: Shared.UBCommon } & Cbs) {
  const style = (ub as any).blockStyle ?? (ub as any).style ?? {};
  const stroke = Shared.readStroke(style);
  const fill = Shared.readFill(style);
  const opacity01 = Shared.readOpacity(style);

  const setStrokeHex = (hex: string) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { color: { hex } }) } as any);
  const setStrokeW = (n: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { width: Shared.clamp(n, 0, 64) }) } as any);
  const setDashed = (on: boolean) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { dash: on ? [6, 6] : [] }) } as any);
  const setDashLength = (n: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeStroke(style, { dash: stroke.dashed ? [Shared.clamp(n,1,64), Shared.clamp(n,1,64)] : [] }) } as any);
  const setFillHex = (hex: string | null) => updateUserBlock(ub.id, { blockStyle: Shared.composeFill(style, hex) } as any);
  const setOpacity = (pct: number) => updateUserBlock(ub.id, { blockStyle: Shared.composeOpacity(style, Shared.clamp(pct/100, 0, 1)) } as any);

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" className="w-4 h-4" checked={stroke.dashed} onChange={(e) => setDashed(e.target.checked)} />
            Dashed
          </label>
          <input type="number" className="w-full border rounded px-2 py-1 text-sm" min={1} max={64} value={stroke.dashLength} onChange={(e) => setDashLength(Number(e.target.value || stroke.dashLength))} disabled={!stroke.dashed} title="Dash length" />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <div className="text-xs text-gray-600">Opacity (%)</div>
          <input type="range" min={0} max={100} step={1} className="w-full" value={Math.round(opacity01 * 100)} onChange={(e) => setOpacity(Number(e.target.value || 100))} />
          <div className="text-[11px] text-gray-500 mt-0.5">{Math.round(opacity01 * 100)}%</div>
        </div>
      </div>

      <ZOrderDelete {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

/** ---------- Shared z-order/delete row ---------- */
function ZOrderDelete({ ub, deleteUserBlock, bringForward, sendBackward }: { ub: Shared.UBCommon } & Pick<Cbs, "deleteUserBlock"|"bringForward"|"sendBackward">) {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => bringForward(ub.id)}>Bring forward</button>
      <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => sendBackward(ub.id)}>Send backward</button>
      <div className="flex-1" />
      <button className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50" onClick={() => deleteUserBlock(ub.id)}>Delete</button>
    </div>
  );
}
