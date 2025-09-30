// client/src/editor/media/utils/grouping.ts
import type { QueuedFile, ImportGroup } from "../types";

function makeIdFactory() {
  let gid = 0;
  return () => {
    gid += 1;
    return `g${gid}`;
  };
}

function stem(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function parseNameParts(name: string): { prefix: string; num: number | null } {
  const s = stem(name);
  const m = s.match(/^(.*?)(\d+)$/
  );
  if (!m) return { prefix: s, num: null };
  return { prefix: m[1], num: Number(m[2]) };
}

/**
 * Groups by folder first when available, otherwise by filename numeric jumps.
 * captureGapMs is reserved for future EXIF/metadata time-based grouping.
 */
export function groupByFolderOrTime(files: QueuedFile[], _captureGapMs: number): ImportGroup[] {
  const nextId = makeIdFactory();

  // 1) Folder-based groups using path prefix (before last '/')
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

  let groups: ImportGroup[] = [...folderMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, list]) => ({
      id: nextId(),
      label: folder,
      files: list.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));

  // 2) If everything landed in one group, do a filename-based clustering
  if (groups.length <= 1) {
    const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name));
    const parts = sorted.map((f) => ({ f, ...parseNameParts(f.name) }));
    const anyNumeric = parts.some((p) => p.num !== null);

    if (!anyNumeric) {
      // No numeric hints — keep a single session, still deterministic.
      return [
        {
          id: nextId(),
          label: "Session 1",
          files: sorted,
        },
      ];
    }

    const out: ImportGroup[] = [];
    let bucket: QueuedFile[] = [];
    let lastPrefix = parts[0].prefix;
    let lastNum = parts[0].num;

    for (const p of parts) {
      const prefixChanged = p.prefix !== lastPrefix;
      const jump =
        lastNum != null && p.num != null ? p.num - lastNum : 0;
      const bigJump = jump > 1;

      if ((prefixChanged || bigJump) && bucket.length) {
        out.push({
          id: nextId(),
          label: `Session ${out.length + 1}`,
          files: bucket,
        });
        bucket = [];
      }

      bucket.push(p.f);
      lastPrefix = p.prefix;
      lastNum = p.num;
    }

    if (bucket.length) {
      out.push({
        id: nextId(),
        label: `Session ${out.length + 1}`,
        files: bucket,
      });
    }

    return out;
  }

  return groups;
}
