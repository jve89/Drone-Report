// shared/types/template.ts
export type Rect = { x: number; y: number; w: number; h: number }; // percents 0–100

export type BlockType =
  | "text"
  | "rich_text"
  | "image_slot"
  | "table"
  | "metric"
  | "legend"
  | "page_index"
  | "map"
  | "select"
  | "number"
  | "date";

export type BlockBase = {
  id: string;
  type: BlockType;
  rect: Rect;
  label?: string;
  placeholder?: string;
  options?: Record<string, any>;
};

export type BlockText = BlockBase & { type: "text" | "rich_text" };
export type BlockImage = BlockBase & {
  type: "image_slot";
  options?: { crop?: boolean; minRes?: { w: number; h: number }; aspect?: number };
};
export type BlockTable = BlockBase & {
  type: "table";
  options: { columns: { key: string; label: string }[]; maxRows?: number };
};

export type Block = BlockText | BlockImage | BlockTable | BlockBase;

export type TemplatePage = {
  id: string;
  name: string;
  kind:
    | "cover"
    | "exec_summary"
    | "method_scope"
    | "site_details"
    | "severity_legend"
    | "issue_index"
    | "detail"
    | "recommendations"
    | "media_appendix"
    | "compliance"
    | "signoff";
  repeatable?: boolean;
  freeformZones?: Rect[];
  blocks: Block[];
};

export type Template = {
  id: string;
  name: string;
  version: string;
  pages: TemplatePage[];
};

export type Crop = { x: number; y: number; scale: number }; // relative to natural image size

export type Media = { id: string; url: string; kind: "image" | "video"; filename?: string; thumb?: string };

export type Annotation = {
  id: string;
  mediaId: string;
  note: string;
  severity?: number;
  x?: number;
  y?: number;
  createdAt: string;
};

export type PageInstance = {
  id: string;
  templatePageId: string;
  values: Record<string, any>;
  userBlocks: Array<{ id: string; type: BlockType; rect: Rect; value?: any; options?: any }>;
};

export type Draft = {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  status: "draft" | "archived";
  media: Media[];
  annotations: Annotation[];
  pageInstances: PageInstance[];
  createdAt: string;
  updatedAt: string;
};
