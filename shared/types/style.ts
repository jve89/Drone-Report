// shared/types/style.ts
// Shared styling primitives for blocks, pages, and themes.
// Used across both client and server to ensure consistent rendering.
// Token-first color reference. Prefer `token`, allow `hex` override.
export type ColorRef = { token?: string; hex?: string };

// Stroke and block styling used by shapes, lines, dividers, and optional text backgrounds.
export type StrokeStyle = {
  color?: ColorRef;
  width?: number;
  dash?: number[];          // e.g. [5, 4] => dashed
  arrowStart?: boolean;     // for lines
  arrowEnd?: boolean;       // for lines
};
export type BlockStyle = {
  fill?: ColorRef | null;
  stroke?: StrokeStyle;
  radius?: number;
  opacity?: number;
};

// Per-page visual settings. Document defaults live in Theme.page.
export type PageMargins = { top: number; right: number; bottom: number; left: number };
export type PageStyle = {
  margin?: Partial<PageMargins>;
  background?: ColorRef | null;
  header?: boolean;
  footer?: boolean;
};

// Shared text style (minimal; extend as needed).
export type TextStyle = {
  fontFamily?: string;
  fontSize?: number; // px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string; // resolved hex
  lineHeight?: number; // unitless
  letterSpacing?: number; // px
};

// Draft-level theme and tokens.
export type Theme = {
  colors: Record<string, ColorRef>; // e.g. { primary:{token:"primary"}, surface:{hex:"#ffffff"} }
  fonts?: { ui?: string; mono?: string };
  page?: Partial<PageStyle>;        // document defaults
  textVariants?: Record<string, TextStyle>;
};
