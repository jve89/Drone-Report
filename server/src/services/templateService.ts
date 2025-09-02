// server/src/services/templateService.ts
import path from "node:path";
import fs from "node:fs";
import type { Template } from "../../../shared/types/template";

const ROOT = process.cwd();
const TEMPLATES_DIR = path.resolve(ROOT, "shared", "templates");

export function listTemplates(): Array<Pick<Template, "id" | "name" | "version">> {
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith(".json"));
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), "utf8")) as Template)
    .map(t => ({ id: t.id, name: t.name, version: t.version }));
}

export function getTemplate(id: string): Template | null {
  const file = path.join(TEMPLATES_DIR, templateFileFromId(id));
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Template;
}

function templateFileFromId(id: string) {
  if (id.startsWith("generic-building")) return "generic-building.json";
  if (id.startsWith("wind-blade")) return "wind-blade.json";
  if (id.startsWith("solar-pv")) return "solar-pv.json";
  return `${id}.json`;
}
