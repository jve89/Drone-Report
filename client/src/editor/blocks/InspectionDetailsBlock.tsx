// client/src/editor/blocks/InspectionDetailsBlock.tsx
import React from "react";

export type InspectionDetailsProps = {
  showIcons?: boolean;
  cols?: number; // 1 or 2
};

type Incoming =
  | { props?: InspectionDetailsProps; payload?: Record<string, any> }
  | { value?: Record<string, any>; props?: InspectionDetailsProps }; // legacy shape used by Canvas

export default function InspectionDetailsBlock(incoming: Incoming = {} as any) {
  // Normalize inputs (support both {props,payload} and legacy {value})
  const rawProps = (incoming as any)?.props ?? {};
  const payload: Record<string, any> =
    (incoming as any)?.payload ?? (incoming as any)?.value ?? {};

  // Robust coercion
  const showIcons =
    rawProps.showIcons === true ||
    rawProps.showIcons === "true" ||
    rawProps.showIcons === 1;

  const colsNum = Number(rawProps.cols);
  const cols = Number.isFinite(colsNum) ? (colsNum === 2 ? 2 : 1) : 1;

  const items: Array<{ k: string; v: any }> = [
    { k: "Date",         v: payload?.date ?? "" },
    { k: "Inspector",    v: payload?.inspector ?? "" },
    { k: "Weather",      v: payload?.weather ?? "" },
    { k: "Wind",         v: payload?.wind ?? "" },
    { k: "Temperature",  v: payload?.temperature ?? "" },
    { k: "Notes",        v: payload?.notes ?? "" },
  ].filter((x) => String(x.v ?? "").trim().length > 0);

  const colClass = cols === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={`w-full h-full p-2 grid gap-2 ${colClass}`}>
      {items.map((it, i) => (
        <div key={i} className="border rounded p-2 text-xs">
          <div className="text-[11px] text-gray-500 mb-0.5">
            {showIcons ? "📝 " : null}
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
