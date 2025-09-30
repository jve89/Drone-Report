// client/src/editor/blocks/ImageBlock.tsx
import React from "react";

export type ImageBlockProps = {
  src?: string;
  alt?: string;
  fit?: "contain" | "cover" | "scale-down";
  opacity?: number;          // 0–100
  borderRadius?: number;     // px
  stroke?: boolean;          // optional outline for visibility
};

export default function ImageBlock({
  src,
  alt = "",
  fit = "contain",
  opacity = 100,
  borderRadius = 0,
  stroke = true,
}: ImageBlockProps) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius,
    overflow: "hidden",
    position: "relative",
  };

  if (!src) {
    // Visible placeholder when no image is bound
    return (
      <div
        style={{
          ...baseStyle,
          border: stroke ? "1px dashed #d1d5db" : undefined,
          background:
            "repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px",
          display: "grid",
          placeItems: "center",
        }}
        aria-label="Empty image placeholder"
      >
        <span style={{ fontSize: 11, color: "#6b7280" }}>Image</span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        border: stroke ? "1px solid #e5e7eb" : undefined,
        backgroundColor: "#fff",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          opacity: Math.max(0, Math.min(100, opacity)) / 100,
          display: "block",
        }}
        draggable={false}
      />
    </div>
  );
}
