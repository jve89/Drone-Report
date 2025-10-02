// client/src/state/editor/types.ts
import type {
  Draft,
  Theme,
  PageStyle,
  TextStyle,
  BlockStyle,
  UserBlock,
} from "../../types/draft";
import type { Template } from "../../types/template";

export type Rect = { x: number; y: number; w: number; h: number };
export type InsertKind = "text" | "line" | "rect" | "ellipse" | "divider";

export type GuideState = { enabled: boolean; stepIndex: number };
export type ToolState =
  | { mode: "idle"; kind?: undefined }
  | { mode: "insert"; kind: InsertKind };

export type Step = { pageId: string; blockId: string; help?: string };

/** Findings domain (matches prior monolith semantics) */
export type Severity = 1 | 2 | 3 | 4 | 5;
export type Annotation = {
  id: string;
  kind: "box";
  rect: { x: number; y: number; w: number; h: number }; // normalized 0..1
  index: number;
};
export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  category?: string;
  location?: string;
  description?: string;
  tags: string[];
  photoId: string;
  photoIds?: string[];
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
};

// Mirror of monolith state needed by slices
export type EditorState = {
  draft: Draft | null;
  template: Template | null;
  pageIndex: number;
  zoom: number;

  _saveTimer: number | null;
  saving: boolean;
  dirty: boolean;
  lastSavedAt?: string;

  // selection + guide + tool
  selectedBlockId: string | null;
  selectedUserBlockId: string | null;
  guide: GuideState;
  tool: ToolState;

  // derived
  steps: Step[];

  // findings payload
  findings: Finding[];

  // preview
  previewOpen: boolean;
  previewZoom: number;

  // history
  historyPast: any[];
  historyFuture: any[];
  lastMarkTs: number;
  canUndo: boolean;
  canRedo: boolean;

  /** IO — required because components call these directly */
  loadDraft: (id: string) => Promise<void>;
  saveDebounced: () => void;
  saveNow: () => Promise<void>;
  setDraftTitle: (title: string) => Promise<void>;

  /** Findings CRUD — required by FindingsPanel */
  setFindings: (f: Finding[]) => void;
  createFindingsFromPhotos: (photoIds: string[]) => void;
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  deleteFinding: (id: string) => void;
  reindexAnnotations: (photoId: string) => void;

  /** Other methods filled by slices (kept optional to avoid tight coupling) */
  mark?: (opts?: { coalesce?: boolean }) => void;
  undo?: () => void;
  redo?: () => void;

  setDraft?: (d: Draft) => void;
  setTemplate?: (t: Template | null) => void;
  setPageIndex?: (i: number) => void;
  setZoom?: (z: number) => void;

  setSelectedBlock?: (blockId: string | null) => void;
  selectUserBlock?: (id: string | null) => void;

  setValue?: (pageId: string, blockId: string, value: unknown) => void;
  duplicatePage?: (pageId: string) => void;
  repeatPage?: (pageId: string) => void;
  deletePage?: (pageId: string) => void;

  insertImageAtPoint?: (
    pageId: string,
    pointPct: { x: number; y: number },
    media: { id: string; url: string; filename?: string; kind?: string }
  ) => boolean;
  insertImageAppend?: (
    pageId: string,
    media: { id: string; url: string; filename?: string; kind?: string }
  ) => boolean;

  enableGuide?: () => void;
  disableGuide?: () => void;
  guidePrev?: () => void;
  guideNext?: () => void;
  guideSkip?: () => void;
  setGuideStep?: (i: number) => void;
  recomputeSteps?: () => void;

  startInsert?: (kind: InsertKind) => void;
  cancelInsert?: () => void;
  placeUserBlock?: (rect: Rect) => string | null;
  updateUserBlock?: (id: string, patch: Partial<UserBlock>) => void;
  deleteUserBlock?: (id: string) => void;

  bringForward?: (id: string) => void;
  sendBackward?: (id: string) => void;
  nudgeSelected?: (dxPct: number, dyPct: number) => void;
  setTextStyle?: (id: string, patch: Partial<TextStyle>) => void;
  setBlockFill?: (id: string, fill: BlockStyle["fill"]) => void;
  setBlockStroke?: (id: string, stroke: Partial<NonNullable<BlockStyle["stroke"]>>) => void;
  setBlockRadius?: (id: string, r: number) => void;
  setBlockOpacity?: (id: string, o: number) => void;
  setLinePoints?: (id: string, pts: Array<{ x: number; y: number }>) => void;

  setPageStyle?: (pageIndex: number, patch: Partial<PageStyle>) => void;
  setTheme?: (patch: Partial<Theme>) => void;
  setThemeColorToken?: (key: string, ref: { token?: string; hex?: string }) => void;

  openPreview?: () => void;
  closePreview?: () => void;
  setPreviewZoom?: (z: number) => void;

  updateBlockProps?: (id: string, patch: Record<string, unknown>) => void;
};
