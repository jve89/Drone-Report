// client/src/lib/zip.ts
// Placeholder for future client ZIP helpers if needed.
// Current flow uploads ZIP as a single file to the server where it gets unpacked.
// Provide function here for future streaming/inspection without adding deps.

export function isZip(file: File): boolean {
  return file.name.toLowerCase().endsWith(".zip");
}
