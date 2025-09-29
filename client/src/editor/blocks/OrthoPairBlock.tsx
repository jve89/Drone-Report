// client/src/editor/blocks/OrthoPairBlock.tsx
import React from "react";

export type OrthoPairProps = {
  layout: "horizontal" | "vertical";
  showNorth: boolean;
  showScale: boolean;
  leftLabel?: string;
  rightLabel?: string;
};

type OrthoPairPayload = {
  leftUrl?: string;
  rightUrl?: string;
  leftCaption?: string;
  rightCaption?: string;
};

const DEFAULT_PROPS: OrthoPairProps = {
  layout: "horizontal",
  showNorth: false,
  showScale: false,
  leftLabel: "Ortho",
  rightLabel: "Detail",
};

export default function OrthoPairBlock({
  props = DEFAULT_PROPS,
  payload = {},
}: {
  props?: OrthoPairProps;
  payload?: OrthoPairPayload;
}) {
  const p = { ...DEFAULT_PROPS, ...props };
  const data = payload || {};

  const isHorizontal = p.layout !== "vertical";
  const wrap = isHorizontal ? "grid-cols-2" : "grid-rows-2";

  const left = data.leftUrl || "";
  const right = data.rightUrl || "";

  const Cap = ({ label }: { label: string }) => (
    <div className="text-[11px] text-gray-600 mt-1">{label}</div>
  );

  const Placeholder = () => (
    <div className="w-full h-56 grid place-items-center bg-gray-100 text-gray-400 rounded border">
      No image
    </div>
  );

  return (
    <div className={`relative w-full h-full p-2 grid gap-2 ${wrap}`}>
      <div className="w-full h-full">
        {left ? (
          <img src={left} alt="Left ortho" className="w-full h-56 object-cover rounded border" />
        ) : (
          <Placeholder />
        )}
        <Cap label={data.leftCaption || p.leftLabel || "Ortho"} />
      </div>

      <div className="w-full h-full">
        {right ? (
          <img src={right} alt="Right ortho/detail" className="w-full h-56 object-cover rounded border" />
        ) : (
          <Placeholder />
        )}
        <Cap label={data.rightCaption || p.rightLabel || "Detail"} />
      </div>

      {(p.showNorth || p.showScale) && (
        <div className="absolute right-2 bottom-2 flex gap-2 text-[11px]">
          {p.showNorth && <div className="px-2 py-1 bg-white/90 border rounded">N ↑</div>}
          {p.showScale && <div className="px-2 py-1 bg-white/90 border rounded">10 m</div>}
        </div>
      )}
    </div>
  );
}
