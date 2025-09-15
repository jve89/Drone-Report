// client/src/editor/blocks/ElementsPanel.tsx
import { useEditor } from "../../state/editorStore";

export default function ElementsPanel() {
  const { draft, tool, startInsert, cancelInsert } = useEditor();

  const disabled = !draft || !draft.pageInstances?.length;

  const isActive = (k: "text" | "line" | "rect" | "ellipse" | "divider") =>
    tool.mode === "insert" && (tool as any).kind === k;

  const toggle = (k: "text" | "line" | "rect" | "ellipse" | "divider") => {
    if (disabled) return;
    if (isActive(k)) cancelInsert();
    else startInsert(k as any);
  };

  const btn = (label: string, k: "text" | "line" | "rect" | "ellipse" | "divider", title: string) => (
    <button
      className={`px-3 py-2 border rounded text-sm disabled:opacity-50 ${
        isActive(k) ? "bg-green-50 border-green-300" : "hover:bg-gray-50"
      }`}
      disabled={disabled}
      onClick={() => toggle(k)}
      title={title}
    >
      {isActive(k) ? "Cancel" : label}
    </button>
  );

  return (
    <div className="p-3 space-y-4">
      <div>
        <div className="text-sm font-medium">Elements</div>
        <p className="text-[11px] text-gray-500">
          Click an element, then click on the page to place it.
        </p>
      </div>

      {/* Text */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Text</div>
        <div className="grid grid-cols-2 gap-2">
          {btn("Text", "text", "Insert a text box")}
        </div>
      </div>

      {/* Shapes */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Shapes</div>
        <div className="grid grid-cols-3 gap-2">
          {btn("Line", "line", "Insert a line")}
          {btn("Rect", "rect", "Insert a rectangle")}
          {btn("Ellipse", "ellipse", "Insert an ellipse")}
          {btn("Divider", "divider", "Insert a horizontal divider")}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Press Esc to cancel placement.
        </p>
      </div>

      {disabled && (
        <div className="text-[11px] text-gray-500">
          Load or create a draft first.
        </div>
      )}
    </div>
  );
}
