// client/src/editor/layout/EditorShell.tsx
import Navigator from "../Navigator";
import Canvas from "../Canvas";
import Toolbar from "../Toolbar";
import Inspector from "../Inspector";
import MediaPanel from "../panels/MediaPanel";
import ExportPanel from "../panels/ExportPanel";
import TemplatePanel from "../panels/TemplatePanel";

export default function EditorShell() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <Navigator />
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">
          <Canvas />
          <MediaPanel />
          <ExportPanel />
        </div>
        <div className="w-72 border-l flex flex-col">
          <TemplatePanel />
          <div className="flex-1 min-h-0 overflow-auto">
            <Inspector />
          </div>
        </div>
      </div>
    </div>
  );
}
