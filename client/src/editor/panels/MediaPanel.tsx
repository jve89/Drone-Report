// client/src/editor/panels/MediaPanel.tsx
import React from "react";
import { uploadDraftMedia } from "../../lib/api";
import { useEditor } from "../../state/editorStore";
import type { Draft } from "../../types/draft";

type MediaItem = { id: string; url: string; kind?: string; filename?: string; thumb?: string };

export default function MediaPanel() {
  const { draft, setDraft } = useEditor();
  if (!draft) return null;

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files || []);
    e.currentTarget.value = ""; // allow re-selecting same files
    if (!files.length) return;

    // Re-check draft at call time to satisfy TS and runtime safety
    const current: Draft | null = draft;
    if (!current) return;

    const media = (await uploadDraftMedia(current.id, files)) as unknown as MediaItem[];
    const next: Draft = { ...current, media };
    setDraft(next);
  }

  return (
    <div className="border-t p-2 text-sm">
      <div className="font-medium mb-1">Media</div>
      <input type="file" multiple accept="image/*" onChange={onUpload} />
      <div className="grid grid-cols-3 gap-2 mt-2">
        {draft.media?.map((m: any) => (
          <img key={m.id} src={m.thumb || m.url} className="w-full h-20 object-cover rounded" />
        ))}
      </div>
    </div>
  );
}
