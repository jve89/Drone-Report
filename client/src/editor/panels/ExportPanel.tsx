// client/src/editor/panels/ExportPanel.tsx
import React, { useRef, useState } from "react";
import { exportDraftHtml, uploadDraftMedia } from "../../lib/api";
import { useEditor } from "../../state/editorStore";
import type { Draft } from "../../types/draft";

export default function ExportPanel() {
  const { draft, template, setDraft } = useEditor();
  const draftId = draft?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!draftId) return null;
  const blocked = !template;

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
    try {
      setBusy(true);
      const media = await uploadDraftMedia(draft.id, files);
      setDraft({ ...draft, media } as Draft);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-10 p-3 bg-white border-t">
      <div className="flex items-center justify-between">
        {/* Media */}
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

        {/* Export */}
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
        Add media, then export. The PDF link in the top bar uses the same HTML.
      </p>
    </div>
  );
}
