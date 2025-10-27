// client/src/editor/inspector/SectionPanels.tsx
import React from "react";
import { BLOCK_DEFS, BlockKind } from "../blocks/defs";

// Local helpers
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const numOr = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Meta patch composers (preserve siblings)
function compose(prev: any, patch: any) {
  return { ...(prev || {}), ...patch };
}
function withMetaProps(blockStyle: any, patch: Record<string, any>) {
  const meta = blockStyle?.meta ?? {};
  const props = meta.props ?? {};
  return compose(blockStyle, { meta: compose(meta, { props: compose(props, patch) }) });
}
function withMetaPayload(blockStyle: any, patch: Record<string, any>) {
  const meta = blockStyle?.meta ?? {};
  const payload = meta.payload ?? {};
  return compose(blockStyle, { meta: compose(meta, { payload: compose(payload, patch) }) });
}

type SectionPanelProps = {
  ub: any;
  blockStyle: any;
  updateUserBlock: (id: string, patch: any) => void;
  deleteUserBlock: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
};

export function SectionInspector(props: SectionPanelProps) {
  const { ub, blockStyle } = props;
  const meta = (blockStyle?.meta ?? {}) as {
    blockKind?: BlockKind;
    props?: any;
    payload?: any;
  };
  const kind = meta.blockKind as BlockKind | undefined;
  if (!kind) return null;

  if (kind === "severityOverview") return <SeverityOverviewInspector {...props} meta={meta} />;
  if (kind === "findingsTable") return <FindingsTableInspector {...props} meta={meta} />;
  if (kind === "photoStrip") return <PhotoStripInspector {...props} meta={meta} />;

  return (
    <div className="p-3 text-xs text-gray-600">
      <div className="text-sm font-medium mb-1">Inspector</div>
      <div>Section type: <span className="font-mono">{String(kind)}</span></div>
      <div className="text-gray-500">Panel coming soon.</div>
    </div>
  );
}

/* ======================================================================= */
/* SEVERITY OVERVIEW — with editable counts                                 */
/* ======================================================================= */
function SeverityOverviewInspector({
  ub, blockStyle, updateUserBlock, deleteUserBlock, bringForward, sendBackward, meta,
}: SectionPanelProps & { meta: any }) {
  const def = BLOCK_DEFS.severityOverview.defaultProps;
  const props = { ...def, ...(meta.props ?? {}) };
  const payload = meta.payload ?? {};
  const counts: number[] = Array.isArray(payload.counts) ? payload.counts.slice(0, 5) : [0, 0, 0, 0, 0];

  const setProps = (patch: any) =>
    updateUserBlock(ub.id, { blockStyle: withMetaProps(blockStyle, patch) });

  const setCounts = (idx: number, val: number) => {
    const next = counts.slice();
    next[idx] = Math.max(0, Math.round(val || 0));
    updateUserBlock(ub.id, { blockStyle: withMetaPayload(blockStyle, { counts: next }) });
  };

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>

      <div>
        <div className="text-xs text-gray-600 mb-1">Severity counts</div>
        <div className="grid grid-cols-5 gap-2">
          {[0,1,2,3,4].map((i) => (
            <label key={i} className="block">
              <span className="text-[11px] text-gray-500 block mb-0.5">S{i+1}</span>
              <input
                type="number"
                min={0}
                className="w-full border rounded px-2 py-1 text-sm"
                value={numOr(counts[i], 0)}
                onChange={(e) => setCounts(i, Number(e.target.value || 0))}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={!!props.showIcons}
          onChange={(e) => setProps({ showIcons: e.target.checked })}
        />
        Show icons
      </label>

      <ZOrderBar {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

/* ======================================================================= */
/* FINDINGS TABLE (S4-A)                                                   */
/* ======================================================================= */
function FindingsTableInspector({
  ub, blockStyle, updateUserBlock, deleteUserBlock, bringForward, sendBackward, meta,
}: SectionPanelProps & { meta: any }) {
  const def = BLOCK_DEFS.findingsTable.defaultProps;
  const props = { ...def, ...(meta.props ?? {}) };
  const payload = meta.payload ?? {};
  const rows: Array<any> = Array.isArray(payload.rows) ? payload.rows : [];

  const setProps = (patch: any) =>
    updateUserBlock(ub.id, { blockStyle: withMetaProps(blockStyle, patch) });

  const setRows = (next: any[]) =>
    updateUserBlock(ub.id, { blockStyle: withMetaPayload(blockStyle, { rows: next }) });

  const updateCell = (idx: number, key: "title" | "location" | "category", val: string) => {
    const next = rows.slice();
    next[idx] = { ...(next[idx] || {}), [key]: val };
    setRows(next);
  };

  const addRow = () => setRows([...rows, { title: "", location: "", category: "" }]);
  const removeLast = () => rows.length && setRows(rows.slice(0, -1));

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-600">
          Rows per page
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            className="w-full border rounded px-2 py-1 text-sm mt-1"
            value={clamp(numOr(props.pageSize, def.pageSize), 1, 50)}
            onChange={(e) => setProps({ pageSize: clamp(numOr(e.target.value, def.pageSize), 1, 50) })}
          />
        </label>
        <label className="flex items-end gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={!!props.showSeverityIcons}
            onChange={(e) => setProps({ showSeverityIcons: e.target.checked })}
          />
          Show severity icons
        </label>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Location</th>
              <th className="px-2 py-1 text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-2 py-1">
                  <input
                    className="w-full border rounded px-1"
                    value={r?.title ?? ""}
                    onChange={(e) => updateCell(idx, "title", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full border rounded px-1"
                    value={r?.location ?? ""}
                    onChange={(e) => updateCell(idx, "location", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full border rounded px-1"
                    value={r?.category ?? ""}
                    onChange={(e) => updateCell(idx, "category", e.target.value)}
                  />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-2 py-2 text-slate-400" colSpan={3}>
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="px-2 py-1 border rounded text-xs" onClick={addRow}>Add row</button>
        <button className="px-2 py-1 border rounded text-xs disabled:opacity-50" onClick={removeLast} disabled={!rows.length}>
          Remove last
        </button>
      </div>

      <ZOrderBar {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

/* ======================================================================= */
/* PHOTO STRIP (S4-B)                                                      */
/* ======================================================================= */
function PhotoStripInspector({
  ub, blockStyle, updateUserBlock, deleteUserBlock, bringForward, sendBackward, meta,
}: SectionPanelProps & { meta: any }) {
  const def = BLOCK_DEFS.photoStrip.defaultProps;
  const props = { ...def, ...(meta.props ?? {}) };

  const setProps = (patch: any) =>
    updateUserBlock(ub.id, { blockStyle: withMetaProps(blockStyle, patch) });

  return (
    <div className="p-3 space-y-4">
      <div className="text-sm font-medium">Inspector</div>

      <label className="text-xs text-gray-600">
        Photos count
        <input
          type="number"
          min={1}
          max={12}
          step={1}
          className="w-full border rounded px-2 py-1 text-sm mt-1"
          value={clamp(numOr(props.count, def.count), 1, 12)}
          onChange={(e) => setProps({ count: clamp(numOr(e.target.value, def.count), 1, 12) })}
        />
      </label>

      <ZOrderBar {...{ ub, deleteUserBlock, bringForward, sendBackward }} />
    </div>
  );
}

/* ======================================================================= */
/* SHARED BUTTON BAR                                                       */
/* ======================================================================= */
function ZOrderBar({ ub, deleteUserBlock, bringForward, sendBackward }: any) {
  return (
    <div className="flex gap-2">
      <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => bringForward(ub.id)}>
        Bring forward
      </button>
      <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => sendBackward(ub.id)}>
        Send backward
      </button>
      <div className="flex-1" />
      <button
        className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50"
        onClick={() => deleteUserBlock(ub.id)}
      >
        Delete
      </button>
    </div>
  );
}