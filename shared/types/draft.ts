// shared/types/draft.ts
import type { MediaItem } from "./media";
import type { BlockStyle, PageStyle, TextStyle, Theme } from "./style";

// User-defined overlay elements placed by the editor.
// Geometry uses percent units 0..100.
export type UserBlockType = "text" | "line" | "rect" | "ellipse" | "divider";

export type UserBlock = {
  id: string;
  type: UserBlockType;

  // Geometry:
  // - text/rect/ellipse/divider: use `rect`
  // - line: use `points` (two points min)
  rect?: { x: number; y: number; w: number; h: number };
  points?: Array<{ x: number; y: number }>;

  // Optional rotation (degrees) for shape blocks that use `rect` geometry.
  // Applies to: "rect" now, and "ellipse" later. Ignored elsewhere.
  rotation?: number;

  // Z-order (higher renders on top). Optional; compute if absent.
  z?: number;

  // Text payload (text only)
  value?: string;
  style?: TextStyle;

  // Visual style (shapes, divider; optional for text backgrounds later)
  blockStyle?: BlockStyle;
};

export type PageInstance = {
  id: string;
  templatePageId: string;
  values?: Record<string, unknown>;
  userBlocks?: UserBlock[];

  // Optional per-page visual overrides
  pageStyle?: PageStyle;
};

// Draft payload with metadata, theme, and extensibility.
export type DraftPayloadMeta = {
  title?: string;
  templateId?: string;
  themeVersion?: string;
  [k: string]: unknown;
};

export type DraftPayload = {
  meta?: DraftPayloadMeta;
  findings?: unknown[]; // keep loose; dedicated type may live in ./finding
  theme?: Theme;
  features?: { formatting?: boolean; [k: string]: unknown };
  [k: string]: unknown; // allow forward-compatible keys
};

export type Draft = {
  id: string;
  title?: string;
  templateId?: string | null;

  // Core collections
  media: MediaItem[];
  annotations?: Record<string, unknown>;
  pageInstances?: PageInstance[];

  // Free-form payload used by bindings and theming
  payload?: DraftPayload;

  status?: string; // "draft" | "ready" | etc.
  createdAt?: string;
  updatedAt?: string;
};
