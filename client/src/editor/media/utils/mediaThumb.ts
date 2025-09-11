// client/src/editor/media/utils/mediaThumb.ts
export function mediaThumb(m: any): string | undefined {
  return (
    m?.thumb ||
    m?.thumbnailUrl ||
    m?.preview ||
    m?.previewUrl ||
    m?.url ||
    m?.src ||
    m?.originalUrl
  );
}
