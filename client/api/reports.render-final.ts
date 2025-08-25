import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_db'
const pool = getPool()

export const config = { runtime: 'nodejs' }

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://drone-report.fly.dev'
const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS || 60000)

async function htmlToPdf(html: string, filename = 'report.pdf', timeoutMs = PDF_TIMEOUT_MS): Promise<Buffer> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const form = new FormData()
    const blob = new Blob([html], { type: 'text/html' })
    form.append('files', blob, 'index.html')
    form.append('paperWidth', '8.27')
    form.append('paperHeight', '11.69')
    form.append('marginTop', '0.5')
    form.append('marginBottom', '0.5')
    form.append('marginLeft', '0.5')
    form.append('marginRight', '0.5')
    form.append('printBackground', 'true')
    const url = `${GOTENBERG_URL}/forms/chromium/convert/html`
    const resp = await fetch(url, { method: 'POST', body: form as any, signal: controller.signal })
    if (!resp.ok) throw new Error(`Gotenberg ${resp.status}: ${await resp.text().catch(() => '')}`)
    return Buffer.from(await resp.arrayBuffer())
  } finally {
    clearTimeout(t)
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  const { reportId } = (req.body || {}) as { reportId?: string }
  if (!reportId) return res.status(400).send('Missing reportId')

  const pool = await getPool()
  const client = await pool.connect()
  try {
    const r = await client.query('select * from reports where id=$1', [reportId])
    if (!r.rows.length) return res.status(404).send('Report not found')
    const report = r.rows[0]
    const media = (await client.query('select * from media where report_id=$1 order by position asc', [reportId])).rows
    const findings = (
      await client.query(
        `select f.*, array_agg(m.ref_code order by m.position) as media_refs
         from findings f
         left join finding_media fm on fm.finding_id=f.id
         left join media m on m.id=fm.media_id
         where f.report_id=$1
         group by f.id
         order by f.updated_at desc`,
        [reportId]
      )
    ).rows

    const today = new Date().toISOString().slice(0, 10)
    const summaryItems = [
      `Total media: ${media.filter(m => m.kind === 'image').length} images${
        media.some(m => m.kind === 'video') ? `, ${media.filter(m => m.kind === 'video').length} videos` : ''
      }`,
      `Generated on ${today}.`,
      `Project date: ${report.inspection_date ?? today}.`,
    ]
      .map(x => `<li>${esc(x)}</li>`)
      .join('')

    const findingsRows = findings
      .map(
        (f: any) => `
      <tr>
        <td>${esc(f.title || '')}</td>
        <td>${esc(f.caption || '')}</td>
        <td>${esc(f.severity || '')}</td>
        <td>${(f.media_refs || []).map((r: string) => `<code>${esc(r)}</code>`).join(', ')}</td>
      </tr>
    `
      )
      .join('')

    const grid = media
      .filter((m: any) => m.kind === 'image')
      .map(
        (m: any) => `
      <div class="cell">
        <img src="${m.thumb || m.url}" alt="${esc(m.filename || m.ref_code)}" />
        <div class="ref">${esc(m.ref_code)}</div>
      </div>
    `
      )
      .join('')

    const brand = report.brand_color || '#6B7280'
    const logo = report.logo_url || ''
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>DroneReport</title>
<style>
:root{--brand:${brand};--ink:#111827;--muted:#6b7280;--line:#e5e7eb}
*{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans";color:var(--ink)}
h1,h2,h3{margin:0 0 .5rem 0} h1{font-size:24px} h2{font-size:18px;border-bottom:1px solid var(--line);padding-bottom:.25rem;margin-top:1rem}
p,li,td,th{font-size:12px;line-height:1.5}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--brand);padding-bottom:.5rem;margin-bottom:1rem}
.logo{height:36px}
.meta{text-align:right;font-size:11px;color:var(--muted)}
.table{width:100%;border-collapse:collapse} .table th{color:var(--muted);border-bottom:1px solid var(--line);padding:.5rem;text-align:left}
.table td{border-bottom:1px solid var(--line);padding:.5rem;vertical-align:top}
.grid{display:grid;gap:.5rem} .grid-12{grid-template-columns:repeat(6,1fr)}
.cell{border:1px solid var(--line);padding:.25rem;border-radius:.25rem}
.cell img{width:100%;height:auto;display:block} .cell .ref{text-align:center;font-size:10px;color:var(--muted);margin-top:.25rem}
.footer{position:fixed;bottom:12px;left:0;right:0;text-align:center;font-size:10px;color:var(--muted)}
.watermark{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;color:rgba(17,24,39,0.06);transform:rotate(-30deg);z-index:0;pointer-events:none}
.content{position:relative;z-index:1}
.cover{page-break-after:always}
.toc{page-break-after:always}
.appendix-page{page-break-before:always}
</style></head>
<body>
<div class="watermark">DRAFT</div>
<div class="content">
<section class="cover">
  <div class="header">
    <div style="display:flex;align-items:center;gap:.5rem">
      ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ``}
      <h1>Drone Inspection Report</h1>
    </div>
    <div class="meta">
      <div><strong>Project:</strong> ${esc(report.project)}</div>
      <div><strong>Company:</strong> ${esc(report.company)}</div>
      ${report.contact_name ? `<div><strong>Contact:</strong> ${esc(report.contact_name)}</div>` : ''}
      ${report.phone ? `<div><strong>Phone:</strong> ${esc(report.phone)}</div>` : ''}
      ${report.site_address ? `<div><strong>Address:</strong> ${esc(report.site_address)}</div>` : ''}
      <div><strong>Date:</strong> ${esc(String(report.inspection_date || today))}</div>
      <div><strong>Email:</strong> ${esc(report.email)}</div>
    </div>
  </div>
  <p style="color:var(--muted)">Generated ${esc(today)} • Brand color ${esc(brand)}</p>
</section>

<section class="toc">
  <h2>Contents</h2>
  <ol>
    <li>Site & Inspection Details</li>
    <li>Executive Summary</li>
    <li>Findings</li>
    <li>Media Contact Sheets</li>
  </ol>
</section>

<section>
  <h2>Site & Inspection Details</h2>
  <table class="table">
    <tbody>
      ${report.site_address ? `<tr><th style="width:160px">Site address</th><td>${esc(report.site_address)}</td></tr>` : ''}
      <tr><th>Inspection date</th><td>${esc(String(report.inspection_date || today))}</td></tr>
      <tr><th>Operator</th><td>${esc(report.company)}</td></tr>
    </tbody>
  </table>
</section>

<section>
  <h2>Executive Summary</h2>
  <ul>${summaryItems}</ul>
</section>

<section>
  <h2>Findings</h2>
  <table class="table">
    <thead><tr><th style="width:120px">Title</th><th>Caption</th><th style="width:80px">Severity</th><th style="width:160px">Refs</th></tr></thead>
    <tbody>${findingsRows || `<tr><td colspan="4" style="color:var(--muted)">No findings recorded.</td></tr>`}</tbody>
  </table>
</section>

<section class="appendix">
  <h2>Appendix: Contact sheets</h2>
  <div class="grid grid-12">${grid}</div>
</section>
</div>
<div class="footer">DroneReport • Generated ${esc(today)} • Draft for review</div>
</body></html>`

    const pdf = await htmlToPdf(html, `DroneReport_${report.project.replace(/\s+/g, '_')}.pdf`)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=DroneReport_${report.project.replace(/\s+/g, '_')}.pdf`)
    return res.send(pdf)
  } catch (e: any) {
    return res.status(500).json({ error: String(e) })
  } finally {
    client.release()
  }
}
