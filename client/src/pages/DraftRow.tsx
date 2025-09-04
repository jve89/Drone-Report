// client/src/pages/DraftRow.tsx
import { Link } from "react-router-dom";

type DraftRowProps = {
  draft: any;
};

export default function DraftRow({ draft }: DraftRowProps) {
  const title = draft.payload?.meta?.title || draft.title || "Untitled";
  const templateId = draft.payload?.meta?.templateId || draft.templateId || "—";
  const updated = draft.updatedAt || draft.updated_at;

  return (
    <Link
      to={`/annotate/${draft.id}`}
      className="border rounded p-3 hover:bg-gray-50 block"
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500">
        {updated ? new Date(updated).toLocaleString() : ""}
      </div>
      <div className="text-xs text-gray-500">Template: {templateId}</div>
    </Link>
  );
}
