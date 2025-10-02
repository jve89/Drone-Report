// client/src/editor/canvas/CanvasHUD.tsx
import React from "react";
import TextToolbar from "../blocks/TextToolbar";
import ShapeToolbar from "../blocks/ShapeToolbar";

/**
 * Heads-up UI overlays that float above the canvas:
 * - Text and Shape toolbars (sticky under the app header)
 * - Rotation angle HUD near the cursor
 */
export function CanvasHUD({
  toolbarTop,
  activeTextBlock,
  activeShapeBlock,
  rotHUD,
}: {
  toolbarTop: number;
  activeTextBlock?: { id: string; style?: any } | null;
  activeShapeBlock?: { id: string; type: "line" | "rect" | "ellipse" | "divider"; blockStyle?: any; style?: any } | null;
  rotHUD: { active: boolean; deg: number; cursor: { x: number; y: number } };
}) {
  return (
    <>
      {/* Sticky toolbars */}
      {activeTextBlock && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ top: toolbarTop }}>
          <TextToolbar blockId={activeTextBlock.id} style={activeTextBlock.style || {}} />
        </div>
      )}
      {activeShapeBlock && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ top: toolbarTop }}>
          <ShapeToolbar
            blockId={activeShapeBlock.id}
            kind={activeShapeBlock.type}
            style={(activeShapeBlock as any).blockStyle ?? (activeShapeBlock as any).style}
          />
        </div>
      )}

      {/* Rotation HUD */}
      {rotHUD.active && (
        <div
          style={{
            position: "absolute",
            left: rotHUD.cursor.x,
            top: rotHUD.cursor.y,
            padding: "4px 6px",
            fontSize: 12,
            borderRadius: 6,
            background: "rgba(17,24,39,0.92)",
            color: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          {rotHUD.deg}°
        </div>
      )}
    </>
  );
}
