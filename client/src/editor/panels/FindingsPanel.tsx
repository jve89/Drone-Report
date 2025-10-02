// client/src/editor/panels/FindingsPanel.tsx
import { useMemo, useState } from "react";
import { useEditor, type Finding } from "../../state/editor";
import Annotator, { type Annotation as BoxAnn } from "../annotations/Annotator";

type MediaItem = { id: string; url: string; kind?: string; filename?: string; thumb?: string };

function fmtTags(tags?: string[]) { return (tags ?? []).join(", "); }
function parseTags(input: string) {
  return (input || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export default function FindingsPanel() {
  const {
    draft,
    findings,
    createFindingsFromPhotos,
    updateFinding,
    deleteFinding,
    reindexAnnotations,
    saveDebounced,
  } = useEditor();

  const media: MediaItem[] = Array.isArray(draft?.media) ? (draft!.media as MediaItem[]) : [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [annotateFor, setAnnotateFor] = useState<{ findingId: string } | null>(null);

  const list = useMemo(
    () => [...(findings || [])].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
    [findings]
  );

  function togglePick(id: string) { setSelected((s) => ({ ...s, [id]: !s[id] })); }
  function closePicker() { setPickerOpen(false); setSelected({}); }
  function commitBatchCreate() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    createFindingsFromPhotos(ids);
    saveDebounced?.();
    closePicker();
  }

  function photoById(id?: string) { return id ? media.find((m) => m.id === id) : undefined; }

  // All annotations per photo for ghost rendering (always return an array)
  function allAnnForPhoto(photoId: string): BoxAnn[] {
    return (findings || [])
      .filter((f: any) => f.photoId === photoId)
      .flatMap((f: any) => (Array.isArray(f.annotations) ? (f.annotations as unknown as BoxAnn[]) : []));
  }

  if (!draft) return null;

  return (
    <div className="text-sm">
      {/* Header actions */}
      <div className="flex items-center gap-2 px-2 py-1">
        <button className="px-2 py-1 border rounded" onClick={() => setPickerOpen(true)}>
          New from photos
        </button>
        <div className="ml-auto text-xs text-gray-500">{(findings || []).length} total</div>
      </div>

      {/* Photo picker */}
      {pickerOpen && (
        <div className="p-2 border-t">
          <div className="text-xs text-gray-600 mb-2">Select photos to create findings</div>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-auto">
            {media.map((m) => {
              const checked = !!selected[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => togglePick(m.id)}
                  className={`relative border rounded overflow-hidden ${checked ? "ring-2 ring-blue-500" : ""}`}
                  title={m.filename || m.id}
                  aria-pressed={checked}
                >
                  <img src={m.thumb || m.url} className="w-full h-20 object-cover" alt={m.filename || "photo"} />
                  {checked && (
                    <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1 rounded">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              className="px-2 py-1 border rounded text-xs disabled:opacity-50"
              onClick={commitBatchCreate}
              disabled={!Object.values(selected).some(Boolean)}
            >
              Create findings
            </button>
            <button className="px-2 py-1 border rounded text-xs" onClick={closePicker}>Cancel</button>
            <div className="text-xs text-gray-500 ml-auto">
              {Object.values(selected).filter(Boolean).length} selected
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="p-2 text-gray-600">
          No findings yet.
          <div className="text-xs text-gray-500 mt-1">
            Use <span className="font-medium">New from photos</span> to create one per selected photo.
          </div>
        </div>
      ) : (
        <ul className="divide-y">
          {list.map((f) => (
            <FindingRow
              key={f.id}
              finding={f as Finding}
              media={media}
              onAnnotate={() => setAnnotateFor({ findingId: f.id })}
              onChange={(patch) => { updateFinding(f.id, patch); saveDebounced?.(); }}
              onDelete={() => { deleteFinding(f.id); saveDebounced?.(); }}
            />
          ))}
        </ul>
      )}

      {/* Annotator modal */}
      {annotateFor && (() => {
        const f = (findings || []).find((x: any) => x.id === annotateFor.findingId) as Finding | undefined;
        if (!f || !f.photoId) return null; // invalid selection
        const p = photoById(f.photoId);
        if (!p) return null; // photo missing

        const all = allAnnForPhoto(f.photoId);
        const value = Array.isArray(f.annotations) ? (f.annotations as unknown as BoxAnn[]) : [];

        return (
          <Annotator
            photo={{ id: p.id, url: p.url, thumb: p.thumb, filename: p.filename }}
            value={value}
            allForPhoto={all}
            onCancel={() => setAnnotateFor(null)}
            onSave={(next) => {
              const nextCast = next as unknown as Finding["annotations"];
              updateFinding(f.id, { annotations: nextCast });
              reindexAnnotations(f.photoId);
              saveDebounced?.();
              setAnnotateFor(null);
            }}
          />
        );
      })()}
    </div>
  );
}

function FindingRow({
  finding,
  media,
  onChange,
  onDelete,
  onAnnotate,
}: {
  finding: Finding;
  media: MediaItem[];
  onChange: (patch: Partial<Finding>) => void;
  onDelete: () => void;
  onAnnotate: () => void;
}) {
  const m = media.find((x) => x.id === finding.photoId);

  return (
    <li className="py-2 px-2">
      <div className="flex items-start gap-2">
        <img
          src={m?.thumb || m?.url}
          className="w-14 h-14 object-cover rounded border"
          alt={m?.filename || "linked photo"}
        />

        <div className="flex-1 min-w-0">
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Finding title"
            value={finding.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />

          <div className="mt-2 grid grid-cols-2 gap-2">
            <SeverityPicker
              value={((finding.severity as unknown as number) ?? 3) as 1 | 2 | 3 | 4 | 5}
              onChange={(sev) => onChange({ severity: sev })}
            />
            <select
              className="border rounded px-2 py-1 text-sm"
              value={finding.photoId}
              onChange={(e) => onChange({ photoId: e.target.value })}
              title="Linked photo"
            >
              {media.map((mi) => (
                <option key={mi.id} value={mi.id}>
                  {mi.filename || mi.id}
                </option>
              ))}
            </select>
          </div>

          <input
            className="mt-2 w-full border rounded px-2 py-1 text-sm"
            placeholder="tags, comma separated"
            value={fmtTags(finding.tags)}
            onChange={(e) => onChange({ tags: parseTags(e.target.value) })}
          />

          <textarea
            className="mt-2 w-full border rounded px-2 py-1 text-sm"
            rows={2}
            placeholder="Description"
            value={finding.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button className="px-2 py-1 border rounded text-sm" onClick={onAnnotate} title="Annotate on image">
          Annotate
        </button>
        <div className="flex-1" />
        <button
          className="px-2 py-1 border rounded text-sm text-red-700 border-red-300"
          onClick={onDelete}
          title="Delete finding"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function SeverityPicker({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const items: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {items.map((n) => (
        <button
          key={n}
          className={`w-7 h-7 rounded text-[11px] font-medium border ${
            n === value
              ? "bg-orange-500 text-white border-orange-600"
              : "bg-orange-100 text-orange-900 border-orange-200"
          }`}
          onClick={() => onChange(n)}
          title={`Severity ${n}`}
          aria-pressed={n === value}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
