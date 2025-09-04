// client/src/editor/Toolbar.tsx
import { useEditor } from "../state/editorStore";
import TemplateDropdown from "./TemplateDropdown";

export default function Toolbar() {
  const { draft, template, pageIndex, setPageIndex, repeatPage } = useEditor();
  if (!draft) return null;

  const pageCount = draft.pageInstances?.length ?? 0;
  const hasPages = pageCount > 0;
  const current = hasPages ? draft.pageInstances[pageIndex] : null;

  return (
    <div className="h-12 border-b px-3 flex items-center gap-2 bg-white">
      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
        disabled={!hasPages || pageIndex <= 0}
      >
        Prev
      </button>

      <div className="text-sm min-w-[88px] text-center">
        {hasPages ? `${pageIndex + 1} / ${pageCount}` : "0 / 0"}
      </div>

      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
        disabled={!hasPages || pageIndex >= pageCount - 1}
      >
        Next
      </button>

      <div className="flex-1" />

      {/* Template selector always visible */}
      <TemplateDropdown />

      <div className="flex-1" />

      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        onClick={() => current && repeatPage(current.id)}
        title="Repeat current page"
        disabled={!current}
      >
        Repeat page
      </button>

      <a
        className={`px-3 py-1 border rounded ${template && hasPages ? "" : "pointer-events-none opacity-50"}`}
        href={template && hasPages ? `/api/drafts/${draft.id}/export/pdf` : undefined}
        target="_blank"
      >
        Export (PDF)
      </a>
    </div>
  );
}
