// client/src/types/draft.ts

// Local mirror of shared style types to avoid cross-package client imports.
export type ColorRef = { token?: string; hex?: string };
export type StrokeStyle = { color?: ColorRef; width?: number; dash?: number[] };
export type BlockStyle = {
  fill?: ColorRef | null;
  stroke?: StrokeStyle;
  radius?: number;
  opacity?: number;
};
export type PageMargins = { top: number; right: number; bottom: number; left: number };
export type PageStyle = {
  margin?: Partial<PageMargins>;
  background?: ColorRef | null;
  header?: boolean;
  footer?: boolean;
};
export type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
};
export type Theme = {
  colors: Record<string, ColorRef>;
  fonts?: { ui?: string; mono?: string };
  page?: Partial<PageStyle>;
  textVariants?: Record<string, TextStyle>;
};

// Elements placed by the user.
export type UserBlockType = "text" | "line" | "rect" | "ellipse" | "divider";

export type UserBlock = {
  id: string;
  type: UserBlockType;

  // Geometry
  rect?: { x: number; y: number; w: number; h: number }; // 0–100 for text/rect/ellipse/divider
  points?: Array<{ x: number; y: number }>;              // for line only

  // Rotation for rect/ellipse-style shapes (degrees). Optional.
  rotation?: number;

  // Z-index
  z?: number;

  // Text payload (text only)
  value?: string;
  style?: TextStyle;

  // Visual style (shapes/divider)
  blockStyle?: BlockStyle;
};

export type PageInstance = {
  id: string;
  templatePageId: string;
  values?: Record<string, unknown>;
  userBlocks?: UserBlock[];

  pageStyle?: PageStyle; // optional per-page overrides
};

export type DraftPayloadMeta = {
  title?: string;
  templateId?: string;
  themeVersion?: string;
  [k: string]: unknown;
};

export type DraftPayload = {
  meta?: DraftPayloadMeta;
  findings?: unknown[];
  theme?: Theme;
  features?: { formatting?: boolean; [k: string]: unknown };
  [k: string]: unknown;
};

export type Draft = {
  id: string;
  userId?: string;
  templateId: string;
  title: string;
  status: "draft" | "final";
  pageInstances: PageInstance[];
  media: unknown[];
  createdAt: string;
  updatedAt: string;

  payload?: DraftPayload;
};
