// client/src/editor/LeftPane.tsx
import Navigator from "./Navigator";
import { Accordion, AccordionItem } from "../components/Accordion";
import FindingsPanel from "./panels/FindingsPanel";
import GuidePanel from "./GuidePanel";
import LayersPanel from "./panels/LayersPanel";

export default function LeftPane() {
  return (
    <div
      className="w-64 border-r flex flex-col overflow-hidden"
      role="complementary"
      aria-label="Editor sidebar"
    >
      <Accordion storageKey="dr/leftPanels" singleOpen defaultOpenId="pages">
        <AccordionItem id="pages" title="Pages">
          <div className="overflow-y-auto overflow-x-hidden" aria-label="Pages panel">
            <Navigator />
          </div>
        </AccordionItem>

        <AccordionItem id="layers" title="Layers">
          <div
            className="min-h-[120px] max-h-[50vh] overflow-y-auto overflow-x-hidden"
            aria-label="Layers panel"
          >
            <LayersPanel />
          </div>
        </AccordionItem>

        <AccordionItem id="guide" title="Guide">
          <div
            className="min-h-[120px] max-h-[40vh] overflow-y-auto overflow-x-hidden"
            aria-label="Guide panel"
          >
            <GuidePanel />
          </div>
        </AccordionItem>

        <AccordionItem id="findings" title="Findings">
          <div
            className="min-h-[120px] max-h-[60vh] overflow-y-auto overflow-x-hidden"
            aria-label="Findings panel"
          >
            <FindingsPanel />
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
