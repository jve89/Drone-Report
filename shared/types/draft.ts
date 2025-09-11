// shared/types/draft.ts
import type { MediaItem } from "./media";

export type Draft = {
  id: string;
  title?: string;
  templateId?: string | null;

  // Core collections
  media: MediaItem[];
  annotations?: Record<string, unknown>;
  pageInstances?: Array<Record<string, unknown>>;

  // Free-form payload used by bindings (e.g., findings live here)
  payload?: Record<string, unknown>;

  status?: string; // "draft" | "ready" | etc.
  createdAt?: string;
  updatedAt?: string;
};
