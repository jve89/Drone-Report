// client/src/state/editor/store.ts
import { create } from "zustand";
import type { EditorState } from "./types";

import { createDraftSlice } from "./draftSlice";
import { createToolSlice } from "./toolSlice";
import { createSelectionSlice } from "./selectionSlice";
import { createUserBlocksSlice } from "./userBlocksSlice";
import { createMediaSlice } from "./mediaSlice";
import { createGuideSlice } from "./guideSlice";
import { createHistorySlice } from "./historySlice";
import { createIOSlice } from "./ioSlice";
import { createFindingsSlice } from "./findingsSlice";

// Compose final store type by intersecting the slices' public members.
// We keep it broad here and rely on runtime shape (easier than threading
// every slice's generic constraints through zustand's StateCreator types).
export type EditorStoreNew = EditorState &
  ReturnType<typeof createDraftSlice> &
  ReturnType<typeof createToolSlice> &
  ReturnType<typeof createSelectionSlice> &
  ReturnType<typeof createUserBlocksSlice> &
  ReturnType<typeof createMediaSlice> &
  ReturnType<typeof createGuideSlice> &
  ReturnType<typeof createHistorySlice> &
  ReturnType<typeof createIOSlice> &
  ReturnType<typeof createFindingsSlice>;

export const createEditorStore = () =>
  create<EditorStoreNew>()((set, get, store) =>
    ({
      // Cast each slice spread to any to avoid overly-strict generics conflicts.
      ...(createDraftSlice as any)(set, get, store),
      ...(createToolSlice as any)(set, get, store),
      ...(createSelectionSlice as any)(set, get, store),
      ...(createUserBlocksSlice as any)(set, get, store),
      ...(createMediaSlice as any)(set, get, store),
      ...(createGuideSlice as any)(set, get, store),
      ...(createHistorySlice as any)(set, get, store),
      ...(createIOSlice as any)(set, get, store),
      ...(createFindingsSlice as any)(set, get, store),
    } as unknown as EditorStoreNew)
  );
