// client/src/editor/preview/EditorPreviewModal.tsx
import React, { useEffect, useRef } from "react";
import { useEditor } from "../../state/editorStore";
import BlockViewer from "./BlockViewer";

const clampZoom = (z: number) => Math.max(0.5, Math.min(3, z));

export default function EditorPreviewModal() {
  const { draft, template, previewZoom, setPreviewZoom, closePreview } = useEditor();
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = "editor-preview-title";

  // Keyboard shortcuts and body scroll lock
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") closePreview();
      if (meta && e.key.toLowerCase() === "0") {
        e.preventDefault();
        setPreviewZoom(1);
      }
      if (meta && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setPreviewZoom(clampZoom(previewZoom + 0.1));
      }
      if (meta && e.key === "-") {
        e.preventDefault();
        setPreviewZoom(clampZoom(previewZoom - 0.1));
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    // Focus close button for keyboard users
    closeBtnRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePreview, setPreviewZoom]); // avoid reattaching on zoom changes

  if (!draft || !template) return null;

  const zoom = clampZoom(previewZoom);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={(e) => {
          if (e.currentTarget === e.target) closePreview();
        }}
      />
      {/* Panel */}
      <div
        className="absolute inset-4 md:inset-10 bg-white rounded shadow-lg overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between border-b px-3">
          <div id={titleId} className="text-sm font-medium">
            Preview
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 border rounded"
              onClick={() => setPreviewZoom(clampZoom(zoom - 0.1))}
              title="Zoom out"
            >
              −
            </button>
            <div className="w-16 text-center text-sm">{Math.round(zoom * 100)}%</div>
            <button
              type="button"
              className="px-2 py-1 border rounded"
              onClick={() => setPreviewZoom(clampZoom(zoom + 0.1))}
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="ml-2 px-3 py-1 border rounded"
              onClick={() => setPreviewZoom(1)}
              title="Reset zoom"
            >
              100%
            </button>
            <button
              type="button"
              ref={closeBtnRef}
              className="ml-2 px-3 py-1 border rounded"
              onClick={closePreview}
              title="Close"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-neutral-100">
          <div
            className="origin-top-left"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          >
            <BlockViewer draft={draft} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
}
