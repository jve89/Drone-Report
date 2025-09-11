// client/src/state/mediaStore.ts
import { create } from "zustand";
import type { MediaItem } from "@drone-report/shared/types/media";
import { deleteDraftMedia } from "../lib/api"; // new API helper

type MediaState = {
  items: MediaItem[];
  query: string;
  selected: Set<string>;
  isLoading: boolean;

  setItems: (items: MediaItem[]) => void;
  addItems: (items: MediaItem[]) => void;
  removeItem: (id: string, draftId: string) => Promise<void>;
  setQuery: (q: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
};

export const useMediaStore = create<MediaState>((set, get) => ({
  items: [],
  query: "",
  selected: new Set(),
  isLoading: false,

  setItems: (items) => set({ items }),
  addItems: (items) => set((s) => ({ items: [...s.items, ...items] })),
  removeItem: async (id, draftId) => {
    set({ isLoading: true });
    try {
      await deleteDraftMedia(draftId, id);
      set((s) => ({ items: s.items.filter((m) => m.id !== id) }));
    } finally {
      set({ isLoading: false });
    }
  },
  setQuery: (q) => set({ query: q }),
  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selected);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selected: next };
    }),
  clearSelection: () => set({ selected: new Set() }),
}));
