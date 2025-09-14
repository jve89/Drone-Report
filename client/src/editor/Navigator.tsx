// client/src/editor/Navigator.tsx
import { useEffect, useMemo, useState } from "react";
import { useEditor } from "../state/editorStore";

type NavMode = "list" | "thumbs";

export default function Navigator() {
  const { draft, template, pageIndex, setPageIndex, repeatPage, deletePage } = useEditor();
  const [mode, setMode] = useState<NavMode>("list");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  // Always call hooks
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

  // Render guards only AFTER hooks
  if (!draft) return <div className="p-2 text-xs text-gray-500">Loading…</div>;
  if (!template) return <div className="p-2 text-xs text-gray-500">Select a template to see pages.</div>;

  const canDelete = (draft.pageInstances?.length ?? 0) > 1;

  function handleDelete(id: string) {
    if (!canDelete) return;
    deletePage?.(id);
    setOpenMenuId(null);
  }

  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className="px-2 py-2 border-b bg-white">
        <div className="flex items-center justify-between min-w-0">
          <div className="text-xs text-gray-500 truncate">Pages</div>
          <div className="flex gap-1 shrink-0">
            <button
              className={`px-2 py-1 text-xs rounded border ${mode === "list" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setMode("list")}
              title="List view"
            >
              List
            </button>
            <button
              className={`px-2 py-1 text-xs rounded border ${mode === "thumbs" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setMode("thumbs")}
              title="Thumbnail view"
            >
              Thumbs
            </button>
          </div>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">{pageIndex + 1} / {pageCount}</div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {mode === "list" ? (
          <ul className="py-1">
            {items.map((it) => (
              <li key={it.id}>
                <div className={`w-full flex items-center justify-between px-2 ${it.idx === pageIndex ? "bg-gray-100" : ""}`}>
                  <button
                    onClick={() => { setPageIndex(it.idx); setOpenMenuId(null); }}
                    className={`flex-1 text-left px-1 py-2 text-sm hover:bg-gray-50 ${it.idx === pageIndex ? "font-medium" : ""}`}
                  >
                    {it.idx + 1}. {it.name}
                  </button>
                  <div className="relative">
                    <button
                      className="px-2 py-1 text-gray-600 hover:text-gray-900"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === it.id ? null : it.id); }}
                      title="More"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === it.id}
                    >
                      ⋮
                    </button>
                    {openMenuId === it.id && (
                      <div
                        className="absolute right-0 z-10 mt-1 w-36 bg-white border rounded shadow"
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
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
            ))}
          </ul>
        ) : (
          <div className="p-2 grid grid-cols-1 gap-3">
            {items.map((it) => (
              <div key={it.id} className={`w-full border rounded-md p-2 hover:shadow-sm ${it.idx === pageIndex ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-start justify-between">
                  <button
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
                      className="px-2 py-1 text-gray-600 hover:text-gray-900"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === it.id ? null : it.id); }}
                      title="More"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === it.id}
                    >
                      ⋮
                    </button>
                    {openMenuId === it.id && (
                      <div
                        className="absolute right-0 z-10 mt-1 w-36 bg-white border rounded shadow"
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
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
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-white">
        <button
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
