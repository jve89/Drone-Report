export type Block = {
  id: string;
  type: "text" | "image_slot" | "checkbox" | "date" | string;
  rect: { x: number; y: number; w: number; h: number };
  placeholder?: string;
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
