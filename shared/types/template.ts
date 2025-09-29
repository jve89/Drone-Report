// shared/types/template.ts
export type Rect = { x: number; y: number; w: number; h: number }; // percents 0–100

// Section kinds must mirror client/src/editor/blocks/defs.ts BlockKind
export type SectionKind =
  | "severityOverview"
  | "findingsTable"
  | "photoStrip"
  | "siteProperties"
  | "inspectionDetails"
  | "orthoPair"
  | "thermalAnomalies";

export type BlockType =
  | "text"
  | "divider"
  | "line"
  | "rect"
  | "ellipse"
  | "image_slot"
  | "table"
  | "badge"
  | "repeater"
  | "siteProperties" // legacy
  | "section";       // preferred going forward

export type BlockBase = {
  id: string;
  type: BlockType;
  rect: Rect;
  label?: string;
  placeholder?: string;
  help?: string; // drives Guided Wizard steps
  options?: Record<string, any>;
};

export type BlockText = BlockBase & {
  type: "text" | "divider" | "line" | "rect" | "ellipse";
  // style is intentionally open; renderer interprets per type
  options?: Record<string, any>;
};

export type BlockImage = BlockBase & {
  type: "image_slot";
  options?: { crop?: boolean; minRes?: { w: number; h: number }; aspect?: number };
};

export type BlockTable = BlockBase & {
  type: "table";
  options: {
    columns: { key: string; label: string; align?: "left" | "center" | "right" }[];
    maxRows?: number;
    dense?: boolean;
  };
};

export type BlockBadge = BlockBase & {
  type: "badge";
  options?: { palette?: "gray" | "blue" | "amber" | "red" | "green" };
};

export type BlockRepeater = BlockBase & {
  type: "repeater";
  options?: {
    datasource?: "findings";
    previewCount?: number;
  };
};

// Legacy direct site properties block (kept for backward compatibility)
export type BlockSiteProperties = BlockBase & {
  type: "siteProperties";
  options?: { fields?: string[] };
};

// New: first-class Section reference with props passthrough
export type BlockSection = BlockBase & {
  type: "section";
  options: {
    kind: SectionKind;
    props?: Record<string, any>;
  };
};

export type Block =
  | BlockText
  | BlockImage
  | BlockTable
  | BlockBadge
  | BlockRepeater
  | BlockSiteProperties
  | BlockSection;

export type TemplatePage = {
  id: string;
  name: string;
  kind:
    | "cover"
    | "exec_summary"
    | "issue_index"
    | "detail"
    | "media_appendix"
    | "compliance"
    | "toc"
    | string;
  repeatable?: boolean;
  blocks: Block[];
};

export type Template = {
  id: string;
  name: string;
  version: string;
  pages: TemplatePage[];
};

// Below types are shared hints for draft payloads used by templates
export type Finding = {
  id: string;
  photoUrl: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  issue: string;
  comment?: string;
  location?: string;
  timestamp?: string; // ISO
};

export type DraftPayload = {
  meta?: { templateId?: string; title?: string };
  findings?: Finding[];
};

export interface SiteProperties {
  address?: string;
  peakPowerMWp?: number;
  panelCount?: number;
  inclinationDeg?: number;
  orientation?: string;
  areaHa?: number;
  panelModel?: string;
  inverterModel?: string;
}
