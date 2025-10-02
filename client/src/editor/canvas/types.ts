// client/src/editor/canvas/types.ts

// Geometry in page-percent units [0..100]
export type Rect = { x: number; y: number; w: number; h: number };
export type LinePoint = { x: number; y: number };

// Styles kept loose for now to avoid coupling to UI libs
export type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  lineHeight?: number | string;
  letterSpacing?: number;
};

export type StrokeStyle = {
  strokeColor?: string;
  strokeWidth?: number;
  dash?: number;
};

export type FillStyle = { fillColor?: string };

export type BlockStyle = {
  meta?: { blockKind?: string; payload?: any; props?: any };
  stroke?: { color?: { hex?: string }; width?: number; dash?: number[] };
  fill?: { hex?: string };
};

// User-created elements
export type UserText = {
  id: string;
  type: "text";
  rect: Rect;
  value?: string;
  style?: TextStyle;
  blockStyle?: BlockStyle;
  z?: number;
};

export type UserLine = {
  id: string;
  type: "line";
  points: LinePoint[];
  style?: StrokeStyle;
  blockStyle?: BlockStyle;
  z?: number;
};

export type UserDivider = {
  id: string;
  type: "divider";
  rect: Rect;
  style?: StrokeStyle;
  blockStyle?: BlockStyle;
  z?: number;
};

export type UserRect = {
  id: string;
  type: "rect";
  rect: Rect;
  rotation?: number;
  style?: StrokeStyle & FillStyle;
  blockStyle?: BlockStyle;
  z?: number;
};

export type UserEllipse = {
  id: string;
  type: "ellipse";
  rect: Rect;
  rotation?: number;
  style?: StrokeStyle & FillStyle;
  blockStyle?: BlockStyle;
  z?: number;
};

export type UserImage = {
  id: string;
  type: "image";
  rect: Rect;
  src: string;
  z?: number;
};

export type UserBlock = UserText | UserLine | UserDivider | UserRect | UserEllipse | UserImage;

// Rotation HUD
export type RotHUD = {
  active: boolean;
  deg: number;
  cursor: { x: number; y: number };
  targetId?: string;
};
