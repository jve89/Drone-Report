// client/src/state/mediaStore.ts
import { create } from "zustand";
import type { MediaItem } from "@drone-report/shared/types/media";

type State = {
  items: MediaItem[];
  query: string;
};
type Actions = {
  setItems: (items: MediaItem[]) => void;            // replace
  addItems: (items: MediaItem[]) => void;             // upsert
  removeItems: (ids: string[]) => void;               // delete by id
  setQuery: (q: string) => void;
};

function normalize(m: any): MediaItem | null {
  if (!m) return null;
  const id = String(m.id || m._id || "").trim();
  const url = String(m.url || m.src || "").trim();
  const filename = (m.filename || m.name || "").trim();
  const thumb = (m.thumb || m.thumbnail || m.preview || "").trim() || url;
  if (!id || !url) return null; // drop broken
  return { id, url, filename, thumb, kind: m.kind || "image", ...m };
}

function uniqById(list: MediaItem[]): MediaItem[] {
  const map = new Map<string, MediaItem>();
  for (const it of list) map.set(it.id, it);
  return Array.from(map.values());
}

export const useMediaStore = create<State & Actions>((set) => ({
  items: [],
  query: "",
  setQuery: (q) => set({ query: q }),
  setItems: (items) =>
    set(() => {
      const norm = items.map(normalize).filter(Boolean) as MediaItem[];
      return { items: uniqById(norm) };
    }),
  addItems: (items) =>
    set((s) => {
      const norm = items.map(normalize).filter(Boolean) as MediaItem[];
      return { items: uniqById([...s.items, ...norm]) };
    }),
  removeItems: (ids) =>
    set((s) => ({ items: s.items.filter((m) => !ids.includes(m.id)) })),
}));
