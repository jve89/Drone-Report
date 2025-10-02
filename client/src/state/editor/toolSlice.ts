import type { StateCreator } from "zustand";
import type { EditorState, InsertKind } from "./types";

export type ToolSlice = {
  startInsert: (kind: InsertKind) => void;
  cancelInsert: () => void;
};

export const createToolSlice: StateCreator<
  EditorState & ToolSlice,
  [],
  [],
  ToolSlice
> = (set) => ({
  startInsert: (kind) => set({ tool: { mode: "insert", kind }, selectedUserBlockId: null }),
  cancelInsert: () => set({ tool: { mode: "idle" } }),
});
