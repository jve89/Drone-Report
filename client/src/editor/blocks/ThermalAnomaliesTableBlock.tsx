// client/src/editor/blocks/ThermalAnomaliesTableBlock.tsx
import React from "react";

export type ThermalAnomaliesProps = {
  pageSize: number;
  showDelta: boolean;
  unit: "°C" | "K";
};

export default function ThermalAnomaliesTableBlock({
  props,
  payload,
}: {
  props?: Partial<ThermalAnomaliesProps>;
  payload?: {
    rows?: Array<{
      type?: string;
      cause?: string;
      tMin?: number;
      tMean?: number;
      tMax?: number;
      tDelta?: number;
      lat?: number;
      lon?: number;
    }>;
  };
}) {
  const p: ThermalAnomaliesProps = {
    pageSize: 6,
    showDelta: true,
    unit: "°C",
    ...(props || {}),
  };

  const data = payload ?? {};
  const rawRows = Array.isArray(data.rows) ? data.rows : [];
  const rows = rawRows
    .filter(Boolean)
    .slice(0, Math.max(1, Number(p.pageSize || 0)));

  return (
    <div className="w-full h-full overflow-auto">
      <table className="min-w-full text-xs border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-1 text-left border-b">Type</th>
            <th className="px-2 py-1 text-left border-b">Cause</th>
            <th className="px-2 py-1 text-left border-b">Tmin ({p.unit})</th>
            <th className="px-2 py-1 text-left border-b">Tmean ({p.unit})</th>
            <th className="px-2 py-1 text-left border-b">Tmax ({p.unit})</th>
            {p.showDelta && <th className="px-2 py-1 text-left border-b">ΔT ({p.unit})</th>}
            <th className="px-2 py-1 text-left border-b">Lat</th>
            <th className="px-2 py-1 text-left border-b">Lon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b align-top">
              <td className="px-2 py-1">{r?.type || ""}</td>
              <td className="px-2 py-1">{r?.cause || ""}</td>
              <td className="px-2 py-1">{r?.tMin ?? ""}</td>
              <td className="px-2 py-1">{r?.tMean ?? ""}</td>
              <td className="px-2 py-1">{r?.tMax ?? ""}</td>
              {p.showDelta && <td className="px-2 py-1">{r?.tDelta ?? ""}</td>}
              <td className="px-2 py-1">{r?.lat ?? ""}</td>
              <td className="px-2 py-1">{r?.lon ?? ""}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="px-2 py-2 text-gray-400" colSpan={p.showDelta ? 8 : 7}>
                No anomalies to display. Add rows via Inspector ▶ Section block props.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
