// server/src/pdf/render.ts
import type { Draft } from "@drone-report/shared/dist/types/template";

// Minimal HTML export. PDF service can reuse this HTML.
export function renderDraftHTML(draft: Draft): string {
  const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]!));
  const pages = (draft.pageInstances || []).map((pi, i) => {
    const title = esc(draft.title || `Page ${i + 1}`);
    return `<section class="page"><h2>${title}</h2><pre>${esc(JSON.stringify(pi.values ?? {}, null, 2))}</pre></section>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif} .page{page-break-after:always; padding:24px}
  </style></head><body>${pages.join("")}</body></html>`;
}
