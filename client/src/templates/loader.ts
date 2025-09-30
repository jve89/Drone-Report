// client/src/templates/loader.ts
import { getTemplate } from "../api/templates";

function normalize(mod: any) {
  return mod?.default ?? mod ?? null;
}

/**
 * Load a template by id.
 * - First-party templates are bundled JSON files (imported dynamically).
 * - All other ids fall back to API fetch.
 */
export async function loadTemplate(id: string) {
  if (!id || typeof id !== "string") return null;

  switch (id) {
    case "building-roof-v1": {
      const mod = await import("../../../shared/templates/building-roof-v1.json");
      return normalize(mod);
    }
    case "blank-v1": {
      const mod = await import("../../../shared/templates/blank.json");
      return normalize(mod);
    }
    default:
      return getTemplate(id);
  }
}
