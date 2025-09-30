// client/src/editor/media/workers/exifWorker.ts

// Define expected message shape
type InMsg = { type: "PARSE_EXIF"; files: { name: string; size: number }[] };
type OutMsg = { type: "EXIF_RESULT"; ok: boolean; files: { name: string; size: number }[] };

// Worker entry
self.onmessage = (e: MessageEvent<InMsg>) => {
  if (e.data?.type !== "PARSE_EXIF") return;

  const files = Array.isArray(e.data.files) ? e.data.files : [];
  // No heavy parsing yet; just echo back basic metadata
  const msg: OutMsg = { type: "EXIF_RESULT", ok: true, files };
  self.postMessage(msg);
};

export {};
