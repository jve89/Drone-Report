// shared/types/media.ts
// Shared contract for uploaded media items between client and server.
// Represents files stored under /uploads/<draftId>/<id>.
export type MediaItem = {
  id: string;                 // stored filename (unique, includes extension)
  filename: string;           // original filename
  kind: "image" | "file";
  url: string;                // browser-reachable (/uploads/<draftId>/<id>)
  thumb?: string;             // optional
  size?: number;
  createdAt: string;          // ISO
  tags?: string[];
  folder?: string;
  exif?: { ts?: string; lat?: number; lon?: number };
};
