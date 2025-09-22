// client/src/editor/panels/LayersPanel.tsx
import React, { useMemo } from "react";
import { useEditor } from "../../state/editorStore";

export default function LayersPanel() {
  const {
    draft, pageIndex, selectUserBlock, selectedUserBlockId,
    bringForward, sendBackward,
  } = useEditor();

  const items = useMemo(() => {
    const pi = draft?.pageInstances?.[pageIndex];
    const list = Array.isArray((pi as any)?.userBlocks) ? ((pi as any).userBlocks as any[]) : [];
    // stable z (store normalizes, but re-sort just in case)
    const sorted = list.slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    return sorted.map((b) => {
      const meta = b?.blockStyle?.meta as { blockKind?: string } | undefined;
      const isSection = !!meta?.blockKind;
      const label =
        isSection ? `Section: ${meta!.blockKind}` :
        b.type === "text" ? "Text" :
        b.type === "line" ? "Line" :
        b.type === "divider" ? "Divider" :
        b.type === "rect" ? "Rectangle" :
        b.type === "ellipse" ? "Ellipse" :
        b.type || "Element";
      return { id: b.id as string, label, type: b.type as string, isSection };
    });
  }, [draft, pageIndex]);

  if (!draft) return null;

  return (
    <div className="p-3">
      <div className="text-sm font-medium mb-2">Layers</div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">No elements on this page.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it, idx) => {
            const active = selectedUserBlockId === it.id;
            return (
              <li
                key={it.id}
                className={`flex items-center gap-2 px-2 py-1 rounded border ${active ? "bg-blue-50 border-blue-200" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <button
                  className="flex-1 text-left text-xs truncate"
                  title={it.label}
                  onClick={() => selectUserBlock(it.id)}
                >
                  {it.label}
                </button>
                {/* z-order controls */}
                <div className="flex items-center gap-1">
                  <button
                    className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50"
                    title="Bring forward"
                    onClick={() => bringForward(it.id)}
                  >▲</button>
                  <button
                    className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50"
                    title="Send backward"
                    onClick={() => sendBackward(it.id)}
                  >▼</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="text-[11px] text-gray-400 mt-2">Shows elements for the current page.</div>
    </div>
  );
}
