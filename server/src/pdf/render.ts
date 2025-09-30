// server/src/pdf/render.ts
import fs from "fs";
import path from "path";

type PageInstance = { id: string; values?: Record<string, unknown> };
type MediaItem = { id: string; url: string; filename?: string; thumb?: string };
type Finding = {
  id: string;
  title: string;
  severity: number;
  location?: string;
  description?: string;
  photoId: string;
  annotations?: any[];
  updatedAt?: string;
};
type Draft = {
  id: string;
  title: string;
  pageInstances: PageInstance[];
  media: MediaItem[];
  payload?: any;
};

function esc(s: unknown) {
  const str = String(s ?? "");
  return str.replace(/[&<>"]/g, (m) =>
    m === "&" ? "&amp;"
    : m === "<" ? "&lt;"
    : m === ">" ? "&gt;"
    : "&quot;"
  );
}

function loadTemplate(): string {
  // dist runtime: ../templates/report.html
  const distPath = path.resolve(__dirname, "../templates/report.html");
  if (fs.existsSync(distPath)) return fs.readFileSync(distPath, "utf8");
  // fallback dev path
  const devPath = path.resolve(__dirname, "../../src/templates/report.html");
  return fs.readFileSync(devPath, "utf8");
}

export function renderDraftHTML(draft: Draft): string {
  const tpl = loadTemplate();

  const findings: Finding[] = Array.isArray(draft?.payload?.findings) ? draft.payload.findings : [];
  const media: MediaItem[] = Array.isArray(draft?.media) ? draft.media : [];

  const byMedia: Record<string, MediaItem> = Object.fromEntries(media.map((m) => [m.id, m]));

  // Basic KPIs
  const total = findings.length;
  const crit = findings.filter((f) => (f.severity ?? 0) >= 4).length;

  // COVER
  const COVER = `
    <section class="cover">
      <div class="top">
        <div><span class="small muted">Logo</span></div>
        <div>
          <h1>${esc(draft.title || "Inspection report")}</h1>
          <div class="meta small">Generated ${esc(new Date().toISOString())}</div>
        </div>
      </div>
      <div class="counts">
        <div class="count"><div class="label">Findings</div><div class="value">${total}</div></div>
        <div class="count"><div class="label">Critical (4–5)</div><div class="value">${crit}</div></div>
        <div class="count"><div class="label">Media items</div><div class="value">${media.length}</div></div>
        <div class="count"><div class="label">Template</div><div class="value">Building Roof v1</div></div>
      </div>
    </section>
  `.trim();

  // SUMMARY (minimal)
  const SUMMARY = `
    <div class="card">
      <h2>Executive summary</h2>
      <p class="muted small">This section can be bound from the editor. For now it shows KPIs.</p>
      <p>Total findings: <b>${total}</b>. Critical: <b>${crit}</b>.</p>
    </div>
  `.trim();

  // OVERVIEW table
  const OVERVIEW = `
    <table class="overview">
      <thead><tr>
        <th>#</th><th>Severity</th><th>Issue</th><th>Location</th><th>Photo</th>
      </tr></thead>
      <tbody>
        ${findings
          .slice()
          .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
          .map((f, i) => {
            const m = byMedia[f.photoId];
            return `<tr>
              <td>${i + 1}</td>
              <td>${esc(String(f.severity ?? ""))}</td>
              <td>${esc(f.title || "")}</td>
              <td>${esc(f.location || "")}</td>
              <td>${m ? esc(m.filename || m.id) : ""}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  `.trim();

  // DETAIL_PAGES
  const DETAIL_PAGES = findings
    .slice()
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
    .map((f, i) => {
      const m = byMedia[f.photoId];
      const img = m?.url
        ? `<img class="detail-img" src="${esc(m.url)}" alt="${esc(m.filename || m.id)}" />`
        : "";
      return `
        <div class="detail-card">
          <h3>${i + 1}. ${esc(f.title || "Untitled finding")}</h3>
          <div class="grid detail">
            <div>${img}</div>
            <div>
              <div class="fact"><b>Severity</b> ${esc(String(f.severity ?? ""))}</div>
              <div class="fact"><b>Location</b> ${esc(f.location || "")}</div>
              <div class="fact"><b>Description</b><br/>${esc(f.description || "")}</div>
            </div>
          </div>
        </div>
      `.trim();
    })
    .join("\n");

  // APPENDIX_PAGES
  const APPENDIX_PAGES = media
    .map((m, i) => {
      return `
        <figure class="appendix-item">
          <img src="${esc(m.url)}" alt="${esc(m.filename || m.id)}" />
          <figcaption>${i + 1}. ${esc(m.filename || m.id)}</figcaption>
        </figure>
      `.trim();
    })
    .join("\n");

  const METHODOLOGY = `<div class="card"><h2>Methodology</h2><p class="small muted">Add methodology text in a later pass.</p></div>`.trim();
  const COMPLIANCE = `<p class="small muted">Compliance and disclaimers go here.</p>`.trim();

  const html = tpl
    .replaceAll("{{THEME_COLOR}}", "#3B82F6")
    .replaceAll("{{PROJECT}}", esc(draft.title || "Inspection"))
    .replace("{{COVER}}", COVER)
    .replace("{{SUMMARY}}", SUMMARY)
    .replace("{{OVERVIEW}}", OVERVIEW)
    .replace("{{METHODOLOGY}}", METHODOLOGY)
    .replace("{{DETAIL_PAGES}}", DETAIL_PAGES)
    .replace("{{APPENDIX_PAGES}}", APPENDIX_PAGES)
    .replace("{{COMPLIANCE}}", COMPLIANCE);

  return html;
}
