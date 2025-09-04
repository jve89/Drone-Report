import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthGuard from "../auth/AuthGuard";
import { listDrafts, createDraftRecord } from "../lib/api";
import TemplatePicker from "./TemplatePicker";
import DraftRow from "./DraftRow";

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardInner />
    </AuthGuard>
  );
}

function DashboardInner() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listDrafts().then(setDrafts).catch(() => setDrafts([]));
  }, []);

  async function newReport(tid: string) {
    const id = await createDraftRecord({ templateId: tid });
    navigate(`/annotate/${id}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your reports</h1>
        <button
          className="px-3 py-2 border rounded"
          onClick={() => setOpen(true)}
        >
          New report
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="text-sm text-gray-500">No drafts yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {drafts.map((d) => (
            <DraftRow key={d.id} draft={d} />
          ))}
        </div>
      )}

      {open && (
        <TemplatePicker
          onSelect={async (t) => {
            try {
              await newReport(t.id);
            } catch (e: any) {
              console.error(e);
              alert(e?.message || "Failed to create draft");
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
