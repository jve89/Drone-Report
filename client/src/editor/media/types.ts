// client/src/editor/media/types.ts
export type MediaItem = { id: string; url: string; kind?: string; filename?: string; thumb?: string };

export type QueuedFile = {
  file: File;
  name: string;
  size: number;
  type: string;
  path: string; // webkitRelativePath fallback
  status: "queued" | "uploading" | "done" | "error";
  error: string | null;
};

export type ImportGroup = {
  id: string;
  label: string;
  files: QueuedFile[];
};
