import type { VercelRequest, VercelResponse } from '@vercel/node'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url';
import path from 'node:path';

chromium.setHeadlessMode(true);
chromium.setGraphicsMode('disabled');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = { runtime: 'nodejs' }

type Contact = { email: string; company?: string; project: string }
type Media = { type: 'image' | 'video'; url: string; thumb: string; filename?: string; mime?: string; size?: number }
type Payload = {
  contact: Contact
  notes?: string
  brandColor?: string
  logoUrl?: string
  files: Media[]
  tier?: 'raw' | 'polished'
}

const MAX_IMAGES = 200
const MAX_VIDEOS = 3

const isImage = (m?: Media) => m?.type === 'image'
const isVideo = (m?: Media) => m?.type === 'video'

function sanitizeColor(hex?: string) {
  if (!hex) return '#1f2937'
  const m = hex.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i)
  return m ? hex : '#1f2937'
}

function formatDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function chunk<T>(arr: T[], size: number) {
  const res: T[][] = []
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size))
  return res
}

async function readTemplate(): Promise<string> {
  const a = path.resolve(__dirname, '../templates/report.html')
  const b = path.join(process.cwd(), 'client', 'templates', 'report.html')
  try {
    return await fs.readFile(a, 'utf8')
  } catch {
    return await fs.readFile(b, 'utf8')
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function getBaseUrl(req: VercelRequest) {
  const host = (req.headers['x-forwarded-host'] || req.headers.host) as string
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  return `${proto}://${host}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[create-draft] start')
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')
    const body = req.body as Payload
    if (!body?.contact?.email || !body?.contact?.project) return res.status(400).send('Missing required fields')
    if (!Array.isArray(body.files) || body.files.length === 0) return res.status(400).send('No media provided')

    const images = body.files.filter(isImage).slice(0, MAX_IMAGES)
    const videos = body.files.filter(isVideo).slice(0, MAX_VIDEOS)
    if (images.length + videos.length === 0) return res.status(400).send('No valid media after filtering')

    images.sort((a, b) => (a.filename || '').localeCompare(b.filename || '') || a.url.localeCompare(b.url))
    videos.sort((a, b) => (a.filename || '').localeCompare(b.filename || '') || a.url.localeCompare(b.url))

    const refs = images.map((img, i) => ({ ...img, ref: `IMG-${String(i + 1).padStart(3, '0')}` }))
    const findings = refs.filter((_, i) => i % 6 === 0).slice(0, 32).map(r => ({ ref: r.ref, caption: '', severity: '—' }))
    const appendixPages = chunk(refs, 12)

    const brandColor = sanitizeColor(body.brandColor)
    const baseUrl = getBaseUrl(req)
    const logoUrl = body.logoUrl || `${baseUrl}/logo.svg`
    const today = formatDate()

    const tpl = await readTemplate()
    const summaryBullets = [
      `Total media received: ${images.length} images${videos.length ? `, ${videos.length} videos` : ''}.`,
      `Auto-draft generated on ${today}.`,
      `This is a Raw Draft. Findings are unverified and watermarked.`,
    ]

    const findingsRows = findings.map(f => `
      <tr>
        <td>${f.ref}</td>
        <td>${esc(f.caption)}</td>
        <td>${f.severity}</td>
      </tr>
    `).join('')

    const appendixHtml = appendixPages.map((page, i) => `
      <div class="appendix-page">
        <h3>Appendix page ${i + 1}</h3>
        <div class="grid grid-12">
          ${page.map(r => `
            <div class="cell">
              <img src="${r.thumb}" alt="${esc(r.filename || r.ref)}" />
              <div class="ref">${r.ref}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')

    const videosBlock = videos.length ? `
      <div class="section">
        <h2>Videos</h2>
        <ul>
          ${videos.map((v, i) => `
            <li>
              <img class="poster" src="${v.thumb}" alt="Video ${i + 1} poster" />
              <div class="caption"><a href="${v.url}">Open video ${i + 1}</a></div>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''

    const html = tpl
      .replaceAll('{{PROJECT}}', esc(body.contact.project))
      .replaceAll('{{COMPANY}}', esc(body.contact.company || ''))
      .replaceAll('{{EMAIL}}', esc(body.contact.email))
      .replaceAll('{{DATE}}', esc(today))
      .replaceAll('{{BRAND_COLOR}}', brandColor)
      .replaceAll('{{LOGO_URL}}', esc(logoUrl))
      .replaceAll('{{SUMMARY_ITEMS}}', summaryBullets.map(b => `<li>${esc(b)}</li>`).join(''))
      .replaceAll('{{NOTES}}', esc(body.notes || ''))
      .replaceAll('{{FINDINGS_ROWS}}', findingsRows)
      .replaceAll('{{VIDEOS_BLOCK}}', videosBlock)
      .replaceAll('{{APPENDIX}}', appendixHtml)

    const execPath = await chromium.executablePath();
    console.log('Chromium exec path:', execPath);

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: true,
    });

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 36, right: 36, bottom: 36, left: 36 } })
    await browser.close()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=DroneReport_${body.contact.project.replace(/\s+/g, '_')}.pdf`)
    res.send(pdf)
  } catch (err: any) {
    console.error('[create-draft] error', err)
    if ((req as any)?.query?.debug === '1') {
      return res.status(500).json({ error: String(err), stack: err?.stack })
    }
    return res.status(500).send('Internal error')
  }
}
