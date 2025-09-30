// client/src/editor/media/utils/mediaThumb.ts
import { mediaSrc } from "./mediaResponse";

export function mediaThumb(m: any): string | undefined {
  const raw =
    m?.thumb ||
    m?.thumbnailUrl ||
    m?.thumbnail ||
    m?.preview ||
    m?.previewUrl ||
    m?.path || // occasionally thumbs come through as path
    undefined;

  if (!raw) return mediaSrc(m);

  // Absolute (http/https), protocol-relative (//), or data/blob/file URLs
  if (/^(?:[a-z]+:)?\/\//i.test(raw) || /^(?:data:|blob:|file:)/i.test(raw)) return raw;

  // Absolute path on same origin
  if (raw.startsWith("/")) return `${window.location.origin}${raw}`;

  // Relative path → make absolute
  const base = window.location.origin.replace(/\/+$/, "");
  const path = String(raw).replace(/^\/+/, "");
  return `${base}/${path}`;
}
