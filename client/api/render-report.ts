import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = { runtime: 'nodejs' }

function applyTemplate(template: string, payload: any): string {
  const contact = payload.contact ?? {}
  const notes = payload.notes ?? ''
  const logoUrl = payload.logoUrl ?? '/logo.svg'
  const brandColor = payload.brandColor ?? '#2563eb'
  return template
    .replace(/{{PROJECT}}/g, contact.project ?? '')
    .replace(/{{COMPANY}}/g, contact.company ?? '')
    .replace(/{{EMAIL}}/g, contact.email ?? '')
    .replace(/{{DATE}}/g, new Date().toISOString().slice(0, 10))
    .replace(/{{LOGO_URL}}/g, logoUrl)
    .replace(/{{BRAND_COLOR}}/g, brandColor)
    .replace(/{{NOTES}}/g, notes)
    .replace(/{{SUMMARY_ITEMS}}/g, payload.summaryItems ?? '')
    .replace(/{{FINDINGS_ROWS}}/g, payload.findingsRows ?? '')
    .replace(/{{VIDEOS_BLOCK}}/g, payload.videosBlock ?? '')
    .replace(/{{APPENDIX}}/g, payload.appendix ?? '')
}

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://drone-report.fly.dev'
const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS || 30000)

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
    let attempt = 0
    while (true) {
      attempt++
      const resp = await fetch(url, { method: 'POST', body: form as any, signal: controller.signal })
      if (resp.ok) return Buffer.from(await resp.arrayBuffer())
      if (attempt < 3 && [502, 503, 504].includes(resp.status)) continue
      const txt = await resp.text().catch(() => '')
      throw new Error(`Gotenberg ${resp.status}: ${txt}`)
    }
  } finally {
    clearTimeout(t)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const payload = req.body as any
    const templatePath = path.resolve(__dirname, '../templates/report.html')
    const altPath = path.join(process.cwd(), 'client', 'templates', 'report.html')
    let template: string
    try { template = await fs.readFile(templatePath, 'utf8') } catch { template = await fs.readFile(altPath, 'utf8') }

    const html: string = payload?.html ?? applyTemplate(template, payload ?? {})
    if (!html) return res.status(400).send('Missing html and no template found')

    const pdf = await htmlToPdf(html, 'report.pdf')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf')
    res.send(Buffer.from(pdf))
  } catch (err: any) {
    console.error('[render-report] error', err)
    if ((req as any)?.query?.debug === '1') return res.status(500).json({ error: String(err), stack: err?.stack })
    return res.status(500).send('Internal error')
  }
}
