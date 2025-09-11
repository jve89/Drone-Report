// client/src/editor/media/utils/grouping.ts
import type { QueuedFile, ImportGroup } from "../types";

let gid = 0;
function nextId() {
  gid += 1;
  return `g${gid}`;
}

/**
 * Groups by folder first when available, otherwise by capture time gaps.
 * captureGapMs: e.g., 90_000 for 90 seconds.
 * Note: capture time is not parsed yet; we use name heuristic only for now.
 */
export function groupByFolderOrTime(files: QueuedFile[], captureGapMs: number): ImportGroup[] {
  // 1) Try folder-based groups using the path prefix (before last '/')
  const folderMap = new Map<string, QueuedFile[]>();
  files.forEach((f) => {
    const path = f.path || f.name;
    const idx = path.lastIndexOf("/");
    const folder = idx >= 0 ? path.slice(0, idx) : "";
    const key = folder || "(root)";
    const list = folderMap.get(key) || [];
    list.push(f);
    folderMap.set(key, list);
  });

  const groups: ImportGroup[] = [];
  for (const [folder, list] of folderMap) {
    groups.push({
      id: nextId(),
      label: folder,
      files: list,
    });
  }

  // 2) Fallback if everything landed in one folder: naive time-gap clustering by filename sort
  if (groups.length <= 1) {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    const out: ImportGroup[] = [];
    let bucket: QueuedFile[] = [];
    let last = 0;

    sorted.forEach((f, idx) => {
      const current = Date.now() + idx; // placeholder monotonic surrogate
      if (!last) last = current;
      const diff = current - last;
      if (diff >= captureGapMs && bucket.length) {
        out.push({ id: nextId(), label: `Session ${out.length + 1}`, files: bucket });
        bucket = [];
      }
      bucket.push(f);
      last = current;
    });
    if (bucket.length) {
      out.push({ id: nextId(), label: `Session ${out.length + 1}`, files: bucket });
    }
    return out;
  }

  return groups;
}
