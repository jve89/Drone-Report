import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE, getDraft, updateDraft } from "../lib/api";

type Image = { id?: string; url: string; thumb?: string; filename?: string; note?: string };
type Finding = { imageUrl: string; severity?: string; issue?: string; comment?: string };
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
    [k: string]: unknown;
  };
};

const SEVERITIES = ["None", "Low", "Medium", "High", "Critical"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const URGENCY = ["None", "Low", "Medium", "High", "Critical"];
const TYPES = ["General", "Roof", "Facade", "Solar", "Insurance", "Progress", "Other"];
const PAGE_SIZE = 1; // appendix/detail grouping aligned with server

type PageKey =
  | "cover" | "summary" | "overview" | "methodology" | "compliance"
  | `detail:${number}` | `appendix:${number}`;

function isDetail(p: PageKey) { return p.startsWith("detail:"); }
function isAppendix(p: PageKey) { return p.startsWith("appendix:"); }
function parseIndex(p: PageKey) {
  const m = /:(\d+)$/.exec(p);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

export default function Annotate() {
  const { draftId } = useParams<{ draftId: string }>();
  const [data, setData] = useState<DraftResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<PageKey>("cover");
  const [zoom, setZoom] = useState<number>(1);
  const [newIssue, setNewIssue] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancel = false;
    async function run() {
      if (!draftId) { setErr("Missing draftId"); setLoading(false); return; }
      try {
        setLoading(true);
        const json = await getDraft(draftId);
        if (!cancel) {
          setData(json as DraftResponse);
          // default to cover on first load
          setPage("cover");
        }
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Failed to load draft");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    run();
    return () => { cancel = true; };
  }, [draftId]);

  const images = useMemo(() => data?.payload?.media?.images ?? [], [data]);
  const detailCount = images.length;
  const appendixCount = Math.max(1, Math.ceil(images.length / PAGE_SIZE));

  // Build page list
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

  // Current image for detail page
  const currentImage = useMemo(() => {
    if (!isDetail(page)) return null;
    const idx = parseIndex(page) - 1;
    return images[idx] || null;
  }, [page, images]);

  const currentFinding: Finding = useMemo(() => {
    if (!currentImage) return { imageUrl: "" };
    const f = data?.payload?.findings?.find(x => x.imageUrl === currentImage.url);
    return f || { imageUrl: currentImage.url, severity: "None", issue: "", comment: "" };
  }, [data, currentImage]);

  const refreshPreview = () => {
    if (!draftId) return;
    if (!iframeRef.current) return;
    const src = `${API_BASE}/api/drafts/${encodeURIComponent(draftId)}/preview?page=${encodeURIComponent(page)}`;
    iframeRef.current.src = src + `&t=${Date.now()}`;
  };

  useEffect(() => { refreshPreview(); /* refresh on page switch */ }, [page, draftId]);

  // ---- Save helpers ----
  const savePatch = async (patch: any) => {
    if (!draftId || !data) return;
    const next = { ...data, payload: { ...data.payload, ...patch } };
    setData(next);
    try { await updateDraft(draftId, patch); refreshPreview(); } catch (e) { console.error(e); }
  };

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
    await savePatch({ findings: nextFindings });
  };

  const saveImageMeta = async (imgPatch: Partial<Image>) => {
    if (!draftId || !data || !currentImage) return;
    const nextImages = (data.payload.media?.images || []).map(i => i.url === currentImage.url ? { ...i, ...imgPatch } : i);
    await saveNested((cur) => ({ ...cur, media: { ...(cur.media || {}), images: nextImages } }));
  };

  // ---- Toolbar navigation ----
  const idx = pages.findIndex(p => p.key === page);
  const go = (delta: number) => {
    const n = Math.min(pages.length - 1, Math.max(0, idx + delta));
    setPage(pages[n].key);
  };

  // ---- Preview source ----
  const previewSrc = draftId
    ? `${API_BASE}/api/drafts/${encodeURIComponent(draftId)}/preview?page=${encodeURIComponent(page)}`
    : "";

  // ---- Right panel forms per page ----
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
      const topIssues = summary.topIssues || [];
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
            <div className="flex gap-2 mb-2">
              <input className="flex-1 border rounded px-2 py-1 text-sm" value={newIssue} onChange={e => setNewIssue(e.target.value)} />
              <button type="button" className="border rounded px-2 py-1 text-sm"
                      onClick={() => {
                        if (!newIssue.trim()) return;
                        const nextIssues = [...topIssues, newIssue.trim()].slice(0, 20);
                        setNewIssue("");
                        saveNested(cur => ({ ...cur, summary: { ...(cur.summary || {}), topIssues: nextIssues } }));
                      }}>Add</button>
            </div>
            {topIssues.length > 0 && (
              <ul className="space-y-1">
                {topIssues.map((it, i) => (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <span className="truncate">{it}</span>
                    <button type="button" className="text-red-600 text-xs underline"
                            onClick={() => {
                              const nextIssues = topIssues.filter((_, j) => j !== i);
                              saveNested(cur => ({ ...cur, summary: { ...(cur.summary || {}), topIssues: nextIssues } }));
                            }}>remove</button>
                  </li>
                ))}
              </ul>
            )}
          </Labeled>
        </aside>
      );
    }

    if (isDetail(page)) {
      return (
        <aside className="border rounded p-4 bg-white h-max sticky top-4">
          <h2 className="text-sm font-semibold mb-3">Detail</h2>

          <Labeled label="Severity">
            <select className="w-full border rounded px-2 py-1 text-sm"
                    value={currentFinding.severity || "None"}
                    onChange={e => saveFinding({ severity: e.target.value })}
                    disabled={!currentImage}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Labeled>

          <Labeled label="Issue">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={currentFinding.issue || ""}
                   onChange={e => saveFinding({ issue: e.target.value })}
                   disabled={!currentImage} />
          </Labeled>

          <Labeled label="Comment">
            <textarea className="w-full border rounded px-2 py-1 text-sm" rows={4}
                      value={currentFinding.comment || ""}
                      onChange={e => saveFinding({ comment: e.target.value })}
                      disabled={!currentImage} />
          </Labeled>

          <hr className="my-3" />

          <Labeled label="Filename (override)">
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={currentImage?.filename || ""}
                   onChange={e => saveImageMeta({ filename: e.target.value })}
                   disabled={!currentImage} />
          </Labeled>

          <Labeled label="Notes">
            <textarea className="w-full border rounded px-2 py-1 text-sm" rows={3}
                      value={currentImage?.note || ""}
                      onChange={e => saveImageMeta({ note: e.target.value })}
                      disabled={!currentImage} />
          </Labeled>
        </aside>
      );
    }

    // Overview / Methodology / Appendix / Compliance – editing coming next
    return (
      <aside className="border rounded p-4 bg-white h-max sticky top-4">
        <h2 className="text-sm font-semibold mb-3">Page settings</h2>
        <p className="text-xs text-gray-500">Editing for this page type will be added next.</p>
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
            <button className="border rounded px-2 py-1" onClick={() => go(-1)} disabled={idx <= 0}>Prev</button>
            <select className="border rounded px-2 py-1 text-sm" value={page} onChange={e => setPage(e.target.value as PageKey)}>
              {pages.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button className="border rounded px-2 py-1" onClick={() => go(1)} disabled={idx >= pages.length - 1}>Next</button>

            <div className="ml-4 flex items-center gap-2">
              <button className="border rounded px-2 py-1" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>−</button>
              <div className="w-16 text-center text-sm">{Math.round(zoom * 100)}%</div>
              <button className="border rounded px-2 py-1" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 p-4">
        {/* Centered page preview */}
        <div className="flex items-start justify-center">
          {loading && <div className="rounded border p-6 text-gray-500">Loading…</div>}
          {err && <div className="rounded border p-6 text-red-600">Error: {err}</div>}
          {!loading && !err && (
            <div className="border rounded shadow-sm overflow-hidden bg-white" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <iframe
                ref={iframeRef}
                title="preview"
                src={previewSrc}
                className="w-[900px] h-[1200px] bg-white"
              />
            </div>
          )}
        </div>

        {/* Right drawer */}
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
