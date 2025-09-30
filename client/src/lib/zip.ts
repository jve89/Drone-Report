// client/src/lib/zip.ts
/**
 * ZIP helpers (client-side).
 *
 * Status: minimal as of v0.3.26 — only provides detection.
 * Current flow uploads ZIPs directly to the server for unpacking.
 * Extend here in the future if client-side inspection/streaming is needed.
 */

/** Returns true if the file appears to be a .zip archive (by extension). */
export function isZip(file: File): boolean {
  const name = (file?.name || "").toLowerCase();
  return name.endsWith(".zip");
}
