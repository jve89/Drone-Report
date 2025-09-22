// client/src/editor/blocks/SitePropertiesBlock.tsx
import React from "react";
import { useEditor } from "../../state/editorStore";

type Props = {
  pageId: string;
  blockId: string;
  value?: {
    address?: string;
    peakPowerMWp?: number;
    panelCount?: number;
    inclinationDeg?: number;
    orientation?: string;
    areaHa?: number;
    panelModel?: string;
    inverterModel?: string;
  };
};

const FIELD_LABELS: Record<string, string> = {
  address: "Address",
  peakPowerMWp: "Peak Power (MWp)",
  panelCount: "Panel Count",
  inclinationDeg: "Inclination (°)",
  orientation: "Orientation",
  areaHa: "Area (ha)",
  panelModel: "Panel Model",
  inverterModel: "Inverter Model",
};

export default function SitePropertiesBlock({ pageId, blockId, value = {} }: Props) {
  const setValue = useEditor((s) => s.setValue);

  function handleChange(key: string, v: string) {
    const parsed =
      key === "peakPowerMWp" || key === "panelCount" || key === "inclinationDeg" || key === "areaHa"
        ? Number(v)
        : v;
    // value can be {}, always spread a plain object
    setValue(pageId, blockId, { ...(value || {}), [key]: parsed });
  }

  return (
    <div className="site-properties-block text-sm">
      <table className="w-full border-collapse">
        <tbody>
          {Object.keys(FIELD_LABELS).map((key) => (
            <tr key={key}>
              <td className="pr-2 font-medium align-top">{FIELD_LABELS[key]}</td>
              <td>
                <input
                  className="w-full border rounded px-1 py-0.5"
                  type="text"
                  value={(value as any)?.[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
