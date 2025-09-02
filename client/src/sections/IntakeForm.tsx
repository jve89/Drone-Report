import { useState } from "react";
import { createDraftRecord } from "../lib/api";

type IntakeContact = {
  project: string;
  company: string;
  email: string;
};

export default function IntakeForm() {
  const [contact, setContact] = useState<IntakeContact>({
    project: "",
    company: "",
    email: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const project = contact.project.trim();
    const company = contact.company.trim();
    const email = contact.email.trim();

    if (!project || !email) {
      setErr("Project and Email are required.");
      return;
    }

    try {
      setBusy(true);
      const draftId = await createDraftRecord({ contact: { project, company, email } });
      window.location.href = `/annotate/${encodeURIComponent(draftId)}`;
    } catch (e: any) {
      setErr(e?.message || "Failed to create draft.");
      setBusy(false);
    }
  };

  return (
    <section id="intake" className="py-10">
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-2xl font-semibold mb-4">Create report</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Project<span className="text-red-600">*</span></label>
            <input
              className="w-full border rounded px-2 py-1"
              value={contact.project}
              onChange={(e) => setContact((s) => ({ ...s, project: e.target.value }))}
              placeholder="Project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Company</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={contact.company}
              onChange={(e) => setContact((s) => ({ ...s, company: e.target.value }))}
              placeholder="Company (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email<span className="text-red-600">*</span></label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={contact.email}
              onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start annotation"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          Media, branding, and other details move to the annotation flow.
        </p>
      </div>
    </section>
  );
}
