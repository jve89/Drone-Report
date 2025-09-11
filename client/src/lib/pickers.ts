// client/src/lib/pickers.ts
// File System Access API helpers with safe casts and no TS error directives.

const IMG_ACCEPT = { "image/*": [".png", ".jpg", ".jpeg", ".webp"] };
const ZIP_ACCEPT = { "application/zip": [".zip"] };

type StartIn = "pictures" | "documents" | "downloads" | "desktop";

export async function pickFilesViaFS(opts?: {
  allowZip?: boolean;
  multiple?: boolean;
  startIn?: StartIn;
  id?: string;
}): Promise<File[] | null> {
  const w = window as any;
  if (typeof w.showOpenFilePicker !== "function") return null;

  const multiple = opts?.multiple ?? true;
  const id = opts?.id ?? "dr-media-files";
  const startIn = opts?.startIn ?? "pictures";

  const types = [
    {
      description: "Images/ZIP",
      accept: opts?.allowZip ? { ...IMG_ACCEPT, ...ZIP_ACCEPT } : IMG_ACCEPT,
    },
  ];

  const handles = (await w.showOpenFilePicker({
    multiple,
    startIn,
    id,
    types,
  })) as FileSystemFileHandle[];

  const files = await Promise.all(handles.map((h) => h.getFile()));
  return files as File[];
}

export async function pickDirectoryViaFS(opts?: {
  startIn?: StartIn;
  id?: string;
}): Promise<File[] | null> {
  const w = window as any;
  if (typeof w.showDirectoryPicker !== "function") return null;

  const id = opts?.id ?? "dr-media-folder";
  const startIn = opts?.startIn ?? "pictures";

  const dir = (await w.showDirectoryPicker({ startIn, id })) as FileSystemDirectoryHandle;
  const out: File[] = [];

  async function walk(handle: FileSystemDirectoryHandle): Promise<void> {
    // Iterate AsyncIterableIterator without `for await`
    const iter = (handle as any).entries();
    // entries().next() returns { value: [name, entry], done: boolean }
    while (true) {
      const r = await iter.next();
      if (r && r.done) break;
      const tuple = r?.value as [string, FileSystemHandle];
      if (!tuple) break;
      const entry = tuple[1];
      if (entry.kind === "file") {
        const f = await (entry as unknown as FileSystemFileHandle).getFile();
        out.push(f as File);
      } else {
        await walk(entry as unknown as FileSystemDirectoryHandle);
      }
    }
  }

  await walk(dir);
  return out;
}
