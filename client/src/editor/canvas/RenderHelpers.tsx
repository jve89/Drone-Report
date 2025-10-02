// client/src/editor/canvas/RenderHelpers.tsx
import React from "react";

export type Rect = { x: number; y: number; w: number; h: number };

export const pct = (n: number) => `${n}%`;

/** Absolute-positioned container with padding and clipping */
export function Box({ rect, children }: { rect: Rect; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x),
    top: pct(rect.y),
    width: pct(rect.w),
    height: pct(rect.h),
    padding: 8,
    overflow: "hidden",
  };
  return <div style={style}>{children}</div>;
}

/** Selection-aware frame used for both template and user blocks */
export function Frame({
  rect,
  active,
  children,
  overflowVisible = false,
}: {
  rect: Rect;
  active: boolean;
  children: React.ReactNode;
  overflowVisible?: boolean;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(rect.x),
    top: pct(rect.y),
    width: pct(rect.w),
    height: pct(rect.h),
    border: active ? "2px solid #3b82f6" : "1px dashed #e5e7eb",
    boxShadow: active ? "0 0 0 3px rgba(59,130,246,0.2)" : undefined,
    padding: 8,
    overflow: overflowVisible ? "visible" : "hidden",
    background: "rgba(255,255,255,0.9)",
    borderRadius: 4,
  };
  return <div style={style}>{children}</div>;
}
