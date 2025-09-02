// client/src/editor/Toolbar.tsx
import { useEditor } from "../state/editorStore";

export default function Toolbar() {
  const { draft, template, pageIndex, setPageIndex, repeatPage } = useEditor();
  if (!draft || !template) return null;
  const current = draft.pageInstances[pageIndex];

  return (
    <div className="h-12 border-b px-3 flex items-center gap-2 bg-white">
      <button
        className="px-3 py-1 border rounded"
        onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
      >
        Prev
      </button>
      <div className="text-sm">{pageIndex + 1} / {draft.pageInstances.length}</div>
      <button
        className="px-3 py-1 border rounded"
        onClick={() => setPageIndex(Math.min(draft.pageInstances.length - 1, pageIndex + 1))}
      >
        Next
      </button>
      <div className="flex-1" />
      <button
        className="px-3 py-1 border rounded"
        onClick={() => repeatPage(current.id)}
        title="Repeat current page"
      >
        Repeat page
      </button>
      <a className="px-3 py-1 border rounded" href={`/api/drafts/${draft.id}/export/pdf`} target="_blank">
        Export (HTML)
      </a>
    </div>
  );
}
