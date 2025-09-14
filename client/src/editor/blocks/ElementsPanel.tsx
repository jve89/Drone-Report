// client/src/editor/blocks/ElementsPanel.tsx
import { useEditor } from "../../state/editorStore";

export default function ElementsPanel() {
  const { draft, tool, startInsert, cancelInsert } = useEditor();

  const disabled = !draft || !draft.pageInstances?.length;

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Elements</div>
      <p className="text-[11px] text-gray-500">
        Click an element, then click on the page to place it.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={`px-3 py-2 border rounded text-sm ${tool.mode === "insert" ? "bg-green-50 border-green-300" : "hover:bg-gray-50"} disabled:opacity-50`}
          disabled={disabled}
          onClick={() => (tool.mode === "insert" ? cancelInsert() : startInsert("text"))}
          title="Insert a text box"
        >
          {tool.mode === "insert" ? "Cancel" : "Text"}
        </button>
      </div>

      {disabled && (
        <div className="text-[11px] text-gray-500">
          Load or create a draft first.
        </div>
      )}
    </div>
  );
}
