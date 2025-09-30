// client/src/editor/media/MediaManagerModal.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { uploadDraftMedia, deleteDraftMedia } from "../../lib/api";
import type { MediaItem } from "@drone-report/shared/types/media";
import type { QueuedFile, ImportGroup } from "./types";
import { useImportSession } from "./ImportSessionStore";
import { groupByFolderOrTime } from "./utils/grouping";
import { pickFilesViaFS, pickDirectoryViaFS } from "../../lib/pickers";
import { useEditor } from "../../state/editorStore";
import { useMediaStore } from "../../state/mediaStore";
import { normalizeUploadResponse, mediaSrc, pickJustUploaded } from "./utils/mediaResponse";

const DR_MEDIA_MIME = "application/x-dr-media";

export type MediaManagerModalProps = {
  draftId: string;
  onClose: () => void;
  onUploaded: (media: MediaItem[]) => void;
};

type Mode = "queue" | "library";

export default function MediaManagerModal({ draftId, onClose, onUploaded }: MediaManagerModalProps) {
  const { draft, pageIndex, insertImageAppend } = useEditor();
  const { items, addItems, removeItems } = useMediaStore();
  const [mode, setMode] = useState<Mode>("queue");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const inputFilesRef = useRef<HTMLInputElement>(null);
  const inputFolderRef = useRef<HTMLInputElement>(null);
  const inputZipRef = useRef<HTMLInputElement>(null);

  const [dragOverAll, setDragOverAll] = useState(false);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  useEffect(() => {
    if (inputFolderRef.current) inputFolderRef.current.setAttribute("webkitdirectory", "");
  }, []);

  const {
    files, setFiles, clear,
    groups, setGroups,
    view, setView,
    filter, setFilter,
    isUploading, setIsUploading,
  } = useImportSession();

  function queueFiles(list: File[], targetGroupId?: string) {
    // dedupe by name:size to avoid duplicate entries on repeated drops
    const seen = new Set(files.map((f) => `${f.name}:${f.size}`));
    const fresh = list.filter((f) => !seen.has(`${f.name}:${f.size}`));
    if (!fresh.length) return;

    const queued: QueuedFile[] = fresh.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      path:
        "webkitRelativePath" in f && typeof (f as any).webkitRelativePath === "string" && (f as any).webkitRelativePath
          ? (f as any).webkitRelativePath
          : f.name,
      status: "queued",
      error: null,
    }));
    setFiles([...files, ...queued]);

    if (targetGroupId) {
      const next = groups.map((g) => (g.id === targetGroupId ? { ...g, files: [...g.files, ...queued] } : g));
      setGroups(next);
    }
  }

  const onPick = (adder: (fs: File[]) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.currentTarget.files || []);
    e.currentTarget.value = "";
    adder(picked);
  };

  function makeGroups() {
    const imgs = files.filter((f) => isImageOrZip(f.name));
    if (!imgs.length) { setGroups([]); return; }
    const g = groupByFolderOrTime(imgs, 90_000);
    setGroups(g);
  }

  const filteredQueue = useMemo(() => {
    if (!filter) return files;
    const q = filter.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, filter]);

  async function startUpload() {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    try {
      const payload: File[] = files.map((f) => f.file);
      const before = new Set(items.map((x) => x.id));
      const resp = await uploadDraftMedia(draftId, payload);
      const all = normalizeUploadResponse(resp) as MediaItem[];

      const picked = pickJustUploaded(all, payload, before) as MediaItem[];
      if (picked.length) { onUploaded(picked); addItems(picked); }
      clear();
      setFilter("");
      setMode("library");
    } finally {
      setIsUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!draft) return;
    removeItems([id]); // optimistic
    setBusyIds((s) => new Set(s).add(id));
    try {
      await deleteDraftMedia(draft.id, id);
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  const modalRef = useRef<HTMLDivElement>(null);
  // Drag listeners on the modal root — stable, bind once
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const stop = (ev: DragEvent) => { ev.preventDefault(); ev.stopPropagation(); };
    const onEnter = (ev: DragEvent) => { stop(ev); setDragOverAll(true); };
    const onOver = (ev: DragEvent) => stop(ev);
    const onLeave = (ev: DragEvent) => { stop(ev); if (ev.target === el) setDragOverAll(false); };
    const onDrop = async (ev: DragEvent) => {
      stop(ev);
      setDragOverAll(false);
      const fs = await extractFilesFromDataTransfer(ev.dataTransfer);
      queueFiles(fs);
      setMode("queue");
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
  }, []); // bind once

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const library = useMemo(() => items.filter((m) => m && m.id && mediaSrc(m)), [items]);

  const onDragStartMedia = useCallback((ev: React.DragEvent, m: MediaItem) => {
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
  }, [draft]);

  const currentPageId = draft?.pageInstances?.[pageIndex]?.id || null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex">
      <div
        ref={modalRef}
        className="m-auto bg-white w=[min(1100px,95vw)] h=[min(88vh,900px)] rounded-xl shadow-xl flex flex-col relative"
        style={{ width: "min(1100px,95vw)", height: "min(88vh,900px)" }}
      >
        {dragOverAll && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none flex items-center justify-center">
            <div className="px-3 py-1 bg-white/90 border rounded text-sm">Drop files to add</div>
          </div>
        )}

        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">Media Manager</div>
          <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={onClose}>Close</button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b flex items-center gap-2">
          <div className="inline-flex rounded-lg border overflow-hidden mr-2" role="tablist" aria-label="Media mode">
            <button
              role="tab"
              aria-selected={mode === "queue"}
              className={`px-3 py-1 text-sm ${mode === "queue" ? "bg-gray-100" : "bg-white"} border-r`}
              onClick={() => setMode("queue")}
            >
              Queue
            </button>
            <button
              role="tab"
              aria-selected={mode === "library"}
              className={`px-3 py-1 text-sm ${mode === "library" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setMode("library")}
            >
              Library
            </button>
          </div>

          <button className="px-2 py-1 border rounded hover:bg-gray-50"
            onClick={async () => { const fs = await pickFilesViaFS({ allowZip: true, id: "dr-media-files" }); if (fs) { queueFiles(fs); setMode("queue"); return; } inputFilesRef.current?.click(); }}>
            Files
          </button>
          <button className="px-2 py-1 border rounded hover:bg-gray-50" title="Chromium only"
            onClick={async () => { const fs = await pickDirectoryViaFS({ id: "dr-media-folder" }); if (fs) { queueFiles(fs); setMode("queue"); return; } inputFolderRef.current?.click(); }}>
            Folder
          </button>
          <button className="px-2 py-1 border rounded hover:bg-gray-50"
            onClick={async () => { const fs = await pickFilesViaFS({ allowZip: true, id: "dr-media-zip" }); if (fs) { queueFiles(fs.filter((f) => f.name.toLowerCase().endsWith(".zip"))); setMode("queue"); return; } inputZipRef.current?.click(); }}>
            ZIP
          </button>

          {/* Hidden fallbacks */}
          <input ref={inputFilesRef} type="file" multiple accept="image/*,.zip" onChange={onPick((fs) => { queueFiles(fs); setMode("queue"); })} className="hidden" />
          <input ref={inputFolderRef} type="file" multiple onChange={onPick((fs) => { queueFiles(fs); setMode("queue"); })} className="hidden" />
          <input ref={inputZipRef} type="file" accept=".zip" onChange={onPick((fs) => { queueFiles(fs.filter((f) => f.name.toLowerCase().endsWith(".zip"))); setMode("queue"); })} className="hidden" />

          {/* Search + view only affect Queue */}
          <input type="text" placeholder="Search filename…" value={filter} onChange={(e) => setFilter(e.target.value)} className="px-2 py-1 border rounded" />
          <select value={view} onChange={(e) => setView(e.target.value as "grid" | "list")} className="px-2 py-1 border rounded">
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
          <button className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled={!files.length} onClick={makeGroups}>Auto-group</button>

          <div className="ml-auto flex items-center gap-2">
            <button disabled={!files.length || isUploading} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" onClick={startUpload}>
              {isUploading ? "Uploading…" : "Start upload"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Groups rail (queue-only) */}
          <aside className="w-64 border-r p-3 overflow-auto">
            <div className="text-xs font-semibold mb-2">Groups</div>
            {mode !== "queue" && <div className="text-xs text-gray-500">Library mode. Import groups hidden.</div>}
            {mode === "queue" && groups.length === 0 && <div className="text-xs text-gray-500">No groups yet. Click Auto-group.</div>}
            {mode === "queue" && groups.map((g: ImportGroup) => (
              <div
                key={g.id}
                className={`mb-2 p-2 rounded border ${dragOverGroup === g.id ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroup(g.id); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroup(null); }}
                onDrop={async (e) => {
                  e.preventDefault(); e.stopPropagation(); setDragOverGroup(null);
                  const fs = await extractFilesFromDataTransfer(e.dataTransfer);
                  queueFiles(fs, g.id);
                }}
              >
                <div className="text-xs font-medium truncate">{g.label}</div>
                <div className="text-[11px] text-gray-500">{g.files.length} files</div>
              </div>
            ))}
          </aside>

          {/* Right area */}
          <main className="flex-1 p-3 overflow-auto">
            {mode === "queue" ? (
              view === "grid" ? (
                <div className="grid grid-cols-6 gap-2">
                  {filteredQueue.map((f) => (
                    <div key={f.name + f.size} className="border rounded p-2">
                      <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-[11px] text-gray-500">IMG</div>
                      <div className="text-[12px] truncate">{f.name}</div>
                      <div className="text-[11px] text-gray-500">{formatSize(f.size)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1 pr-2">Name</th>
                      <th className="py-1 pr-2">Size</th>
                      <th className="py-1 pr-2">Type</th>
                      <th className="py-1 pr-2">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.map((f) => (
                      <tr key={f.name + f.size} className="border-b last:border-0">
                        <td className="py-1 pr-2 truncate">{f.name}</td>
                        <td className="py-1 pr-2">{formatSize(f.size)}</td>
                        <td className="py-1 pr-2">{f.type || "-"}</td>
                        <td className="py-1 pr-2 truncate">{f.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <div className="grid grid-cols-6 gap-3">
                {library.map((m) => {
                  const busy = busyIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className="border rounded p-2"
                      draggable
                      onDragStart={(e) => onDragStartMedia(e, m)}
                      title="Drag to canvas to insert"
                    >
                      <div className="w-full h-28 border rounded overflow-hidden bg-white mb-2 relative">
                        <img
                          src={mediaSrc(m)}
                          alt={m.filename || m.id}
                          className="w-full h-full object-cover pointer-events-none select-none"
                          draggable={false}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "data:image/svg+xml;utf8," +
                              encodeURIComponent(
                                `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='160'><rect width='100%' height='100%' fill='#f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-size='12'>no preview</text></svg>`
                              );
                          }}
                        />
                        <div className="absolute bottom-1 right-1 text-[10px] px-1 py-0.5 bg-white/90 border rounded">Drag</div>
                      </div>

                      <div className="text-[12px] truncate mb-1">{m.filename || "unnamed"}</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-gray-500">{m.kind || "image"}</span>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-[12px] border rounded hover:bg-gray-50 disabled:opacity-50"
                            disabled={!currentPageId || !mediaSrc(m)}
                            onClick={() => {
                              if (!currentPageId) return;
                              const url = mediaSrc(m) || "";
                              if (!url) return;
                              insertImageAppend(currentPageId, {
                                id: m.id,
                                url,
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
                            aria-label={`Delete ${m.filename || m.id}`}
                          >
                            {busy ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {library.length === 0 && (
                  <div className="col-span-full text-sm text-gray-500">No media yet. Use Files/Folder to add.</div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function isImageOrZip(name: string) {
  const n = name.toLowerCase();
  return n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png") || n.endsWith(".zip");
}
function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
