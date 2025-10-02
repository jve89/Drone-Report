import type { StateCreator } from "zustand";
import type { EditorState } from "./types";

export type SelectionSlice = {
  setSelectedBlock: (blockId: string | null) => void;
  selectUserBlock: (id: string | null) => void;
};

export const createSelectionSlice: StateCreator<
  EditorState & SelectionSlice,
  [],
  [],
  SelectionSlice
> = (set) => ({
  setSelectedBlock: (blockId) => set({ selectedBlockId: blockId }),
  selectUserBlock: (id) => set({ selectedUserBlockId: id }),
});
