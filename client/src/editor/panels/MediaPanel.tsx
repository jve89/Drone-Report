// client/src/editor/panels/MediaPanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadDraftMedia, deleteDraftMedia } from "../../lib/api";
import { useEditor } from "../../state/editorStore";
import { useMediaStore } from "../../state/mediaStore";
import type { MediaItem } from "@drone-report/shared/types/media";
import MediaManagerModal from "../media/MediaManagerModal";
import { useVirtualGrid } from "../media/utils/virtualGrid";
import { pickFilesViaFS, pickDirectoryViaFS } from "../../lib/pickers";
import { normalizeUploadResponse, mediaSrc, pickJustUploaded } from "../media/utils/mediaResponse";

const DR_MEDIA_MIME = "application/x-dr-media";

export default function MediaPanel() {
  const { draft, pageIndex, insertImageAppend } = useEditor();
  const { items, addItems, removeItems, query, setQuery } = useMediaStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (folderInputRef.current) folderInputRef.current.setAttribute("webkitdirectory", "");
  }, []);

  // Keep media store in sync with current draft’s media
  useEffect(() => {
    if (!draft) return;
    const serverMedia = ((draft as any).media || []) as MediaItem[];
    const cur = new Set(items.map((m) => m.id));
    const nxt = new Set(serverMedia.map((m) => m.id));
    const identical = cur.size === nxt.size && [...cur].every((id) => nxt.has(id));
    if (identical) return;

    if (items.length) removeItems(items.map((m) => m.id));
    if (serverMedia.length) addItems(serverMedia);
    setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  if (!draft) return null;

  const renderable = useMemo(
    () => items.filter((m) => m && m.id && mediaSrc(m)),
    [items]
  );

  const filtered = useMemo(() => {
    if (!query) return renderable;
    const q = String(query || "").toLowerCase();
    return renderable.filter((m) => (m.filename || "").toLowerCase().includes(q));
  }, [renderable, query]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length || !draft) return;
      setIsUploading(true);
      try {
        const before = new Set(items.map((x) => x.id));
        const resp = await uploadDraftMedia(draft.id, files);
        const all = normalizeUploadResponse(resp) as MediaItem[];
        const picked = pickJustUploaded(all, files, before) as MediaItem[];
        if (picked.length) addItems(picked);
      } finally {
        setIsUploading(false);
      }
    },
    [draft, items, addItems]
  );

  const onChoose =
    (cb: (files: File[]) => void) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.currentTarget.files || []);
      e.currentTarget.value = "";
      await cb(files);
    };

  // Drag-and-drop onto the panel (stable listeners)
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const stop = (ev: DragEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const onEnter = (ev: DragEvent) => {
      stop(ev);
      setDragOver(true);
    };
    const onOver = (ev: DragEvent) => stop(ev);
    const onLeave = (ev: DragEvent) => {
      stop(ev);
      if (ev.target === el) setDragOver(false);
    };
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
  }, [handleUpload]);

  const gridRef = useRef<HTMLDivElement>(null);
  const rowH = 96;
  const { start, end, onScroll } = useVirtualGrid({
    itemCount: filtered.length,
    itemHeight: rowH,
    overscan: 12,
    containerRef: gridRef,
  });

  async function onDelete(id: string) {
    if (!draft) return;
    removeItems([id]); // optimistic
    setBusyIds((s) => new Set(s).add(id));
    try {
      await deleteDraftMedia(draft.id, id);
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  function onDragStartMedia(ev: React.DragEvent, m: MediaItem) {
    if (!draft) return;
    const url = mediaSrc(m) || "";
    if (!url) return;
    const payload = {
      draftId: draft.id,
      id: m.id,
      url,
      filename: m.filename || m.id,
      kind: m.kind || "image",
    };
    ev.dataTransfer.setData(DR_MEDIA_MIME, JSON.stringify(payload));
    ev.dataTransfer.effectAllowed = "copy";
  }

  const currentPageId = draft.pageInstances?.[pageIndex]?.id || null;

  return (
    <div
      ref={panelRef}
      className="border-t p-2 text-sm relative h-full flex flex-col min-h-[300px] overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-2 mb-2 overflow-visible">
        <input
          type="text"
          placeholder="Search filename…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[160px] flex-1 px-2 py-1 border rounded"
        />

        <div className="relative overflow-visible">
          <div className="inline-flex">
            <button
              className="px-3 py-1 rounded-l border hover:bg-gray-50"
              disabled={isUploading}
              onClick={async () => {
                const fs = await pickFilesViaFS({ allowZip: true, id: "dr-media-files" });
                if (fs) {
                  await handleUpload(fs);
                  return;
                }
                fileInputRef.current?.click();
              }}
            >
              Add media
            </button>
            <button
              className="px-2 py-1 rounded-r border-l-0 border hover:bg-gray-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ▾
            </button>
          </div>

          {menuOpen && (
            <ul
              role="menu"
              className="absolute left-0 z-50 mt-1 w-36 bg-white text-gray-900 border rounded shadow"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <li>
                <button
                  role="menuitem"
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={async () => {
                    setMenuOpen(false);
                    const fs = await pickFilesViaFS({ allowZip: false, id: "dr-media-files" });
                    if (fs) {
                      await handleUpload(fs);
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                >
                  Files
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={async () => {
                    setMenuOpen(false);
                    const fs = await pickDirectoryViaFS({ id: "dr-media-folder" });
                    if (fs) {
                      await handleUpload(fs);
                      return;
                    }
                    folderInputRef.current?.click();
                  }}
                >
                  Folder
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={async () => {
                    setMenuOpen(false);
                    const fs = await pickFilesViaFS({ allowZip: true, id: "dr-media-zip" });
                    if (fs) {
                      await handleUpload(fs.filter((f) => f.name.toLowerCase().endsWith(".zip")));
                      return;
                    }
                    zipInputRef.current?.click();
                  }}
                >
                  ZIP
                </button>
              </li>
            </ul>
          )}
        </div>

        <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.zip"
            onChange={onChoose(handleUpload)}
            className="hidden"
        />
        <input
            ref={folderInputRef}
            type="file"
            multiple
            onChange={onChoose(handleUpload)}
            className="hidden"
        />
        <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={onChoose((fs) =>
              handleUpload(fs.filter((f) => f.name.toLowerCase().endsWith(".zip")))
            )}
            className="hidden"
        />

        <button
          className="ml-auto px-2 py-1 rounded border hover:bg-gray-50"
          onClick={() => setIsOpen(true)}
          aria-label="Open Media Manager"
          title="Open Media Manager"
        >
          Expand
        </button>
      </div>

      {isUploading && <div className="text-xs text-gray-600 mb-2">Uploading…</div>}

      <div
        ref={gridRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border rounded p-2"
        role="list"
        aria-label="Media items"
      >
        <div style={{ height: filtered.length * rowH }} className="relative">
          {filtered.slice(start, end).map((m, i) => {
            const index = start + i;
            const top = index * rowH + 4;
            const busy = busyIds.has(m.id);
            const src = mediaSrc(m);
            return (
              <div key={m.id} className="absolute inset-x-0" style={{ top }} role="listitem">
                <div
                  className="flex items-center gap-3 pr-2"
                  draggable
                  onDragStart={(e) => onDragStartMedia(e, m)}
                  title="Drag to canvas to insert"
                >
                  <div className="flex-none w-20 h-20 border rounded overflow-hidden bg-white relative">
                    <img
                      src={src}
                      alt={m.filename || m.id}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "data:image/svg+xml;utf8," +
                          encodeURIComponent(
                            `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='#f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-size='12'>no preview</text></svg>`
                          );
                      }}
                    />
                    <div className="absolute bottom-1 right-1 text-[10px] px-1 py-0.5 bg-white/90 border rounded">
                      Drag
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">{m.filename || "unnamed"}</div>
                    <div className="text-[11px] text-gray-500">{m.kind || "image"}</div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      className="px-2 py-1 text-[12px] border rounded hover:bg-gray-50 disabled:opacity-50"
                      disabled={!currentPageId || !src}
                      onClick={() => {
                        if (!currentPageId || !src) return;
                        insertImageAppend(currentPageId, {
                          id: m.id,
                          url: src,
                          filename: m.filename || "",
                          kind: m.kind || "image",
                        });
                      }}
                      title="Insert on current page"
                    >
                      Insert
                    </button>
                    <button
                      className="px-2 py-1 text-[12px] border rounded hover:bg-red-50 disabled:opacity-50"
                      onClick={() => onDelete(m.id)}
                      disabled={busy}
                    >
                      {busy ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-xs text-gray-500 py-6">
            Drop files here or use “Add media”.
          </div>
        )}
      </div>

      {dragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded pointer-events-none flex items-center justify-center">
          <div className="px-3 py-1 bg-white/90 border rounded text-sm">Drop to add</div>
        </div>
      )}

      {isOpen && draft && (
        <MediaManagerModal
          draftId={draft.id}
          onClose={() => setIsOpen(false)}
          onUploaded={addItems}
        />
      )}
    </div>
  );
}

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
        entry.file(
          (f: File) => {
            out.push(f);
            resolve();
          },
          () => resolve()
        );
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
                ? new Promise<void>((res) =>
                    ent.file(
                      (f: File) => {
                        sink.push(f);
                        res();
                      },
                      () => res()
                    )
                  )
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
