// client/src/editor/GuidePanel.tsx
import { useEffect, useMemo } from "react";
import { useEditor } from "../state/editorStore";

export default function GuidePanel() {
  const {
    draft,
    template,
    guide,
    steps,
    enableGuide,
    disableGuide,
    guidePrev,
    guideNext,
    guideSkip,
    setGuideStep,
    setSelectedBlock,
    setPageIndex,
  } = useEditor();

  const total = steps.length;
  const idx = Math.min(Math.max(0, guide.stepIndex), Math.max(0, total - 1));
  const current = useMemo(() => (total ? steps[idx] : null), [steps, idx, total]);

  // Sync page and focused block when guide/step changes.
  useEffect(() => {
    if (!draft || !template || !guide.enabled || !current) return;
    const pageIdx = draft.pageInstances.findIndex((pi) => pi.templatePageId === current.pageId);
    if (pageIdx >= 0) setPageIndex(pageIdx);
    setSelectedBlock(current.blockId);
  }, [draft, template, guide.enabled, current, setPageIndex, setSelectedBlock]);

  if (!draft || !template) {
    return <div className="p-2 text-xs text-gray-500">Select a template to enable the guide.</div>;
  }
  if (!total) {
    return <div className="p-2 text-xs text-gray-500">No guided steps in this template.</div>;
  }

  if (!guide.enabled) {
    return (
      <div className="p-2 text-xs">
        <div className="text-gray-700 mb-2">Guided mode is off.</div>
        <button className="px-2 py-1 border rounded text-xs" onClick={enableGuide}>Enable guide</button>
      </div>
    );
  }

  const percent = total ? Math.round(((idx + 1) / total) * 100) : 0;
  const blockLabel = (() => {
    if (!current) return "";
    const tp = template.pages.find((p) => p.id === current.pageId);
    const b = tp?.blocks.find((x: any) => x.id === current.blockId) as any | undefined;
    return b?.label || b?.placeholder || current.blockId;
  })();

  return (
    <div className="p-2 text-xs space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-medium">Guide</div>
        <button className="px-2 py-1 border rounded text-[11px]" onClick={disableGuide} title="Disable guided mode">
          Disable
        </button>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-gray-600">Step {idx + 1} / {total}</div>
          <div className="text-gray-500">{percent}%</div>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded">
          <div className="h-1.5 bg-blue-500 rounded" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Current hint */}
      <div className="border rounded p-2 bg-white">
        <div className="text-[11px] text-gray-500 mb-1 truncate">{blockLabel}</div>
        <div className="text-sm whitespace-pre-wrap">
          {current?.help}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={guidePrev}
          disabled={idx <= 0}
          title="Previous step"
        >
          Prev
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={guideSkip}
          title="Skip this step"
        >
          Skip
        </button>
        <button
          className="ml-auto px-2 py-1 border rounded disabled:opacity-50"
          onClick={guideNext}
          disabled={idx >= total - 1}
          title="Next step"
        >
          Next
        </button>
      </div>

      {/* Step list */}
      <div className="max-h-48 overflow-auto border rounded">
        <ul className="divide-y">
          {steps.map((s, i) => {
            const tp = template.pages.find((p) => p.id === s.pageId);
            const b = tp?.blocks.find((x: any) => x.id === s.blockId) as any | undefined;
            const label = b?.label || b?.placeholder || s.blockId;
            const active = i === idx;
            return (
              <li key={`${s.pageId}:${s.blockId}`}>
                <button
                  className={`w-full text-left px-2 py-1 ${active ? "bg-blue-50 font-medium" : "hover:bg-gray-50"}`}
                  onClick={() => setGuideStep(i)}
                  title={tp?.name || ""}
                >
                  <span className="mr-2 text-[11px] text-gray-500">{i + 1}.</span>
                  <span className="text-[12px]">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
