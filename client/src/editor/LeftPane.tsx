// client/src/editor/LeftPane.tsx
import Navigator from "./Navigator";
import { Accordion, AccordionItem } from "../components/Accordion";
import FindingsPanel from "./panels/FindingsPanel";
import GuidePanel from "./GuidePanel";

export default function LeftPane() {
  return (
    <div className="w-64 border-r flex flex-col overflow-hidden">
      <Accordion storageKey="dr/leftPanels" singleOpen defaultOpenId="pages">
        <AccordionItem id="pages" title="Pages">
          <div className="overflow-y-auto overflow-x-hidden">
            <Navigator />
          </div>
        </AccordionItem>

        <AccordionItem id="guide" title="Guide">
          <div className="min-h-[120px] max-h-[40vh] overflow-y-auto overflow-x-hidden">
            <GuidePanel />
          </div>
        </AccordionItem>

        <AccordionItem id="findings" title="Findings">
          <div className="min-h-[120px] max-h-[60vh] overflow-y-auto overflow-x-hidden">
            <FindingsPanel />
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
