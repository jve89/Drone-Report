import { randomUUID } from "node:crypto";
import type { Intake } from "@drone-report/shared/dist/types/intake";

export type DraftStatus = "draft" | "finalized";
export interface Draft {
  id: string;
  ownerId?: string;       // <-- NEW
  payload: Intake;
  status: DraftStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

class InMemoryDraftsStore {
  private map = new Map<string, Draft>();

  create(payload: Intake, ownerId?: string): Draft {   // <-- ownerId optional
    const id = randomUUID();
    const now = new Date().toISOString();
    const draft: Draft = { id, ownerId, payload, status: "draft", createdAt: now, updatedAt: now };
    this.map.set(id, draft);
    return draft;
  }

  get(id: string): Draft | null {
    return this.map.get(id) || null;
  }

  update(id: string, merge: Partial<Intake>): Draft | null {
    const cur = this.map.get(id);
    if (!cur) return null;
    const next: Draft = {
      ...cur,
      payload: deepMerge(cur.payload, merge),
      updatedAt: new Date().toISOString(),
    };
    this.map.set(id, next);
    return next;
  }

  markFinalized(id: string): void {
    const cur = this.map.get(id);
    if (!cur) return;
    cur.status = "finalized";
    cur.updatedAt = new Date().toISOString();
    this.map.set(id, cur);
  }

  listByOwner(ownerId: string): Draft[] {             // <-- NEW
    return Array.from(this.map.values())
      .filter(d => d.ownerId === ownerId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  claim(id: string, ownerId: string): Draft | null {  // <-- NEW
    const cur = this.map.get(id);
    if (!cur) return null;
    cur.ownerId = ownerId;
    cur.updatedAt = new Date().toISOString();
    this.map.set(id, cur);
    return cur;
  }
}

function isObject(v: any) { return v && typeof v === "object" && !Array.isArray(v); }
function deepMerge<T>(base: T, patch: any): T {
  if (!isObject(base) || !isObject(patch)) return (patch ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isObject(out[k]) && isObject(v) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

export const draftsStore = new InMemoryDraftsStore();
