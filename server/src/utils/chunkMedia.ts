/**
 * Chunk an array into fixed-size pages. Used for 24-up contact sheets.
 */
export function chunkArray<T>(items: T[], pageSize: number): T[][] {
  if (!Array.isArray(items) || pageSize <= 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}
