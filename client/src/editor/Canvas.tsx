// client/src/editor/Canvas.tsx
import React, { useCallback, useMemo, useRef } from "react";
import { useEditor } from "../state/editorStore";
import { renderString, select } from "../templates/bindings";

const DR_MEDIA_MIME = "application/x-dr-media";

/** Local types (allow binding fields on blocks) */
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

function pct(n: number) { return `${n}%`; }

function Frame({ rect, children }: { rect: Rect; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x), top: pct(rect.y),
    width: pct(rect.w), height: pct(rect.h),
    border: "1px dashed #e5e7eb",
    padding: 8, overflow: "hidden", background: "rgba(255,255,255,0.9)",
  };
  return <div style={style}>{children}</div>;
}

export default function Canvas() {
  const { draft, template, pageIndex, setValue, zoom, findings, insertImageAtPoint } = useEditor();
  const pageRef = useRef<HTMLDivElement>(null);

  const PAGE_W = 820;
  const PAGE_H = 1160;

  // Binding context (safe even if draft/findings undefined)
  const ctx = useMemo(() => ({
    run: (draft as any)?.payload?.meta ?? {},
    draft: draft as any,
    findings: (findings as any[]) ?? [],
  }), [draft, findings]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DR_MEDIA_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    if (!pageRef.current) return;
    const raw = e.dataTransfer.getData(DR_MEDIA_MIME);
    if (!raw) return;
    e.preventDefault();

    let payload: { draftId: string; id: string; url: string; filename?: string; kind?: string } | null = null;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    if (!payload) return;
    if (!draft?.id || payload.draftId !== draft.id) return;

    const rect = pageRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const nx = Math.max(0, Math.min(100, (px / PAGE_W) * 100));
    const ny = Math.max(0, Math.min(100, (py / PAGE_H) * 100));

    const pageInstance = draft.pageInstances?.[pageIndex];
    if (!pageInstance) return;

    const ok = insertImageAtPoint?.(pageInstance.id, { x: nx, y: ny }, { id: payload.id, url: payload.url, filename: payload.filename || "", kind: payload.kind || "image" });
    if (!ok) {
      const tPage = template?.pages.find((p: any) => p.id === pageInstance.templatePageId);
      const firstImg = (tPage?.blocks || []).find((b: any) => b.type === "image_slot") as BlockImage | undefined;
      if (firstImg) setValue(pageInstance.id, firstImg.id, payload.url);
    }
  }, [draft?.id, pageIndex, insertImageAtPoint, setValue, template?.pages]);

  function renderBoundText(raw?: string) {
    if (!raw) return "";
    try { return renderString(raw, ctx); } catch { return ""; }
  }

  function renderRepeater(b: BlockRepeater) {
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
            {(b.children || []).map((ch, ci) => {
              if (ch.type === "text") {
                const v = renderString(ch.value || "", { ...ctx, item });
                return <div key={ci} className="text-xs mb-1 whitespace-pre-wrap">{v}</div>;
              }
              if (ch.type === "image_slot") {
                const src = renderString((ch as any).source || "", { ...ctx, item });
                return src ? (
                  <img key={ci} src={src} className="w-full h-40 object-contain border rounded" />
                ) : (
                  <div key={ci} className="text-xs text-gray-400 border rounded h-40 grid place-items-center">No image</div>
                );
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

  // -------- Render branches (no conditional hooks) --------
  if (!draft) {
    return <div className="p-6 text-gray-500">Loading editor…</div>;
  }

  if (!template) {
    function openTemplateDropdown() { window.dispatchEvent(new CustomEvent("open-template-dropdown")); }
    return (
      <div className="w-full flex items-center justify-center bg-neutral-100 p-12">
        <div className="bg-white border rounded shadow-sm p-6 max-w-xl text-center">
          <div className="text-lg font-medium mb-2">Select a template to start</div>
          <p className="text-sm text-gray-600 mb-4">The workspace will populate with the template’s page stack.</p>
          <div className="flex items-center justify-center">
            <button onClick={openTemplateDropdown} className="px-3 py-2 border rounded hover:bg-gray-50">Pick a template</button>
          </div>
          <p className="text-xs text-gray-500 mt-3">You can change templates later.</p>
        </div>
      </div>
    );
  }

  const pageInstance = draft.pageInstances?.[pageIndex];
  if (!pageInstance) return <div className="p-6 text-gray-500">No page to display</div>;

  const tPage = template.pages.find((p: any) => p.id === pageInstance.templatePageId);
  if (!tPage) return <div className="p-6 text-gray-500">Template page not found</div>;

  const blocks = (tPage.blocks ?? []) as Block[];

  return (
    <div className="w-full flex items-start justify-center bg-neutral-100 p-6">
      <div style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }} className="relative">
        <div
          ref={pageRef}
          className="relative bg-white shadow"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {blocks.map((b: Block) => {
            const v = (pageInstance.values as any)?.[b.id];

            switch (b.type) {
              case "image_slot": {
                const boundSrc = (b as BlockImage).source ? renderBoundText((b as BlockImage).source) : "";
                const url = boundSrc || (typeof v === "string" ? v : "");
                return (
                  <Frame key={b.id} rect={b.rect}>
                    {url ? (
                      <img src={url} alt={b.id} className="w-full h-full object-cover" />
                    ) : (
                      <label className="text-sm text-gray-500 cursor-pointer">
                        <input
                          type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const localUrl = URL.createObjectURL(file);
                            setValue(pageInstance.id, b.id, localUrl);
                          }}
                        />
                        Click to add image
                      </label>
                    )}
                  </Frame>
                );
              }

              case "text": {
                const hasBinding = typeof (b as BlockText).value === "string";
                const content = hasBinding ? renderBoundText((b as BlockText).value) : (typeof v === "string" && v) || b.placeholder || "";
                return (
                  <Frame key={b.id} rect={b.rect}>
                    {hasBinding ? (
                      <div className="w-full h-full text-sm whitespace-pre-wrap">{content}</div>
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full h-full outline-none"
                        onBlur={(e) => setValue(pageInstance.id, b.id, e.currentTarget.textContent || "")}
                      >
                        {content}
                      </div>
                    )}
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
                  <Frame key={b.id} rect={b.rect}>
                    <span className={`inline-block px-2 py-1 rounded text-xs ${palette[color] || palette.gray}`}>{label}</span>
                  </Frame>
                );
              }

              case "table": {
                const rows: any[] = Array.isArray(v) ? v : [];
                const cols = (b.options?.columns ?? []) as { key: string; label: string }[];
                return (
                  <Frame key={b.id} rect={b.rect}>
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

              case "repeater": {
                return (
                  <Frame key={b.id} rect={b.rect}>
                    {renderRepeater(b as BlockRepeater)}
                  </Frame>
                );
              }
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
