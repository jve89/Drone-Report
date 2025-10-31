// client/src/editor/blocks/FindingsTableBlock.tsx
import React from "react";
import { SectionFindingsTable } from "../canvas/sections/SectionFindingsTable";
import { useEditor } from "../../state/editor";

export function FindingsTableBlock({
  ub,
  active,
  zIndex,
  pct,
  onBlockMouseDown,
  startRectDrag,
  isDashed,
  renderBoxBadge,
}: any) {
  const { findings } = useEditor();

  // Map findings from global store into the row format expected by SectionFindingsTable
  const rows = (findings || []).map((f) => ({
    title: f.title || "",
    location: f.location || "",
    category: f.category || "",
  }));

  // Ensure existing meta.props (like pageSize, showSeverityIcons) remain intact
  const nextUb = {
    ...ub,
    blockStyle: {
      ...(ub.blockStyle || {}),
      meta: {
        ...(ub.blockStyle?.meta || {}),
        payload: { rows },
      },
    },
  };

  return (
    <SectionFindingsTable
      ub={nextUb}
      active={active}
      zIndex={zIndex}
      pct={pct}
      onBlockMouseDown={onBlockMouseDown}
      startRectDrag={startRectDrag}
      isDashed={isDashed}
      renderBoxBadge={renderBoxBadge}
    />
  );
}

export default FindingsTableBlock;
