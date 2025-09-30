// server/src/services/mediaService.ts
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(__dirname, ".."); // server/dist
// Default to ../public/uploads to match repo structure; still overrideable via env.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(ROOT, "../public/uploads");

function safePart(v: string): string {
  // Prevent path traversal; keep filename-only components.
  return path.basename(v);
}

export function ensureUploadRoot(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

export function ensureUploadDirForDraft(draftId: string): string {
  const dir = path.join(ensureUploadRoot(), safePart(draftId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function urlFor(draftId: string, storedFilename: string): string {
  return `/uploads/${encodeURIComponent(safePart(draftId))}/${encodeURIComponent(safePart(storedFilename))}`;
}

export function absPathFor(draftId: string, storedFilename: string): string {
  return path.join(ensureUploadRoot(), safePart(draftId), safePart(storedFilename));
}

export function deleteMediaFile(draftId: string, storedFilename: string): void {
  const p = absPathFor(draftId, storedFilename);
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}
