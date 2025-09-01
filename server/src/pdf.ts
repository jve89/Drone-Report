import fs from "node:fs/promises";
import path from "node:path";
import { chunkArray } from "./utils/chunkMedia";
import type { Intake } from "@drone-report/shared/dist/types/intake";

function esc(s?: string) {
  return (s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]
  );
}
function fmt(val?: unknown) { if (val === undefined || val === null || val === "") return "—"; return String(val); }
function themeColor(hex?: string) { return hex && /^#([0-9A-Fa-f]{6})$/.test(hex) ? hex : "#6B7280"; }
async function loadTemplate(): Promise<string> { const p = path.join(__dirname, "templates", "report.html"); return fs.readFile(p, "utf8"); }

function severityBuckets(findings: any[]) {
  const buckets: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const f of findings || []) { const s = (f?.severity ?? "").toString(); if (buckets[s] !== undefined) buckets[s]++; }
  return buckets;
}
const SEV_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1, None: 0 };
const PAGE_SIZE = 1; // 1 image per appendix page and one finding per detail page

// ===== Section builders (return HTML fragments) =====
function coverSectionHtml(intake: Intake): string {
  const color = themeColor(intake.branding?.color);
  const logoTag = intake.branding?.logoUrl ? `<img class="logo" src="${esc(intake.branding.logoUrl)}" alt="Logo"/>` : "";
  const dateStr = fmt(intake.inspection?.date);
  const project = esc(intake.contact?.project || "Inspection report");
  const company = esc(intake.contact?.company || "—");
  const location = esc(intake.site?.address || "");
  const inspectionType = esc((intake.scope?.types && intake.scope.types[0]) || "General");

  const images = intake.media?.images ?? [];
  const findings = (intake as any).findings || [];
  const sev = severityBuckets(findings);
  const totalImages = images.length;

  return `
  <section class="cover">
    <div class="top">
      ${logoTag || `<div></div>`}
      <div>
        <h1>${project}</h1>
        <div class="meta">
          <div><strong>Client:</strong> ${company}</div>
          <div><strong>Date:</strong> ${esc(dateStr)} · <strong>Location:</strong> ${location || "—"}</div>
          <div><strong>Inspection type:</strong> ${inspectionType}</div>
          <div><strong>Images:</strong> ${totalImages}</div>
        </div>
      </div>
    </div>
    <div class="counts">
      <div class="count"><div class="label">Low</div><div class="value">${sev.Low}</div></div>
      <div class="count"><div class="label">Medium</div><div class="value">${sev.Medium}</div></div>
      <div class="count"><div class="label">High</div><div class="value">${sev.High}</div></div>
      <div class="count"><div class="label">Critical</div><div class="value">${sev.Critical}</div></div>
    </div>
  </section>`;
}

function summarySectionHtml(intake: Intake): string {
  const hasSummary = Boolean(intake.summary?.condition || intake.summary?.urgency || intake.summary?.topIssues?.length);
  const summaryBullets = (intake.summary?.topIssues || []).map(t => `<li>${esc(t)}</li>`).join("");
  return hasSummary
    ? `
  <div class="card">
    <h2>Executive summary</h2>
    <div class="badges">
      ${intake.summary?.condition ? `<span class="badge">${esc(intake.summary.condition)}</span>` : ""}
      ${intake.summary?.urgency ? `<span class="badge warn">${esc(intake.summary.urgency)}</span>` : ""}
    </div>
    ${summaryBullets ? `<ul class="bullets">${summaryBullets}</ul>` : `<p class="muted">No summary provided.</p>`}
  </div>`
    : `<div class="card"><h2>Executive summary</h2><p class="muted">No summary provided.</p></div>`;
}

function overviewSectionHtml(intake: Intake): string {
  const images = intake.media?.images ?? [];
  const findings = (intake as any).findings || [];

  const normalized = (findings as any[]).map((f) => {
    const url = f.imageUrl || (Array.isArray(f.imageRefs) ? f.imageRefs[0] : undefined);
    const img = images.find(x => x.url === url) || null;
    return {
      image: img?.filename || url || "",
      severity: f.severity || "None",
      issue: f.issue || "",
      comment: f.comment || "",
      // Detail page index maps 1:1 to image order for now
      page: url ? (images.findIndex(x => x.url === url) + 1 || "—") : "—",
    };
  }).sort((a, b) => (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0));

  return normalized.length
    ? `
<table class="overview">
  <thead>
    <tr>
      <th style="width:26%">Image</th>
      <th style="width:12%">Severity</th>
      <th style="width:22%">Issue</th>
      <th>Comment</th>
      <th style="width:8%">Page</th>
    </tr>
  </thead>
  <tbody>
    ${normalized.map(r => `
      <tr>
        <td>${esc(r.image)}</td>
        <td>${esc(r.severity)}</td>
        <td>${esc(r.issue)}</td>
        <td>${esc(r.comment)}</td>
        <td>${r.page}</td>
      </tr>`).join("")}
  </tbody>
</table>`
    : `<p class="muted">No annotations added.</p>`;
}

function methodologySectionHtml(intake: Intake): string {
  const mapUrl = intake.site?.mapImageUrl || "";
  const equip = intake.equipment;
  const auth = intake.authorisation;
  const weather = intake.weather;
  const flight = intake.flight;
  const constraints = intake.constraints;
  const risk = intake.risk;

  const scopeChips = (intake.scope?.types || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
  const areaChips = (intake.areas || []).map((t) => `<span class="chip muted">${esc(t)}</span>`).join("");

  return `
  <div class="card">
    <h2>Methodology</h2>
    <div class="grid two">
      <div>
        <h3>Scope & Site</h3>
        <div class="chips">${scopeChips || `<span class="chip muted">—</span>`}</div>
        <div class="chips">${areaChips || ``}</div>
        ${mapUrl ? `<figure class="map"><img src="${esc(mapUrl)}" alt="Site map"/></figure>` : ""}
        <p><strong>Height limit:</strong> ${fmt(constraints?.heightLimitM)} m</p>
      </div>
      <div>
        <h3>Equipment & UAS ID</h3>
        <table class="kv">
          <tr><th>Manufacturer</th><td>${fmt(equip?.drone?.manufacturer)}</td></tr>
          <tr><th>Model</th><td>${fmt(equip?.drone?.model)}</td></tr>
          <tr><th>Type</th><td>${fmt(equip?.drone?.type)}</td></tr>
          <tr><th>Span</th><td>${fmt(equip?.specs?.spanM)} m</td></tr>
          <tr><th>MTOM</th><td>${fmt(equip?.specs?.tomKg)} kg</td></tr>
          <tr><th>Max speed</th><td>${fmt(equip?.specs?.maxSpeedMs)} m/s</td></tr>
          <tr><th>Serial</th><td>${fmt(equip?.identifiers?.serial)}</td></tr>
          <tr><th>UA reg mark</th><td>${fmt(equip?.identifiers?.uaReg)}</td></tr>
        </table>
        <p><strong>Certificates:</strong> ${fmt(
          [equip?.certificates?.tc, equip?.certificates?.dvr, equip?.certificates?.cofa, equip?.certificates?.noise]
            .filter(Boolean)
            .join(", ")
        )}</p>
      </div>
    </div>

    <div class="grid two">
      <div>
        <h3>Flight & Conditions</h3>
        <table class="kv">
          <tr><th>Type</th><td>${fmt(flight?.type)}</td></tr>
          <tr><th>Altitude</th><td>${fmt(flight?.altitudeMinM)}–${fmt(flight?.altitudeMaxM)} m</td></tr>
          <tr><th>Airtime</th><td>${fmt(flight?.airtimeMin)} min</td></tr>
          <tr><th>Crew</th><td>${fmt(flight?.crewCount)}</td></tr>
          <tr><th>Weather</th><td>${fmt(weather?.tempC)}°C, wind ${fmt(weather?.windMs)} m/s, ${fmt(weather?.precip)}, ${fmt(weather?.cloud)}</td></tr>
        </table>
      </div>
      <div>
        <h3>Risk & Authorisation</h3>
        <p><strong>Ground risk:</strong> ${fmt(risk?.ground?.characterisation)}; mitigations ${fmt(risk?.ground?.mitigations)}; ERP ${fmt(risk?.ground?.ERP)}</p>
        <p><strong>Air risk (ARC):</strong> op ${fmt(risk?.air?.residualARC?.operational)}, adj ${fmt(risk?.air?.residualARC?.adjacent)}; strategic ${fmt(risk?.air?.strategic)}</p>
        <p><strong>Authorisation:</strong> ${fmt(auth?.number)} ${auth?.expires ? `(exp ${esc(auth.expires)})` : ""}</p>
      </div>
    </div>
  </div>`;
}

function complianceSectionHtml(intake: Intake): string {
  return `
    <p><strong>Operator:</strong> ${esc(intake.operator?.name || "")} ${esc(intake.operator?.registration || "")}</p>
    ${
      intake.operator?.responsibleContact?.name ||
      intake.operator?.responsibleContact?.email ||
      intake.operator?.responsibleContact?.phone
        ? `<p><strong>Responsible:</strong> ${esc(intake.operator?.responsibleContact?.name || "")} ${esc(intake.operator?.responsibleContact?.email || "")} ${esc(intake.operator?.responsibleContact?.phone || "")}</p>`
        : ""
    }
    ${intake.compliance?.insuranceConfirmed ? `<p><strong>Insurance:</strong> confirmed</p>` : `<p class="muted">Insurance not declared.</p>`}
    ${intake.compliance?.omRef ? `<p><strong>OM ref:</strong> ${esc(intake.compliance.omRef)}</p>` : ""}
    ${intake.compliance?.evidenceRef ? `<p><strong>Evidence:</strong> ${esc(intake.compliance.evidenceRef)}</p>` : ""}
    ${intake.compliance?.eventsNote ? `<p><strong>Events note:</strong> ${esc(intake.compliance.eventsNote)}</p>` : ""}
    <p class="muted small">Documents retained ≥ 2 years per ops policy.</p>
  `;
}

function detailPageHtml(intake: Intake, pageIndex1: number): string {
  const images = intake.media?.images ?? [];
  const findings = (intake as any).findings || [];

  const findingByUrl = new Map<string, any>();
  for (const f of findings) {
    const url = f?.imageUrl || (Array.isArray(f?.imageRefs) ? f.imageRefs[0] : undefined);
    if (url) findingByUrl.set(url, f);
  }

  const pages = images.map((img) => {
    const f = findingByUrl.get(img.url) || {};
    const fn = esc(img.filename || "");
    const src = esc(img.thumb || img.url);
    const note = esc((img as any).note || "");
    const issue = esc(f.issue || "Finding");
    const severity = esc(f.severity || "None");
    const comment = esc(f.comment || "");
    return `
      <section class="detail-card">
        <div class="grid detail">
          <div>
            <img class="detail-img" src="${src}" alt="${fn || "image"}" />
          </div>
          <div>
            <h3>${issue}</h3>
            <div class="badges">${severity && severity !== "None" ? `<span class="badge">${severity}</span>` : ""}</div>
            <div class="fact"><b>Image:</b> ${fn || esc(img.url)}</div>
            <div class="fact"><b>Comment:</b> ${comment || "—"}</div>
            ${note ? `<div class="fact"><b>Notes:</b> ${note}</div>` : ""}
          </div>
        </div>
      </section>`;
  });

  const idx = Math.min(Math.max(1, pageIndex1), Math.max(1, pages.length)) - 1;
  return pages.length ? pages[idx] : `<p class="muted">No media supplied.</p>`;
}

function appendixPageHtml(intake: Intake, pageIndex1: number): string {
  const images = intake.media?.images ?? [];
  const chunks = chunkArray(images, PAGE_SIZE);
  const idx = Math.min(Math.max(1, pageIndex1), Math.max(1, chunks.length)) - 1;
  const page = chunks[idx] || [];

  if (!page.length) return `<section class="appendix-page"><h2>Media appendix</h2><p class="muted">No media supplied.</p></section>`;

  const figures = page.map((img) => {
    const fn = esc(img.filename || "");
    const note = esc((img as any).note || "");
    const src = esc(img.thumb || img.url);
    return `
      <figure style="display:grid;grid-template-columns:3fr 2fr;gap:12px;align-items:start;border:1px solid #E5E7EB;border-radius:4px;padding:8px;margin:0 0 12px 0;page-break-inside:avoid;break-inside:avoid;">
        <img src="${src}" alt="${fn}" style="width:100%;height:auto;object-fit:contain;border-radius:3px;" />
        <figcaption style="font-size:11px;color:#374151;word-break:break-word;margin:0;">
          <div style="font-weight:600;margin:0 0 6px 0;">${fn || "&nbsp;"}</div>
          ${note ? `<div style="white-space:pre-wrap;line-height:1.4;">${note}</div>` : `<div style="color:#9CA3AF;">&nbsp;</div>`}
        </figcaption>
      </figure>`;
  }).join("");

  return `
  <section class="appendix-page">
    <h2>Media appendix — page ${idx + 1}</h2>
    <div>${figures}</div>
  </section>`;
}

// Render a full doc from all sections (used by finalize)
export async function buildReportHtml(intake: Intake): Promise<string> {
  const tpl = await loadTemplate();

  const color = themeColor(intake.branding?.color);
  const coverHtml = coverSectionHtml(intake);
  const summaryHtml = summarySectionHtml(intake);
  const overviewHtml = overviewSectionHtml(intake);
  const methodologyHtml = methodologySectionHtml(intake);

  // Detailed annotations (all)
  const images = intake.media?.images ?? [];
  const allDetailPages = images.length
    ? images.map((_img, idx) => `<section class="detail-card ${idx > 0 ? "page-break" : ""}">${detailPageHtml(intake, idx + 1)}</section>`)
    : [`<p class="muted">No annotations added.</p>`];

  // Appendix (all)
  const chunks = chunkArray(images, PAGE_SIZE);
  const allAppendixPages = chunks.length
    ? chunks.map((_, idx) => `<section class="${idx > 0 ? "page-break" : ""}">${appendixPageHtml(intake, idx + 1)}</section>`)
    : [`<section class="appendix-page"><h2>Media appendix</h2><p class="muted">No media supplied.</p></section>`];

  const complianceHtml = complianceSectionHtml(intake);

  let html = tpl
    .replaceAll("{{THEME_COLOR}}", color)
    .replaceAll("{{COVER}}", coverHtml)
    .replaceAll("{{SUMMARY}}", summaryHtml)
    .replaceAll("{{OVERVIEW}}", overviewHtml)
    .replaceAll("{{METHODOLOGY}}", methodologyHtml)
    .replaceAll("{{DETAIL_PAGES}}", allDetailPages.join("\n"))
    .replaceAll("{{APPENDIX_PAGES}}", allAppendixPages.join("\n"))
    .replaceAll("{{COMPLIANCE}}", complianceHtml);

  return html;
}

// Single-page preview renderer
export async function buildPreviewPageHtml(intake: Intake, page: string): Promise<string> {
  const tpl = await loadTemplate();
  const color = themeColor(intake.branding?.color);

  let cover = "", summary = "", overview = "", methodology = "", detail = "", appendix = "", compliance = "";

  const mDetail = /^detail:(\d+)$/i.exec(page);
  const mAppendix = /^appendix:(\d+)$/i.exec(page);

  if (page === "cover") cover = coverSectionHtml(intake);
  else if (page === "summary") summary = summarySectionHtml(intake);
  else if (page === "overview") overview = overviewSectionHtml(intake);
  else if (page === "methodology") methodology = methodologySectionHtml(intake);
  else if (page === "compliance") compliance = complianceSectionHtml(intake);
  else if (mDetail) detail = detailPageHtml(intake, Math.max(1, parseInt(mDetail[1], 10)));
  else if (mAppendix) appendix = appendixPageHtml(intake, Math.max(1, parseInt(mAppendix[1], 10)));
  else cover = coverSectionHtml(intake); // default

  const html = tpl
    .replaceAll("{{THEME_COLOR}}", color)
    .replaceAll("{{COVER}}", cover)
    .replaceAll("{{SUMMARY}}", summary)
    .replaceAll("{{OVERVIEW}}", overview)
    .replaceAll("{{METHODOLOGY}}", methodology)
    .replaceAll("{{DETAIL_PAGES}}", detail)
    .replaceAll("{{APPENDIX_PAGES}}", appendix)
    .replaceAll("{{COMPLIANCE}}", compliance);

  return html;
}

/** HTML -> PDF via Gotenberg */
export async function renderPdfViaGotenberg(html: string): Promise<Buffer> {
  const base = (process.env.GOTENBERG_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("GOTENBERG_URL missing");
  const url = `${base}/forms/chromium/convert/html`;

  const form = new FormData();
  const file = new Blob([html], { type: "text/html; charset=utf-8" });
  form.append("files", file, "index.html");

  const timeoutMs = Number(process.env.PDF_TIMEOUT_MS || 60000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { method: "POST", body: form as any, signal: controller.signal });
    if (!resp.ok) { const msg = await safeText(resp as any); throw new Error(`Gotenberg error ${resp.status}: ${msg}`); }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
async function safeText(r: Response) { try { return await r.text(); } catch { return "<no-body>"; } }
