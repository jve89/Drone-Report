// client/src/editor/panels/LayersPanel.tsx
import React, { useMemo } from "react";
import { useEditor } from "../../state/editor";

export default function LayersPanel() {
  const {
    draft,
    pageIndex,
    selectUserBlock,
    selectedUserBlockId,
    bringForward,
    sendBackward,
  } = useEditor();

  const items = useMemo(() => {
    const pi = draft?.pageInstances?.[pageIndex];
    const list = Array.isArray((pi as any)?.userBlocks) ? ((pi as any).userBlocks as any[]) : [];
    const sorted = list.slice().sort((a, b) => (a?.z ?? 0) - (b?.z ?? 0));

    return sorted.map((b, i) => {
      const meta = (b?.blockStyle?.meta ?? {}) as { blockKind?: string };
      const isSection = typeof meta.blockKind === "string" && meta.blockKind.length > 0;

      const label = isSection
        ? `Section: ${meta.blockKind}`
        : b?.type === "text"
        ? "Text"
        : b?.type === "line"
        ? "Line"
        : b?.type === "divider"
        ? "Divider"
        : b?.type === "rect"
        ? "Rectangle"
        : b?.type === "ellipse"
        ? "Ellipse"
        : String(b?.type || "Element");

      // Ensure we always have a stable id to render (avoid crashes if missing)
      const id = typeof b?.id === "string" && b.id.length ? b.id : `ub-${i}`;

      return { id, label, type: String(b?.type || ""), isSection };
    });
  }, [draft, pageIndex]);

  if (!draft) return null;

  const hasValidPage =
    typeof pageIndex === "number" &&
    pageIndex >= 0 &&
    Array.isArray(draft.pageInstances) &&
    pageIndex < draft.pageInstances.length;

  if (!hasValidPage) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Layers</div>
        <div className="text-xs text-gray-500">Open a page to view its elements.</div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="text-sm font-medium mb-2">Layers</div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">No elements on this page.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => {
            const active = selectedUserBlockId === it.id;
            return (
              <li
                key={it.id}
                className={`flex items-center gap-2 px-2 py-1 rounded border ${
                  active ? "bg-blue-50 border-blue-200" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <button
                  className="flex-1 text-left text-xs truncate"
                  title={it.label}
                  onClick={() => selectUserBlock(it.id)}
                  aria-pressed={active}
                >
                  {it.label}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50"
                    title="Bring forward"
                    onClick={() => bringForward(it.id)}
                  >
                    ▲
                  </button>
                  <button
                    className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50"
                    title="Send backward"
                    onClick={() => sendBackward(it.id)}
                  >
                    ▼
                  </button>
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
