// client/src/editor/Navigator.tsx
import { useEditor } from "../state/editorStore";

export default function Navigator() {
  const { draft, template, pageIndex, setPageIndex } = useEditor();
  if (!draft || !template) return null;
  return (
    <div className="w-56 border-r overflow-auto">
      <div className="p-2 text-xs text-gray-500">Pages</div>
      {draft.pageInstances.map((pi: any, i: number) => {
        const tp = template.pages.find((p: any) => p.id === pi.templatePageId);
        return (
          <button
            key={pi.id}
            onClick={() => setPageIndex(i)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${i === pageIndex ? "bg-gray-100 font-medium" : ""}`}
          >
            {i + 1}. {tp?.name}
          </button>
        );
      })}
    </div>
  );
}
