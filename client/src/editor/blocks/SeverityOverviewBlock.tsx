// client/src/editor/blocks/SeverityOverviewBlock.tsx
import React from "react";

export default function SeverityOverviewBlock({
  counts,
  showIcons = true,
}: {
  counts: number[]; // expected length up to 5, indexes 0..4 => severities 1..5
  showIcons?: boolean;
}) {
  const safe = Array.isArray(counts) ? counts : [];
  const get = (sev: number) => {
    const idx = Math.max(0, Math.min(4, sev - 1));
    const n = Number(safe[idx]);
    return Number.isFinite(n) ? n : 0;
  };

  const SevDot = ({ sev }: { sev: number }) => {
    if (!showIcons) return null;
    const color =
      sev >= 5 ? "#7c3aed" : // 5 purple (optional)
      sev === 4 ? "#ef4444" : // 4 red
      sev === 3 ? "#f59e0b" : // 3 amber
      sev === 2 ? "#22c55e" : // 2 green
      "#0ea5e9";              // 1 sky
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          marginRight: 6,
          flex: "0 0 auto",
        }}
      />
    );
  };

  // Render all five severities for clarity (S1..S5)
  const severities = [1, 2, 3, 4, 5];

  return (
    <div className="w-full h-full p-2 overflow-auto">
      <div className="grid grid-cols-5 gap-2 h-full">
        {severities.map((sev) => (
          <div key={sev} className="border rounded p-2 bg-white/90 flex flex-col justify-center">
            <div className="flex items-center text-[11px] text-gray-600 mb-1">
              <SevDot sev={sev} />
              <span>Severity {sev}</span>
            </div>
            <div className="text-xl font-semibold leading-none">{get(sev)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
