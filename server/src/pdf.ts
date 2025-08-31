import fs from "node:fs/promises";
import path from "node:path";
import { chunkArray } from "./utils/chunkMedia";
import type { Intake } from "@drone-report/shared/dist/types/intake";

// Helpers
function esc(s?: string) {
  return (s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]
  );
}
function fmt(val?: unknown) {
  if (val === undefined || val === null || val === "") return "—";
  return String(val);
}
function themeColor(hex?: string) {
  return hex && /^#([0-9A-Fa-f]{6})$/.test(hex) ? hex : "#6B7280";
}
async function loadTemplate(): Promise<string> {
  const p = path.join(__dirname, "templates", "report.html");
  return fs.readFile(p, "utf8");
}

/**
 * Build HTML by injecting intake fields into template.
 */
export async function buildReportHtml(intake: Intake): Promise<string> {
  const tpl = await loadTemplate();

  const color = themeColor(intake.branding?.color);
  const logoTag = intake.branding?.logoUrl ? `<img class="logo" src="${esc(intake.branding.logoUrl)}" alt="Logo"/>` : "";
  const mapUrl = intake.site?.mapImageUrl || "";
  const dateStr = fmt(intake.inspection?.date);
  const project = esc(intake.contact.project);
  const company = esc(intake.contact.company);
  const location = esc(intake.site?.address || "");
  const videos = intake.media?.videos ?? [];
  const images = intake.media?.images ?? [];

  const summaryHtml =
    intake.summary?.condition || intake.summary?.urgency || intake.summary?.topIssues?.length
      ? `
  <div class="card">
    <h2>Executive summary</h2>
    <div class="badges">
      ${intake.summary?.condition ? `<span class="badge">${esc(intake.summary.condition)}</span>` : ""}
      ${intake.summary?.urgency ? `<span class="badge warn">${esc(intake.summary.urgency)}</span>` : ""}
    </div>
    ${
      (intake.summary?.topIssues || [])
        .map((t) => `<li>${esc(t)}</li>`)
        .join("") || `<p class="muted">No summary provided.</p>`
    }
  </div>`
      : `<div class="card"><h2>Executive summary</h2><p class="muted">No summary provided.</p></div>`;

  const equip = intake.equipment;
  const auth = intake.authorisation;
  const weather = intake.weather;
  const flight = intake.flight;
  const constraints = intake.constraints;
  const risk = intake.risk;

  const scopeChips = (intake.scope?.types || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
  const areaChips = (intake.areas || []).map((t) => `<span class="chip muted">${esc(t)}</span>`).join("");

  const methodologyHtml = `
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
          <tr><th>Weather</th><td>${fmt(weather?.tempC)}°C, wind ${fmt(weather?.windMs)} m/s, ${fmt(
    weather?.precip
  )}, ${fmt(weather?.cloud)}</td></tr>
        </table>
      </div>
      <div>
        <h3>Risk & Authorisation</h3>
        <p><strong>Ground risk:</strong> ${fmt(risk?.ground?.characterisation)}; mitigations ${fmt(
    risk?.ground?.mitigations
  )}; ERP ${fmt(risk?.ground?.ERP)}</p>
        <p><strong>Air risk (ARC):</strong> op ${fmt(risk?.air?.residualARC?.operational)}, adj ${fmt(
    risk?.air?.residualARC?.adjacent
  )}; strategic ${fmt(risk?.air?.strategic)}</p>
        <p><strong>Authorisation:</strong> ${fmt(auth?.number)} ${auth?.expires ? `(exp ${esc(auth.expires)})` : ""}</p>
      </div>
    </div>
  </div>`;

  const findings = intake.findings || [];
  const findingsHtml =
    findings.length > 0
      ? findings
          .map((f) => {
            const thumbs = (f.imageRefs || [])
              .map((id) => {
                const img = images.find((i) => i.id === id || i.filename === id || i.url === id);
                if (!img) return "";
                const src = img.thumb || img.url;
                return `<img class="thumb" src="${esc(src)}" alt="${esc(img.filename || "image")}"/>`;
              })
              .join("");
            return `
            <div class="finding">
              <h3>${esc(f.area)} · ${esc(f.defect)}</h3>
              <div class="badges">
                ${f.severity ? `<span class="badge">${esc(f.severity)}</span>` : ""}
                ${f.recommendation ? `<span class="badge info">${esc(f.recommendation)}</span>` : ""}
              </div>
              ${f.note ? `<p>${esc(f.note)}</p>` : ""}
              ${thumbs ? `<div class="thumbs">${thumbs}</div>` : ""}
            </div>`;
          })
          .join("")
      : `<p class="muted">No findings entered. Raw report shows media in appendix.</p>`;

  // --- MEDIA APPENDIX: 3 items per page, each item 60/40 figure (inline styles to defeat external CSS) ---
  const PAGE_SIZE = 3;
  const imagePages = chunkArray(images, PAGE_SIZE).map((page, idx) => {
    const figures = page
      .map((img) => {
        const fn = esc(img.filename || "");
        const src = esc(img.thumb || img.url);
        return `
        <figure style="
          display:grid;
          grid-template-columns:3fr 2fr; /* 60/40 */
          gap:12px;
          align-items:start;
          border:1px solid #E5E7EB;
          border-radius:4px;
          padding:8px;
          margin:0 0 12px 0;
          page-break-inside:avoid;
          break-inside:avoid;
        ">
          <img src="${src}" alt="${fn}" style="width:100%;height:auto;object-fit:contain;border-radius:3px;" />
          <figcaption style="font-size:11px;color:#6B7280;word-break:break-all;margin:0;">
            ${fn || "&nbsp;"}
          </figcaption>
        </figure>`;
      })
      .join("");
    return `
    <section class="appendix-page ${idx > 0 ? "page-break" : ""}">
      <h2>Media appendix — page ${idx + 1}</h2>
      <div>${figures}</div>
    </section>`;
  });

  const videosList =
    videos.length > 0
      ? `<ul>${videos
          .map(
            (v) =>
              `<li><strong>${esc(v.filename || "video")}</strong>: <a href="${esc(v.url)}">${esc(v.url)}</a></li>`
          )
          .join("")}</ul>`
      : `<p class="muted">No videos.</p>`;

  const complianceHtml = `
    <p><strong>Operator:</strong> ${esc(intake.operator?.name || "")} ${esc(
    intake.operator?.registration || ""
  )}</p>
    ${
      intake.operator?.responsibleContact?.name ||
      intake.operator?.responsibleContact?.email ||
      intake.operator?.responsibleContact?.phone
        ? `<p><strong>Responsible:</strong> ${esc(
            intake.operator?.responsibleContact?.name || ""
          )} ${esc(intake.operator?.responsibleContact?.email || "")} ${esc(
            intake.operator?.responsibleContact?.phone || ""
          )}</p>`
        : ""
    }
    ${
      intake.compliance?.insuranceConfirmed
        ? `<p><strong>Insurance:</strong> confirmed</p>`
        : `<p class="muted">Insurance not declared.</p>`
    }
    ${
      intake.compliance?.omRef
        ? `<p><strong>OM ref:</strong> ${esc(intake.compliance.omRef)}</p>`
        : ""
    }
    ${
      intake.compliance?.evidenceRef
        ? `<p><strong>Evidence:</strong> ${esc(intake.compliance.evidenceRef)}</p>`
        : ""
    }
    ${
      intake.compliance?.eventsNote
        ? `<p><strong>Events note:</strong> ${esc(intake.compliance.eventsNote)}</p>`
        : ""
    }
    <p class="muted small">Documents retained ≥ 2 years per ops policy.</p>
  `;

  let html = tpl
    .replaceAll("{{THEME_COLOR}}", color)
    .replaceAll("{{PROJECT}}", project)
    .replaceAll("{{COMPANY}}", company)
    .replaceAll("{{DATE}}", esc(dateStr))
    .replaceAll("{{LOCATION}}", location || "—")
    .replaceAll("{{LOGO_TAG}}", logoTag)
    .replaceAll("{{SUMMARY}}", summaryHtml)
    .replaceAll("{{METHODOLOGY}}", methodologyHtml)
    .replaceAll("{{FINDINGS}}", findingsHtml)
    .replaceAll("{{APPENDIX_PAGES}}", imagePages.join("\n"))
    .replaceAll("{{VIDEOS}}", videosList)
    .replaceAll("{{COMPLIANCE}}", complianceHtml);

  return html;
}

/**
 * Send HTML to Gotenberg and return a PDF buffer.
 * Reads env at call time to avoid stale values.
 */
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
    const resp = await fetch(url, {
      method: "POST",
      body: form as any,
      signal: controller.signal,
    });

    if (!resp.ok) {
      const msg = await safeText(resp as any);
      throw new Error(`Gotenberg error ${resp.status}: ${msg}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "<no-body>";
  }
}
