// client/src/lib/pickers.ts
// File System Access API helpers with safe casts and no TS error directives.

const IMG_ACCEPT = { "image/*": [".png", ".jpg", ".jpeg", ".webp"] };
const ZIP_ACCEPT = { "application/zip": [".zip"] };

type StartIn = "pictures" | "documents" | "downloads" | "desktop";

function hasOpenPicker(w: Window): boolean {
  return typeof (w as any).showOpenFilePicker === "function";
}
function hasDirPicker(w: Window): boolean {
  return typeof (w as any).showDirectoryPicker === "function";
}

export async function pickFilesViaFS(opts?: {
  allowZip?: boolean;
  multiple?: boolean;
  startIn?: StartIn;
  id?: string;
}): Promise<File[] | null> {
  const w = window as Window;
  if (!hasOpenPicker(w)) return null;

  const multiple = opts?.multiple ?? true;
  const id = opts?.id ?? "dr-media-files";
  const startIn = opts?.startIn ?? "pictures";

  const types = [
    {
      description: "Images/ZIP",
      accept: opts?.allowZip ? { ...IMG_ACCEPT, ...ZIP_ACCEPT } : IMG_ACCEPT,
    },
  ];

  try {
    const openPicker = (w as any)["showOpenFilePicker"] as (options: any) => Promise<any[]>;
    const handles = await openPicker({
      multiple,
      startIn,
      id,
      types,
      excludeAcceptAllOption: true,
    });

    const files = await Promise.all(
      handles.map(async (h: any) => {
        try {
          const f = await h.getFile();
          return f as File;
        } catch {
          return null;
        }
      })
    );

    return files.filter((f): f is File => !!f);
  } catch (err: any) {
    if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) return null;
    throw err;
  }
}

export async function pickDirectoryViaFS(opts?: {
  startIn?: StartIn;
  id?: string;
}): Promise<File[] | null> {
  const w = window as Window;
  if (!hasDirPicker(w)) return null;

  const id = opts?.id ?? "dr-media-folder";
  const startIn = opts?.startIn ?? "pictures";

  let dir: any;
  try {
    const dirPicker = (w as any)["showDirectoryPicker"] as (options: any) => Promise<any>;
    dir = await dirPicker({ startIn, id });
  } catch (err: any) {
    if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) return null;
    throw err;
  }

  const out: File[] = [];

  async function walk(handle: any): Promise<void> {
    const entries = handle?.entries?.bind(handle);
    if (typeof entries === "function") {
      const iterable = entries();
      // Prefer for-await if supported
      if (iterable && typeof (iterable as any)[Symbol.asyncIterator] === "function") {
        for await (const [, entry] of iterable as AsyncIterable<[string, any]>) {
          if (entry.kind === "file") {
            try {
              const f = await entry.getFile();
              out.push(f as File);
            } catch {}
          } else {
            await walk(entry);
          }
        }
        return;
      }
      // Fallback: manual iterator
      while (true) {
        const r = await (iterable as any).next?.();
        if (!r || r.done) break;
        const tuple = r.value as [string, any] | undefined;
        if (!tuple) continue;
        const entry = tuple[1];
        if (entry.kind === "file") {
          try {
            const f = await entry.getFile();
            out.push(f as File);
          } catch {}
        } else {
          await walk(entry);
        }
      }
    }
  }

  await walk(dir);
  return out;
}
