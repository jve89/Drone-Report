// shared/templates/index.ts
// Registry of first-party templates bundled with the app.
// Use `templates` for iteration or `byId` for lookup.
// JSON files must conform to shared/types/template.Template.
import type { Template } from "../types/template";
import blank from "./blank.json";
import gb from "./generic-building.json";
import wb from "./wind-blade.json";
import spv from "./solar-pv.json";

export const templates: Template[] = [
  blank as Template,        // first
  gb as Template,
  wb as Template,
  spv as Template,
];

export const byId = (id: string) => templates.find(t => t.id === id) || null;
