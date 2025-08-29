export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").trim();

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
