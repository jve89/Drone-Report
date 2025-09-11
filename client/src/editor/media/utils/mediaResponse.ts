// client/src/editor/media/utils/mediaResponse.ts
export function normalizeUploadResponse(resp: any): any[] {
  if (Array.isArray(resp)) return resp;
  return resp?.added ?? resp?.items ?? resp?.media ?? resp?.data ?? [];
}

// Heuristic to pick just-uploaded items out of a paged response
export function pickJustUploaded(all: any[], files: File[], beforeIds: Set<string>) {
  const n = files.length;

  // 1) Prefer items with new IDs
  let newById = all.filter((x) => x && x.id && !beforeIds.has(x.id));
  if (newById.length >= n) return takeNewest(newById, n);

  // 2) Prefer filename matches
  const uploadedNames = new Set(files.map((f) => f.name.toLowerCase()));
  const byName = all.filter((x) => uploadedNames.has((x?.filename || x?.name || "").toLowerCase()));
  if (byName.length >= n) return takeNewest(byName, n);

  // 3) Fallback: newest N overall
  return takeNewest(all, n);
}

export function mediaSrc(m: any): string | undefined {
  const raw =
    m?.thumb || m?.thumbnailUrl || m?.thumbnail || m?.preview || m?.previewUrl ||
    m?.url || m?.src || m?.originalUrl || m?.path;
  if (!raw) return undefined;
  const hasProto = /^[a-z]+:\/\//i.test(raw);
  const isAbsPath = raw.startsWith("/");
  return hasProto ? raw : isAbsPath ? window.location.origin + raw : `${window.location.origin}/${raw}`;
}

function takeNewest(arr: any[], n: number) {
  const hasDate = (x: any) =>
    !!(x?.uploadedAt || x?.createdAt || x?.updatedAt || x?.created || x?.date);
  const getTime = (x: any) =>
    new Date(x?.uploadedAt || x?.createdAt || x?.updatedAt || x?.created || x?.date || 0).getTime();

  const sorted = hasDate(arr[0])
    ? [...arr].sort((a, b) => getTime(b) - getTime(a))
    : arr; // if no timestamps, trust server order (usually newest last)
  return sorted.slice(-n); // last N if no dates, or take N after sort
}
