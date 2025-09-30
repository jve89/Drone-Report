// client/src/editor/media/utils/mediaResponse.ts
export function normalizeUploadResponse(resp: any): any[] {
  if (Array.isArray(resp)) return resp;
  return resp?.added ?? resp?.items ?? resp?.media ?? resp?.data ?? [];
}

// Heuristic to pick just-uploaded items out of a paged response
export function pickJustUploaded(all: any[], files: File[], beforeIds: Set<string>) {
  const n = files.length;
  if (!n || !all?.length) return [];

  // Always ignore items we already had
  const fresh = all.filter((x) => x && x.id && !beforeIds.has(x.id));

  // 1) Prefer items with new IDs
  const byId = fresh.filter((x) => x.id);
  if (byId.length >= n) return takeNewest(byId, n);

  // 2) Prefer filename matches (case-insensitive)
  const uploadedNames = new Set(files.map((f) => (f?.name || "").toLowerCase()));
  const byName = fresh.filter((x) =>
    uploadedNames.has(String(x?.filename || x?.name || "").toLowerCase())
  );
  if (byName.length >= n) return takeNewest(byName, n);

  // 3) Fallback: newest N overall among fresh; if not enough, pull from all (still excluding beforeIds)
  const fromFresh = takeNewest(fresh, Math.min(n, fresh.length));
  if (fromFresh.length >= n) return fromFresh;

  const remaining = n - fromFresh.length;
  const pool = all.filter((x) => x && x.id && !beforeIds.has(x.id) && !fromFresh.some((y) => y.id === x.id));
  return fromFresh.concat(takeNewest(pool, remaining));
}

export function mediaSrc(m: any): string | undefined {
  const raw =
    m?.thumb ||
    m?.thumbnailUrl ||
    m?.thumbnail ||
    m?.preview ||
    m?.previewUrl ||
    m?.url ||
    m?.src ||
    m?.originalUrl ||
    m?.path;

  if (!raw) return undefined;

  // Already absolute or data/blob/file URLs
  if (/^(?:[a-z]+:)?\/\//i.test(raw) || /^(?:data:|blob:|file:)/i.test(raw)) return raw;

  // Absolute path on same origin
  if (raw.startsWith("/")) return `${window.location.origin}${raw}`;

  // Relative path
  const base = window.location.origin.replace(/\/+$/, "");
  const path = raw.replace(/^\/+/, "");
  return `${base}/${path}`;
}

function takeNewest(arr: any[], n: number) {
  if (!arr.length || n <= 0) return [];

  const getTime = (x: any) =>
    new Date(
      x?.uploadedAt || x?.createdAt || x?.updatedAt || x?.created || x?.date || 0
    ).getTime();

  const anyDates = arr.some((x) => !!(x?.uploadedAt || x?.createdAt || x?.updatedAt || x?.created || x?.date));
  if (anyDates) {
    // Sort newest first, then take first n
    const sorted = [...arr].sort((a, b) => getTime(b) - getTime(a));
    return sorted.slice(0, n);
  }

  // If no timestamps, trust server order (usually newest last) → take last n
  return arr.slice(Math.max(0, arr.length - n));
}
