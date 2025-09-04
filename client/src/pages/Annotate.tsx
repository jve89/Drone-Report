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
  const { id } = useParams();
  const { draft, loadDraft, saveDebounced } = useEditor();

  // load on mount or when id changes
  useEffect(() => {
    if (id) loadDraft(id);
  }, [id, loadDraft]);

  // autosave whenever draft changes
  useEffect(() => {
    if (draft) saveDebounced();
  }, [draft, saveDebounced]);

  // Render the shell even when no template is chosen yet.
  if (!draft) return null;

  return <EditorShell />;
}
