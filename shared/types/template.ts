// shared/types/template.ts
export type Rect = { x: number; y: number; w: number; h: number }; // percents 0–100

export type BlockType = "text" | "image_slot" | "table" | "badge" | "repeater";

export type BlockBase = {
  id: string;
  type: BlockType;
  rect: Rect;
  label?: string;
  placeholder?: string;
  help?: string; // drives Guided Wizard steps
  // type-specific options live here; values live in draft.pageInstances[].values[blockId]
  options?: Record<string, any>;
};

export type BlockText = BlockBase & {
  type: "text";
  options?: { binding?: string; align?: "left" | "center" | "right" };
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

export type Block = BlockText | BlockImage | BlockTable | BlockBadge | BlockRepeater;

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
    | "toc";
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
