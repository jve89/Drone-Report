// client/src/editor/panels/MediaPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { uploadDraftMedia } from "../../lib/api";
import { useEditor } from "../../state/editorStore";
import { useMediaStore } from "../../state/mediaStore";
import type { MediaItem } from "@drone-report/shared/types/media";
import MediaManagerModal from "../media/MediaManagerModal";
import { useVirtualGrid } from "../media/utils/virtualGrid";

export default function MediaPanel() {
  const { draft } = useEditor();
  const { items, setItems, addItems, query, setQuery } = useMediaStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (folderInputRef.current) folderInputRef.current.setAttribute("webkitdirectory", "");
  }, []);

  if (!draft) return null;

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((m) => (m.filename || "").toLowerCase().includes(q));
  }, [items, query]);

  async function handleUpload(files: File[]) {
    if (!files.length || !draft) return;
    setIsUploading(true);
    try {
      const uploaded = (await uploadDraftMedia(draft.id, files)) as MediaItem[];
      addItems(uploaded);
    } finally {
      setIsUploading(false);
    }
  }

  const onChoose =
    (cb: (files: File[]) => void) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.currentTarget.files || []);
      e.currentTarget.value = "";
      await cb(files);
    };

  // Panel-level DnD
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const stop = (ev: DragEvent) => { ev.preventDefault(); ev.stopPropagation(); };
    const onEnter = (ev: DragEvent) => { stop(ev); setDragOver(true); };
    const onOver = (ev: DragEvent) => stop(ev);
    const onLeave = (ev: DragEvent) => { stop(ev); if (ev.target === el) setDragOver(false); };
    const onDrop = async (ev: DragEvent) => {
      stop(ev);
      setDragOver(false);
      const files = await extractFilesFromDataTransfer(ev.dataTransfer);
      await handleUpload(files);
    };
    el.addEventListener("dragenter", onEnter);
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onEnter);
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [panelRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Virtualized list
  const gridRef = useRef<HTMLDivElement>(null);
  const rowH = 96;
  const { start, end, onScroll } = useVirtualGrid({
    itemCount: filtered.length,
    itemHeight: rowH,
    overscan: 12,
    containerRef: gridRef,
  });

  return (
    <div ref={panelRef} className="border-t p-2 text-sm overflow-x-hidden relative">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-2 overflow-visible">
        <input
          type="text"
          placeholder="Search filename…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[160px] flex-1 px-2 py-1 border rounded"
        />

        {/* Split button */}
        <div className="relative overflow-visible">
          <div className="inline-flex">
            <button className="px-3 py-1 rounded-l border hover:bg-gray-50" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Add media</button>
            <button className="px-2 py-1 rounded-r border-l-0 border hover:bg-gray-50" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>▾</button>
          </div>

          {menuOpen && (
            <ul role="menu" className="absolute left-0 z-50 mt-1 w-32 bg-white text-gray-900 border rounded shadow" onMouseLeave={() => setMenuOpen(false)}>
              <li>
                <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}>
                  Files
                </button>
              </li>
              <li>
                <button role="menuitem" title="Chromium only" className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); folderInputRef.current?.click(); }}>
                  Folder
                </button>
              </li>
              <li>
                <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); zipInputRef.current?.click(); }}>
                  ZIP
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" multiple accept="image/*,.zip" onChange={onChoose(handleUpload)} className="hidden" />
        <input ref={folderInputRef} type="file" multiple onChange={onChoose(handleUpload)} className="hidden" />
        <input ref={zipInputRef} type="file" accept=".zip" onChange={onChoose((fs) => handleUpload(fs.filter((f) => f.name.toLowerCase().endsWith(".zip"))))} className="hidden" />

        <button className="ml-auto px-2 py-1 rounded border hover:bg-gray-50" onClick={() => setIsOpen(true)} aria-label="Open Media Manager" title="Open Media Manager">
          Expand
        </button>
      </div>

      {isUploading && <div className="text-xs text-gray-600 mb-2">Uploading…</div>}

      {/* Scrollable list */}
      <div ref={gridRef} onScroll={onScroll} className="h-64 overflow-y-auto overflow-x-hidden border rounded p-2" role="list" aria-label="Media items">
        <div style={{ height: filtered.length * rowH }} className="relative">
          {filtered.slice(start, end).map((m, i) => {
            const index = start + i;
            const top = index * rowH + 4;
            return (
              <div key={m.id} className="absolute inset-x-0" style={{ top }} role="listitem">
                <div className="flex items-center gap-3 pr-2">
                  <div className="flex-none w-20 h-20 border rounded overflow-hidden bg-white">
                    <img src={m.thumb || m.url} alt={m.filename || m.id} className="w-full h-full object-cover" draggable={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">{m.filename || "unnamed"}</div>
                    <div className="text-[11px] text-gray-500">{m.kind || "image"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <div className="text-center text-xs text-gray-500 py-6">Drop files here or use “Add media”.</div>}
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded pointer-events-none flex items-center justify-center">
          <div className="px-3 py-1 bg-white/90 border rounded text-sm">Drop to add</div>
        </div>
      )}

      {/* Media Manager modal */}
      {isOpen && draft && (
        <MediaManagerModal
          draftId={draft.id}
          onClose={() => setIsOpen(false)}
          onUploaded={setItems}
        />
      )}
    </div>
  );
}

// Best-effort extraction of files from a DataTransfer
async function extractFilesFromDataTransfer(dt: DataTransfer | null): Promise<File[]> {
  if (!dt) return [];
  const files = Array.from(dt.files || []);
  const items = dt.items ? Array.from(dt.items) : [];
  const hasEntries = items.some((it) => typeof (it as any).webkitGetAsEntry === "function");
  if (!hasEntries) return files;

  const out: File[] = [...files];
  const walkers: Promise<void>[] = [];

  for (const it of items) {
    // @ts-ignore Chromium API
    const entry = (it as any).webkitGetAsEntry && (it as any).webkitGetAsEntry();
    if (!entry) continue;
    if (entry.isFile) {
      const p = new Promise<void>((resolve) => {
        entry.file((f: File) => { out.push(f); resolve(); }, () => resolve());
      });
      walkers.push(p);
    } else if (entry.isDirectory) {
      walkers.push(walkDirectory(entry, out));
    }
  }
  await Promise.all(walkers);
  return out;
}

// @ts-ignore Chromium directory reader types
function walkDirectory(dirEntry: any, sink: File[]): Promise<void> {
  return new Promise((resolve) => {
    const reader = dirEntry.createReader();
    const entries: any[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch: any[]) => {
          if (!batch.length) {
            const ops = entries.map((ent) =>
              ent.isFile
                ? new Promise<void>((res) => ent.file((f: File) => { sink.push(f); res(); }, () => res()))
                : walkDirectory(ent, sink)
            );
            Promise.all(ops).then(() => resolve());
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        () => resolve()
      );
    };
    readBatch();
  });
}
