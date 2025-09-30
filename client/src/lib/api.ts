// client/src/lib/api.ts
const BASE_RAW = (import.meta.env.VITE_API_BASE ?? "").trim();
export const API_BASE = BASE_RAW.replace(/\/+$/, ""); // strip trailing slash

const withCreds: RequestInit = { credentials: "include" };
const jsonHeaders = { "Content-Type": "application/json" };

type AnyObj = Record<string, any>;

/** Uniform fetch + error handling returning JSON. */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...withCreds, ...init });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${init?.method || "GET"} ${path} failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<T>;
}

/** Uniform fetch + error handling returning text. */
async function requestText(path: string, init?: RequestInit): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, { ...withCreds, ...init });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${init?.method || "GET"} ${path} failed: ${res.status} ${txt}`);
  }
  return res.text();
}

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
export async function createDraftRecord(input?: { templateId?: string; title?: string }): Promise<string> {
  const json = await requestJson<any>("/api/drafts", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input ?? {}),
  });
  const id = json?.id || json?.draftId;
  if (!id || typeof id !== "string") throw new Error("Invalid create-draft response");
  return id;
}

/** List drafts */
export async function listDrafts(): Promise<any[]> {
  const arr = await requestJson<any[]>("/api/drafts");
  return Array.isArray(arr) ? arr.map(normDraft) : [];
}

/** Read a draft (normalized to include .payload for Annotate) */
export async function getDraft(draftId: string): Promise<any> {
  const json = await requestJson<any>(`/api/drafts/${encodeURIComponent(draftId)}`);
  return normDraft(json);
}

/** Patch-update a draft */
export async function updateDraft(draftId: string, payload: unknown): Promise<void> {
  await requestJson<void>(`/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

/** Delete a draft */
export async function deleteDraft(draftId: string): Promise<void> {
  await requestJson<void>(`/api/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" });
}

/** Upload media files */
export async function uploadDraftMedia(draftId: string, files: File[]): Promise<any[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  return requestJson<any[]>(`/api/drafts/${encodeURIComponent(draftId)}/media`, {
    method: "POST",
    body: fd,
  });
}

export async function deleteDraftMedia(draftId: string, mediaId: string): Promise<void> {
  await requestJson<void>(
    `/api/drafts/${encodeURIComponent(draftId)}/media/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" }
  );
}

/**
 * Export via server. Returns the HTML string the server produced.
 * Note: endpoint is /export/pdf (server generates PDF from this HTML).
 */
export async function exportDraftHtml(draftId: string): Promise<string> {
  return requestText(`/api/drafts/${encodeURIComponent(draftId)}/export/pdf`, {
    method: "POST",
  });
}
