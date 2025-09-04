// client/src/editor/Toolbar.tsx
import { useEditor } from "../state/editorStore";
import TemplateDropdown from "./TemplateDropdown";

export default function Toolbar() {
  const { draft, template, pageIndex, setPageIndex, repeatPage } = useEditor();
  if (!draft) return null;

  const pageCount = draft.pageInstances?.length ?? 0;
  const hasPages = pageCount > 0;
  const current = hasPages ? draft.pageInstances[pageIndex] : null;

  const blocked = !template;
  const navPrevDisabled = blocked || !hasPages || pageIndex <= 0;
  const navNextDisabled = blocked || !hasPages || pageIndex >= pageCount - 1;
  const exportDisabled = blocked || !hasPages;

  function openTemplateDropdown() {
    window.dispatchEvent(new CustomEvent("open-template-dropdown"));
  }

  return (
    <div className="h-12 border-b px-3 flex items-center gap-2 bg-white">
      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
        disabled={navPrevDisabled}
        title={navPrevDisabled && blocked ? "Select a template first" : undefined}
      >
        Prev
      </button>

      <div className="text-sm min-w-[88px] text-center">
        {hasPages ? `${pageIndex + 1} / ${pageCount}` : "0 / 0"}
      </div>

      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
        disabled={navNextDisabled}
        title={navNextDisabled && blocked ? "Select a template first" : undefined}
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
        title={current ? "Repeat current page" : "Select a template first"}
        disabled={!current || blocked}
      >
        Repeat page
      </button>

      <a
        className={`px-3 py-1 border rounded ${exportDisabled ? "pointer-events-none opacity-50" : ""}`}
        href={!exportDisabled ? `/api/drafts/${draft.id}/export/pdf` : undefined}
        target="_blank"
        title={exportDisabled ? "Select a template first" : "Export PDF"}
        onClick={(e) => {
          if (exportDisabled) {
            e.preventDefault();
            openTemplateDropdown();
          }
        }}
      >
        Export (PDF)
      </a>
    </div>
  );
}
