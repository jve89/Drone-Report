// client/src/editor/RightPane.tsx
import { useEditor } from "../state/editor";
import { Accordion, AccordionItem } from "../components/Accordion";
import ElementsPanel from "./blocks/ElementsPanel";
import Inspector from "./Inspector";
import MediaPanel from "./panels/MediaPanel";
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

        {/* Sections panel removed; merged into Elements */}

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
