import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../state/editor";
import { CanvasSurface } from "./canvas/CanvasSurface";
import { CanvasElements } from "./canvas/CanvasElements";
import { CanvasHUD } from "./canvas/CanvasHUD";
import { useCanvasEvents } from "./canvas/useCanvasEvents";

const PAGE_W = 820;
const PAGE_H = 1160;

function clamp(v: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export default function Canvas() {
  const {
    draft,
    template,
    pageIndex,
    setPageIndex,
    setValue,
    zoom,
    findings,
    insertImageAtPoint,
    guide,
    selectedBlockId,
    setSelectedBlock,
    guideNext,
    undo,
    redo,
    tool,
    placeUserBlock,
    selectUserBlock,
    selectedUserBlockId,
    updateUserBlock,
    setLinePoints,
    deleteUserBlock,
    cancelInsert,
  } = useEditor();

  // ✅ Early returns moved up here (before hooks)
  if (!draft)
    return <div className="p-6 text-gray-500">Loading editor…</div>;

  if (!template)
    return (
      <div className="w-full flex items-center justify-center bg-neutral-100 p-12">
        <div className="bg-white border rounded shadow-sm p-6 max-w-xl text-center">
          <div className="text-lg font-medium mb-2">Select a template to start</div>
          <p className="text-sm text-gray-600 mb-4">
            The workspace will populate with the template’s page stack.
          </p>
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-template-dropdown"))
            }
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            Pick a template
          </button>
        </div>
      </div>
    );

  // Now we can safely use hooks below this line
  const pageRef = useRef<HTMLDivElement>(null);

  const getHeaderH = () =>
    (document.querySelector("[data-app-header]") as HTMLElement)?.offsetHeight ?? 56;
  const [toolbarTop, setToolbarTop] = useState(getHeaderH());

  useEffect(() => {
    const updateTop = () => {
      const headerH = getHeaderH();
      const pageTop = pageRef.current?.getBoundingClientRect().top ?? 0;
      setToolbarTop(Math.max(headerH, pageTop));
    };
    updateTop();
    window.addEventListener("scroll", updateTop, { passive: true });
    window.addEventListener("resize", updateTop);
    return () => {
      window.removeEventListener("scroll", updateTop);
      window.removeEventListener("resize", updateTop);
    };
  }, []);

  const ctx = useMemo(
    () => ({
      run: (draft as any)?.payload?.meta ?? {},
      draft: draft as any,
      findings: (findings as any[]) ?? [],
    }),
    [draft, findings]
  );

  const {
    onDragOver,
    onDrop,
    onCanvasClick,
    onCanvasBackgroundMouseDown,
    startDrag,
    startLineDrag,
    startRectDrag,
    rotHUD,
  } = useCanvasEvents({
    pageRef,
    draft,
    template,
    pageIndex,
    insertImageAtPoint,
    setValue,
    guide,
    selectedBlockId,
    guideNext,
    tool,
    placeUserBlock,
    selectUserBlock,
    selectedUserBlockId,
    updateUserBlock,
    setLinePoints,
    deleteUserBlock,
    cancelInsert,
    undo,
    redo,
  });

  // Compute a safe index locally and fix the store if needed.
  const count = Math.max(1, draft.pageInstances?.length ?? 1);
  const safeIndex = clamp(Number(pageIndex), 0, count - 1);
  useEffect(() => {
    if (pageIndex !== safeIndex) setPageIndex(safeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, count]);

  const pageInstance = draft.pageInstances?.[safeIndex];
  if (!pageInstance)
    return <div className="p-6 text-gray-500">No page to display</div>;

  const tPage = template.pages.find(
    (p: any) => p.id === pageInstance.templatePageId
  );
  if (!tPage)
    return <div className="p-6 text-gray-500">Template page not found</div>;

  const blocks = (tPage.blocks ?? []) as any[];
  const userBlocks: any[] = Array.isArray(
    (pageInstance as any).userBlocks
  )
    ? ((pageInstance as any).userBlocks as any[])
    : [];

  const activeTextBlock = selectedUserBlockId
    ? userBlocks.find(
        (b) => b.id === selectedUserBlockId && b.type === "text"
      ) || null
    : null;

  const activeShapeBlock = selectedUserBlockId
    ? userBlocks.find(
        (b) =>
          b.id === selectedUserBlockId &&
          ["line", "rect", "ellipse", "divider"].includes(b.type)
      ) || null
    : null;

  return (
    <div className="w-full flex items-start justify-center bg-neutral-100 p-6">
      <div
        className="relative"
        style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }}
      >
        <CanvasHUD
          toolbarTop={toolbarTop}
          activeTextBlock={activeTextBlock}
          activeShapeBlock={activeShapeBlock}
          rotHUD={rotHUD}
        />
        <div
          ref={pageRef}
          className="relative bg-white shadow"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            cursor: tool.mode === "insert" ? "crosshair" : "default",
          }}
          onClick={(e) => {
            onCanvasClick(e);
            onCanvasBackgroundMouseDown(e);
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <CanvasSurface
            blocks={blocks}
            pageInstance={pageInstance}
            ctx={ctx}
            guide={guide}
            selectedBlockId={selectedBlockId}
            guideNext={guideNext}
            setValue={setValue}
            draft={draft}
            findings={findings}
            onSelectTemplateBlock={setSelectedBlock}
          />
          <CanvasElements
            userBlocks={userBlocks}
            selectedUserBlockId={selectedUserBlockId}
            ctx={ctx}
            onUpdateBlock={updateUserBlock}
            onSelectBlock={selectUserBlock}
            startRectDrag={startRectDrag}
            startLineDrag={startLineDrag}
            startDrag={startDrag}
          />
        </div>
      </div>
    </div>
  );
}
