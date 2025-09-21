// client/src/editor/blocks/BlocksPanel.tsx
import React from "react";
import { useEditor } from "../../state/editorStore";

type BlockKind = "severityOverview" | "findingsTable" | "photoStrip";

function Card({
  title, subtitle, onInsert, preview,
}: { title: string; subtitle: string; onInsert: () => void; preview: React.ReactNode }) {
  return (
    <div className="border rounded p-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
      <div className="border rounded h-20 grid place-items-center mb-2 bg-white overflow-hidden">{preview}</div>
      <button className="px-2 py-1 border rounded text-xs hover:bg-gray-50" onClick={onInsert}>Insert</button>
    </div>
  );
}

export default function BlocksPanel() {
  const { draft, pageIndex, startInsert, placeUserBlock, updateUserBlock, selectUserBlock, findings } = useEditor();
  const canInsert = !!draft && pageIndex >= 0;
  if (!canInsert) return <div className="p-3 text-xs text-gray-500">Open a draft page to insert blocks.</div>;

  function makePayload(kind: BlockKind) {
    if (kind === "severityOverview") {
      const counts = [1, 2, 3, 4, 5].map((s) => findings.filter((f) => f.severity === s).length);
      return { counts }; // [sev1..sev5]
    }
    if (kind === "findingsTable") {
      const rows = findings.slice(0, 4).map((f) => ({
        title: f.title || "(untitled)",
        severity: f.severity,
        location: f.location || "",
        category: f.category || "",
      }));
      const sample = rows.length
        ? rows
        : [
            { title: "Loose fastener at panel A3", severity: 3, location: "Roof NE", category: "Mechanical" },
            { title: "Cracked sealant", severity: 2, location: "Roof SW", category: "Sealant" },
            { title: "Corrosion on bracket", severity: 4, location: "Tower mid", category: "Corrosion" },
          ];
      return { rows: sample };
    }
    // photoStrip
    return { urls: [] as string[] }; // Canvas will derive from findings if empty
  }

  function insert(kind: BlockKind) {
    // place a generic rect, then tag it as a block
    startInsert("rect");
    const id = placeUserBlock({ x: 10, y: 10, w: 80, h: kind === "photoStrip" ? 18 : 24 });
    if (!id) return;
    updateUserBlock(id, {
      blockStyle: {
        stroke: { width: 0 },
        fill: { token: "surface" },
        meta: { blockKind: kind, payload: makePayload(kind) },
      } as any,
    } as any);
    selectUserBlock(id);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Blocks</div>
      <div className="grid grid-cols-2 gap-2">
        <Card
          title="Severity Overview"
          subtitle="Counts by severity"
          onInsert={() => insert("severityOverview")}
          preview={
            <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
              {[1, 3, 5].map((s) => (
                <div key={s} className="border rounded text-center text-[11px] p-1">
                  <div className="text-[10px] text-gray-500">S{s}</div>
                  <div className="text-base font-semibold">12</div>
                </div>
              ))}
            </div>
          }
        />
        <Card
          title="Findings Table"
          subtitle="Top findings"
          onInsert={() => insert("findingsTable")}
          preview={
            <div className="w-full h-full p-2">
              <div className="text-[10px] text-gray-500">Title • Sev • Loc</div>
              <div className="text-[11px]">Loose fastener • 3 • Roof</div>
              <div className="text-[11px]">Cracked sealant • 2 • SW</div>
            </div>
          }
        />
        <Card
          title="Photo Strip"
          subtitle="Recent photos"
          onInsert={() => insert("photoStrip")}
          preview={
            <div className="flex gap-1 px-2 w-full">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex-1 h-12 bg-gray-200 rounded" />
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}
