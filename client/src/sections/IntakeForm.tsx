import { useEffect, useMemo, useState } from "react";
import { createDraft } from "../lib/api";
import { initUploadcare, pickSingle, pickMultiple } from "../lib/uploadcare";

type Mode = "easy" | "advanced";

type ImageItem = { url: string; filename?: string; thumb?: string };
type VideoItem = { url: string; filename?: string; thumb?: string };

type FormState = {
  mode: Mode;
  contact: { email: string; project: string; company: string; name?: string; phone?: string };
  inspection: { date: string };
  site: { address?: string; country?: string; mapImageUrl?: string };
  branding: { color?: string; logoUrl?: string };
  equipment?: { drone?: { manufacturer?: string; model?: string; type?: string } };
  flight?: { type?: "Manual" | "Automated"; altitudeMinM?: number; altitudeMaxM?: number; airtimeMin?: number; crewCount?: number };
  weather?: { tempC?: number; windMs?: number; precip?: string; cloud?: string };
  constraints?: { heightLimitM?: number };
  scope?: { types?: string[] };
  areas?: string[];
  summary?: { condition?: string; urgency?: string; topIssues?: string[] };
  findings?: Array<{ area: string; defect: string; severity?: string; recommendation?: string; note?: string; imageRefs?: string[] }>;
  media: { images: ImageItem[]; videos?: VideoItem[] };
  preparedBy?: { name?: string; company?: string; credentials?: string };
  compliance?: { insuranceConfirmed?: boolean; omRef?: string; evidenceRef?: string; eventsNote?: string };
  notes?: string;
};

const initialState: FormState = {
  mode: "easy",
  contact: { email: "", project: "", company: "" },
  inspection: { date: "" },
  site: {},
  branding: {},
  media: { images: [] },
};

function requiredEasy(s: FormState): string[] {
  const m: string[] = [];
  if (!s.contact.project) m.push("Project");
  if (!s.contact.company) m.push("Company");
  if (!s.contact.email) m.push("Email");
  if (!s.inspection.date) m.push("Inspection date");
  if (!s.media.images || s.media.images.length < 1) m.push("At least 1 image");
  return m;
}

function requiredAdvanced(s: FormState): string[] {
  const m = requiredEasy(s);
  if (!s.site.address) m.push("Site address");
  if (!s.equipment?.drone?.manufacturer) m.push("Drone manufacturer");
  if (!s.equipment?.drone?.model) m.push("Drone model");
  if (!s.scope?.types || s.scope.types.length < 1) m.push("Scope type");
  if (!s.areas || s.areas.length < 1) m.push("At least 1 area");
  if (!s.constraints?.heightLimitM && s.constraints?.heightLimitM !== 0) m.push("Height limit");
  if (!s.preparedBy?.name) m.push("Prepared by name");
  return m;
}

export default function IntakeForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => { initUploadcare(); }, []);

  const missing = useMemo(() => {
    return state.mode === "easy" ? requiredEasy(state) : requiredAdvanced(state);
  }, [state]);

  const onPickLogo = async () => {
    const url = await pickSingle();
    if (!url) return;
    setState(s => ({ ...s, branding: { ...s.branding, logoUrl: url } }));
  };

  const onPickMap = async () => {
    const url = await pickSingle();
    if (!url) return;
    setState(s => ({ ...s, site: { ...(s.site || {}), mapImageUrl: url } }));
  };

  const onPickMedia = async () => {
    const files = await pickMultiple(200);
    if (!files?.length) return;
    setState(s => ({ ...s, media: { images: files.slice(0, 200) } }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null);
    const miss = missing;
    if (miss.length) { setErr("Missing: " + miss.join(", ")); return; }
    try {
      setBusy(true);
      const blob = await createDraft(state);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.contact.project || "report"}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setOk("PDF downloaded.");
    } catch (e: any) {
      setErr(e?.message || "Failed to create draft.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="intake" className="py-10">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl font-semibold mb-4">Create report</h2>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <label className="font-medium">Mode</label>
            <select
              className="border rounded px-2 py-1"
              value={state.mode}
              onChange={(e) => setState(s => ({ ...s, mode: e.target.value as Mode }))}
            >
              <option value="easy">Easy</option>
              <option value="advanced">Advanced</option>
            </select>
            <span className="text-sm text-gray-500">
              Advanced pre-fills more sections. Skeleton is identical.
            </span>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Project*</label>
              <input className="w-full border rounded px-2 py-1" value={state.contact.project}
                onChange={(e) => setState(s => ({ ...s, contact: { ...s.contact, project: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Company*</label>
              <input className="w-full border rounded px-2 py-1" value={state.contact.company}
                onChange={(e) => setState(s => ({ ...s, contact: { ...s.contact, company: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Email*</label>
              <input className="w-full border rounded px-2 py-1" type="email" value={state.contact.email}
                onChange={(e) => setState(s => ({ ...s, contact: { ...s.contact, email: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Inspection date*</label>
              <input className="w-full border rounded px-2 py-1" type="date" value={state.inspection.date}
                onChange={(e) => setState(s => ({ ...s, inspection: { ...s.inspection, date: e.target.value } }))} />
            </div>
          </div>

          {/* Branding + Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Brand color (hex)</label>
              <input className="w-full border rounded px-2 py-1" placeholder="#2563EB"
                value={state.branding.color || ""} onChange={(e) => setState(s => ({ ...s, branding: { ...s.branding, color: e.target.value } }))} />
              <div className="text-xs text-gray-500 mt-1">Leave empty for default gray.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Upload logo</label>
              <div className="flex items-center gap-2">
                <button type="button" className="border rounded px-2 py-1" onClick={onPickLogo}>Pick logo</button>
                {state.branding.logoUrl ? <span className="text-xs text-green-700">Selected</span> : <span className="text-xs text-gray-500">Optional</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Site map image</label>
              <div className="flex items-center gap-2">
                <button type="button" className="border rounded px-2 py-1" onClick={onPickMap}>Pick map</button>
                {state.site.mapImageUrl ? <span className="text-xs text-green-700">Selected</span> : <span className="text-xs text-gray-500">Optional</span>}
              </div>
            </div>
          </div>

          {/* Advanced-only fields */}
          {state.mode === "advanced" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Site address*</label>
                  <input className="w-full border rounded px-2 py-1" value={state.site.address || ""}
                    onChange={(e) => setState(s => ({ ...s, site: { ...s.site, address: e.target.value } }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Drone manufacturer*</label>
                  <input className="w-full border rounded px-2 py-1" value={state.equipment?.drone?.manufacturer || ""}
                    onChange={(e) => setState(s => ({ ...s, equipment: { ...(s.equipment || {}), drone: { ...(s.equipment?.drone || {}), manufacturer: e.target.value } } }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Drone model*</label>
                  <input className="w-full border rounded px-2 py-1" value={state.equipment?.drone?.model || ""}
                    onChange={(e) => setState(s => ({ ...s, equipment: { ...(s.equipment || {}), drone: { ...(s.equipment?.drone || {}), model: e.target.value } } }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Height limit (m)*</label>
                  <input className="w-full border rounded px-2 py-1" type="number" value={state.constraints?.heightLimitM ?? ""}
                    onChange={(e) => setState(s => ({ ...s, constraints: { ...(s.constraints || {}), heightLimitM: Number(e.target.value) } }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Prepared by*</label>
                  <input className="w-full border rounded px-2 py-1" value={state.preparedBy?.name || ""}
                    onChange={(e) => setState(s => ({ ...s, preparedBy: { ...(s.preparedBy || {}), name: e.target.value } }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Scope types*</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Roof","Facade","Solar","Insurance","Progress","Other"].map(t => (
                    <label key={t} className="inline-flex items-center gap-1 text-sm border px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={!!state.scope?.types?.includes(t)}
                        onChange={(e) => setState(s => {
                          const curr = new Set(s.scope?.types || []);
                          e.target.checked ? curr.add(t) : curr.delete(t);
                          return { ...s, scope: { types: [...curr] } };
                        })}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Areas*</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Comma-separated, e.g. Roof North, Roof South"
                  value={(state.areas || []).join(", ")}
                  onChange={(e) => setState(s => ({ ...s, areas: e.target.value.split(",").map(v => v.trim()).filter(Boolean) }))}
                />
              </div>
            </>
          )}

          {/* Media */}
          <div>
            <label className="block text-sm font-medium">Media* (images; videos later)</label>
            <button type="button" className="border rounded px-2 py-1" onClick={onPickMedia}>Pick images</button>
            <div className="text-xs text-gray-500 mt-1">
              Up to 200 images. Videos are listed in the PDF when added later.
            </div>
            {state.media.images?.length ? (
              <div className="text-xs mt-1">{state.media.images.length} selected</div>
            ) : null}
          </div>

          {/* Status */}
          {err && <div className="text-red-600 text-sm">{err}</div>}
          {ok && <div className="text-green-700 text-sm">{ok}</div>}

          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {busy ? "Generating…" : "Create PDF draft"}
          </button>
        </form>
      </div>
    </section>
  );
}
