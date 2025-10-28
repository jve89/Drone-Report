// client/src/editor/inspector/shared.ts
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const numOr = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ----- blockStyle readers -----
export function readStroke(style: any) {
  const color = style?.stroke?.color?.hex ?? style?.strokeColor ?? "#111827";
  const width = Number.isFinite(style?.stroke?.width)
    ? style.stroke.width
    : Number.isFinite(style?.strokeWidth)
    ? style.strokeWidth
    : 2;
  const dashArr: number[] = Array.isArray(style?.stroke?.dash)
    ? style.stroke.dash.map(Number).filter((n: any) => Number.isFinite(n))
    : Number.isFinite(style?.dash)
    ? [Number(style.dash), Number(style.dash)]
    : [];
  const dashed = dashArr.some((n) => n > 0);
  const dashLength = dashed ? (dashArr[0] ?? 6) : 6;
  return { color, width, dashed, dashLength };
}

export function readFill(style: any) {
  const hex = style?.fill?.color?.hex ?? style?.fillColor ?? "#ffffff";
  return { hex };
}

export function readOpacity(style: any) {
  const o = style?.opacity;
  if (typeof o === "number" && o >= 0 && o <= 1) return o;
  if (typeof o === "number" && o > 1 && o <= 100) return clamp(o / 100, 0, 1);
  return 1;
}

export function readRadius(style: any) {
  const r = style?.radius ?? style?.borderRadius ?? 0;
  return numOr(r, 0);
}

// ----- compose helpers (do not clobber siblings) -----
export function composeBlockStyle(prev: any, patch: any) {
  return { ...(prev || {}), ...patch };
}
export function composeStroke(prevStyle: any, patch: any) {
  const prevStroke = prevStyle?.stroke ?? {};
  return composeBlockStyle(prevStyle, { stroke: { ...prevStroke, ...patch } });
}
export function composeFill(prevStyle: any, hex: string | null) {
  if (!hex) return composeBlockStyle(prevStyle, { fill: undefined });
  const prevFill = prevStyle?.fill ?? {};
  return composeBlockStyle(prevStyle, { fill: { ...prevFill, color: { hex } } });
}
export function composeOpacity(prevStyle: any, opacity01: number) {
  return composeBlockStyle(prevStyle, { opacity: clamp(opacity01, 0, 1) });
}
export function composeRadius(prevStyle: any, r: number) {
  return composeBlockStyle(prevStyle, { radius: Math.max(0, Math.round(r)) });
}

// ----- image helpers -----
export function readImageMeta(ub: UBCommon) {
  const meta = (ub as any)?.blockStyle?.meta ?? {};
  const props = meta.props ?? {};
  const fit: "contain" | "cover" | "scale-down" = (props.fit as any) || "contain";
  const zoom = clamp(numOr(props.zoom, 100), 10, 500);
  return { meta, props, fit, zoom };
}

// ----- shared local types used by the panels -----
export type UBCommon = {
  id: string;
  type: string;
  rect?: { x: number; y: number; w: number; h: number };
  points?: Array<{ x: number; y: number }>;
  rotation?: number;
  value?: string;
  style?: any;
  blockStyle?: any;
  z?: number;
};
