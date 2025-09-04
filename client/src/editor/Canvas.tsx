// client/src/editor/Canvas.tsx
import React from "react";
import { useEditor } from "../state/editorStore";

/** Local types */
type Rect = { x: number; y: number; w: number; h: number };
type BlockBase = { id: string; type: string; rect: Rect; label?: string; placeholder?: string; options?: any };
type BlockText = BlockBase & { type: "text" };
type BlockImage = BlockBase & { type: "image_slot" };
type BlockTable = BlockBase & { type: "table"; options?: { columns?: { key: string; label: string }[] } };
type BlockBadge = BlockBase & { type: "badge"; options?: { palette?: string } };
type BlockRepeater = BlockBase & { type: "repeater"; options?: { previewCount?: number } };
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
  const { draft, template, pageIndex, setValue, zoom } = useEditor();

  if (!draft) return <div className="p-6 text-gray-500">Loading editor…</div>;

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

  const blocks = ((tPage.blocks ?? []) as unknown) as Block[];

  const PAGE_W = 820;
  const PAGE_H = 1160;

  return (
    <div className="w-full flex items-start justify-center bg-neutral-100 p-6">
      <div style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }} className="relative">
        <div
          className="relative bg-white shadow"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          {blocks.map((b: Block) => {
            const v = (pageInstance.values as any)?.[b.id];

            switch (b.type) {
              case "image_slot": {
                const url = typeof v === "string" ? v : "";
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
                return (
                  <Frame key={b.id} rect={b.rect}>
                    <div
                      contentEditable suppressContentEditableWarning className="w-full h-full outline-none"
                      onBlur={(e) => setValue(pageInstance.id, b.id, e.currentTarget.textContent || "")}
                    >
                      {(typeof v === "string" && v) || b.placeholder || ""}
                    </div>
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
                const val = v && typeof v === "object" ? (v as { count?: number }) : {};
                const count = Number((val.count ?? b.options?.previewCount ?? 0) as number);
                return (
                  <Frame key={b.id} rect={b.rect}>
                    <div className="w-full h-full overflow-auto space-y-2 text-xs text-gray-600">
                      {Array.from({ length: Math.max(0, count) }).map((_, i) => (
                        <div key={i} className="border rounded p-2">Repeater item #{i + 1} — design child layout in template</div>
                      ))}
                      {!count && <div className="text-gray-400">No items. Set preview count in Inspector.</div>}
                    </div>
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
