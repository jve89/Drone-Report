// client/src/editor/preview/BlockViewer.tsx
import React, { useMemo } from "react";
import { renderString, select } from "../../templates/bindings";
import type { Draft } from "../../types/draft";
import type { Template } from "../../types/template";
import { BLOCK_DEFS } from "../blocks/defs";

/** Mirror Canvas constants */
const PAGE_W = 820;
const PAGE_H = 1160;

type Rect = { x: number; y: number; w: number; h: number };
type BlockBase = { id: string; type: string; rect: Rect; label?: string; placeholder?: string; options?: any };
type BlockText = BlockBase & { type: "text"; value?: string };
type BlockImage = BlockBase & { type: "image_slot"; source?: string };
type BlockTable = BlockBase & { type: "table"; options?: { columns?: { key: string; label: string }[] } };
type BlockBadge = BlockBase & { type: "badge"; options?: { palette?: string } };
type BlockRepeater = BlockBase & {
  type: "repeater";
  bind?: string;
  options?: { previewCount?: number };
  children?: Array<BlockText | BlockImage | BlockBadge>;
};
type BlockSection = BlockBase & {
  type: "section";
  options?: { kind?: string; props?: any };
};
type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater | BlockSection;

/** Relaxed typing for user blocks so meta-based section blocks render */
type UserBlock = {
  id: string;
  type: string;
  rect: Rect;
  blockStyle?: any; // may contain meta.blockKind/payload/props
  value?: string;
  style?: any;
};

function pct(n: number) {
  return `${n}%`;
}

function Box({ rect, children }: { rect: Rect; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x),
    top: pct(rect.y),
    width: pct(rect.w),
    height: pct(rect.h),
    padding: 8,
    overflow: "hidden",
  };
  return <div style={style}>{children}</div>;
}

export default function BlockViewer({ draft, template }: { draft: Draft; template: Template }) {
  const ctx = useMemo(
    () => ({
      run: (draft as any)?.payload?.meta ?? {},
      draft: draft as any,
      findings: ((draft as any)?.payload?.findings as any[]) ?? [],
    }),
    [draft]
  );

  function renderBoundText(raw?: string) {
    if (!raw) return "";
    try {
      return renderString(raw, ctx);
    } catch {
      return "";
    }
  }

  function renderRepeater(b: BlockRepeater) {
    const rows = b.bind ? select(b.bind, ctx) : [];
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) return null;
    return (
      <div className="w-full h-full overflow-auto space-y-3">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="border rounded p-2">
            {(b.children || []).map((ch, ci) => {
              if (ch.type === "text") {
                const v = renderString(ch.value || "", { ...ctx, item });
                return (
                  <div key={ci} className="text-xs mb-1 whitespace-pre-wrap">
                    {v}
                  </div>
                );
              }
              if (ch.type === "image_slot") {
                const src = renderString((ch as any).source || "", { ...ctx, item });
                return src ? (
                  <img key={ci} src={src} className="w-full h-40 object-contain border rounded" />
                ) : null;
              }
              if (ch.type === "badge") {
                const lbl = renderString((ch as any).label || "", { ...ctx, item });
                return (
                  <span className="inline-block px-2 py-1 rounded text:[11px] text-[11px] bg-amber-200 text-amber-900 mr-2" key={ci}>
                    {lbl}
                  </span>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
    );
  }

  /** --- Simple read-only renderers for meta section blocks --- */
  function RenderSeverityOverview({ payload, props }: any) {
    const counts: number[] = Array.isArray(payload?.counts) ? payload.counts : [];
    return (
      <div className="w-full h-full grid grid-cols-3 gap-2 p-2">
        {[1, 3, 5].map((sev) => {
          const idx = Math.max(0, Math.min(4, sev - 1));
          const n = Number.isFinite(counts[idx]) ? counts[idx] : 0;
          return (
            <div key={sev} className="border rounded text-center p-2">
              <div className="text-[11px] text-gray-500">Severity {sev}</div>
              <div className="text-xl font-semibold">{props?.showIcons ? "⚠️ " : null}{n}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function RenderFindingsTable({ payload, props }: any) {
    const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
    const limit = Math.max(1, Number(props?.pageSize ?? 6));
    return (
      <div className="w-full h-full overflow-auto">
        <table className="min-w-full text-xs border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left border-b">Title</th>
              {!props?.showSeverityIcons && <th className="px-2 py-1 text-left border-b">Sev</th>}
              <th className="px-2 py-1 text-left border-b">Location</th>
              <th className="px-2 py-1 text-left border-b">Category</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r, i) => (
              <tr key={i} className="border-b align-top">
                <td className="px-2 py-1">{r?.title ?? ""}</td>
                {!props?.showSeverityIcons && <td className="px-2 py-1">{r?.severity ?? ""}</td>}
                <td className="px-2 py-1">{r?.location ?? ""}</td>
                <td className="px-2 py-1">{r?.category ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function RenderPhotoStrip({ payload, props }: any) {
    const urls: string[] = Array.isArray(payload?.urls) ? payload.urls : [];
    const count = Number(props?.count ?? 3);
    const final = (urls.length ? urls : []).slice(0, count);
    return (
      <div className="w-full h-full flex gap-2">
        {Array.from({ length: count }).map((_, idx) => {
          const u = final[idx] || "";
          return u ? (
            <img key={idx} src={u} className="flex-1 object-cover rounded border" />
          ) : (
            <div key={idx} className="flex-1 rounded bg-gray-200 border" />
          );
        })}
      </div>
    );
  }

  function RenderSiteProperties({ payload }: any) {
    const FIELD_LABELS: Record<string, string> = {
      address: "Address",
      peakPowerMWp: "Peak Power (MWp)",
      panelCount: "Panel Count",
      inclinationDeg: "Inclination (°)",
      orientation: "Orientation",
      areaHa: "Area (ha)",
      panelModel: "Panel Model",
      inverterModel: "Inverter Model",
    };
    const v = payload || {};
    return (
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(FIELD_LABELS).map(([k, lbl]) => (
            <tr key={k}>
              <td className="pr-2 font-medium align-top">{lbl}</td>
              <td className="align-top">{v?.[k] ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function RenderInspectionDetails({ payload }: any) {
    const obj = payload && typeof payload === "object" ? payload : {};
    const keys = Object.keys(obj);
    if (!keys.length) return null;
    return (
      <table className="w-full text-sm">
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td className="pr-2 font-medium align-top">{k}</td>
              <td className="align-top">{String(obj[k] ?? "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function RenderOrthoPair({ payload }: any) {
    const urls: string[] = Array.isArray(payload?.urls)
      ? payload.urls
      : [payload?.leftUrl, payload?.rightUrl].filter(Boolean);
    const [u1, u2] = [urls[0] || "", urls[1] || ""];
    return (
      <div className="grid grid-cols-2 gap-2 w-full h-full">
        <div className="w-full h-full bg-gray-50 border rounded overflow-hidden">
          {u1 ? <img src={u1} className="w-full h-full object-contain" /> : null}
        </div>
        <div className="w-full h-full bg-gray-50 border rounded overflow-hidden">
          {u2 ? <img src={u2} className="w-full h-full object-contain" /> : null}
        </div>
      </div>
    );
  }

  function RenderThermalAnomalies({ payload }: any) {
    const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
    if (!rows.length) return null;
    return (
      <div className="w-full h-full overflow-auto">
        <table className="min-w-full text-xs border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left border-b">ID</th>
              <th className="px-2 py-1 text-left border-b">ΔT</th>
              <th className="px-2 py-1 text-left border-b">Location</th>
              <th className="px-2 py-1 text-left border-b">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b align-top">
                <td className="px-2 py-1">{r?.id ?? r?.title ?? ""}</td>
                <td className="px-2 py-1">{r?.deltaT ?? r?.delta ?? ""}</td>
                <td className="px-2 py-1">{r?.location ?? ""}</td>
                <td className="px-2 py-1">{r?.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  /** --- end section block renderers --- */

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {(draft.pageInstances || []).map((pi: any) => {
        const tPage = (template.pages || []).find((p: any) => p.id === pi.templatePageId);
        const blocks = (tPage?.blocks ?? []) as Block[];
        const userBlocks: UserBlock[] = Array.isArray(pi.userBlocks) ? (pi.userBlocks as any) : [];

        return (
          <div key={pi.id} className="bg-white shadow relative" style={{ width: PAGE_W, height: PAGE_H }}>
            {/* Template blocks */}
            {blocks.map((b) => {
              const v = (pi.values as any)?.[b.id];

              switch (b.type) {
                case "image_slot": {
                  // Support both template-level binding (b.source) and runtime binding in value (v with {{ }})
                  const vStr = typeof v === "string" ? v : "";
                  const boundFromValue = vStr.includes("{{") ? renderBoundText(vStr) : "";
                  const boundSrc = (b as BlockImage).source ? renderBoundText((b as BlockImage).source) : "";
                  const url = boundFromValue || boundSrc || vStr;
                  return (
                    <Box key={b.id} rect={b.rect}>
                      {url ? <img src={url} className="w-full h-full object-cover" /> : null}
                    </Box>
                  );
                }
                case "text": {
                  // Treat as bound only when template provides a value OR runtime value has {{ }}
                  const tpl = (b as BlockText).value || "";
                  const vStr = typeof v === "string" ? v : "";
                  const runtimeBinding = vStr.includes("{{") ? vStr : "";
                  const hasBinding = Boolean(tpl || runtimeBinding);
                  const content = hasBinding
                    ? renderBoundText(tpl || runtimeBinding)
                    : vStr || b.placeholder || "";
                  return (
                    <Box key={b.id} rect={b.rect}>
                      <div className="w-full h-full text-sm whitespace-pre-wrap">{content}</div>
                    </Box>
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
                    <Box key={b.id} rect={b.rect}>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${palette[color] || palette.gray}`}>{label}</span>
                    </Box>
                  );
                }
                case "table": {
                  const rows: any[] = Array.isArray(v) ? v : [];
                  const cols = (b.options?.columns ?? []) as { key: string; label: string }[];
                  return (
                    <Box key={b.id} rect={b.rect}>
                      <div className="overflow-auto w-full h-full">
                        <table className="min-w-full text-xs border">
                          <thead className="bg-gray-50">
                            <tr>
                              {cols.map((c) => (
                                <th key={c.key} className="px-2 py-1 text-left border-b">
                                  {c.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, ri) => (
                              <tr key={ri} className="border-b align-top">
                                {cols.map((c) => (
                                  <td key={c.key} className="px-2 py-1">
                                    {r?.[c.key] ?? ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Box>
                  );
                }
                case "repeater": {
                  return (
                    <Box key={b.id} rect={b.rect}>
                      {renderRepeater(b as BlockRepeater)}
                    </Box>
                  );
                }
                case "section": {
                  const kind = (b as BlockSection)?.options?.kind as keyof typeof BLOCK_DEFS | undefined;
                  if (!kind || !BLOCK_DEFS[kind]) return null;

                  const props = {
                    ...(BLOCK_DEFS[kind].defaultProps ?? {}),
                    ...(((b as BlockSection)?.options?.props as any) ?? {}),
                  };
                  const payload = v && typeof v === "object" ? v : {};

                  return (
                    <Box key={b.id} rect={b.rect}>
                      {kind === "severityOverview" && <RenderSeverityOverview payload={payload} props={props} />}
                      {kind === "findingsTable" && <RenderFindingsTable payload={payload} props={props} />}
                      {kind === "photoStrip" && <RenderPhotoStrip payload={payload} props={props} />}
                      {kind === "siteProperties" && <RenderSiteProperties payload={payload} />}
                      {kind === "inspectionDetails" && <RenderInspectionDetails payload={payload} />}
                      {kind === "orthoPair" && <RenderOrthoPair payload={payload} />}
                      {kind === "thermalAnomalies" && <RenderThermalAnomalies payload={payload} />}
                    </Box>
                  );
                }
                default:
                  return null;
              }
            })}

            {/* User section blocks (identified by blockStyle.meta.blockKind) */}
            {(userBlocks || []).map((ub) => {
              const meta = (ub as any)?.blockStyle?.meta as
                | { blockKind?: string; payload?: any; props?: any }
                | undefined;
              if (!meta?.blockKind || !ub?.rect) return null;

              const r = ub.rect as Rect;
              const kind = meta.blockKind as keyof typeof BLOCK_DEFS;
              const def = BLOCK_DEFS[kind];
              if (!def) return null;

              const props = { ...(def.defaultProps ?? {}), ...(meta.props ?? {}) } as any;
              const payload = meta.payload || {};

              return (
                <Box key={ub.id} rect={r}>
                  {kind === "severityOverview" && <RenderSeverityOverview payload={payload} props={props} />}
                  {kind === "findingsTable" && <RenderFindingsTable payload={payload} props={props} />}
                  {kind === "photoStrip" && <RenderPhotoStrip payload={payload} props={props} />}
                  {kind === "siteProperties" && <RenderSiteProperties payload={payload} />}
                  {kind === "inspectionDetails" && <RenderInspectionDetails payload={payload} />}
                  {kind === "orthoPair" && <RenderOrthoPair payload={payload} />}
                  {kind === "thermalAnomalies" && <RenderThermalAnomalies payload={payload} />}
                </Box>
              );
            })}

            {/* User text blocks */}
            {(userBlocks || []).map((ub) => {
              if (ub.type !== "text" || !ub?.rect) return null;
              const st = (ub as any).style || {};
              const style: React.CSSProperties = {
                color: st.color,
                fontFamily: st.fontFamily,
                fontSize: st.fontSize ? `${st.fontSize}px` : undefined,
                fontWeight: st.bold ? 700 : 400,
                fontStyle: st.italic ? "italic" : "normal",
                textDecoration: st.underline ? "underline" : "none",
                lineHeight: st.lineHeight ? String(st.lineHeight) : undefined,
                letterSpacing: st.letterSpacing != null ? `${st.letterSpacing}px` : undefined,
                textAlign: st.align || "left",
                unicodeBidi: "plaintext",
                width: "100%",
                height: "100%",
              };
              const raw = (ub as any).value || "";
              const display = typeof raw === "string" && raw.includes("{{") ? renderBoundText(raw) : raw;
              return (
                <Box key={ub.id} rect={ub.rect}>
                  <div className="w-full h-full text-sm whitespace-pre-wrap" style={style}>
                    {display}
                  </div>
                </Box>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
