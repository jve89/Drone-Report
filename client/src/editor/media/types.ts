// client/src/editor/media/types.ts

/**
 * Keep MediaItem as a passthrough alias to the shared type to avoid duplication.
 * This lets existing code continue importing from "./types" while using the
 * single source of truth in @drone-report/shared.
 */
export type MediaItem = import("@drone-report/shared/types/media").MediaItem;

/** Lifecycle status for a file queued for upload. */
export type UploadStatus = "queued" | "uploading" | "done" | "error";

export type QueuedFile = {
  file: File;
  name: string;
  size: number;
  type: string;
  /**
   * Path relative to a picked directory.
   * Acts as a fallback for `webkitRelativePath` when available.
   */
  path: string;
  status: UploadStatus;
  error: string | null;
};

export type ImportGroup = {
  id: string;
  label: string;
  files: QueuedFile[];
};
