// client/src/editor/Inspector.tsx
import React from "react";
import { useEditor } from "../state/editor";
import { UserElementInspector } from "./inspector/UserElementPanels";
import { TemplateBlocksInspector } from "./inspector/TemplateBlockPanels";
import { SectionInspector } from "./inspector/SectionPanels";

export default function Inspector() {
  const {
    draft,
    template,
    pageIndex,
    setValue,
    selectedBlockId,
    setSelectedBlock,
    guide,
    guideNext,
    // User elements
    selectedUserBlockId,
    selectUserBlock,
    updateUserBlock,
    deleteUserBlock,
    bringForward,
    sendBackward,
  } = useEditor();

  if (!draft || !template) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-gray-500">Select a template to edit properties.</div>
      </div>
    );
  }

  const page = (draft.pageInstances?.[pageIndex] as any) || null;
  if (!page) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-gray-500">No page selected.</div>
      </div>
    );
  }

  const tPage = (template.pages || []).find((p: any) => p.id === page.templatePageId);
  if (!tPage) {
    return (
      <div className="p-3">
        <div className="text-sm font-medium mb-2">Inspector</div>
        <div className="text-xs text-red-600">Template page not found.</div>
      </div>
    );
  }

  /** ---------- USER ELEMENTS (text / shapes / images / sections) ---------- */
  if (selectedUserBlockId) {
    const list = Array.isArray(page.userBlocks) ? page.userBlocks : [];
    const ub = list.find((b: any) => b.id === selectedUserBlockId);
    if (!ub) {
      selectUserBlock(null);
      return null;
    }

    const blockStyle = (ub as any).blockStyle ?? (ub as any).style ?? {};
    const blockKind = blockStyle?.meta?.blockKind as string | undefined;

    // ✅ Route both sections and image-based blocks to SectionInspector
    if (blockKind && ["image", "image_slot"].includes(blockKind) || blockKind) {
      return (
        <SectionInspector
          ub={ub}
          blockStyle={blockStyle}
          updateUserBlock={updateUserBlock}
          deleteUserBlock={deleteUserBlock}
          bringForward={bringForward}
          sendBackward={sendBackward}
        />
      );
    }

    // Fallback: non-block elements (text / shapes)
    return (
      <UserElementInspector
        ub={ub}
        updateUserBlock={updateUserBlock}
        deleteUserBlock={deleteUserBlock}
        bringForward={bringForward}
        sendBackward={sendBackward}
      />
    );
  }

  /** ---------- TEMPLATE BLOCKS (existing behavior) ---------- */
  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Inspector</div>
      <TemplateBlocksInspector
        tPageBlocks={(tPage.blocks ?? []) as any}
        selectedBlockId={selectedBlockId}
        pageId={page.id}
        values={(page.values as any) || {}}
        setSelectedBlock={setSelectedBlock}
        setValue={setValue}
        guideEnabled={!!guide?.enabled}
        guideNext={guideNext}
      />
    </div>
  );
}
