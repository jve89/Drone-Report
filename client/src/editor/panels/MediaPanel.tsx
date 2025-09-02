// client/src/editor/panels/MediaPanel.tsx
import { uploadMedia } from "../../api/drafts";
import { useEditor } from "../../state/editorStore";

export default function MediaPanel() {
  const { draft, setDraft } = useEditor();
  if (!draft) return null;

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const media = await uploadMedia(draft.id, files);
    setDraft({ ...draft, media });
  }

  return (
    <div className="border-t p-2 text-sm">
      <div className="font-medium mb-1">Media</div>
      <input type="file" multiple onChange={onUpload} />
      <div className="grid grid-cols-3 gap-2 mt-2">
        {draft.media?.map((m: any) => (
          <img key={m.id} src={m.url} className="w-full h-20 object-cover rounded" />
        ))}
      </div>
    </div>
  );
}
