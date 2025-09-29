// client/src/editor/blocks/defs.ts
export type BlockKind =
  | "severityOverview"
  | "findingsTable"
  | "photoStrip"
  | "siteProperties"
  | "inspectionDetails"
  | "orthoPair"
  | "thermalAnomalies";

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

export type BlockPropsByKind = {
  severityOverview: SeverityOverviewProps;
  findingsTable: FindingsTableProps;
  photoStrip: PhotoStripProps;
  siteProperties: SitePropertiesProps;
  inspectionDetails: InspectionDetailsProps;
  orthoPair: OrthoPairProps;
  thermalAnomalies: ThermalAnomaliesProps;
};

type Field =
  | { type: "checkbox"; key: string; label: string }
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number }
  | { type: "text"; key: string; label: string }
  | { type: "select"; key: string; label: string; options: Array<{ value: string; label: string }> };

export const BLOCK_DEFS: {
  [K in BlockKind]: { defaultProps: BlockPropsByKind[K]; inspectorFields: Field[] };
} = {
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
    // These act as initial values for the editable table
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
};
