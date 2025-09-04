// client/src/editor/panels/ExportPanel.tsx
import React, { useRef, useState } from "react";
import { exportDraftHtml, uploadDraftMedia } from "../../lib/api";
import { useEditor } from "../../state/editorStore";
import type { Draft } from "../../types/draft";

export default function ExportPanel() {
  const { draft, template, zoom, setZoom, setDraft } = useEditor();
  const draftId = draft?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!draftId) return null;
  const blocked = !template;

  function clamp(z: number) {
    return Math.min(2, Math.max(0.25, z));
  }
  function onZoomDelta(delta: number) {
    setZoom(clamp(Number((zoom + delta).toFixed(2))));
  }

  async function exportHtml() {
    if (blocked) return;
    try {
      setBusy(true);
      setError(null);
      const html = await exportDraftHtml(draftId!);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files || []);
    e.currentTarget.value = "";
    if (!files.length || !draft) return;
    const current: Draft = draft;
    try {
      setBusy(true);
      const media = await uploadDraftMedia(current.id, files);
      setDraft({ ...current, media } as Draft);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-10 p-3 bg-white border-t">
      <div className="flex items-center">
        {/* Left: Media */}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={onPickMedia}
          />
          <button
            className="px-3 py-2 border rounded text-sm disabled:opacity-50"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title="Add photos"
          >
            Add media
          </button>
          <span className="text-xs text-gray-500">
            {draft?.media?.length ? `${draft.media.length} items` : "No media"}
          </span>
        </div>

        {/* Center: Zoom */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-600">Zoom</span>
          <button
            className="px-2 py-1 border rounded text-sm"
            onClick={() => onZoomDelta(-0.1)}
            title="Zoom out"
          >
            −
          </button>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(clamp(parseFloat(e.target.value)))}
            className="w-40"
            aria-label="Page zoom"
          />
          <button
            className="px-2 py-1 border rounded text-sm"
            onClick={() => onZoomDelta(+0.1)}
            title="Zoom in"
          >
            +
          </button>
          <div className="w-12 text-right text-sm tabular-nums">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Right: Export */}
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-2 border rounded disabled:opacity-50"
            onClick={exportHtml}
            disabled={busy || blocked}
            title={blocked ? "Select a template to enable export" : "Export HTML"}
          >
            {busy ? "Working…" : "Export HTML"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Add media, adjust zoom, then export. The PDF link in the top bar uses the same HTML.
      </p>
    </div>
  );
}
