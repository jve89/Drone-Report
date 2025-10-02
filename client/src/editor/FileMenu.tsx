// client/src/editor/FileMenu.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDraftRecord } from "../lib/api";
import { useEditor } from "../state/editor";

export default function FileMenu() {
  const nav = useNavigate();
  const { draft, saveNow, setDraftTitle, dirty, saving, _saveTimer } = useEditor();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = "file-menu";

  const title =
    (draft as any)?.payload?.meta?.title ||
    (draft as any)?.title ||
    "Untitled";

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Close on Escape and focus first item on open
  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onNew() {
    setOpen(false);
    const id = await createDraftRecord({});
    nav(`/annotate/${id}`);
  }
  function onOpen() {
    setOpen(false);
    nav("/dashboard");
  }
  async function onSave() {
    setOpen(false);
    await saveNow();
  }
  async function onRename() {
    const next = window.prompt("Report title", title);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setOpen(false);
    await setDraftTitle(trimmed);
  }
  function onClose() {
    setOpen(false);
    nav("/dashboard");
  }

  const isSaving = saving || !!_saveTimer;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="px-3 py-1 border rounded hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(v => !v)}
      >
        File ▾
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute z-20 mt-1 w-44 bg-white border rounded shadow"
        >
          <button
            type="button"
            ref={firstItemRef}
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onNew}
          >
            New report
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onOpen}
          >
            Open…
          </button>
          <button
            type="button"
            role="menuitem"
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${isSaving ? "opacity-60 pointer-events-none" : ""}`}
            onClick={onSave}
          >
            Save
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onRename}
          >
            Rename…
          </button>
          <div className="my-1 border-t" />
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}

      {/* Optional inline title hover */}
      <span className="sr-only">Current title: {title}</span>
      <span className="sr-only">
        Status: {isSaving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
      </span>
    </div>
  );
}
