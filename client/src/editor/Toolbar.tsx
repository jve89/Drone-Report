// client/src/editor/Toolbar.tsx
import { useEffect } from "react";
import { useEditor } from "../state/editorStore";
import TemplateDropdown from "./TemplateDropdown";
import EditorPreviewModal from "./preview/EditorPreviewModal";
import FileMenu from "./FileMenu";
import UndoRedo from "./UndoRedo";

export default function Toolbar() {
  const { draft, template, previewOpen, openPreview, saveNow, dirty, saving, _saveTimer, lastSavedAt } = useEditor();
  if (!draft) return null;

  const hasPages = (draft.pageInstances?.length ?? 0) > 0;
  const blocked = !template;
  const exportDisabled = blocked || !hasPages;
  const previewDisabled = exportDisabled;

  const draftTitle =
    (typeof (draft as any)?.payload?.meta?.title === "string" && (draft as any).payload.meta.title.trim()) ||
    (typeof (draft as any)?.title === "string" && (draft as any).title.trim()) ||
    "Untitled";

  function openTemplateDropdown() {
    window.dispatchEvent(new CustomEvent("open-template-dropdown"));
  }

  async function backToReports() {
    try {
      await saveNow();
      const ref = document.referrer;
      const sameOrigin = !!ref && new URL(ref).origin === window.location.origin;
      if (sameOrigin) {
        history.back();
        return;
      }
    } catch {}
    window.location.href = "/dashboard";
  }

  // Warn on unload if unsaved
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty || saving || _saveTimer) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, saving, _saveTimer]);

  const status =
    saving || _saveTimer ? "Saving…" : dirty ? "Unsaved changes" : lastSavedAt ? "All changes saved" : "";

  return (
    <>
      <div className="h-12 border-b px-3 flex items-center gap-2 bg-white" role="toolbar" aria-label="Editor toolbar">
        {/* Home icon on far left */}
        <button
          type="button"
          className="p-2 border rounded hover:bg-gray-50"
          onClick={backToReports}
          aria-label="Back to dashboard"
          title="Dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M11.47 2.72a.75.75 0 0 1 1.06 0l8 8a.75.75 0 0 1-1.06 1.06L19 11.31V20a2 2 0 0 1-2 2h-3.5a.5.5 0 0 1-.5-.5V16a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5.5a.5.5 0 0 1-.5.5H5a2 2 0 0 1-2-2v-8.69l-.47.47a.75.75 0 1 1-1.06-1.06l8-8Z" />
          </svg>
        </button>

        {/* File menu */}
        <FileMenu />

        {/* Undo/Redo */}
        <UndoRedo />

        <div className="flex-1" />

        <TemplateDropdown />

        {/* Current draft title */}
        <div className="max-w-[360px] truncate text-sm text-gray-500" title={draftTitle} aria-label="Draft title">
          {draftTitle}
        </div>

        <div className="flex-1" />

        <div className="text-xs text-gray-500 mr-2 whitespace-nowrap" aria-live="polite">
          {status}
        </div>

        <button
          type="button"
          className={`px-3 py-1 border rounded ${
            previewDisabled ? "pointer-events-none opacity-50" : "hover:bg-gray-50"
          }`}
          onClick={async (e) => {
            if (previewDisabled) {
              e.preventDefault();
              openTemplateDropdown();
              return;
            }
            await saveNow();
            openPreview();
          }}
          title={previewDisabled ? "Select a template first" : "Preview report"}
        >
          Preview
        </button>

        <a
          className={`px-3 py-1 border rounded ${
            exportDisabled ? "pointer-events-none opacity-50" : "hover:bg-gray-50"
          }`}
          href={!exportDisabled ? `/api/drafts/${draft.id}/export/pdf` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={exportDisabled || undefined}
          title={exportDisabled ? "Select a template first" : "Export PDF"}
          onClick={async (e) => {
            if (exportDisabled) {
              e.preventDefault();
              openTemplateDropdown();
              return;
            }
            e.preventDefault();
            await saveNow();
            window.open(`/api/drafts/${draft.id}/export/pdf`, "_blank", "noopener");
          }}
        >
          Export (PDF)
        </a>
      </div>

      {previewOpen && <EditorPreviewModal />}
    </>
  );
}
