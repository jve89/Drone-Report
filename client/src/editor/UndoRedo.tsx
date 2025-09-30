// client/src/editor/UndoRedo.tsx
import { useEffect } from "react";
import { useEditor } from "../state/editorStore";

export default function UndoRedo() {
  const { canUndo, canRedo, undo, redo } = useEditor();

  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null;
      if (!el) return false;
      if (el.closest("[contenteditable=''], [contenteditable='true']")) return true;
      const tag = (el as HTMLElement).tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    }

    function onKey(e: KeyboardEvent) {
      // Do not override native behavior in editable contexts
      if (isEditableTarget(e.target)) return;

      const meta = e.metaKey || e.ctrlKey; // works across platforms
      if (!meta) return;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+Z
      if (key === "z" && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Shift+Cmd/Ctrl+Z  OR  Cmd/Ctrl+Y
      if ((key === "z" && e.shiftKey) || key === "y") {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`p-2 border rounded ${canUndo ? "hover:bg-gray-50" : "opacity-50 pointer-events-none"}`}
        onClick={undo}
        title="Undo (Cmd/Ctrl+Z)"
        aria-label="Undo"
      >
        {/* Undo icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M12 5a7 7 0 1 1-4.95 11.95.75.75 0 1 0-1.06 1.06A8.5 8.5 0 1 0 12 3H6.75a.75.75 0 0 0 0 1.5H12Z" />
          <path d="M6.28 8.28a.75.75 0 0 0 1.06-1.06L5.81 5.69a1 1 0 0 0-1.62.78v4.2a.75.75 0 0 0 1.5 0V7.56l.59.72Z" />
        </svg>
      </button>

      <button
        type="button"
        className={`p-2 border rounded ${canRedo ? "hover:bg-gray-50" : "opacity-50 pointer-events-none"}`}
        onClick={redo}
        title="Redo (Shift+Cmd/Ctrl+Z)"
        aria-label="Redo"
      >
        {/* Redo icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M12 5a7 7 0 1 0 4.95 11.95.75.75 0 1 1 1.06 1.06A8.5 8.5 0 1 1 12 3h5.25a.75.75 0 0 1 0 1.5H12Z" />
          <path d="M17.72 8.28a.75.75 0 0 1-1.06-1.06l1.53-1.53a1 1 0 0 1 1.62.78v4.2a.75.75 0 0 1-1.5 0V7.56l-.59.72Z" />
        </svg>
      </button>
    </div>
  );
}
