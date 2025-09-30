// client/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthGuard from "../auth/AuthGuard";
import { listDrafts, createDraftRecord } from "../lib/api";
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr(null);
    listDrafts()
      .then((arr) => {
        if (!active) return;
        setDrafts(Array.isArray(arr) ? arr : []);
      })
      .catch((e) => {
        if (!active) return;
        setErr(e instanceof Error ? e.message : "Failed to load drafts");
        setDrafts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function newReport() {
    try {
      setCreating(true);
      const id = await createDraftRecord();
      navigate(`/annotate/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create draft";
      // eslint-disable-next-line no-alert
      alert(msg);
      setCreating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your reports</h1>
        <button
          type="button"
          className="px-3 py-2 border rounded disabled:opacity-50"
          onClick={newReport}
          disabled={creating}
          aria-busy={creating || undefined}
        >
          {creating ? "Creating…" : "New report"}
        </button>
      </div>

      <div aria-live="polite" className="min-h-[1.5rem]">
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {!loading && err && <div className="text-sm text-red-600">{err}</div>}
      </div>

      {!loading && !err && (drafts.length === 0 ? (
        <div className="text-sm text-gray-500">No drafts yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              onDeleted={(id) => setDrafts((cur) => cur.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
