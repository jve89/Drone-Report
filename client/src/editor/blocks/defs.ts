// client/src/editor/blocks/defs.ts
export type BlockKind = "severityOverview" | "findingsTable" | "photoStrip";

export type SeverityOverviewProps = {
  showIcons: boolean;
};
export type FindingsTableProps = {
  pageSize: number;           // max rows to show
  showSeverityIcons: boolean; // if false, show numeric sev only
};
export type PhotoStripProps = {
  count: number; // max photos
};

export type BlockPropsByKind = {
  severityOverview: SeverityOverviewProps;
  findingsTable: FindingsTableProps;
  photoStrip: PhotoStripProps;
};

type Field =
  | { type: "checkbox"; key: string; label: string }
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number };

export const BLOCK_DEFS: {
  [K in BlockKind]: {
    defaultProps: BlockPropsByKind[K];
    inspectorFields: Field[];
  };
} = {
  severityOverview: {
    defaultProps: { showIcons: true },
    inspectorFields: [
      { type: "checkbox", key: "showIcons", label: "Show icons" },
    ],
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
    inspectorFields: [
      { type: "number", key: "count", label: "Photos", min: 1, max: 12, step: 1 },
    ],
  },
};
