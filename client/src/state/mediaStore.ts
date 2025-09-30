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
  const filename = String(m.filename || m.name || "").trim();
  const thumb = String(m.thumb || m.thumbnail || m.preview || "").trim() || url;
  const kind = (m.kind || "image") as string;
  if (!id || !url) return null; // drop broken
  // Ensure normalized fields win over source fields.
  return {
    ...(m as object),
    id,
    url,
    filename,
    thumb,
    kind,
  } as MediaItem;
}

function uniqById(list: MediaItem[]): MediaItem[] {
  const map = new Map<string, MediaItem>();
  for (const it of list) map.set(it.id, it); // last wins
  return Array.from(map.values());
}

export const useMediaStore = create<State & Actions>((set) => ({
  items: [],
  query: "",
  setQuery: (q) => set({ query: (q ?? "").trim() }),
  setItems: (items) =>
    set(() => {
      const norm = items.map(normalize).filter(Boolean) as MediaItem[];
      return { items: uniqById(norm) };
    }),
  addItems: (items) =>
    set((s) => {
      const norm = items.map(normalize).filter(Boolean) as MediaItem[];
      // existing first, then new; new wins on id collision
      return { items: uniqById([...s.items, ...norm]) };
    }),
  removeItems: (ids) =>
    set((s) => {
      const ban = new Set(ids);
      return { items: s.items.filter((m) => !ban.has(m.id)) };
    }),
}));
