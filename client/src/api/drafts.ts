// client/src/api/drafts.ts
const base = (import.meta.env.VITE_API_BASE as string) || "/api";

export async function listDrafts() {
  const r = await fetch(`${base}/drafts`, { credentials: "include" });
  if (!r.ok) throw new Error("drafts_list_failed");
  return r.json();
}

export async function createDraft(templateId: string, title?: string) {
  const r = await fetch(`${base}/drafts`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ templateId, title })
  });
  if (!r.ok) throw new Error("draft_create_failed");
  return r.json();
}

export async function getDraft(id: string) {
  const r = await fetch(`${base}/drafts/${id}`, { credentials: "include" });
  if (!r.ok) throw new Error("draft_get_failed");
  return r.json();
}

export async function patchDraft(id: string, patch: any) {
  const r = await fetch(`${base}/drafts/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error("draft_patch_failed");
  return r.json();
}

export async function uploadMedia(id: string, files: File[]) {
  const fd = new FormData();
  files.forEach(f => fd.append("files", f));
  const r = await fetch(`${base}/drafts/${id}/media`, { method: "POST", credentials: "include", body: fd });
  if (!r.ok) throw new Error("media_upload_failed");
  return r.json();
}
