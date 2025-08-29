// client/src/lib/uploadcare.ts
type UcFile = { cdnUrl?: string; cdnUrlMod?: string; name?: string };

const UCARE_PUBLIC_KEY = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || "";

function ensureScript() {
  if (document.getElementById("ucare-cdn")) return;
  const s = document.createElement("script");
  s.id = "ucare-cdn";
  s.src = "https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js";
  document.head.appendChild(s);
}

function readyUploadcare(): Promise<any> {
  return new Promise((resolve) => {
    const check = () => {
      // @ts-ignore
      if (window.uploadcare) resolve((window as any).uploadcare);
      else setTimeout(check, 30);
    };
    check();
  });
}

export async function initUploadcare() {
  ensureScript();
  // also set the global, but we no longer rely on it
  (window as any).UPLOADCARE_PUBLIC_KEY = UCARE_PUBLIC_KEY;
}

export async function pickSingle(): Promise<string | null> {
  const uploadcare = await readyUploadcare();
  const dialog = uploadcare.openDialog(null, {
    imagesOnly: true,
    publicKey: UCARE_PUBLIC_KEY,
  });
  const file: UcFile = await dialog.done((f: any) => f.promise());
  return (file?.cdnUrl || null) as string | null;
}

export async function pickMultiple(maxFiles = 200): Promise<
  { url: string; filename?: string; thumb?: string }[]
> {
  const uploadcare = await readyUploadcare();
  const dialog = uploadcare.openDialog(null, {
    imagesOnly: false,
    multiple: true,
    publicKey: UCARE_PUBLIC_KEY,
  });
  const group = await dialog.done((g: any) => g.promise());
  const files: any[] = await group.files();
  return files.slice(0, maxFiles).map((f: UcFile) => {
    const url = (f.cdnUrl || f.cdnUrlMod || "") as string;
    const filename = f.name as string | undefined;
    const thumb = url ? `${url}-/preview/320x240/` : undefined;
    return { url, filename, thumb };
  });
}
