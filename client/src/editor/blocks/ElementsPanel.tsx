// client/src/editor/blocks/ElementsPanel.tsx
import React from "react";
import { useEditor } from "../../state/editor";
import { BLOCK_DEFS } from "./defs";

type ElemKind = "text" | "line" | "rect" | "ellipse" | "divider";

export default function ElementsPanel() {
  const {
    draft,
    tool,
    startInsert,
    cancelInsert,
    placeUserBlock,
    updateUserBlock,
    selectUserBlock,
  } = useEditor();

  const disabled = !draft || !(draft as any).pageInstances?.length;

  const isActive = (k: ElemKind) =>
    (tool?.mode === "insert") && ((tool as any)?.kind === k);

  const toggle = (k: ElemKind) => {
    if (disabled) return;
    if (isActive(k)) cancelInsert();
    else startInsert(k as any);
  };

  const Btn = ({ label, k, title }: { label: string; k: ElemKind; title: string }) => (
    <button
      className={`px-3 py-2 border rounded text-sm disabled:opacity-50 ${
        isActive(k) ? "bg-green-50 border-green-300" : "hover:bg-gray-50"
      }`}
      disabled={disabled}
      onClick={() => toggle(k)}
      title={title}
      aria-pressed={isActive(k)}
      data-active={isActive(k) ? "true" : "false"}
    >
      {isActive(k) ? "Cancel" : label}
    </button>
  );

  function insertImageBlock() {
    if (disabled) return;
    // Place a section-style image block inside a rect host
    startInsert("rect" as any);
    const id = placeUserBlock({ x: 20, y: 20, w: 40, h: 20 });
    if (!id) return;
    updateUserBlock(id, {
      blockStyle: {
        stroke: { width: 0 },
        fill: { token: "surface" },
        meta: {
          blockKind: "image",
          payload: { src: "", alt: "Image" },
          props: BLOCK_DEFS.image.defaultProps,
        },
      } as any,
    } as any);
    selectUserBlock(id);
  }

  return (
    <div className="p-3 space-y-4">
      <div>
        <div className="text-sm font-medium">Elements</div>
        <p className="text-[11px] text-gray-500">
          Click an element, then click on the page to place it.
        </p>
      </div>

      {/* Text */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Text</div>
        <div className="grid grid-cols-2 gap-2">
          <Btn label="Text" k="text" title="Insert a text box" />
        </div>
      </div>

      {/* Shapes */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Shapes</div>
        <div className="grid grid-cols-3 gap-2">
          <Btn label="Line" k="line" title="Insert a line" />
          <Btn label="Rect" k="rect" title="Insert a rectangle" />
          <Btn label="Ellipse" k="ellipse" title="Insert an ellipse" />
          <Btn label="Divider" k="divider" title="Insert a horizontal divider" />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Press Esc to cancel placement.
        </p>
      </div>

      {/* Media */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Media</div>
        <button
          className="px-3 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={disabled}
          onClick={insertImageBlock}
          title="Insert an image block"
        >
          Image Block
        </button>
      </div>

      {disabled && (
        <div className="text-[11px] text-gray-500">
          Load or create a draft first.
        </div>
      )}
    </div>
  );
}
