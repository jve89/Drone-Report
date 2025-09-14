// client/src/editor/preview/EditorPreviewModal.tsx
import React, { useEffect, useRef } from "react";
import { useEditor } from "../../state/editorStore";
import BlockViewer from "./BlockViewer";

export default function EditorPreviewModal() {
  const { draft, template, previewZoom, setPreviewZoom, closePreview } = useEditor();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePreview();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "0") { e.preventDefault(); setPreviewZoom(1); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) { e.preventDefault(); setPreviewZoom(previewZoom + 0.1); }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); setPreviewZoom(previewZoom - 0.1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview, previewZoom, setPreviewZoom]);

  if (!draft || !template) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={(e) => { if (e.target === backdropRef.current) closePreview(); }}
      />
      {/* Panel */}
      <div className="absolute inset-4 md:inset-10 bg-white rounded shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 flex items-center justify-between border-b px-3">
          <div className="text-sm font-medium">Preview</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 border rounded" onClick={() => setPreviewZoom(previewZoom - 0.1)} title="Zoom out">−</button>
            <div className="w-16 text-center text-sm">{Math.round(previewZoom * 100)}%</div>
            <button className="px-2 py-1 border rounded" onClick={() => setPreviewZoom(previewZoom + 0.1)} title="Zoom in">+</button>
            <button className="px-2 py-1 border rounded" onClick={() => setPreviewZoom(1)} title="Reset zoom">100%</button>
            <button className="ml-2 px-3 py-1 border rounded" onClick={closePreview} title="Close" aria-label="Close preview">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-neutral-100">
          <div
            className="origin-top-left"
            style={{ transform: `scale(${previewZoom})`, transformOrigin: "top left" }}
          >
            <BlockViewer draft={draft} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
}
