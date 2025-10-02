// client/src/editor/blocks/SitePropertiesBlock.tsx
import React from "react";
import { useEditor } from "../../state/editor";

type SitePropsValue = {
  address?: string;
  peakPowerMWp?: number | "";
  panelCount?: number | "";
  inclinationDeg?: number | "";
  orientation?: string;
  areaHa?: number | "";
  panelModel?: string;
  inverterModel?: string;
};

type Props = {
  pageId: string;
  blockId: string;
  value?: SitePropsValue;
};

const FIELD_LABELS = {
  address: "Address",
  peakPowerMWp: "Peak Power (MWp)",
  panelCount: "Panel Count",
  inclinationDeg: "Inclination (°)",
  orientation: "Orientation",
  areaHa: "Area (ha)",
  panelModel: "Panel Model",
  inverterModel: "Inverter Model",
} as const;

type FieldKey = keyof typeof FIELD_LABELS;
const NUMERIC_KEYS = new Set<FieldKey>([
  "peakPowerMWp",
  "panelCount",
  "inclinationDeg",
  "areaHa",
]);

export default function SitePropertiesBlock({ pageId, blockId, value = {} }: Props) {
  const setValue = useEditor((s: any) => s.setValue);

  function parseMaybeNumber(k: FieldKey, raw: string): number | "" | string {
    if (!NUMERIC_KEYS.has(k)) return raw;
    if (raw.trim() === "") return "";
    const n = Number(raw);
    return Number.isFinite(n) ? n : "";
    }

  function handleChange(key: FieldKey, v: string) {
    const next = parseMaybeNumber(key, v);
    setValue(pageId, blockId, { ...(value || {}), [key]: next });
  }

  return (
    <div className="site-properties-block text-sm">
      <table className="w-full border-collapse">
        <tbody>
          {(Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => {
            const current = value?.[key];
            const stringValue =
              typeof current === "number" ? String(current) : (current ?? "");
            const isNumeric = NUMERIC_KEYS.has(key);
            return (
              <tr key={key}>
                <td className="pr-2 font-medium align-top whitespace-nowrap align-middle">
                  {FIELD_LABELS[key]}
                </td>
                <td>
                  <input
                    className="w-full border rounded px-1 py-0.5"
                    type={isNumeric ? "number" : "text"}
                    step={isNumeric ? "any" : undefined}
                    value={stringValue}
                    onChange={(e) => handleChange(key, e.target.value)}
                    aria-label={FIELD_LABELS[key]}
                    placeholder={FIELD_LABELS[key]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
