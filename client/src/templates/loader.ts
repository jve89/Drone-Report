// client/src/templates/loader.ts
import { getTemplate } from "../api/templates";

function normalizeModule(mod: any) {
  return mod?.default ?? mod ?? null;
}

/**
 * Back-compat normalization:
 * - Map legacy { type: "divider", rect } → { type: "line", rect }.
 *   We keep rect as-is; renderers infer a horizontal line from rect mid-Y.
 */
function normalizeTemplate(tpl: any) {
  if (!tpl || typeof tpl !== "object") return tpl;

  const pages = Array.isArray(tpl.pages) ? tpl.pages.map((p: any) => {
    const blocks = Array.isArray(p.blocks)
      ? p.blocks.map((b: any) => {
          if (b && b.type === "divider" && b.rect) {
            const { id, rect, label, placeholder, help, options } = b;
            return { id, type: "line", rect, label, placeholder, help, options };
          }
          return b;
        })
      : [];
    return { ...p, blocks };
  }) : [];

  return { ...tpl, pages };
}

/**
 * Load a template by id.
 * - First-party templates are bundled JSON files (imported dynamically).
 * - All other ids fall back to API fetch.
 * - All returned templates are normalized for back-compat.
 */
export async function loadTemplate(id: string) {
  if (!id || typeof id !== "string") return null;

  switch (id) {
    case "building-roof-v1": {
      const mod = await import("../../../shared/templates/building-roof-v1.json");
      return normalizeTemplate(normalizeModule(mod));
    }
    case "blank-v1": {
      const mod = await import("../../../shared/templates/blank.json");
      return normalizeTemplate(normalizeModule(mod));
    }
    // Alias BOTH ids to the same bundled file
    case "solar-pv":
    case "solar-pv-v1": {
      const mod = await import("../../../shared/templates/solar-pv.json");
      return normalizeTemplate(normalizeModule(mod));
    }
    default: {
      const tpl = await getTemplate(id);
      return normalizeTemplate(tpl);
    }
  }
}
