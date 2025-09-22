// client/src/editor/blocks/OrthoPairBlock.tsx
import React from "react";

export type OrthoPairProps = {
  layout: "horizontal" | "vertical";
  showNorth: boolean;
  showScale: boolean;
  leftLabel?: string;
  rightLabel?: string;
};

export default function OrthoPairBlock({
  props,
  payload,
}: {
  props: OrthoPairProps;
  payload: { leftUrl?: string; rightUrl?: string; leftCaption?: string; rightCaption?: string };
}) {
  const isH = props.layout !== "vertical";
  const wrap = isH ? "grid-cols-2" : "grid-rows-2";
  const left = payload.leftUrl || "";
  const right = payload.rightUrl || "";

  const Cap = ({ label }: { label: string }) => (
    <div className="text-[11px] text-gray-600 mt-1">{label}</div>
  );

  const Bad = () => (
    <div className="w-full h-40 grid place-items-center bg-gray-100 text-gray-400 rounded border">
      No image
    </div>
  );

  return (
    <div className={`w-full h-full p-2 grid gap-2 ${wrap}`}>
      <div className="w-full h-full">
        {left ? <img src={left} className="w-full h-56 object-cover rounded border" /> : <Bad />}
        <Cap label={payload.leftCaption || props.leftLabel || "Ortho"} />
      </div>
      <div className="w-full h-full">
        {right ? <img src={right} className="w-full h-56 object-cover rounded border" /> : <Bad />}
        <Cap label={payload.rightCaption || props.rightLabel || "Detail"} />
      </div>

      {(props.showNorth || props.showScale) && (
        <div className="absolute right-2 bottom-2 flex gap-2 text-[11px]">
          {props.showNorth && <div className="px-2 py-1 bg-white/90 border rounded">N ↑</div>}
          {props.showScale && <div className="px-2 py-1 bg-white/90 border rounded">10 m</div>}
        </div>
      )}
    </div>
  );
}
