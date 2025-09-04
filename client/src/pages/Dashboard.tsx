// client/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthGuard from "../auth/AuthGuard";
import { listTemplates } from "../api/templates";
import { listDrafts, createDraftRecord } from "../lib/api";

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardInner />
    </AuthGuard>
  );
}

function DashboardInner() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listDrafts().then(setDrafts).catch(() => setDrafts([]));
    listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  async function newReport(tid: string) {
    const id = await createDraftRecord({ templateId: tid });
    navigate(`/annotate/${id}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your reports</h1>
        <button className="px-3 py-2 border rounded" onClick={() => setOpen(true)}>New report</button>
      </div>

      {drafts.length === 0 ? (
        <div className="text-sm text-gray-500">No drafts yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {drafts.map((d) => {
            const title = d.payload?.meta?.title || d.title || "Untitled";
            const templateId = d.payload?.meta?.templateId || d.templateId || "—";
            const updated = d.updatedAt || d.updated_at;
            return (
              <Link key={d.id} to={`/annotate/${d.id}`} className="border rounded p-3 hover:bg-gray-50">
                <div className="text-sm font-medium">{title}</div>
                <div className="text-xs text-gray-500">{updated ? new Date(updated).toLocaleString() : ""}</div>
                <div className="text-xs text-gray-500">Template: {templateId}</div>
              </Link>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded shadow p-4 w-[520px]">
            <div className="text-sm font-medium mb-2">Choose a template</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="border rounded p-3 text-left hover:bg-gray-50"
                  onClick={async () => {
                    try {
                      await newReport(t.id);
                    } catch (e: any) {
                      console.error(e);
                      alert(e?.message || "Failed to create draft");
                    }
                  }}
                >
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.version}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="px-3 py-2 border rounded" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
