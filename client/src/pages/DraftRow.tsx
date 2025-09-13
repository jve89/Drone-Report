// client/src/pages/DraftRow.tsx
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { deleteDraft } from "../lib/api";

type DraftRowProps = {
  draft: any;
  onDeleted?: (id: string) => void;
};

export default function DraftRow({ draft, onDeleted }: DraftRowProps) {
  const title = draft.payload?.meta?.title || draft.title || "Untitled";
  const templateId = draft.payload?.meta?.templateId || draft.templateId || "—";
  const updated = draft.updatedAt || draft.updated_at;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function onDelete() {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      setMenuOpen(false);
      onDeleted?.(draft.id); // optimistic
      await deleteDraft(draft.id);
    } catch (e) {
      // restore on failure by forcing a reload of the list later if needed
      console.error(e);
      alert("Failed to delete report");
      window.location.reload();
    }
  }

  return (
    <div className="relative border rounded p-3 hover:bg-gray-50">
      <Link to={`/annotate/${draft.id}`} className="block pr-8">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-gray-500">
          {updated ? new Date(updated).toLocaleString() : ""}
        </div>
        <div className="text-xs text-gray-500">Template: {templateId}</div>
      </Link>

      {/* Kebab */}
      <div className="absolute bottom-2 right-2" ref={menuRef}>
        <button
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="p-1 rounded hover:bg-gray-100"
          onClick={() => setMenuOpen(v => !v)}
          title="More actions"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute z-10 bottom-7 right-0 min-w-36 bg-white border rounded shadow-md"
          >
            <button
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={onDelete}
            >
              Delete report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
