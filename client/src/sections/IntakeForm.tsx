import { useEffect, useState } from "react";
import { createDraftRecord } from "../lib/api";
import { initUploadcare, pickSingle, pickMultiple } from "../lib/uploadcare";

type InspectionType = "General" | "Roof" | "Facade" | "Solar" | "Insurance" | "Progress" | "Other";

type ImageItem = { url: string; filename?: string; thumb?: string; note?: string };
type VideoItem = { url: string; filename?: string; thumb?: string };

type FormState = {
  scope?: { types?: string[] };
  contact?: { email?: string; project?: string; company?: string; name?: string; phone?: string };
  inspection?: { date?: string };
  site?: { address?: string; country?: string; mapImageUrl?: string };
  branding?: { color?: string; logoUrl?: string };
  equipment?: { drone?: { manufacturer?: string; model?: string; type?: string } };
  flight?: { type?: "Manual" | "Automated"; altitudeMinM?: number; altitudeMaxM?: number; airtimeMin?: number; crewCount?: number };
  weather?: { tempC?: number; windMs?: number; precip?: string; cloud?: string };
  constraints?: { heightLimitM?: number };
  areas?: string[];
  summary?: { condition?: string; urgency?: string; topIssues?: string[] };
  findings?: Array<{ area?: string; defect?: string; severity?: string; recommendation?: string; note?: string; imageRefs?: string[] }>;
  media: { images: ImageItem[]; videos?: VideoItem[] };
  preparedBy?: { name?: string; company?: string; credentials?: string };
  compliance?: { insuranceConfirmed?: boolean; omRef?: string; evidenceRef?: string; eventsNote?: string };
  notes?: string;
};

const TYPES: InspectionType[] = ["General","Roof","Facade","Solar","Insurance","Progress","Other"];

const initialState: FormState = {
  scope: { types: ["General"] },
  contact: { email: "", project: "", company: "" },
  inspection: { date: "" },
  site: {},
  branding: {},
  media: { images: [] },
};

export default function IntakeForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { initUploadcare(); }, []);

  const onPickLogo = async () => {
    const url = await pickSingle();
    if (!url) return;
    setState(s => ({ ...s, branding: { ...(s.branding || {}), logoUrl: url } }));
  };

  const onPickMap = async () => {
    const url = await pickSingle();
    if (!url) return;
    setState(s => ({ ...s, site: { ...(s.site || {}), mapImageUrl: url } }));
  };

  const onPickMedia = async () => {
    const files = await pickMultiple(200);
    const valid = files.filter(f => /^https?:\/\//i.test(f.url));
    if (!valid.length) return;
    setState(s => ({ ...s, media: { images: [...(s.media.images || []), ...valid].slice(0, 200) } }));
  };

  const onRemoveImage = (idx: number) => {
    setState(s => {
      const next = [...(s.media.images || [])];
      next.splice(idx, 1);
      return { ...s, media: { images: next } };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      setBusy(true);
      const payload = cleanEmpty(state);
      const draftId = await createDraftRecord(payload);
      window.location.href = `/annotate/${encodeURIComponent(draftId)}`;
    } catch (e: any) {
      setErr(e?.message || "Failed to start draft.");
      setBusy(false);
    }
  };

  return (
    <section id="intake" className="py-10">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl font-semibold mb-4">Create report</h2>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Inspection type */}
          <div className="flex items-center gap-3">
            <label className="font-medium">Inspection type</label>
            <select
              className="border rounded px-2 py-1"
              value={state.scope?.types?.[0] || "General"}
              onChange={(e) => {
                const v = e.target.value as InspectionType;
                setState(s => ({ ...s, scope: { types: [v] } }));
              }}
            >
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-sm text-gray-500">Affects framing later.</span>
          </div>

          {/* Contact (optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Project</label>
              <input className="w-full border rounded px-2 py-1" value={state.contact?.project || ""}
                onChange={(e) => setState(s => ({ ...s, contact: { ...(s.contact || {}), project: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Company</label>
              <input className="w-full border rounded px-2 py-1" value={state.contact?.company || ""}
                onChange={(e) => setState(s => ({ ...s, contact: { ...(s.contact || {}), company: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input className="w-full border rounded px-2 py-1" type="email" value={state.contact?.email || ""}
                onChange={(e) => setState(s => ({ ...s, contact: { ...(s.contact || {}), email: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Inspection date</label>
              <input className="w-full border rounded px-2 py-1" type="date" value={state.inspection?.date || ""}
                onChange={(e) => setState(s => ({ ...s, inspection: { ...(s.inspection || {}), date: e.target.value } }))} />
            </div>
          </div>

          {/* Branding + Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Brand color (hex)</label>
              <input className="w-full border rounded px-2 py-1" placeholder="#2563EB"
                value={state.branding?.color || ""} onChange={(e) => setState(s => ({ ...s, branding: { ...(s.branding || {}), color: e.target.value } }))} />
              <div className="text-xs text-gray-500 mt-1">Leave empty for default gray.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Upload logo</label>
              <div className="flex items-center gap-2">
                <button type="button" className="border rounded px-2 py-1" onClick={onPickLogo}>Pick logo</button>
                {state.branding?.logoUrl ? <span className="text-xs text-green-700">Selected</span> : <span className="text-xs text-gray-500">Optional</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Site map image</label>
              <div className="flex items-center gap-2">
                <button type="button" className="border rounded px-2 py-1" onClick={onPickMap}>Pick map</button>
                {state.site?.mapImageUrl ? <span className="text-xs text-green-700">Selected</span> : <span className="text-xs text-gray-500">Optional</span>}
              </div>
            </div>
          </div>

          {/* Media */}
          <div>
            <label className="block text-sm font-medium">Media (images; videos later)</label>
            <div className="flex items-center gap-2">
              <button type="button" className="border rounded px-2 py-1" onClick={onPickMedia}>Pick images</button>
              {state.media.images?.length ? <span className="text-xs">{state.media.images.length} selected</span> : <span className="text-xs text-gray-500">Optional</span>}
            </div>

            {state.media.images?.length > 0 && (
              <div className="mt-3 space-y-3">
                {state.media.images.map((img, idx) => (
                  <div key={idx} className="border rounded p-2 grid grid-cols-[96px_1fr] gap-3 items-start">
                    <img src={img.thumb || img.url} alt={img.filename || `image-${idx+1}`} className="w-24 h-18 object-cover border rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600">Filename (override)</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={img.filename || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setState(s => {
                              const next = [...s.media.images];
                              next[idx] = { ...next[idx], filename: v };
                              return { ...s, media: { images: next } };
                            });
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-600">Notes</label>
                        <textarea
                          className="w-full border rounded px-2 py-1 text-sm"
                          rows={3}
                          value={img.note || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setState(s => {
                              const next = [...s.media.images];
                              next[idx] = { ...next[idx], note: v };
                              return { ...s, media: { images: next } };
                            });
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button type="button" className="text-xs text-red-600 underline" onClick={() => onRemoveImage(idx)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          {err && <div className="text-red-600 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start annotation"}
          </button>
        </form>
      </div>
    </section>
  );
}

/** Remove empty strings, empty objects/arrays from payload */
function cleanEmpty<T>(obj: T): T {
  if (obj == null) return obj;
  if (Array.isArray(obj)) {
    const arr = obj.map(cleanEmpty).filter(v => !(v == null || (typeof v === "object" && Object.keys(v as any).length === 0)));
    return arr as unknown as T;
  }
  if (typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === "" || v === undefined || v === null) continue;
      const vv = typeof v === "object" ? cleanEmpty(v as any) : v;
      if (vv === undefined || vv === null) continue;
      if (typeof vv === "object" && !Array.isArray(vv) && Object.keys(vv).length === 0) continue;
      if (Array.isArray(vv) && vv.length === 0) continue;
      out[k] = vv;
    }
    return out as T;
  }
  return obj;
}
