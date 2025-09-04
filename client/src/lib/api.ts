const BASE_RAW = (import.meta.env.VITE_API_BASE ?? "").trim();
export const API_BASE = BASE_RAW.replace(/\/+$/, ""); // strip trailing slash

const withCreds: RequestInit = { credentials: "include" };

type AnyObj = Record<string, any>;

function normDraft(json: AnyObj): AnyObj {
  if (json && typeof json === "object" && json.payload) return json;

  const media = Array.isArray(json?.media) ? json.media : [];
  const pageInstances = Array.isArray(json?.pageInstances) ? json.pageInstances : [];
  const templateId = typeof json?.templateId === "string" ? json.templateId : undefined;
  const title = typeof json?.title === "string" ? json.title : undefined;

  const payload: AnyObj = {
    meta: { templateId: templateId ?? "", title: title ?? "" },
    media: { images: media },
    findings: Array.isArray(json?.annotations) ? json.annotations : [],
    scope: { types: templateId ? [templateId] : [] },
  };

  return {
    id: json?.id ?? "",
    status: json?.status ?? "draft",
    createdAt: json?.createdAt ?? json?.created_at ?? "",
    updatedAt: json?.updatedAt ?? json?.updated_at ?? "",
    title: title ?? "",
    templateId: templateId ?? "",
    payload,
    media,
    pageInstances,
  };
}

/** Create a draft, returns its id */
export async function createDraftRecord(
  input?: { templateId?: string; title?: string }
): Promise<string> {
  const body = JSON.stringify(input ?? {});
  const res = await fetch(`${API_BASE}/api/drafts`, {
    ...withCreds,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create draft failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const id = json?.id || json?.draftId;
  if (!id || typeof id !== "string") throw new Error("Invalid create-draft response");
  return id;
}

/** List drafts */
export async function listDrafts(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/drafts`, withCreds);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`List drafts failed: ${res.status} ${txt}`);
  }
  const arr = await res.json();
  return Array.isArray(arr) ? arr.map(normDraft) : [];
}

/** Read a draft (normalized to include .payload for Annotate) */
export async function getDraft(draftId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}`, withCreds);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Get draft failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return normDraft(json);
}

/** Patch-update a draft: send the intake payload; server should store it */
export async function updateDraft(draftId: string, payload: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}`, {
    ...withCreds,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update draft failed: ${res.status} ${txt}`);
  }
}

/** Upload media files, returns media array */
export async function uploadDraftMedia(draftId: string, files: File[]): Promise<any[]> {
  const fd = new FormData();
  files.forEach(f => fd.append("files", f));
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}/media`, {
    ...withCreds,
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload media failed: ${res.status} ${txt}`);
  }
  return await res.json();
}

/** Export HTML (server PDF can consume this) */
export async function exportDraftHtml(draftId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/drafts/${encodeURIComponent(draftId)}/export/pdf`, {
    ...withCreds,
    method: "POST",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Export HTML failed: ${res.status} ${txt}`);
  }
  return await res.text();
}
