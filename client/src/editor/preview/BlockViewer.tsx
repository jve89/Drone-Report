// client/src/editor/preview/BlockViewer.tsx
import React, { useMemo } from "react";
import { renderString, select } from "../../templates/bindings";
import type { Draft } from "../../types/draft";
import type { Template } from "../../types/template";

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
type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater;

type UserBlock = {
  id: string;
  type: "text";
  rect: Rect; // 0–100
  value?: string;
  style?: {
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

function pct(n: number) { return `${n}%`; }

function Box({ rect, children }: { rect: Rect; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x), top: pct(rect.y),
    width: pct(rect.w), height: pct(rect.h),
    // No borders in preview
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
    try { return renderString(raw, ctx); } catch { return ""; }
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
                return <div key={ci} className="text-xs mb-1 whitespace-pre-wrap">{v}</div>;
              }
              if (ch.type === "image_slot") {
                const src = renderString((ch as any).source || "", { ...ctx, item });
                return src ? (
                  <img key={ci} src={src} className="w-full h-40 object-contain border rounded" />
                ) : null;
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

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {(draft.pageInstances || []).map((pi: any, pageIdx: number) => {
        const tPage = (template.pages || []).find((p: any) => p.id === pi.templatePageId);
        const blocks = (tPage?.blocks ?? []) as Block[];
        const userBlocks: UserBlock[] = Array.isArray(pi.userBlocks) ? pi.userBlocks : [];

        return (
          <div key={pi.id} className="bg-white shadow relative" style={{ width: PAGE_W, height: PAGE_H }}>
            {/* Template blocks */}
            {blocks.map((b) => {
              const v = (pi.values as any)?.[b.id];

              switch (b.type) {
                case "image_slot": {
                  const boundSrc = (b as BlockImage).source ? renderBoundText((b as BlockImage).source) : "";
                  const url = boundSrc || (typeof v === "string" ? v : "");
                  return (
                    <Box key={b.id} rect={b.rect}>
                      {url ? <img src={url} className="w-full h-full object-cover" /> : null}
                    </Box>
                  );
                }
                case "text": {
                  const hasBinding = typeof (b as BlockText).value === "string";
                  const content = hasBinding
                    ? renderBoundText((b as BlockText).value)
                    : (typeof v === "string" && v) || b.placeholder || "";
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
                    </Box>
                  );
                }
                case "repeater": {
                  return <Box key={b.id} rect={b.rect}>{renderRepeater(b as BlockRepeater)}</Box>;
                }
              }
              return null;
            })}

            {/* User text blocks */}
            {userBlocks.map((ub) => {
              if (ub.type !== "text") return null;
              const st = ub.style || {};
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
              return (
                <Box key={ub.id} rect={ub.rect}>
                  <div className="w-full h-full text-sm whitespace-pre-wrap" style={style}>
                    {ub.value || ""}
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
