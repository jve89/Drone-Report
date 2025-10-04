// client/src/editor/ViewerControls.tsx
import { useEffect } from "react";
import { useEditor } from "../state/editor";

function clamp(z: number) {
  return Math.min(2, Math.max(0.25, Number.isFinite(z) ? z : 1));
}
function isTypingTarget(el: EventTarget | null) {
  return (
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

export default function ViewerControls() {
  const { draft, template, pageIndex, setPageIndex, zoom, setZoom } = useEditor();

  const pageCount = draft?.pageInstances?.length ?? 0;
  const hasPages = !!template && pageCount > 0;

  const prevDisabled = !hasPages || pageIndex <= 0;
  const nextDisabled = !hasPages || pageIndex >= pageCount - 1;

  function onPrev() {
    if (!prevDisabled) setPageIndex(pageIndex - 1);
  }
  function onNext() {
    if (!nextDisabled) setPageIndex(pageIndex + 1);
  }
  function onZoom(delta: number) {
    const base = Number.isFinite(zoom) ? (zoom as number) : 1;
    const next = Number((base + delta).toFixed(2));
    setZoom(clamp(next));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if (e.key === "PageUp") {
        if (!prevDisabled) {
          e.preventDefault();
          onPrev();
        }
        return;
      }
      if (e.key === "PageDown") {
        if (!nextDisabled) {
          e.preventDefault();
          onNext();
        }
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        onZoom(-0.1);
        return;
      }
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        onZoom(+0.1);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageIndex, prevDisabled, nextDisabled, zoom]); // deps OK

  if (!hasPages) return null;

  const displayZoom = Number.isFinite(zoom) ? (zoom as number) : 1;

  return (
    <div
      className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
      role="toolbar"
      aria-label="Viewer controls"
    >
      <div className="flex items-center gap-4 rounded-lg bg-gray-700 text-white shadow-lg px-4 py-2 select-none">
        <button
          type="button"
          className={`px-2 py-1 rounded ${prevDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"}`}
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="Previous page"
          title="Previous page (PageUp)"
        >
          ‹
        </button>
        <div className="text-sm tabular-nums" aria-live="polite">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <button
          type="button"
          className={`px-2 py-1 rounded ${nextDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"}`}
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next page"
          title="Next page (PageDown)"
        >
          ›
        </button>

        <div className="w-px h-5 bg-gray-600 mx-1" />

        <button
          type="button"
          className="px-2 py-1 rounded hover:bg-gray-600"
          onClick={() => onZoom(-0.1)}
          aria-label="Zoom out"
          title="Zoom out (-)"
        >
          ⍗
        </button>
        <div className="min-w-[52px] text-center text-sm tabular-nums">
          {Math.round(displayZoom * 100)}%
        </div>
        <button
          type="button"
          className="px-2 py-1 rounded hover:bg-gray-600"
          onClick={() => onZoom(+0.1)}
          aria-label="Zoom in"
          title="Zoom in (+)"
        >
          ⍐
        </button>
      </div>
    </div>
  );
}
