// server/src/services/templateService.ts
import path from "node:path";
import fs from "node:fs";
import type { Template } from "@drone-report/shared/dist/types/template";

function findTemplatesDir(): string {
  const candidates = [
    // built code: server/dist/services -> ../../shared/templates
    path.resolve(__dirname, "../../shared/templates"),
    // ts-node from src: server/src/services -> ../../shared/templates
    path.resolve(__dirname, "../../shared/templates"),
    // process started in repo root
    path.resolve(process.cwd(), "shared/templates"),
    // process started in /server
    path.resolve(process.cwd(), "../shared/templates"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return "";
}

const TEMPLATES_DIR = findTemplatesDir();

export function listTemplates(): Array<Pick<Template, "id" | "name" | "version">> {
  if (!TEMPLATES_DIR) return [];
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith(".json"));
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), "utf8")) as Template)
    .map(t => ({ id: t.id, name: t.name, version: t.version }));
}

export function getTemplate(id: string): Template | null {
  if (!TEMPLATES_DIR) return null;
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
