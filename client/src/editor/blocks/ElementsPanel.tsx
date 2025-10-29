// client/src/editor/blocks/ElementsPanel.tsx
import React, { useState, useRef, useEffect } from "react";
import { useEditor } from "../../state/editor";
import { BLOCK_DEFS, BlockKind } from "./defs";

type ElemKind = "text" | "line" | "rect" | "ellipse";

// Simple card used for “section” style blocks (image, severity, tables, etc.)
function Card({
  title,
  subtitle,
  onInsert,
  preview,
}: {
  title: string;
  subtitle: string;
  onInsert: () => void;
  preview: React.ReactNode;
}) {
  return (
    <div className="border rounded p-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
      <div className="border rounded h-20 grid place-items-center mb-2 bg-white overflow-hidden">
        {preview}
      </div>
      <button className="px-2 py-1 border rounded text-xs hover:bg-gray-50" onClick={onInsert}>
        Insert
      </button>
    </div>
  );
}

export default function ElementsPanel() {
  const {
    draft,
    pageIndex,
    tool,
    startInsert,
    cancelInsert,
    placeUserBlock,
    updateUserBlock,
    selectUserBlock,
    findings,
  } = useEditor();

  const disabled = !draft || !(draft as any).pageInstances?.length;

  const isActive = (k: ElemKind) => tool?.mode === "insert" && (tool as any)?.kind === k;

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

  // Shape split-button (Rectangle / Ellipse)
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

  // Sections (previously BlocksPanel) logic
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

  function insertSection(kind: BlockKind) {
    if (!draft || pageIndex < 0) return;

    // Use a rect frame; the renderer will switch behavior based on blockKind
    const rect =
      kind === "image"
        ? { x: 20, y: 20, w: 40, h: 20 }
        : { x: 10, y: 10, w: 80, h: kind === "photoStrip" ? 18 : 24 };

    // Place a generic rect userBlock, then tag it with meta.blockKind + props
    startInsert("rect" as any);
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

  return (
    <div className="p-3 space-y-6">
      {/* Group 1: Basic drawing elements */}
      <section>
        <div className="text-sm font-medium">Elements</div>
        <p className="text-[11px] text-gray-500">Click an element, then click on the page to place it.</p>

        {/* Text */}
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-600 mb-2">Text</div>
          <div className="grid grid-cols-2 gap-2">
            <Btn label="Text" k="text" title="Insert a text box" />
          </div>
        </div>

        {/* Line & Shapes */}
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-600 mb-2">Shapes</div>
          <div className="grid grid-cols-2 gap-2 items-stretch">
            <Btn label="Line" k="line" title="Insert a line or arrow" />

            {/* Split button for Shape (Rectangle/Ellipse) */}
            <div className="relative" ref={shapeGroupRef}>
              <div className="inline-flex w-full">
                <button
                  className={`px-3 py-2 border rounded-l text-sm flex-1 text-left disabled:opacity-50 ${
                    isActive("rect") || isActive("ellipse") ? "bg-green-50 border-green-300" : "hover:bg-gray-50"
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
                    isActive("rect") || isActive("ellipse") ? "bg-green-50 border-green-300" : "hover:bg-gray-50"
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

          <p className="text-[11px] text-gray-400 mt-1">Press Esc to cancel placement.</p>
        </div>

        {disabled && <div className="text-[11px] text-gray-500 mt-2">Load or create a draft first.</div>}
      </section>

      {/* Group 2: Report sections (merged from the old Sections panel) */}
      <section>
        <div className="text-sm font-medium">Report sections</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Card
            title="Image"
            subtitle="Place an image section"
            onInsert={() => insertSection("image")}
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
            onInsert={() => insertSection("severityOverview")}
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
            onInsert={() => insertSection("findingsTable")}
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
            onInsert={() => insertSection("siteProperties")}
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
            onInsert={() => insertSection("inspectionDetails")}
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
          {/* Optional extras (still accessible but not in the user's way) */}
          <Card
            title="Before/After"
            subtitle="Side-by-side images"
            onInsert={() => insertSection("orthoPair")}
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
            onInsert={() => insertSection("thermalAnomalies")}
            preview={
              <div className="w-full h-full p-2">
                <div className="text-[10px] text-gray-500">Type • Tmin • Tmean • Tmax • ΔT</div>
                <div className="text-[11px]">Hotspot • 32 • 38 • 46 • 14</div>
              </div>
            }
          />
          {/* Photo Strip available if you want it visible later */}
          {/*
          <Card
            title="Photo Strip"
            subtitle="Row of images"
            onInsert={() => insertSection("photoStrip")}
            preview={
              <div className="flex gap-1 px-2 w-full">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex-1 h-12 bg-gray-200 rounded" />
                ))}
              </div>
            }
          />
          */}
        </div>
      </section>
    </div>
  );
}
