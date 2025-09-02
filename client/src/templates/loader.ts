// client/src/templates/loader.ts
import { getTemplate } from "../api/templates";

export async function loadTemplate(id: string) {
  return getTemplate(id);
}
