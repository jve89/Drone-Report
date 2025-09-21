// client/src/editor/blocks/BlocksPanel.tsx
import React, { useEffect, useState } from "react";
import { useEditor } from "../../state/editorStore";
import { BlockPreset, ElementPreset, loadBlockPresets } from "../../templates/presets";

export default function BlocksPanel() {
  const { draft, pageIndex, startInsert, placeUserBlock, updateUserBlock, selectUserBlock } = useEditor();
  const [presets, setPresets] = useState<BlockPreset[]>([]);
  const canInsert = !!draft && pageIndex >= 0;

  useEffect(() => {
    loadBlockPresets().then(setPresets).catch(() => setPresets([]));
  }, []);

  function insertElement(ep: ElementPreset, offsetPct = { x: 0, y: 0 }): string | null {
    if (ep.type === "text" || ep.type === "rect" || ep.type === "ellipse" || ep.type === "divider") {
      startInsert(ep.type); // uses store tool to initialize kind
      const id = placeUserBlock({
        x: ep.type === "divider" ? ep.rect.x : ep.rect.x + offsetPct.x,
        y: ep.type === "divider" ? ep.rect.y : ep.rect.y + offsetPct.y,
        w: ep.rect.w,
        h: ep.rect.h,
      });
      if (id && ep.type === "text" && ep.value != null) {
        updateUserBlock(id, { value: ep.value } as any);
      }
      if (id && (ep as any).blockStyle) updateUserBlock(id, { blockStyle: (ep as any).blockStyle } as any);
      if (id && (ep as any).style) updateUserBlock(id, { style: (ep as any).style } as any);
      return id;
    }
    if (ep.type === "line" && Array.isArray(ep.points)) {
      // place a minimal rect then overwrite with points
      startInsert("line");
      const bbox = {
        x: Math.min(ep.points[0].x, ep.points[ep.points.length - 1].x) + offsetPct.x,
        y: Math.min(ep.points[0].y, ep.points[ep.points.length - 1].y) + offsetPct.y,
        w: 10,
        h: 1,
      };
      const id = placeUserBlock(bbox);
      if (id) {
        const pts = ep.points.map(p => ({ x: p.x + offsetPct.x, y: p.y + offsetPct.y }));
        updateUserBlock(id, { points: pts } as any);
      }
      return id;
    }
    return null; // unsupported in Gate A
  }

  function insertPreset(p: BlockPreset) {
    if (!canInsert) return;
    // slight cascade offset so multiple inserts don’t overlap perfectly
    const baseOffset = { x: 0, y: 0 };
    const created: string[] = [];
    for (const el of p.elements) {
      const id = insertElement(el, baseOffset);
      if (id) created.push(id);
    }
    if (created.length) selectUserBlock(created[created.length - 1]);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Sections</div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            disabled={!canInsert}
            onClick={() => insertPreset(p)}
            className="border rounded p-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
            title={`Insert ${p.name}`}
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-gray-500">{p.elements.length} elements</div>
          </button>
        ))}
      </div>
      {!presets.length && (
        <div className="text-xs text-gray-500">No sections available.</div>
      )}
    </div>
  );
}
