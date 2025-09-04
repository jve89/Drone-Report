// client/src/editor/layout/EditorShell.tsx
import Navigator from "../Navigator";
import Canvas from "../Canvas";
import Toolbar from "../Toolbar";
import Inspector from "../Inspector";
import MediaPanel from "../panels/MediaPanel";
import ExportPanel from "../panels/ExportPanel";
import TemplatePanel from "../panels/TemplatePanel";
import FirstRunBanner from "../onboarding/FirstRunBanner";
import Coachmark from "../onboarding/Coachmark";
import StartChecklist from "../panels/StartChecklist";
import { useEditor } from "../../state/editorStore";

export default function EditorShell() {
  const { template } = useEditor();

  return (
    <div className="flex flex-col h-screen">
      <FirstRunBanner />
      <Toolbar />
      <div className="flex flex-1 min-h-0 relative">
        {!template && <Coachmark />}
        <Navigator />
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">
          <Canvas />
          <MediaPanel />
          <ExportPanel />
        </div>
        <div className="w-72 border-l flex flex-col">
          <TemplatePanel />
          {!template && <StartChecklist />}
          <div className="flex-1 min-h-0 overflow-auto">
            <Inspector />
          </div>
        </div>
      </div>
    </div>
  );
}
