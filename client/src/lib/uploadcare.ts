// client/src/lib/uploadcare.ts
/**
 * Legacy Uploadcare integration.
 * Status: DISABLED as of v0.3.26 (migrated to server-side /api/drafts/:id/media and FS pickers).
 *
 * Why keep this file:
 * - Historical reference
 * - Quick fallback if you ever re-enable Uploadcare-based picking
 *
 * How to re-enable:
 * 1) Ensure VITE_UPLOADCARE_PUBLIC_KEY is set.
 * 2) Replace the stubs below with the commented implementation.
 * 3) Audit UI flows to ensure they call these pickers intentionally.
 */

// --- Public API stubs (kept so imports won't break) ---

export async function initUploadcare(): Promise<void> {
  throw new Error("Uploadcare picker is disabled (legacy). To re-enable, see comments in client/src/lib/uploadcare.ts.");
}

export async function pickSingle(): Promise<string | null> {
  throw new Error("Uploadcare picker is disabled (legacy). To re-enable, see comments in client/src/lib/uploadcare.ts.");
}

export async function pickMultiple(
  _maxFiles = 200
): Promise<{ url: string; filename?: string; thumb?: string }[]> {
  throw new Error("Uploadcare picker is disabled (legacy). To re-enable, see comments in client/src/lib/uploadcare.ts.");
}

/* --------------------------------------------------------------------------
   Original implementation (disabled)
   --------------------------------------------------------------------------

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
  (window as any).UPLOADCARE_PUBLIC_KEY = UCARE_PUBLIC_KEY;
  (window as any).uploadcare?.start?.({ publicKey: UCARE_PUBLIC_KEY });
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

export async function pickMultiple(
  maxFiles = 200
): Promise<{ url: string; filename?: string; thumb?: string }[]> {
  const uploadcare = await readyUploadcare();
  const dialog = uploadcare.openDialog(null, {
    imagesOnly: false,
    multiple: true,
    publicKey: UCARE_PUBLIC_KEY,
  });
  const group = await dialog.done((g: any) => g.promise());
  const files: any[] = await group.files();

  // Wait for each file to resolve to get stable cdnUrl
  const resolved = await Promise.all(
    files.slice(0, maxFiles).map((f: any) => f.promise())
  );

  const out = resolved
    .map((f: any) => {
      const url: string = f.cdnUrl || f.cdnUrlMod || "";
      const filename: string | undefined = f.name;
      const thumb = url ? \`\${url}-/preview/320x240/\` : undefined;
      return { url, filename, thumb };
    })
    // keep only valid absolute http(s) URLs
    .filter((x) => /^https?:\/\//i.test(x.url));

  return out;
}

--------------------------------------------------------------------------- */
