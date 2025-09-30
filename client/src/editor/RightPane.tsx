// client/src/editor/RightPane.tsx
import { useEditor } from "../state/editorStore";
import { Accordion, AccordionItem } from "../components/Accordion";
import ElementsPanel from "./blocks/ElementsPanel";
import BlocksPanel from "./blocks/BlocksPanel";
import Inspector from "./Inspector";
import MediaPanel from "./panels/MediaPanel";
import TemplatePanel from "./panels/TemplatePanel";
import ExportPanel from "./panels/ExportPanel";
import StartChecklist from "./panels/StartChecklist";

export default function RightPane() {
  const { template } = useEditor();

  return (
    <div
      className="w-80 border-l flex flex-col"
      role="complementary"
      aria-label="Editor properties sidebar"
    >
      <Accordion storageKey="dr/rightPanels" singleOpen defaultOpenId="elements">
        <AccordionItem id="elements" title="Elements">
          <div
            className="min-h-[100px] max-h-[40vh] overflow-auto"
            aria-label="Elements panel"
          >
            <ElementsPanel />
          </div>
        </AccordionItem>

        <AccordionItem id="sections" title="Sections">
          <div
            className="min-h-[100px] max-h-[40vh] overflow-auto"
            aria-label="Sections panel"
          >
            <BlocksPanel />
          </div>
        </AccordionItem>

        <AccordionItem id="inspector" title="Inspector">
          <div
            className="min-h-[200px] max-h-[50vh] overflow-auto"
            aria-label="Inspector panel"
          >
            <Inspector />
          </div>
        </AccordionItem>

        <AccordionItem id="media" title="Media">
          <div
            className="min-h-[160px] max-h-[50vh] overflow-auto"
            aria-label="Media panel"
          >
            <MediaPanel />
          </div>
        </AccordionItem>

        <AccordionItem id="template" title="Template & Theme">
          <div
            className="min-h-[120px] max-h-[40vh] overflow-auto"
            aria-label="Template and Theme panel"
          >
            <TemplatePanel />
          </div>
        </AccordionItem>

        <AccordionItem id="export" title="Export">
          <div className="min-h-[100px]" aria-label="Export panel">
            <ExportPanel />
          </div>
        </AccordionItem>

        {!template && (
          <AccordionItem id="start" title="Getting started">
            <div className="min-h-[120px] overflow-auto" aria-label="Getting started checklist">
              <StartChecklist />
            </div>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
