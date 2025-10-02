// client/src/state/editor/index.ts
import { createEditorStore } from "./store";

// Primary hook for editor state (modular store)
export const useEditor = createEditorStore();

// Re-export types so consumers can import from "state/editor"
export * from "./types";
export type { EditorStoreNew } from "./store";
