// client/src/pages/Annotate.tsx
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
  const draftId = (params.id || (params as any).draftId) as string | undefined;
  const { draft, loadDraft, saveDebounced } = useEditor();

  useEffect(() => {
    if (draftId) loadDraft(draftId);
  }, [draftId, loadDraft]);

  useEffect(() => {
    if (draft) saveDebounced();
  }, [draft, saveDebounced]);

  if (!draft) return null;

  return <EditorShell />;
}
