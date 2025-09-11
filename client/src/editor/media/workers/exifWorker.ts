// client/src/editor/media/workers/exifWorker.ts
// Placeholder worker for future EXIF parsing to keep UI responsive.
// For now, it simply echoes file names and sizes; wire EXIF libs later.
self.onmessage = async (e: MessageEvent) => {
  const files: { name: string; size: number }[] = e.data?.files || [];
  // No heavy parsing yet. Return minimal metadata.
  (self as unknown as Worker).postMessage({ ok: true, files });
};
export {};
