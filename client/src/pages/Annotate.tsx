import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE, getDraft, updateDraft } from "../lib/api";
import "../styles/tailwind.css";

type Image = { id?: string; url: string; thumb?: string; filename?: string; note?: string };
type Region = { id: number; rect: { x:number; y:number; w:number; h:number }; label?: string; note?: string };
type Finding = {
  imageUrl: string;
  severity?: "None"|"Low"|"Medium"|"High"|"Critical";
  issue?: string;
  comment?: string;
  filename?: string;
  notes?: string;
  regions?: Region[];
};
type DraftResponse = {
  id: string;
  status: "draft" | "finalized";
  createdAt: string;
  updatedAt: string;
  payload: {
    media?: { images?: Image[] };
    findings?: Finding[];
    scope?: { types?: string[] };
    contact?: { project?: string; company?: string; email?: string };
    inspection?: { date?: string };
    site?: { address?: string; country?: string; mapImageUrl?: string };
    branding?: { color?: string; logoUrl?: string };
    summary?: { condition?: string; urgency?: string; topIssues?: string[] };
    equipment?: any;
    flight?: any;
    weather?: any;
    risk?: any;
    authorisation?: any;
    operator?: any;
    compliance?: any;
    areas?: string[];
    constraints?: any;
    [k: string]: unknown;
  };
};

const SEVERITIES = ["None", "Low", "Medium", "High", "Critical"] as const;
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const URGENCY = ["None", "Low", "Medium", "High", "Critical"];
const TYPES = ["General", "Roof", "Facade", "Solar", "Insurance", "Progress", "Other"];
const PAGE_SIZE = 1;

type PageKey =
  | "cover" | "summary" | "overview" | "methodology" | "compliance"
  | `detail:${number}` | `appendix:${number}`;

function isDetail(p: PageKey) { return p.startsWith("detail:"); }
function parseIndex(p: PageKey) { const m = /:(\d+)$/.exec(p); return m ? Math.max(1, parseInt(m[1], 10)) : 1; }

export default function Annotate() {
  const { draftId } = useParams<{ draftId: string }>();
  const [data, setData] = useState<DraftResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<PageKey>("cover");
  const [zoom, setZoom] = useState<number>(1);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const regionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!draftId) { setErr("Missing draftId"); setLoading(false); return; }
      try {
        setLoading(true);
        const json = await getDraft(draftId);
        if (!cancel) { setData(json as DraftResponse); setPage("cover"); }
      } catch (e:any) { if (!cancel) setErr(e?.message || "Failed to load draft"); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [draftId]);

  const images = useMemo(() => data?.payload?.media?.images ?? [], [data]);
  const detailCount = images.length;
  const appendixCount = Math.max(1, Math.ceil(images.length / PAGE_SIZE));

  const pages: { key: PageKey; label: string }[] = useMemo(() => {
    const base: { key: PageKey; label: string }[] = [
      { key: "cover", label: "Cover" },
      { key: "summary", label: "Executive summary" },
      { key: "overview", label: "Annotation overview" },
      { key: "methodology", label: "Methodology" },
    ];
    for (let i = 1; i <= detailCount; i++) base.push({ key: `detail:${i}`, label: `Detail ${i}` });
    for (let i = 1; i <= appendixCount; i++) base.push({ key: `appendix:${i}`, label: `Appendix ${i}` });
    base.push({ key: "compliance", label: "Compliance" });
    return base;
  }, [detailCount, appendixCount]);

  const currentImage = useMemo(() => {
    if (!isDetail(page)) return null;
    const idx = parseIndex(page) - 1;
    return images[idx] || null;
  }, [page, images]);

  const currentFinding: Finding = useMemo(() => {
    if (!currentImage) return { imageUrl: "" };
    const f = data?.payload?.findings?.find(x => x.imageUrl === currentImage.url);
    return f || { imageUrl: currentImage.url, severity: "None", issue: "", comment: "", regions: [] };
  }, [data, currentImage]);

  /* Preview URL + reload on page change */
  const previewSrc = draftId
    ? `${API_BASE}/api/drafts/${encodeURIComponent(draftId)}/preview?page=${encodeURIComponent(page)}`
    : "";
  useEffect(() => { if (iframeRef.current) iframeRef.current.src = previewSrc + `&t=${Date.now()}`; }, [page, draftId]);

  /* Receive clicks from preview */
  useEffect(() => {
    function onMsg(ev: MessageEvent){
      const msg = ev.data || {};
      if (msg.type === "dr.select") {
        if (msg.page) setPage(msg.page as PageKey);
        if (msg.regionId && typeof msg.regionId === "number") {
          setTimeout(()=>{
            const el = regionRefs.current[msg.regionId];
            el?.scrollIntoView({behavior:"smooth", block:"center"});
            el?.classList.add("ring", "ring-blue-400");
            setTimeout(()=>el?.classList.remove("ring", "ring-blue-400"), 800);
          }, 50);
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* Save helpers */
  const refreshPreview = () => { if (iframeRef.current) iframeRef.current.src = previewSrc + `&t=${Date.now()}`; };

  const saveNested = async (updater: (cur: DraftResponse["payload"]) => DraftResponse["payload"]) => {
    if (!draftId || !data) return;
    const nextPayload = updater(data.payload);
    const next = { ...data, payload: nextPayload };
    setData(next);
    try { await updateDraft(draftId, nextPayload); refreshPreview(); } catch (e) { console.error(e); }
  };
  const saveFinding = async (patch: Partial<Finding>) => {
    if (!draftId || !data || !currentImage) return;
    const existing = data.payload.findings || [];
    const nextFindings = existing.some(f => f.imageUrl === currentImage.url)
      ? existing.map(f => f.imageUrl === currentImage.url ? { ...f, ...patch } : f)
      : [...existing, { imageUrl: currentImage.url, ...patch }];
    await saveNested(cur => ({ ...cur, findings: nextFindings }));
  };

  /* Toolbar nav */
  const idx = pages.findIndex(p => p.key === page);
  const go = (delta: number) => {
    const n = Math.min(pages.length - 1, Math.max(0, idx + delta));
    setPage(pages[n].key);
  };

  /* Panels */
  const RightPanel = () => {
    if (!data) return null;

    if (page === "cover") {
      const contact = data.payload.contact || {};
      const scope = data.payload.scope || {};
      const inspection = data.payload.inspection || {};
      const site = data.payload.site || {};
      const branding = data.payload.branding || {};
      return (
        <aside className="border rounded p-4 bg-white h-max sticky top-4">
          <h2 className="text-sm font-semibold mb-3">Cover</h2>
          <Labeled label="Project">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={contact.project || ""}
                   onChange={e => saveNested(cur => ({ ...cur, contact: { ...(cur.contact || {}), project: e.target.value } }))} />
          </Labeled>
          <Labeled label="Company">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={contact.company || ""}
                   onChange={e => saveNested(cur => ({ ...cur, contact: { ...(cur.contact || {}), company: e.target.value } }))} />
          </Labeled>
          <Labeled label="Date">
            <input type="date" className="w-full border rounded px-2 py-1 text-sm"
                   value={inspection.date || ""}
                   onChange={e => saveNested(cur => ({ ...cur, inspection: { ...(cur.inspection || {}), date: e.target.value } }))} />
          </Labeled>
          <Labeled label="Location">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={site.address || ""}
                   onChange={e => saveNested(cur => ({ ...cur, site: { ...(cur.site || {}), address: e.target.value } }))} />
          </Labeled>
          <Labeled label="Inspection type">
            <select className="w-full border rounded px-2 py-1 text-sm"
                    value={(scope.types && scope.types[0]) || "General"}
                    onChange={e => saveNested(cur => ({ ...cur, scope: { types: [e.target.value] } }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Labeled>
          <Labeled label="Logo URL">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={branding.logoUrl || ""}
                   onChange={e => saveNested(cur => ({ ...cur, branding: { ...(cur.branding || {}), logoUrl: e.target.value } }))} />
          </Labeled>
          <Labeled label="Theme color (hex)">
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="#6B7280"
                   value={branding.color || ""}
                   onChange={e => saveNested(cur => ({ ...cur, branding: { ...(cur.branding || {}), color: e.target.value } }))} />
          </Labeled>
        </aside>
      );
    }

    if (page === "summary") {
      const summary = data.payload.summary || {};
      return (
        <aside className="border rounded p-4 bg-white h-max sticky top-4">
          <h2 className="text-sm font-semibold mb-3">Executive summary</h2>
          <Labeled label="Condition">
            <select className="w-full border rounded px-2 py-1 text-sm"
                    value={summary.condition || ""}
                    onChange={e => saveNested(cur => ({ ...cur, summary: { ...(cur.summary || {}), condition: e.target.value } }))}>
              <option value=""></option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Labeled>
          <Labeled label="Urgency">
            <select className="w-full border rounded px-2 py-1 text-sm"
                    value={summary.urgency || ""}
                    onChange={e => saveNested(cur => ({ ...cur, summary: { ...(cur.summary || {}), urgency: e.target.value } }))}>
              <option value=""></option>
              {URGENCY.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Labeled>
          <Labeled label="Top issues">
            <AddList items={summary.topIssues||[]} onAdd={(val)=>saveNested(cur => ({ ...cur, summary: { ...(cur.summary || {}), topIssues: [...(cur.summary?.topIssues||[]), val] } }))}
                     onRemove={(i)=>saveNested(cur => ({ ...cur, summary: { ...(cur.summary || {}), topIssues: (cur.summary?.topIssues||[]).filter((_,j)=>j!==i) } }))} />
          </Labeled>
        </aside>
      );
    }

    if (page === "methodology") {
      const m = data.payload;
      return (
        <aside className="border rounded p-4 bg-white h-max sticky top-4">
          <h2 className="text-sm font-semibold mb-3">Methodology</h2>
          <Labeled label="Scope types (comma separated)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={(m.scope?.types||[]).join(", ")}
                   onChange={e => saveNested(cur => ({ ...cur, scope: { types: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) } }))} />
          </Labeled>
          <Labeled label="Areas (comma separated)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={(m.areas||[]).join(", ")}
                   onChange={e => saveNested(cur => ({ ...cur, areas: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) }))} />
          </Labeled>
          <Labeled label="Site map URL">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={m.site?.mapImageUrl || ""}
                   onChange={e => saveNested(cur => ({ ...cur, site: { ...(cur.site||{}), mapImageUrl: e.target.value } }))} />
          </Labeled>
          <Labeled label="Equipment (free text)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={(m.equipment||"")}
                   onChange={e => saveNested(cur => ({ ...cur, equipment: e.target.value }))} />
          </Labeled>
          <Labeled label="Flight (free text)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={(m.flight||"")}
                   onChange={e => saveNested(cur => ({ ...cur, flight: e.target.value }))} />
          </Labeled>
          <Labeled label="Weather (free text)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={(m.weather||"")}
                   onChange={e => saveNested(cur => ({ ...cur, weather: e.target.value }))} />
          </Labeled>
          <Labeled label="Risk (free text)">
            <textarea className="w-full border rounded px-2 py-1 text-sm" rows={3}
                   value={(m.risk||"")}
                   onChange={e => saveNested(cur => ({ ...cur, risk: e.target.value }))} />
          </Labeled>
          <Labeled label="Authorisation (free text)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={(m.authorisation||"")}
                   onChange={e => saveNested(cur => ({ ...cur, authorisation: e.target.value }))} />
          </Labeled>
        </aside>
      );
    }

    if (page === "compliance") {
      const p = data.payload;
      const operator = p.operator || {};
      const comp = p.compliance || {};
      return (
        <aside className="border rounded p-4 bg-white h-max sticky top-4">
          <h2 className="text-sm font-semibold mb-3">Compliance</h2>
          <Labeled label="Operator name">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={operator.name || ""}
                   onChange={e => saveNested(cur => ({ ...cur, operator: { ...(cur.operator||{}), name: e.target.value } }))} />
          </Labeled>
          <Labeled label="Operator registration">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={operator.registration || ""}
                   onChange={e => saveNested(cur => ({ ...cur, operator: { ...(cur.operator||{}), registration: e.target.value } }))} />
          </Labeled>
          <Labeled label="Responsible contact (free text)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={operator.responsibleContact?.name || ""}
                   onChange={e => saveNested(cur => ({ ...cur, operator: { ...(cur.operator||{}), responsibleContact: { ...(cur.operator?.responsibleContact||{}), name: e.target.value } } }))} />
          </Labeled>
          <Labeled label="Insurance confirmed">
            <select className="w-full border rounded px-2 py-1 text-sm"
                    value={comp.insuranceConfirmed ? "yes":"no"}
                    onChange={e => saveNested(cur => ({ ...cur, compliance: { ...(cur.compliance||{}), insuranceConfirmed: e.target.value==="yes" } }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Labeled>
          <Labeled label="OM ref">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={comp.omRef || ""}
                   onChange={e => saveNested(cur => ({ ...cur, compliance: { ...(cur.compliance||{}), omRef: e.target.value } }))} />
          </Labeled>
          <Labeled label="Evidence ref">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={comp.evidenceRef || ""}
                   onChange={e => saveNested(cur => ({ ...cur, compliance: { ...(cur.compliance||{}), evidenceRef: e.target.value } }))} />
          </Labeled>
          <Labeled label="Events note">
            <textarea className="w-full border rounded px-2 py-1 text-sm" rows={3}
                   value={comp.eventsNote || ""}
                   onChange={e => saveNested(cur => ({ ...cur, compliance: { ...(cur.compliance||{}), eventsNote: e.target.value } }))} />
          </Labeled>
        </aside>
      );
    }

    if (isDetail(page)) {
      const img = currentImage;
      const f = currentFinding;
      const setRegions = (regions: Region[]) => saveFinding({ regions });

      function addRegion() {
        const n = (f.regions?.length || 0) + 1;
        const r: Region = { id:n, rect:{x:0.1,y:0.1,w:0.3,h:0.3}, label:`Region ${n}`, note:"" };
        setRegions([...(f.regions||[]), r]);
      }
      function removeRegion(id:number) {
        const next = (f.regions||[]).filter(r=>r.id!==id).map((r,i)=>({...r,id:i+1}));
        setRegions(next);
      }
      function updateRegion(r: Region) {
        const cur = [...(f.regions||[])];
        const i = cur.findIndex(x=>x.id===r.id);
        if (i>=0) cur[i]=r; else cur.push(r);
        setRegions(cur);
      }

      regionRefs.current = {}; // reset map for this render

      return (
        <aside className="border rounded p-4 bg-white h-max sticky top-4">
          <h2 className="text-sm font-semibold mb-3">Detail</h2>

          <Labeled label="Severity">
            <select className="w-full border rounded px-2 py-1 text-sm"
                    value={f.severity || "None"}
                    onChange={e => saveFinding({ severity: e.target.value as any })}
                    disabled={!img}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Labeled>

          <Labeled label="Issue">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={f.issue || ""}
                   onChange={e => saveFinding({ issue: e.target.value })}
                   disabled={!img} />
          </Labeled>

          <Labeled label="Comment">
            <textarea className="w-full border rounded px-2 py-1 text-sm" rows={4}
                      value={f.comment || ""}
                      onChange={e => saveFinding({ comment: e.target.value })}
                      disabled={!img} />
          </Labeled>

          <hr className="my-3" />

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Zoom regions <span className="text-gray-500">({f.regions?.length||0}/3 per page)</span></div>
            <button type="button" className="border rounded px-2 py-1 text-sm" onClick={addRegion}>+ Add region</button>
          </div>

          {(f.regions||[]).map(r=>(
            <div key={r.id} ref={el => (regionRefs.current[r.id] = el)} className="border rounded p-2 mb-2">
              <div className="flex items-center justify-between mb-1">
                <strong>#{r.id}</strong>
                <button type="button" className="border rounded px-2 py-1 text-xs" onClick={()=>removeRegion(r.id)}>Delete</button>
              </div>
              <Labeled label="Label">
                <input className="w-full border rounded px-2 py-1 text-sm" value={r.label||""} onChange={e=>updateRegion({...r,label:e.target.value})}/>
              </Labeled>
              <Labeled label="Note">
                <textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} value={r.note||""} onChange={e=>updateRegion({...r,note:e.target.value})}/>
              </Labeled>
              <div className="grid grid-cols-4 gap-2">
                <Num label="x" value={r.rect.x} onChange={v=>updateRegion({...r, rect:{...r.rect,x:v}})} />
                <Num label="y" value={r.rect.y} onChange={v=>updateRegion({...r, rect:{...r.rect,y:v}})} />
                <Num label="w" value={r.rect.w} onChange={v=>updateRegion({...r, rect:{...r.rect,w:v}})} />
                <Num label="h" value={r.rect.h} onChange={v=>updateRegion({...r, rect:{...r.rect,h:v}})} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Values are normalized 0–1 relative to the original image.</p>
            </div>
          ))}
          <p className="text-xs text-gray-500">More than 3 regions will continue on “Detail (cont.)” pages automatically.</p>
        </aside>
      );
    }

    return (
      <aside className="border rounded p-4 bg-white h-max sticky top-4">
        <h2 className="text-sm font-semibold mb-3">Page settings</h2>
        <p className="text-xs text-gray-500">This page has no editable fields.</p>
      </aside>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Editor</h1>
            <p className="text-sm text-gray-500">
              Draft <span className="font-mono">{draftId}</span>
              {data ? <> · {data.status} · {new Date(data.updatedAt).toLocaleString()}</> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-2 py-1" onClick={() => {
              const i = pages.findIndex(p => p.key === page);
              const n = Math.max(0, i - 1);
              setPage(pages[n].key);
            }} disabled={pages.findIndex(p => p.key === page) <= 0}>Prev</button>

            <select className="border rounded px-2 py-1 text-sm" value={page} onChange={e => setPage(e.target.value as PageKey)}>
              {pages.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>

            <button className="border rounded px-2 py-1" onClick={() => {
              const i = pages.findIndex(p => p.key === page);
              const n = Math.min(pages.length - 1, i + 1);
              setPage(pages[n].key);
            }} disabled={pages.findIndex(p => p.key === page) >= pages.length - 1}>Next</button>

            <div className="ml-4 flex items-center gap-2">
              <button className="border rounded px-2 py-1" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>−</button>
              <div className="w-16 text-center text-sm">{Math.round(zoom * 100)}%</div>
              <button className="border rounded px-2 py-1" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 p-4">
        <div className="flex items-start justify-center">
          {loading && <div className="rounded border p-6 text-gray-500">Loading…</div>}
          {err && <div className="rounded border p-6 text-red-600">Error: {err}</div>}
          {!loading && !err && (
            <div className="border rounded shadow-sm overflow-hidden bg-white" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <iframe ref={iframeRef} title="preview" src={previewSrc} className="w-[900px] h-[1200px] bg-white" />
            </div>
          )}
        </div>
        <RightPanel />
      </main>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
function AddList({ items, onAdd, onRemove }:{items:string[]; onAdd:(v:string)=>void; onRemove:(i:number)=>void;}){
  const [val,setVal]=useState("");
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className="flex-1 border rounded px-2 py-1 text-sm" value={val} onChange={e=>setVal(e.target.value)} />
        <button type="button" className="border rounded px-2 py-1 text-sm"
                onClick={()=>{ if(!val.trim())return; onAdd(val.trim()); setVal(""); }}>Add</button>
      </div>
      {items.length>0 && (
        <ul className="space-y-1">
          {items.map((it,i)=>(
            <li key={i} className="flex justify-between items-center text-sm">
              <span className="truncate">{it}</span>
              <button type="button" className="text-red-600 text-xs underline" onClick={()=>onRemove(i)}>remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
function Num({label, value, onChange}:{label:string; value:number; onChange:(v:number)=>void;}){
  return (
    <label className="grid gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      <input type="number" step={0.01} min={0} max={1}
             className="w-full border rounded px-2 py-1 text-sm"
             value={value}
             onChange={e=>onChange(parseFloat(e.target.value))}/>
    </label>
  );
}
