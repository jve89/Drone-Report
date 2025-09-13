export type Block = {
  id: string;
  type: "text" | "image_slot" | "checkbox" | "date" | "table" | "badge" | "repeater" | string;
  rect: { x: number; y: number; w: number; h: number };
  placeholder?: string;
  label?: string;
  help?: string; // optional hint used by the Guided Wizard
  options?: Record<string, any>;
};

export type TemplatePage = {
  id: string;
  name: string;
  blocks: Block[];
};

export type Template = {
  id: string;
  name: string;
  version: string;
  pages: TemplatePage[];
};
