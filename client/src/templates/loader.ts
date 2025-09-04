// client/src/templates/loader.ts
import { getTemplate } from "../api/templates";

// Prefer local JSON for first-party templates; fall back to API for others.
export async function loadTemplate(id: string) {
  if (id === "building-roof-v1") {
    // Dynamic import avoids touching shared/templates/index.ts
    const mod = await import("../../../shared/templates/building-roof-v1.json");
    return mod.default ?? mod;
  }
  return getTemplate(id);
}
