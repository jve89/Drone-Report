// client/src/editor/canvas/CanvasSurface.tsx
import React, { useState } from "react";
import { Frame } from "./RenderHelpers";
import { BLOCK_DEFS } from "../blocks/defs";
import SitePropertiesBlock from "../blocks/SitePropertiesBlock";
import InspectionDetailsBlock from "../blocks/InspectionDetailsBlock";
import OrthoPairBlock from "../blocks/OrthoPairBlock";
import ThermalAnomaliesTableBlock from "../blocks/ThermalAnomaliesTableBlock";
import { renderString, select } from "../../templates/bindings";

type Rect = { x: number; y: number; w: number; h: number };
type Block = any;

type Props = {
  blocks: Block[];
  pageInstance: any;
  ctx: any;
  guide: any;
  selectedBlockId: string | null;
  guideNext: () => void;
  setValue: (pageId: string, blockId: string, value: any) => void;
  draft: any;
  findings: any[];
  onSelectTemplateBlock?: (blockId: string) => void;
};

function renderBoundText(raw?: string, ctx?: any) {
  if (!raw) return "";
  try { return renderString(raw, ctx); } catch { return ""; }
}

function renderRepeater(b: any, ctx: any) {
  const rows = b.bind ? select(b.bind, ctx) : [];
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) {
    const count = Number((b.options?.previewCount ?? 0) as number);
    if (!count) return <div className="text-gray-400">No items.</div>;
    return (
      <div className="w-full h-full overflow-auto space-y-2 text-xs text-gray-600">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border rounded p-2">Repeater preview #{i + 1}</div>
        ))}
      </div>
    );
  }
  return (
    <div className="w-full h-full overflow-auto space-y-3">
      {items.map((item: any, idx: number) => (
        <div key={idx} className="border rounded p-2">
          {(b.children || []).map((ch: any, ci: number) => {
            if (ch.type === "text") {
              const v = renderString(ch.value || "", { ...ctx, item });
              return <div key={ci} className="text-xs mb-1 whitespace-pre-wrap">{v}</div>;
            }
            if (ch.type === "image_slot") {
              const src = renderString((ch as any).source || "", { ...ctx, item });
              return src
                ? <img key={ci} src={src} className="w-full h-40 object-contain border rounded" />
                : <div key={ci} className="text-xs text-gray-400 border rounded h-40 grid place-items-center">No image</div>;
            }
            if (ch.type === "badge") {
              const lbl = renderString((ch as any).label || "", { ...ctx, item });
              return <span key={ci} className="inline-block px-2 py-1 rounded text-[11px] bg-amber-200 text-amber-900 mr-2">{lbl}</span>;
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}

export function CanvasSurface({
  blocks, pageInstance, ctx, guide, selectedBlockId, guideNext, setValue, draft, findings, onSelectTemplateBlock,
}: Props) {
  const [imgErrorRef, setImgErrorRef] = useState<Record<string, boolean>>({});

  return (
    <>
      {blocks.map((b: Block) => {
        const v = (pageInstance.values as any)?.[b.id];
        const active = !!guide?.enabled && selectedBlockId === b.id;

        switch (b.type) {
          case "image_slot": {
            const boundSrc = (b as any).source ? renderBoundText((b as any).source, ctx) : "";
            const vStr = typeof v === "string" ? v : "";
            const boundFromValue = vStr.includes("{{") ? renderBoundText(vStr, ctx) : "";
            const url = boundSrc || boundFromValue || vStr;
            const isBinding = !!((b as any).source) || vStr.includes("{{");
            const failed = !!imgErrorRef[b.id];
            return (
              <Frame key={b.id} rect={b.rect} active={active}>
                {url && !failed ? (
                  <img
                    src={url}
                    alt={b.id}
                    className="w-full h-full object-cover"
                    onClick={() => onSelectTemplateBlock?.(b.id)}
                    onLoad={() => { if (imgErrorRef[b.id]) { const copy = { ...imgErrorRef }; delete copy[b.id]; setImgErrorRef(copy); } }}
                    onError={() => setImgErrorRef({ ...imgErrorRef, [b.id]: true })}
                  />
                ) : (
                  <div
                    className="w-full h-full grid place-items-center text-center text-sm text-gray-500 cursor-pointer"
                    onClick={() => onSelectTemplateBlock?.(b.id)}
                    style={{ background: "repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 16px 16px", borderRadius: 4 }}
                  >
                    <div className="font-medium mb-1">
                      {failed ? "Image failed to load" : isBinding ? "No image (binding empty)" : "Click to add image"}
                    </div>
                  </div>
                )}
              </Frame>
            );
          }
          case "text": {
            const vStr = typeof v === "string" ? v : "";
            const tplBinding = typeof (b as any).value === "string" ? (b as any).value : "";
            const runtimeBinding = vStr.includes("{{") ? vStr : "";
            const hasBinding = !!tplBinding || !!runtimeBinding;
            const content = hasBinding ? renderBoundText(tplBinding || runtimeBinding, ctx) : (vStr || b.placeholder || "");
            return (
              <Frame key={b.id} rect={b.rect} active={active}>
                <div className="w-full h-full text-sm whitespace-pre-wrap" onClick={() => onSelectTemplateBlock?.(b.id)}>{content}</div>
              </Frame>
            );
          }
          case "badge": {
            const val = v && typeof v === "object" ? (v as { label?: string; color?: string }) : {};
            const color = val.color || "gray";
            const label = val.label || "Badge";
            const palette: Record<string, string> = {
              gray: "bg-gray-200 text-gray-800",
              blue: "bg-blue-200 text-blue-800",
              amber: "bg-amber-200 text-amber-900",
              red: "bg-red-200 text-red-800",
              green: "bg-green-200 text-green-800",
            };
            return (
              <Frame key={b.id} rect={b.rect} active={active}>
                <span className={`inline-block px-2 py-1 rounded text-xs ${palette[color] || palette.gray}`}>{label}</span>
              </Frame>
            );
          }
          case "table": {
            const rows: any[] = Array.isArray(v) ? v : [];
            const cols = (b.options?.columns ?? []) as { key: string; label: string }[];
            return (
              <Frame key={b.id} rect={b.rect} active={active}>
                <div className="overflow-auto w-full h-full">
                  <table className="min-w-full text-xs border">
                    <thead className="bg-gray-50">
                      <tr>{cols.map((c) => (<th key={c.key} className="px-2 py-1 text-left border-b">{c.label}</th>))}</tr>
                    </thead>
                    <tbody>
                      {rows.map((r, ri) => (
                        <tr key={ri} className="border-b align-top">
                          {cols.map((c) => (<td key={c.key} className="px-2 py-1">{r?.[c.key] ?? ""}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Frame>
            );
          }
          case "repeater":
            return (
              <Frame key={b.id} rect={b.rect} active={active}>
                {renderRepeater(b, ctx)}
              </Frame>
            );
          case "section": {
            const kind = (b as any)?.options?.kind as keyof typeof BLOCK_DEFS | undefined;
            if (!kind || !BLOCK_DEFS[kind]) return null;
            const payload = (v && typeof v === "object") ? v : {};
            return (
              <Frame key={b.id} rect={b.rect} active={active}>
                {kind === "siteProperties"    && <SitePropertiesBlock        {...({ pageId: pageInstance.id, blockId: b.id, value: payload } as any)} />}
                {kind === "inspectionDetails" && <InspectionDetailsBlock     {...({ pageId: pageInstance.id, blockId: b.id, value: payload } as any)} />}
                {kind === "orthoPair"         && <OrthoPairBlock             {...({ pageId: pageInstance.id, blockId: b.id, value: payload } as any)} />}
                {kind === "thermalAnomalies"  && <ThermalAnomaliesTableBlock {...({ pageId: pageInstance.id, blockId: b.id, value: payload } as any)} />}
              </Frame>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}
