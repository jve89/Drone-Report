type UcFile = { cdnUrl: string; cdnUrlMod?: string; name?: string };

const UCARE_PUBLIC_KEY = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || "";

function ensureScript() {
  if (document.getElementById("ucare-cdn")) return;
  const s = document.createElement("script");
  s.id = "ucare-cdn";
  s.src = "https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js";
  document.head.appendChild(s);
}

export function initUploadcare() {
  ensureScript();
  // @ts-ignore
  (window as any).UPLOADCARE_PUBLIC_KEY = UCARE_PUBLIC_KEY;
}

export async function pickSingle(): Promise<string | null> {
  // @ts-ignore
  const dialog = (window as any).uploadcare.openDialog(null, { imagesOnly: true });
  const file: UcFile = await dialog.done((f: any) => f.promise());
  return file?.cdnUrl || null;
}

export async function pickMultiple(maxFiles = 200): Promise<{ url: string; filename?: string; thumb?: string }[]> {
  // @ts-ignore
  const dialog = (window as any).uploadcare.openDialog(null, { imagesOnly: false, multiple: true });
  const group = await dialog.done((g: any) => g.promise());
  // @ts-ignore
  const files: any[] = await group.files();
  const out = files.slice(0, maxFiles).map((f: UcFile) => {
    const url: string = (f.cdnUrl || f.cdnUrlMod || "") as string;
    const filename: string | undefined = (f as any).name;
    const thumb = url ? `${url}-/preview/320x240/` : undefined;
    return { url, filename, thumb };
  });
  return out;
}
