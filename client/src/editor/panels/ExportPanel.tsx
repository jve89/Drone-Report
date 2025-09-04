// client/src/editor/panels/ExportPanel.tsx
import { useState } from "react";
import { exportDraftHtml } from "../../lib/api";
import { useEditor } from "../../state/editorStore";

export default function ExportPanel() {
  const { draft } = useEditor();
  const draftId = draft?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draftId) return null;

  async function exportHtml() {
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

  return (
    <div className="p-3 border-t bg-white">
      <div className="flex items-center gap-3">
        <button
          className="px-3 py-2 border rounded disabled:opacity-50"
          onClick={exportHtml}
          disabled={busy}
        >
          {busy ? "Exporting…" : "Export HTML"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Exports the current draft as HTML. PDF export will use the same HTML.
      </p>
    </div>
  );
}
