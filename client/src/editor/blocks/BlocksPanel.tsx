// client/src/editor/blocks/BlocksPanel.tsx
import React, { useState } from "react";
import { useEditor } from "../../state/editor";
import { BLOCK_DEFS, BlockKind } from "./defs";

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
  const {
    draft,
    pageIndex,
    startInsert,
    placeUserBlock,
    updateUserBlock,
    selectUserBlock,
    findings,
  } = useEditor();

  const [showMore, setShowMore] = useState(false);

  const canInsert = !!draft && pageIndex >= 0;
  if (!canInsert) return <div className="p-3 text-xs text-gray-500">Open a draft page to insert sections.</div>;

  const findingsArr = Array.isArray(findings) ? findings : [];

  function makePayload(kind: BlockKind) {
    if (kind === "severityOverview") {
      const counts = [1, 2, 3, 4, 5].map(
        (s) => findingsArr.filter((f: any) => f?.severity === s).length
      );
      return { counts };
    }
    if (kind === "findingsTable") {
      const rows = findingsArr.slice(0, 4).map((f: any) => ({
        title: f?.title || "(untitled)",
        severity: f?.severity,
        location: f?.location || "",
        category: f?.category || "",
      }));
      return {
        rows: rows.length
          ? rows
          : [
              { title: "Loose fastener at panel A3", severity: 3, location: "Roof NE", category: "Mechanical" },
              { title: "Cracked sealant", severity: 2, location: "Roof SW", category: "Sealant" },
              { title: "Corrosion on bracket", severity: 4, location: "Tower mid", category: "Corrosion" },
            ],
      };
    }
    if (kind === "photoStrip") return { urls: [] as string[] };
    if (kind === "siteProperties") return {};
    if (kind === "inspectionDetails") {
      return { date: "", inspector: "", weather: "", wind: "", temperature: "", notes: "" };
    }
    if (kind === "orthoPair") return { leftUrl: "", rightUrl: "", leftCaption: "", rightCaption: "" };
    if (kind === "thermalAnomalies") {
      return {
        rows: [
          { type: "Hotspot", cause: "Loose connector", tMin: 32.1, tMean: 38.2, tMax: 45.9, tDelta: 13.8, lat: 52.1, lon: 5.1 },
          { type: "String", cause: "Diode failure",   tMin: 28.4, tMean: 33.0, tMax: 39.2, tDelta: 10.8, lat: 52.1, lon: 5.1 },
        ],
      };
    }
    if (kind === "image") return { src: "", alt: "Image" };
    return {};
  }

  function insert(kind: BlockKind) {
    startInsert("rect" as any);

    const rect =
      kind === "image"
        ? { x: 20, y: 20, w: 40, h: 20 }
        : { x: 10, y: 10, w: 80, h: kind === "photoStrip" ? 18 : 24 };

    const id = placeUserBlock(rect);
    if (!id) return;

    updateUserBlock(
      id,
      {
        blockStyle: {
          stroke: { width: 0 },
          fill: { token: "surface" },
          meta: {
            blockKind: kind,
            payload: makePayload(kind),
            props: BLOCK_DEFS[kind].defaultProps,
          },
        } as any,
      } as any
    );

    selectUserBlock(id);
  }

  // Core sections (visible by default)
  const core = (
    <>
      <Card
        title="Image"
        subtitle="Place an image section"
        onInsert={() => insert("image" as BlockKind)}
        preview={
          <div
            className="w-full h-full grid place-items-center rounded border text-[11px] text-gray-500"
            style={{ background: "repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px" }}
          >
            Image
          </div>
        }
      />
      <Card
        title="Severity Summary"
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
        subtitle="Editable findings list"
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
        title="Site Info"
        subtitle="Client • Site • Address"
        onInsert={() => insert("siteProperties")}
        preview={
          <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
            {["Client", "Site", "Address", "Coords"].map((l) => (
              <div key={l} className="border rounded p-1 text-[11px]">
                <div className="text-[10px] text-gray-500">{l}</div>
                <div>—</div>
              </div>
            ))}
          </div>
        }
      />
      <Card
        title="Inspection Info"
        subtitle="Date • Operator • Weather"
        onInsert={() => insert("inspectionDetails")}
        preview={
          <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
            {["Date", "Operator", "Weather", "Notes"].map((l) => (
              <div key={l} className="border rounded p-1 text-[11px]">
                <div className="text-[10px] text-gray-500">{l}</div>
                <div>—</div>
              </div>
            ))}
          </div>
        }
      />
    </>
  );

  // Optional sections (hidden under "More")
  const more = (
    <>
      <Card
        title="Before/After"
        subtitle="Side-by-side images"
        onInsert={() => insert("orthoPair")}
        preview={
          <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
            <div className="bg-gray-200 rounded" />
            <div className="bg-gray-200 rounded" />
          </div>
        }
      />
      <Card
        title="Thermal Hotspots"
        subtitle="IR table (ΔT)"
        onInsert={() => insert("thermalAnomalies")}
        preview={
          <div className="w-full h-full p-2">
            <div className="text-[10px] text-gray-500">Type • Tmin • Tmean • Tmax • ΔT</div>
            <div className="text-[11px]">Hotspot • 32 • 38 • 46 • 14</div>
          </div>
        }
      />
      {/* Photo Strip intentionally hidden in core; available here only if you still want it visible. 
          If you’d prefer to fully hide it for now, remove this block. */}
      {/* 
      <Card
        title="Photo Strip"
        subtitle="Row of images"
        onInsert={() => insert("photoStrip")}
        preview={
          <div className="flex gap-1 px-2 w-full">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 h-12 bg-gray-200 rounded" />
            ))}
          </div>
        }
      />
      */}
    </>
  );

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Sections</div>

      {/* Core */}
      <div className="grid grid-cols-2 gap-2">
        {core}
      </div>

      {/* More */}
      <div className="mt-3">
        <button
          className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
        >
          {showMore ? "Hide more sections" : "More sections"}
        </button>
        {showMore && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {more}
          </div>
        )}
      </div>
    </div>
  );
}
