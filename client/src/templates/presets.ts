// client/src/templates/presets.ts
// Minimal preset loader for the “Sections” catalog.

export type ElementPreset =
  | { id: string; type: "text"; rect: { x: number; y: number; w: number; h: number }; value?: string; style?: any }
  | { id: string; type: "divider"; rect: { x: number; y: number; w: number; h: number }; style?: any }
  | { id: string; type: "line"; points: Array<{ x: number; y: number }>; style?: any }
  | { id: string; type: "rect" | "ellipse"; rect: { x: number; y: number; w: number; h: number }; style?: any; blockStyle?: any };

export type BlockPreset = {
  id: string;
  name: string;
  elements: ElementPreset[];
  inputs?: Record<string, unknown>;
};

export async function loadBlockPresets(): Promise<BlockPreset[]> {
  const header: BlockPreset = {
    id: "header-basic",
    name: "Header",
    elements: [
      { id: "hdr-title", type: "text", rect: { x: 10, y: 6, w: 60, h: 6 }, value: "Report Title" },
      { id: "hdr-sub", type: "text", rect: { x: 10, y: 12, w: 60, h: 4 }, value: "Subtitle or project name" },
      { id: "hdr-divider", type: "divider", rect: { x: 10, y: 18, w: 80, h: 1 } },
    ],
  };

  const footer: BlockPreset = {
    id: "footer-basic",
    name: "Footer",
    elements: [
      { id: "ftr-divider", type: "divider", rect: { x: 10, y: 90, w: 80, h: 1 } },
      { id: "ftr-left", type: "text", rect: { x: 10, y: 92, w: 40, h: 4 }, value: "Company • Confidential" },
      { id: "ftr-right", type: "text", rect: { x: 70, y: 92, w: 20, h: 4 }, value: "Page {{draft.page}}/{{draft.pages}}" },
    ],
  };

  const siteProps: BlockPreset = {
    id: "site-properties-basic",
    name: "Site Properties",
    elements: [],
    inputs: {
      address: "",
      peakPowerMWp: 0,
      panelCount: 0,
      inclinationDeg: 0,
      orientation: "",
      areaHa: 0,
      panelModel: "",
      inverterModel: "",
    },
  };

  return [header, footer, siteProps];
}
