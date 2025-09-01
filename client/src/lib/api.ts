export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").trim();

/** Legacy: generate PDF immediately (used by current IntakeForm) */
export async function createDraft(payload: unknown): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/create-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create draft failed: ${res.status} ${txt}`);
  }
  return await res.blob();
}

/** New: create a draft record and get its id */
export async function createDraftRecord(payload: unknown): Promise<string> {
  const res = await fetch(`${API_BASE}/api/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create draft record failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const id = json?.draftId;
  if (!id || typeof id !== "string") throw new Error("Invalid create-draft response");
  return id;
}

/** Read a draft */
export async function getDraft(draftId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Get draft failed: ${res.status} ${txt}`);
  }
  return await res.json();
}

/** Patch-update a draft */
export async function updateDraft(draftId: string, patch: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update draft failed: ${res.status} ${txt}`);
  }
}

/** Finalize a draft to PDF */
export async function finalizeDraftToPdf(draftId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}/finalize`, {
    method: "POST",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Finalize draft failed: ${res.status} ${txt}`);
  }
  return await res.blob();
}
