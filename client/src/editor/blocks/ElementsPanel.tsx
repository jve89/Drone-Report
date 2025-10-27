// client/src/editor/blocks/ElementsPanel.tsx
import React, { useState, useRef, useEffect } from "react";
import { useEditor } from "../../state/editor";

type ElemKind = "text" | "line" | "rect" | "ellipse";

export default function ElementsPanel() {
  const { draft, tool, startInsert, cancelInsert } = useEditor();

  const disabled = !draft || !(draft as any).pageInstances?.length;

  const isActive = (k: ElemKind) =>
    tool?.mode === "insert" && (tool as any)?.kind === k;

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

  // Shape dropdown (Rectangle / Ellipse) as a split-button group
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const shapeGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shapeMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!shapeGroupRef.current) return;
      if (!shapeGroupRef.current.contains(e.target as Node)) setShapeMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [shapeMenuOpen]);

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

      {/* Line & Shape */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Shapes</div>
        <div className="grid grid-cols-2 gap-2 items-stretch">
          <Btn label="Line" k="line" title="Insert a line or arrow" />

          {/* Split button group for Shape */}
          <div className="relative" ref={shapeGroupRef}>
            <div className="inline-flex w-full">
              <button
                className={`px-3 py-2 border rounded-l text-sm flex-1 text-left disabled:opacity-50 ${
                  isActive("rect") || isActive("ellipse")
                    ? "bg-green-50 border-green-300"
                    : "hover:bg-gray-50"
                }`}
                disabled={disabled}
                onClick={() => {
                  // Default action places Rectangle
                  if (isActive("rect")) cancelInsert();
                  else toggle("rect");
                }}
                title="Insert a shape"
              >
                {(isActive("rect") || isActive("ellipse")) ? "Cancel" : "Shape"}
              </button>
              <button
                className={`px-2 border border-l-0 rounded-r text-sm disabled:opacity-50 ${
                  isActive("rect") || isActive("ellipse")
                    ? "bg-green-50 border-green-300"
                    : "hover:bg-gray-50"
                }`}
                disabled={disabled}
                onClick={() => setShapeMenuOpen((v) => !v)}
                aria-label="More shape options"
                aria-haspopup="menu"
                aria-expanded={shapeMenuOpen}
                title="More shape options"
              >
                ▾
              </button>
            </div>

            {shapeMenuOpen && (
              <ul
                role="menu"
                className="absolute z-50 mt-1 w-40 bg-white text-gray-900 border rounded shadow"
                onMouseLeave={() => setShapeMenuOpen(false)}
              >
                <li>
                  <button
                    role="menuitem"
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => {
                      setShapeMenuOpen(false);
                      if (isActive("rect")) cancelInsert();
                      else toggle("rect");
                    }}
                  >
                    Rectangle
                  </button>
                </li>
                <li>
                  <button
                    role="menuitem"
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => {
                      setShapeMenuOpen(false);
                      if (isActive("ellipse")) cancelInsert();
                      else toggle("ellipse");
                    }}
                  >
                    Ellipse
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Press Esc to cancel placement.
        </p>
      </div>

      {disabled && (
        <div className="text-[11px] text-gray-500">Load or create a draft first.</div>
      )}
    </div>
  );
}
