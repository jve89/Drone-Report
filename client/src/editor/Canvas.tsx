// client/src/editor/Canvas.tsx
import React from "react";
import { useEditor } from "../state/editorStore";

function pct(n: number) {
  return `${n}%`;
}

// minimal block type for editor rendering
type Block = {
  id: string;
  type: string;
  rect: { x: number; y: number; w: number; h: number };
  placeholder?: string;
};

export default function Canvas() {
  const { draft, template, pageIndex, setValue } = useEditor();
  if (!draft || !template) return <div className="p-6 text-gray-500">Loading editor…</div>;

  const pageInstances = draft.pageInstances || [];
  const pageInstance = pageInstances[pageIndex];
  if (!pageInstance) return <div className="p-6 text-gray-500">No page to display</div>;

  const tPage = template.pages.find((p: any) => p.id === pageInstance.templatePageId);
  if (!tPage) return <div className="p-6 text-gray-500">Template page not found</div>;

  const blocks = Array.isArray(tPage.blocks) ? (tPage.blocks as any[]) : [];

  return (
    <div className="w-full flex items-start justify-center bg-neutral-100 p-6">
      <div className="relative bg-white shadow w-[820px] h-[1160px]">
        {blocks.map((b: any) => {
          const style: React.CSSProperties = {
            position: "absolute",
            left: pct(b.rect.x),
            top: pct(b.rect.y),
            width: pct(b.rect.w),
            height: pct(b.rect.h),
            border: "1px dashed #e5e7eb",
            padding: 8,
            overflow: "hidden",
            background: "rgba(255,255,255,0.9)",
          };
          const value = pageInstance.values?.[b.id] ?? "";
          if (b.type === "image_slot") {
            const url = typeof value === "string" ? value : "";
            return (
              <div key={b.id} style={style}>
                {url ? (
                  <img src={url} alt={b.id} className="w-full h-full object-cover" />
                ) : (
                  <label className="text-sm text-gray-500 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const localUrl = URL.createObjectURL(file);
                        setValue(pageInstance.id, b.id, localUrl);
                      }}
                    />
                    Click to add image
                  </label>
                )}
              </div>
            );
          }
          
          return (
            <div
              key={b.id}
              style={style}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setValue(pageInstance.id, b.id, e.currentTarget.textContent || "")}
            >
              {value || b.placeholder || ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
