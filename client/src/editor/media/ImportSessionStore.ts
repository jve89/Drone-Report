// client/src/editor/media/ImportSessionStore.ts
import { create } from "zustand";
import type { QueuedFile, ImportGroup } from "./types";

type ViewMode = "grid" | "list";

type State = {
  files: QueuedFile[];
  groups: ImportGroup[];
  view: ViewMode;
  filter: string;
  isUploading: boolean;
  setFiles: (f: QueuedFile[]) => void;
  setGroups: (g: ImportGroup[]) => void;
  setView: (v: ViewMode) => void;
  setFilter: (q: string) => void;
  setIsUploading: (v: boolean) => void;
  clear: () => void;
};

export const useImportSession = create<State>((set) => ({
  files: [],
  groups: [],
  view: "grid",
  filter: "",
  isUploading: false,
  setFiles: (files) => set({ files }),
  setGroups: (groups) => set({ groups }),
  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  setIsUploading: (isUploading) => set({ isUploading }),
  clear: () =>
    set({
      files: [],
      groups: [],
      view: "grid",
      filter: "",
      isUploading: false,
    }),
}));
