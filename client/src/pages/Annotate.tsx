// client/src/pages/Annotate.tsx
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AuthGuard from "../auth/AuthGuard";
import { getDraft, updateDraft } from "../lib/api";
import { loadTemplate } from "../templates/loader";
import { useEditor } from "../state/editorStore";
import Navigator from "../editor/Navigator";
import Canvas from "../editor/Canvas";
import Toolbar from "../editor/Toolbar";
import Inspector from "../editor/Inspector";
import MediaPanel from "../editor/panels/MediaPanel";

export default function Annotate() {
  return (
    <AuthGuard>
      <AnnotateInner />
    </AuthGuard>
  );
}

function AnnotateInner() {
  const { id } = useParams();
  const { draft, setDraft, template, setTemplate } = useEditor();
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const d = await getDraft(id!);
      const t = await loadTemplate(d.payload?.meta?.templateId || d.templateId);
      if (!mounted) return;
      setDraft(d);
      setTemplate(t);
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [id, setDraft, setTemplate]);

  // autosave
  useEffect(() => {
    if (!draft) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await updateDraft(draft.id, { pageInstances: draft.pageInstances, media: draft.media });
    }, 800);
  }, [draft]);

  if (!loaded || !draft || !template) return null;

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <Navigator />
        <div className="flex-1 min-w-0">
          <Canvas />
          <MediaPanel />
        </div>
        <Inspector />
      </div>
    </div>
  );
}
