// client/src/editor/media/MediaManagerModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { uploadDraftMedia } from "../../lib/api";
import type { MediaItem } from "@drone-report/shared/types/media";
import type { QueuedFile, ImportGroup } from "./types";
import { useImportSession } from "./ImportSessionStore";
import { groupByFolderOrTime } from "./utils/grouping";
import { pickFilesViaFS, pickDirectoryViaFS } from "../../lib/pickers";

export type MediaManagerModalProps = {
  draftId: string;
  onClose: () => void;
  onUploaded: (media: MediaItem[]) => void;
};

export default function MediaManagerModal({ draftId, onClose, onUploaded }: MediaManagerModalProps) {
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
    const queued: QueuedFile[] = list.map((f) => ({
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
    const g = groupByFolderOrTime(imgs, 90_000);
    setGroups(g);
  }

  const filteredFiles = useMemo(() => {
    if (!filter) return files;
    const q = filter.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, filter]);

  async function startUpload() {
    setIsUploading(true);
    try {
      const payload: File[] = files.map((f) => f.file);
      const uploaded = (await uploadDraftMedia(draftId, payload)) as MediaItem[];
      onUploaded(uploaded);
      clear();
      onClose();
    } finally {
      setIsUploading(false);
    }
  }

  // Modal-level DnD
  const modalRef = useRef<HTMLDivElement>(null);
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
      const files = await extractFilesFromDataTransfer(ev.dataTransfer);
      queueFiles(files);
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
  }, [modalRef.current, files, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex">
      <div
        ref={modalRef}
        className="m-auto bg-white w-[min(1100px,95vw)] h-[min(88vh,900px)] rounded-xl shadow-xl flex flex-col relative"
      >
        {dragOverAll && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none flex items-center justify-center">
            <div className="px-3 py-1 bg-white/90 border rounded text-sm">Drop files to add</div>
          </div>
        )}

        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">Media Manager</div>
          <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={onClose}>Close</button>
        </div>

        <div className="p-3 border-b flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded hover:bg-gray-50"
            onClick={async () => {
              const fs = await pickFilesViaFS({ allowZip: true, id: "dr-media-files" });
              if (fs) { queueFiles(fs); return; }
              inputFilesRef.current?.click(); // fallback for Safari/Firefox
            }}
          >
            Files
          </button>

          <button
            className="px-2 py-1 border rounded hover:bg-gray-50"
            title="Chromium only"
            onClick={async () => {
              const fs = await pickDirectoryViaFS({ id: "dr-media-folder" });
              if (fs) { queueFiles(fs); return; }
              inputFolderRef.current?.click(); // fallback
            }}
          >
            Folder
          </button>

          <button
            className="px-2 py-1 border rounded hover:bg-gray-50"
            onClick={async () => {
              const fs = await pickFilesViaFS({ allowZip: true, id: "dr-media-zip" });
              if (fs) { queueFiles(fs.filter((f) => f.name.toLowerCase().endsWith(".zip"))); return; }
              inputZipRef.current?.click(); // fallback
            }}
          >
            ZIP
          </button>

          <input ref={inputFilesRef} type="file" multiple accept="image/*,.zip" onChange={onPick((fs) => queueFiles(fs))} className="hidden" />
          <input ref={inputFolderRef} type="file" multiple onChange={onPick((fs) => queueFiles(fs))} className="hidden" />
          <input ref={inputZipRef} type="file" accept=".zip" onChange={onPick((fs) => queueFiles(fs.filter((f) => f.name.toLowerCase().endsWith(".zip"))))} className="hidden" />

          <div className="ml-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search filename…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 border rounded"
            />
            <select value={view} onChange={(e) => setView(e.target.value as "grid" | "list")} className="px-2 py-1 border rounded">
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
            <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={makeGroups}>Auto-group</button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              disabled={!files.length || isUploading}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={startUpload}
            >
              {isUploading ? "Uploading…" : "Start upload"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Groups rail */}
          <aside className="w-64 border-r p-3 overflow-auto">
            <div className="text-xs font-semibold mb-2">Groups</div>
            {groups.length === 0 && <div className="text-xs text-gray-500">No groups yet. Click Auto-group.</div>}
            {groups.map((g: ImportGroup) => (
              <div
                key={g.id}
                className={`mb-2 p-2 rounded border ${dragOverGroup === g.id ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroup(g.id); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroup(null); }}
                onDrop={async (e) => {
                  e.preventDefault(); e.stopPropagation(); setDragOverGroup(null);
                  const files = await extractFilesFromDataTransfer(e.dataTransfer);
                  queueFiles(files, g.id);
                }}
              >
                <div className="text-xs font-medium truncate">{g.label}</div>
                <div className="text-[11px] text-gray-500">{g.files.length} files</div>
              </div>
            ))}
          </aside>

          {/* Files area */}
          <main className="flex-1 p-3 overflow-auto">
            {view === "grid" ? (
              <div className="grid grid-cols-6 gap-2">
                {filteredFiles.map((f) => (
                  <div key={f.name + f.size} className="border rounded p-2">
                    <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-[11px] text-gray-500">
                      {previewLabel(f)}
                    </div>
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
                  {filteredFiles.map((f) => (
                    <tr key={f.name + f.size} className="border-b last:border-0">
                      <td className="py-1 pr-2 truncate">{f.name}</td>
                      <td className="py-1 pr-2">{formatSize(f.size)}</td>
                      <td className="py-1 pr-2">{f.type || "-"}</td>
                      <td className="py-1 pr-2 truncate">{f.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
function previewLabel(f: QueuedFile) {
  if (f.name.toLowerCase().endsWith(".zip")) return "ZIP";
  return f.type?.startsWith("image/") ? "IMG" : "FILE";
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
