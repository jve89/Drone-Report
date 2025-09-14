export type UserBlock = {
  id: string;
  type: "text"; // future: "image_slot" | "checkbox" | ...
  rect: { x: number; y: number; w: number; h: number }; // 0–100
  value?: string;
};

export type PageInstance = {
  id: string;
  templatePageId: string;
  values?: Record<string, unknown>;
  userBlocks?: UserBlock[];
};

export type Draft = {
  id: string;
  userId?: string;
  templateId: string;
  title: string;
  status: "draft" | "final";
  pageInstances: PageInstance[];
  media: unknown[];
  createdAt: string;
  updatedAt: string;
};
