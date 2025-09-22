// client/src/editor/blocks/InspectionDetailsBlock.tsx
import React from "react";

export type InspectionDetailsProps = {
  showIcons: boolean;
  cols: number; // 1 or 2
};

export default function InspectionDetailsBlock({
  props,
  payload,
}: {
  props: InspectionDetailsProps;
  payload: Record<string, any>;
}) {
  const items: Array<{ k: string; v: any }> = [
    { k: "Date", v: payload.date ?? "" },
    { k: "Inspector", v: payload.inspector ?? "" },
    { k: "Weather", v: payload.weather ?? "" },
    { k: "Wind", v: payload.wind ?? "" },
    { k: "Temperature", v: payload.temperature ?? "" },
    { k: "Notes", v: payload.notes ?? "" },
  ].filter((x) => String(x.v || "").trim().length);

  const colClass = props.cols === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={`w-full h-full p-2 grid gap-2 ${colClass}`}>
      {items.map((it, i) => (
        <div key={i} className="border rounded p-2 text-xs">
          <div className="text-[11px] text-gray-500 mb-0.5">
            {props.showIcons ? "📝 " : null}
            {it.k}
          </div>
          <div className="text-sm whitespace-pre-wrap">{String(it.v)}</div>
        </div>
      ))}
      {!items.length && (
        <div className="text-xs text-gray-400 border rounded p-2">
          Fill details via Inspector ▶ Section block props or bind at insert-time.
        </div>
      )}
    </div>
  );
}
