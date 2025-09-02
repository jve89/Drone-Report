// client/src/api/templates.ts
export type TemplateSummary = { id: string; name: string; version: string };
import { API_BASE } from "../lib/api";

export async function listTemplates(): Promise<TemplateSummary[]> {
  const r = await fetch(`${API_BASE}/api/templates`, { credentials: "include" });
  if (!r.ok) throw new Error("templates_list_failed");
  return r.json();
}

export async function getTemplate(id: string) {
  const r = await fetch(`${API_BASE}/api/templates/${encodeURIComponent(id)}`, { credentials: "include" });
  if (!r.ok) throw new Error("template_fetch_failed");
  return r.json();
}
