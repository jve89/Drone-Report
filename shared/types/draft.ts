// shared/types/draft.ts
import type { MediaItem } from "./media";

export type UserBlock = {
  id: string;
  type: "text"; // extend as features grow
  rect: { x: number; y: number; w: number; h: number }; // 0–100
  value?: string;
};

export type PageInstance = {
  id: string;
  templatePageId: string;
  values?: Record<string, unknown>;
  userBlocks?: UserBlock[];
};

export type Draft = {
  id: string;
  title?: string;
  templateId?: string | null;

  // Core collections
  media: MediaItem[];
  annotations?: Record<string, unknown>;
  pageInstances?: PageInstance[];

  // Free-form payload used by bindings (e.g., findings live here)
  payload?: Record<string, unknown>;

  status?: string; // "draft" | "ready" | etc.
  createdAt?: string;
  updatedAt?: string;
};
