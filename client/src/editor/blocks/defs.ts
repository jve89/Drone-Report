// client/src/editor/blocks/defs.ts
export type BlockKind =
  | "table"
  | "severityOverview"
  | "findingsTable"
  | "photoStrip"
  | "siteProperties"
  | "inspectionDetails"
  | "orthoPair"
  | "thermalAnomalies"
  | "image";

export type TableProps = {
  data: string[][];
};

export type SeverityOverviewProps = { showIcons: boolean };
export type FindingsTableProps = {
  pageSize: number;
  showSeverityIcons: boolean;
};
export type PhotoStripProps = { count: number };
export type SitePropertiesProps = {
  address?: string;
  peakPowerMWp?: number;
  panelCount?: number;
  inclinationDeg?: number;
  orientation?: string;
  areaHa?: number;
  panelModel?: string;
  inverterModel?: string;
};
export type InspectionDetailsProps = { showIcons: boolean; cols: number };
export type OrthoPairProps = {
  layout: "horizontal" | "vertical";
  showNorth: boolean;
  showScale: boolean;
  leftLabel?: string;
  rightLabel?: string;
};
export type ThermalAnomaliesProps = {
  pageSize: number;
  showDelta: boolean;
  unit: "°C" | "K";
};

// Image block props now include zooming & panning the image CONTENT (frame unchanged).
export type ImageProps = {
  src?: string;
  alt?: string;
  fit: "contain" | "cover" | "scale-down";
  opacity: number;
  borderRadius: number;
  zoom: number;
  panX: number;
  panY: number;
};

export type BlockPropsByKind = {
  table: TableProps;
  severityOverview: SeverityOverviewProps;
  findingsTable: FindingsTableProps;
  photoStrip: PhotoStripProps;
  siteProperties: SitePropertiesProps;
  inspectionDetails: InspectionDetailsProps;
  orthoPair: OrthoPairProps;
  thermalAnomalies: ThermalAnomaliesProps;
  image: ImageProps;
};

type Field =
  | { type: "checkbox"; key: string; label: string }
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number }
  | { type: "text"; key: string; label: string }
  | { type: "select"; key: string; label: string; options: Array<{ value: string; label: string }> };

export const BLOCK_DEFS: {
  [K in BlockKind]: { defaultProps: BlockPropsByKind[K]; inspectorFields: Field[] };
} = {
  table: {
    defaultProps: { data: [["A1", "B1"], ["A2", "B2"]] },
    inspectorFields: [
      { type: "text", key: "data", label: "Initial data (JSON or ignored at runtime)" },
    ],
  },
  severityOverview: {
    defaultProps: { showIcons: true },
    inspectorFields: [{ type: "checkbox", key: "showIcons", label: "Show icons" }],
  },
  findingsTable: {
    defaultProps: { pageSize: 6, showSeverityIcons: false },
    inspectorFields: [
      { type: "number", key: "pageSize", label: "Rows", min: 1, max: 50, step: 1 },
      { type: "checkbox", key: "showSeverityIcons", label: "Show severity icons" },
    ],
  },
  photoStrip: {
    defaultProps: { count: 3 },
    inspectorFields: [{ type: "number", key: "count", label: "Photos", min: 1, max: 12, step: 1 }],
  },
  siteProperties: {
    defaultProps: {
      address: "",
      peakPowerMWp: 0,
      panelCount: 0,
      inclinationDeg: 0,
      orientation: "",
      areaHa: 0,
      panelModel: "",
      inverterModel: "",
    },
    inspectorFields: [
      { type: "text", key: "address", label: "Address" },
      { type: "number", key: "peakPowerMWp", label: "Peak Power (MWp)", min: 0 },
      { type: "number", key: "panelCount", label: "Panel Count", min: 0 },
      { type: "number", key: "inclinationDeg", label: "Inclination (°)", min: 0, max: 90 },
      { type: "text", key: "orientation", label: "Orientation" },
      { type: "number", key: "areaHa", label: "Area (ha)", min: 0 },
      { type: "text", key: "panelModel", label: "Panel Model" },
      { type: "text", key: "inverterModel", label: "Inverter Model" },
    ],
  },
  inspectionDetails: {
    defaultProps: { showIcons: true, cols: 2 },
    inspectorFields: [
      { type: "checkbox", key: "showIcons", label: "Show icons" },
      { type: "number", key: "cols", label: "Columns (1–2)", min: 1, max: 2, step: 1 },
    ],
  },
  orthoPair: {
    defaultProps: {
      layout: "horizontal",
      showNorth: true,
      showScale: true,
      leftLabel: "Ortho",
      rightLabel: "Detail",
    },
    inspectorFields: [
      {
        type: "select",
        key: "layout",
        label: "Layout",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
      },
      { type: "checkbox", key: "showNorth", label: "Show north arrow" },
      { type: "checkbox", key: "showScale", label: "Show scale bar" },
      { type: "text", key: "leftLabel", label: "Left caption" },
      { type: "text", key: "rightLabel", label: "Right caption" },
    ],
  },
  thermalAnomalies: {
    defaultProps: { pageSize: 8, showDelta: true, unit: "°C" },
    inspectorFields: [
      { type: "number", key: "pageSize", label: "Rows", min: 1, max: 50, step: 1 },
      { type: "checkbox", key: "showDelta", label: "Show ΔT column" },
      { type: "text", key: "unit", label: "Unit (°C or K)" },
    ],
  },
  image: {
    defaultProps: {
      src: "",
      alt: "Image",
      fit: "contain",
      opacity: 100,
      borderRadius: 0,
      zoom: 100,
      panX: 0,
      panY: 0,
    },
    inspectorFields: [
      { type: "text", key: "src", label: "Image URL / path" },
      { type: "text", key: "alt", label: "Alt text" },
      {
        type: "select",
        key: "fit",
        label: "Object fit",
        options: [
          { value: "contain", label: "Contain" },
          { value: "cover", label: "Cover" },
          { value: "scale-down", label: "Scale down" },
        ],
      },
      { type: "number", key: "opacity", label: "Opacity (%)", min: 0, max: 100, step: 1 },
      { type: "number", key: "borderRadius", label: "Border radius (px)", min: 0, max: 64, step: 1 },
      { type: "number", key: "zoom", label: "Zoom (%)", min: 10, max: 500, step: 1 },
      { type: "number", key: "panX", label: "Pan X (%)", min: -100, max: 100, step: 1 },
      { type: "number", key: "panY", label: "Pan Y (%)", min: -100, max: 100, step: 1 },
    ],
  },
};
