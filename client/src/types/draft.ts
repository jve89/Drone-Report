export type PageInstance = {
  id: string;
  templatePageId: string;
  values?: Record<string, unknown>;
  userBlocks?: unknown[];
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
