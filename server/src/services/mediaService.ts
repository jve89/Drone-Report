// server/src/services/mediaService.ts
import path from "node:path";
import fs from "node:fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "server", "src", "uploads");

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

export function urlFor(filename: string) {
  return `/uploads/${filename}`;
}
