import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

type DraftRow = { id: string; updated_at: string; status: string; };

export default function Dashboard() {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/drafts?mine=1`, { credentials: "include" });
        if (!res.ok) throw new Error(`List failed: ${res.status}`);
        const json = await res.json();
        setRows(json.items || []);
      } catch (e:any) {
        setErr(e?.message || "Failed to load drafts");
      }
    })();
  }, []);

  async function newDraft() {
    const res = await fetch(`${API_BASE}/api/drafts`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: "{}" });
    if (!res.ok) return alert("Failed to create draft");
    const { draftId } = await res.json();
    window.location.href = `/annotate/${draftId}`;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Your drafts</h1>
        <button className="bg-black text-white px-3 py-2 rounded" onClick={newDraft}>New draft</button>
      </div>
      {err && <div className="text-red-600 mb-3">{err}</div>}
      <ul className="divide-y border rounded">
        {rows.map(r => (
          <li key={r.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-sm">{r.id}</div>
              <div className="text-xs text-gray-500">{new Date(r.updated_at).toLocaleString()}</div>
            </div>
            <a href={`/annotate/${r.id}`} className="underline">Open</a>
          </li>
        ))}
        {rows.length === 0 && <li className="p-4 text-gray-500 text-sm">No drafts yet.</li>}
      </ul>
    </div>
  );
}
