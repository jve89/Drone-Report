// client/src/editor/inspector/InspectorSectionPanels.tsx
import React from "react";
import { BLOCK_DEFS } from "../blocks/defs";

/** Utilities */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const numOr = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

function compose(prev: any, patch: any) {
  return { ...(prev || {}), ...patch };
}

function setMetaProps(blockStyle: any, patch: Record<string, any>) {
  const curMeta = blockStyle?.meta ?? {};
  const curProps = curMeta.props ?? {};
  return compose(blockStyle, { meta: compose(curMeta, { props: compose(curProps, patch) }) });
}

function setMetaPayload(blockStyle: any, patch: Record<string, any>) {
  const curMeta = blockStyle?.meta ?? {};
  const curPayload = curMeta.payload ?? {};
  return compose(blockStyle, { meta: compose(curMeta, { payload: compose(curPayload, patch) }) });
}

/** Props contract used by Inspector.tsx parent */
type SectionPanelsProps = {
  ub: any;
  updateUserBlock: (id: string, patch: any) => void;
  deleteUserBlock: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  selectUserBlock: (id: string | null) => void;
};

export default function InspectorSectionPanels({
  ub,
  updateUserBlock,
  deleteUserBlock,
  bringForward,
  sendBackward,
  selectUserBlock,
}: SectionPanelsProps) {
  const blockStyle = (ub?.blockStyle ?? {}) as any;
  const meta = blockStyle.meta ?? {};

  // 🔧 Normalize legacy kinds
  const rawKind = meta.blockKind as string | undefined;
  const kind = rawKind === "image_slot" ? "image" : rawKind;

  console.log("Inspector kind:", kind, ub);

  if (!kind) return null;

  const onDelete = () => {
    deleteUserBlock(ub.id);
    selectUserBlock(null);
  };

  const zOrderBar = (
    <div className="flex flex-wrap gap-2">
      <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => bringForward(ub.id)}>
        Bring forward
      </button>
      <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => sendBackward(ub.id)}>
        Send backward
      </button>
      <div className="flex-1" />
      <button
        className="px-3 py-1.5 border rounded text-sm text-red-700 border-red-300 hover:bg-red-50"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );

  /** ---------------- IMAGE ---------------- */
  if (kind === "image") {
    const props = meta.props ?? {};
    const fit: "contain" | "cover" | "scale-down" = props.fit || "contain";
    const zoom = clamp(numOr(props.zoom, 100), 10, 500);
    const opacity = clamp(numOr(props.opacity, 100), 0, 100);
    const borderRadius = Math.max(0, Math.round(numOr(props.borderRadius, 0)));

    const setProps = (patch: any) =>
      updateUserBlock(ub.id, { blockStyle: setMetaProps(blockStyle, patch) });

    return (
      <div className="p-3 space-y-4">
        <div className="text-sm font-medium">Inspector</div>

        {/* Fit */}
        <div>
          <div className="text-xs text-gray-600">Object fit</div>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={fit}
            onChange={(e) => setProps({ fit: e.target.value })}
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="scale-down">Scale down</option>
          </select>
        </div>

        {/* Zoom */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-600">Zoom</div>
            <div className="text-[11px] text-gray-500 ml-auto">{zoom}%</div>
          </div>
          <input
            type="range"
            min={10}
            max={500}
            step={1}
            className="w-full"
            value={zoom}
            onChange={(e) => setProps({ zoom: clamp(Math.round(Number(e.target.value || 100)), 10, 500) })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
              onClick={() => setProps({ zoom: 100 })}
            >
              Reset
            </button>
            <div className="text-[11px] text-gray-500">Tip: When zoom &gt; 100%, drag the image to pan.</div>
          </div>
        </div>

        {/* Style */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-600">Opacity (%)</div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              className="w-full"
              value={opacity}
              onChange={(e) => setProps({ opacity: clamp(Math.round(Number(e.target.value || 100)), 0, 100) })}
            />
            <div className="text-[11px] text-gray-500 mt-0.5">{opacity}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Border radius (px)</div>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-sm"
              value={borderRadius}
              onChange={(e) => setProps({ borderRadius: Math.max(0, Math.round(Number(e.target.value || 0))) })}
            />
          </div>
        </div>

        {zOrderBar}
      </div>
    );
  }

  /** ---------------- SEVERITY OVERVIEW ---------------- */
  if (kind === "severityOverview") {
    const def = BLOCK_DEFS.severityOverview.defaultProps;
    const props = { ...def, ...(meta.props ?? {}) };
    const setProps = (patch: any) =>
      updateUserBlock(ub.id, { blockStyle: setMetaProps(blockStyle, patch) });

    return (
      <div className="p-3 space-y-4">
        <div className="text-sm font-medium">Inspector</div>

        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={!!props.showIcons}
            onChange={(e) => setProps({ showIcons: e.target.checked })}
          />
          Show icons
        </label>

        {zOrderBar}
      </div>
    );
  }

  /** ---------------- FINDINGS TABLE (S4) ---------------- */
  if (kind === "findingsTable") {
    const def = BLOCK_DEFS.findingsTable.defaultProps;
    const props = { ...def, ...(meta.props ?? {}) };
    const payload = meta.payload ?? {};
    const rows: Array<any> = Array.isArray(payload.rows) ? payload.rows : [];

    const setProps = (patch: any) =>
      updateUserBlock(ub.id, { blockStyle: setMetaProps(blockStyle, patch) });

    const setRows = (nextRows: any[]) =>
      updateUserBlock(ub.id, { blockStyle: setMetaPayload(blockStyle, { rows: nextRows }) });

    const onChangeCell = (ri: number, key: "title" | "severity" | "location" | "category", val: string) => {
      const next = rows.slice();
      const base = next[ri] || {};
      next[ri] = {
        ...base,
        [key]: key === "severity" ? (val === "" ? "" : Number(val)) : val,
      };
      setRows(next);
    };

    const addRow = () => setRows(rows.concat({ title: "", severity: "", location: "", category: "" }));
    const removeLast = () => rows.length && setRows(rows.slice(0, -1));

    return (
      <div className="p-3 space-y-4">
        <div className="text-sm font-medium">Inspector</div>

        {/* Props */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-600">Rows per page</div>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              className="w-full border rounded px-2 py-1 text-sm"
              value={clamp(numOr(props.pageSize, def.pageSize), 1, 50)}
              onChange={(e) => setProps({ pageSize: clamp(numOr(e.target.value, def.pageSize), 1, 50) })}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={!!props.showSeverityIcons}
                onChange={(e) => setProps({ showSeverityIcons: e.target.checked })}
              />
              Show severity icons
            </label>
          </div>
        </div>

        {/* Rows editor */}
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Rows</div>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left border-b">Title</th>
                  <th className="px-2 py-1 text-left border-b" title="1–5">Severity</th>
                  <th className="px-2 py-1 text-left border-b">Location</th>
                  <th className="px-2 py-1 text-left border-b">Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-b">
                    <td className="px-2 py-1">
                      <input
                        className="w-full border rounded px-1 py-0.5"
                        value={r?.title ?? ""}
                        onChange={(e) => onChangeCell(ri, "title", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="w-full border rounded px-1 py-0.5"
                        value={r?.severity ?? ""}
                        onChange={(e) => onChangeCell(ri, "severity", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-full border rounded px-1 py-0.5"
                        value={r?.location ?? ""}
                        onChange={(e) => onChangeCell(ri, "location", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-full border rounded px-1 py-0.5"
                        value={r?.category ?? ""}
                        onChange={(e) => onChangeCell(ri, "category", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="px-2 py-2 text-[11px] text-gray-500" colSpan={4}>
                      No rows yet. Use “Add row”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button className="px-2 py-1 border rounded text-xs" onClick={addRow}>
              Add row
            </button>
            <button
              className="px-2 py-1 border rounded text-xs disabled:opacity-50"
              onClick={removeLast}
              disabled={!rows.length}
            >
              Remove last
            </button>
          </div>
        </div>

        {zOrderBar}
      </div>
    );
  }

  /** ---------------- FALLBACK ---------------- */
  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Inspector</div>
      <div className="text-[11px] text-gray-500">
        Section kind: <code>{String(kind)}</code>
      </div>
      {zOrderBar}
    </div>
  );
}
