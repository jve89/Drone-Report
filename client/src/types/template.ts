// client/src/types/template.ts

export type SectionKind =
  | "severityOverview"
  | "findingsTable"
  | "photoStrip"
  | "siteProperties"
  | "inspectionDetails"
  | "orthoPair"
  | "thermalAnomalies";

export type Block =
  | {
      id: string;
      type: "text" | "divider" | "line" | "rect" | "ellipse";
      rect: { x: number; y: number; w: number; h: number };
      placeholder?: string;
      label?: string;
      help?: string;
      options?: Record<string, any>;
    }
  | {
      id: string;
      type: "image_slot" | "table" | "badge" | "repeater" | "siteProperties"; // legacy supported
      rect: { x: number; y: number; w: number; h: number };
      placeholder?: string;
      label?: string;
      help?: string;
      options?: Record<string, any>;
    }
  | {
      id: string;
      type: "section";
      rect: { x: number; y: number; w: number; h: number };
      placeholder?: string;
      label?: string;
      help?: string;
      options: { kind: SectionKind; props?: Record<string, any> };
    };

export type TemplatePage = {
  id: string;
  name: string;
  kind: string;           // was optional; now required to match schema/shared
  repeatable?: boolean;
  blocks: Block[];
};

export type Template = {
  id: string;
  name: string;
  version: string;
  pages: TemplatePage[];
};
