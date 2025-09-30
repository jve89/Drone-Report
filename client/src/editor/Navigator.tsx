// client/src/editor/Navigator.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../state/editorStore";

type NavMode = "list" | "thumbs";

export default function Navigator() {
  const { draft, template, pageIndex, setPageIndex, repeatPage, deletePage } = useEditor();
  const [mode, setMode] = useState<NavMode>("list");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Persist per-draft
  useEffect(() => {
    if (!draft) return;
    const key = `dr/navMode/${draft.id}`;
    const saved = window.localStorage.getItem(key) as NavMode | null;
    if (saved === "list" || saved === "thumbs") setMode(saved);
  }, [draft?.id]);

  useEffect(() => {
    if (!draft) return;
    const key = `dr/navMode/${draft.id}`;
    window.localStorage.setItem(key, mode);
  }, [draft?.id, mode]);

  // Close open menu on outside click or Escape
  useEffect(() => {
    if (!openMenuId) return;
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  // Items
  const items = useMemo(() => {
    if (!draft || !template) return [];
    return draft.pageInstances.map((pi: any, i: number) => {
      const tp = template.pages.find((p: any) => p.id === pi.templatePageId);
      return { idx: i, id: pi.id, name: tp?.name ?? `Page ${i + 1}` };
    });
  }, [draft, template]);

  const pageCount = draft?.pageInstances?.length ?? 0;
  const hasPages = !!draft && !!template && pageCount > 0;
  const current = hasPages ? draft!.pageInstances[pageIndex] : null;

  const blocked = !template || !hasPages;
  const navPrevDisabled = blocked || pageIndex <= 0;
  const navNextDisabled = blocked || pageIndex >= pageCount - 1;

  // Guards
  if (!draft) return <div className="p-2 text-xs text-gray-500">Loading…</div>;
  if (!template) return <div className="p-2 text-xs text-gray-500">Select a template to see pages.</div>;

  const canDelete = (draft.pageInstances?.length ?? 0) > 1;

  function handleDelete(id: string) {
    if (!canDelete) return;
    deletePage?.(id);
    setOpenMenuId(null);
  }

  return (
    <div className="flex flex-col min-w-0" ref={rootRef}>
      {/* Header */}
      <div className="px-2 pt-2 pb-1 border-b bg-white">
        {/* Row 1: title + view toggles */}
        <div className="flex items-center justify-between min-w-0">
          <div className="text-xs text-gray-500 truncate">Pages</div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded border ${mode === "list" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setMode("list")}
              title="List view"
            >
              List
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded border ${mode === "thumbs" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setMode("thumbs")}
              title="Thumbnail view"
            >
              Thumbs
            </button>
          </div>
        </div>

        {/* Row 2: pager cluster */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded border disabled:opacity-50"
            onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
            disabled={navPrevDisabled}
            title={navPrevDisabled ? "No previous page" : "Previous page"}
          >
            Prev
          </button>
          <div className="px-2 py-1 text-[11px] text-gray-700 tabular-nums">
            {pageIndex + 1} / {pageCount}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded border disabled:opacity-50"
            onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
            disabled={navNextDisabled}
            title={navNextDisabled ? "No next page" : "Next page"}
          >
            Next
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {mode === "list" ? (
          <ul className="py-1">
            {items.map((it) => {
              const menuId = `page-menu-${it.id}`;
              const isOpen = openMenuId === it.id;
              return (
                <li key={it.id}>
                  <div className={`w-full flex items-center justify-between px-2 ${it.idx === pageIndex ? "bg-gray-100" : ""}`}>
                    <button
                      type="button"
                      onClick={() => { setPageIndex(it.idx); setOpenMenuId(null); }}
                      className={`flex-1 text-left px-1 py-2 text-sm hover:bg-gray-50 ${it.idx === pageIndex ? "font-medium" : ""}`}
                    >
                      {it.idx + 1}. {it.name}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : it.id); }}
                        title="More"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        aria-controls={menuId}
                      >
                        ⋮
                      </button>
                      {isOpen && (
                        <div
                          id={menuId}
                          className="absolute right-0 z-10 mt-1 w-36 bg-white border rounded shadow"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!canDelete ? "text-gray-400 cursor-not-allowed" : ""}`}
                            onClick={() => handleDelete(it.id)}
                            disabled={!canDelete}
                            role="menuitem"
                          >
                            Delete page
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-2 grid grid-cols-1 gap-3">
            {items.map((it) => {
              const menuId = `page-menu-${it.id}`;
              const isOpen = openMenuId === it.id;
              return (
                <div key={it.id} className={`w-full border rounded-md p-2 hover:shadow-sm ${it.idx === pageIndex ? "ring-2 ring-blue-500" : ""}`}>
                  <div className="flex items-start justify-between">
                    <button
                      type="button"
                      onClick={() => { setPageIndex(it.idx); setOpenMenuId(null); }}
                      className="flex-1 text-left"
                      title={it.name}
                    >
                      <div className="aspect-[3/4] w-full bg-white border rounded-sm flex items-center justify-center text-xs text-gray-400">
                        {it.idx + 1}
                      </div>
                      <div className="mt-1 text-xs truncate">{it.name}</div>
                    </button>
                    <div className="relative ml-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : it.id); }}
                        title="More"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        aria-controls={menuId}
                      >
                        ⋮
                      </button>
                      {isOpen && (
                        <div
                          id={menuId}
                          className="absolute right-0 z-10 mt-1 w-36 bg-white border rounded shadow"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!canDelete ? "text-gray-400 cursor-not-allowed" : ""}`}
                            onClick={() => handleDelete(it.id)}
                            disabled={!canDelete}
                            role="menuitem"
                          >
                            Delete page
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-white">
        <button
          type="button"
          className="w-full px-3 py-2 text-sm border rounded disabled:opacity-50"
          onClick={() => current && repeatPage(current.id)}
          disabled={!current}
          title={current ? "Duplicate current page" : "Select a page"}
        >
          +
        </button>
      </div>
    </div>
  );
}
