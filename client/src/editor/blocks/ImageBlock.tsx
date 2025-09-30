// client/src/editor/blocks/ImageBlock.tsx
import React from "react";
import type { ImageProps } from "./defs";

export type ImageBlockViewProps = ImageProps & {
  /** Provided by the canvas container via CSS sizing. Optional here. */
  width?: number;
  height?: number;
};

function fitToObjectFit(fit: ImageProps["fit"]): React.CSSProperties["objectFit"] {
  switch (fit) {
    case "cover":
      return "cover";
    case "scale-down":
      return "scale-down";
    case "contain":
    default:
      return "contain";
  }
}

export default function ImageBlock(props: ImageBlockViewProps) {
  const { src, alt = "Image", fit, opacity, borderRadius } = props;

  const wrapperStyle: React.CSSProperties = {
    width: props.width ?? "100%",
    height: props.height ?? "100%",
    position: "relative",
    overflow: "hidden",
    borderRadius,
  };

  const hasSrc = !!src && src.trim().length > 0;

  return (
    <div style={wrapperStyle} className="bg-white">
      {hasSrc ? (
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fitToObjectFit(fit),
            display: "block",
            opacity: Math.max(0, Math.min(100, opacity)) / 100,
          }}
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full grid place-items-center"
          style={{
            background:
              "repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px",
          }}
        >
          <div className="text-xs text-gray-500 select-none">Image</div>
        </div>
      )}
    </div>
  );
}
