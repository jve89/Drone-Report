// client/src/editor/layout/EditorShell.tsx
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
import { Accordion, AccordionItem } from "../../components/Accordion";
import ViewerControls from "../ViewerControls";
import LeftPane from "../LeftPane";

export default function EditorShell() {
  const { template } = useEditor();

  return (
    <div className="flex flex-col h-screen">
      <FirstRunBanner />
      <Toolbar />
      <div className="flex flex-1 min-h-0 relative">
        {!template && <Coachmark />}

        {/* Left: document navigation + findings */}
        <LeftPane />

        {/* Center: canvas + floating controls */}
        <div className="relative flex-1 min-w-0 flex flex-col overflow-auto">
          <Canvas />
          <ViewerControls />
        </div>

        {/* Right: collapsible panels */}
        <div className="w-80 border-l flex flex-col">
          <Accordion storageKey="dr/rightPanels" singleOpen defaultOpenId="inspector">
            <AccordionItem id="inspector" title="Inspector">
              <div className="min-h-[200px] max-h-[50vh] overflow-auto">
                <Inspector />
              </div>
            </AccordionItem>

            <AccordionItem id="media" title="Media">
              <div className="min-h-[160px] max-h-[50vh] overflow-auto">
                <MediaPanel />
              </div>
            </AccordionItem>

            <AccordionItem id="template" title="Template & Theme">
              <div className="min-h-[120px] max-h-[40vh] overflow-auto">
                <TemplatePanel />
              </div>
            </AccordionItem>

            <AccordionItem id="export" title="Export">
              <div className="min-h-[100px]">
                <ExportPanel />
              </div>
            </AccordionItem>

            {!template && (
              <AccordionItem id="start" title="Getting started">
                <div className="min-h-[120px] overflow-auto">
                  <StartChecklist />
                </div>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
