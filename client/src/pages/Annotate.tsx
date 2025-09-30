// client/src/pages/Annotate.tsx
/**
 * Annotate page — main editor route for working on a draft.
 * Requires authentication (wrapped in <AuthGuard>).
 */
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import AuthGuard from "../auth/AuthGuard";
import { useEditor } from "../state/editorStore";
import EditorShell from "../editor/layout/EditorShell";

export default function Annotate() {
  return (
    <AuthGuard>
      <AnnotateInner />
    </AuthGuard>
  );
}

function AnnotateInner() {
  const params = useParams();
  const draftId = (params.id ?? (params as Record<string, string | undefined>)?.draftId) || undefined;
  const { draft, loadDraft, saveDebounced } = useEditor();

  // Load draft when draftId changes
  useEffect(() => {
    if (draftId) loadDraft(draftId);
  }, [draftId, loadDraft]);

  // Trigger a debounced save once draft is available
  useEffect(() => {
    if (draft) saveDebounced();
  }, [draft, saveDebounced]);

  if (!draft) {
    return <div className="p-4 text-sm text-gray-500">Loading draft…</div>;
  }

  return <EditorShell />;
}
