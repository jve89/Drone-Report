import express from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { htmlToPdf } from "../pdf"

type Media = { type: "image" | "video"; url: string; thumb?: string; filename?: string }
type Contact = { email: string; company?: string; project: string }
type Payload = {
  contact: Contact
  notes?: string
  brandColor?: string
  logoUrl?: string
  files: Media[]
  tier?: "raw" | "polished"
}

const MAX_IMAGES = 200
const MAX_VIDEOS = 3
const isImage = (m?: Media) => m?.type === "image"
const isVideo = (m?: Media) => m?.type === "video"

const sanitizeColor = (hex?: string) =>
  hex?.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i) ? hex : "#1f2937"

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))

const fmtDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))

async function readTemplate(): Promise<string> {
  const file = path.resolve(__dirname, "../templates/report.html") // copied by build
  return fs.readFile(file, "utf8")
}

export const reports = express.Router()

reports.post("/create-draft", async (req: express.Request, res: express.Response) => {
  const body = req.body as Payload
  if (!body?.contact?.email || !body?.contact?.project) return res.status(400).send("Missing contact.email or contact.project")
  if (!Array.isArray(body.files) || body.files.length === 0) return res.status(400).send("No media provided")

  const images = body.files.filter(isImage).slice(0, MAX_IMAGES)
  const videos = body.files.filter(isVideo).slice(0, MAX_VIDEOS)
  if (images.length + videos.length === 0) return res.status(400).send("No valid media after filtering")

  images.sort((a, b) => (a.filename || "").localeCompare(b.filename || "") || a.url.localeCompare(b.url))
  videos.sort((a, b) => (a.filename || "").localeCompare(b.filename || "") || a.url.localeCompare(b.url))

  const refs = images.map((img, i) => ({ ...img, ref: `IMG-${String(i + 1).padStart(3, "0")}` }))
  const findings = refs.filter((_, i) => i % 6 === 0).slice(0, 32).map(r => ({ ref: r.ref, caption: "", severity: "—" }))
  const appendixPages = chunk(refs, 12)

  const brandColor = sanitizeColor(body.brandColor)
  const logoUrl = body.logoUrl || "/logo.svg"
  const today = fmtDate()

  const tpl = await readTemplate()
  const summary = [
    `Total media received: ${images.length} images${videos.length ? `, ${videos.length} videos` : ""}.`,
    `Auto-draft generated on ${today}.`,
    `This is a Raw Draft. Findings are unverified and watermarked.`
  ].map(b => `<li>${esc(b)}</li>`).join("")

  const findingsRows = findings.map(f => `
    <tr><td>${f.ref}</td><td>${esc(f.caption)}</td><td>${f.severity}</td></tr>
  `).join("")

  const appendixHtml = appendixPages.map((page, i) => `
    <div class="appendix-page">
      <h3>Appendix page ${i + 1}</h3>
      <div class="grid grid-12">
        ${page.map(r => `
          <div class="cell">
            <img src="${r.thumb || r.url}" alt="${esc(r.filename || r.ref)}" />
            <div class="ref">${r.ref}</div>
          </div>`).join("")}
      </div>
    </div>
  `).join("")

  const videosBlock = videos.length ? `
    <div class="section">
      <h2>Videos</h2>
      <ul>
        ${videos.map((v, i) => `
          <li>
            <img class="poster" src="${v.thumb || v.url}" alt="Video ${i + 1} poster" />
            <div class="caption"><a href="${v.url}">Open video ${i + 1}</a></div>
          </li>`).join("")}
      </ul>
    </div>` : ""

  const html = tpl
    .replaceAll("{{PROJECT}}", esc(body.contact.project))
    .replaceAll("{{COMPANY}}", esc(body.contact.company || ""))
    .replaceAll("{{EMAIL}}", esc(body.contact.email))
    .replaceAll("{{DATE}}", esc(today))
    .replaceAll("{{BRAND_COLOR}}", brandColor)
    .replaceAll("{{LOGO_URL}}", esc(logoUrl))
    .replaceAll("{{SUMMARY_ITEMS}}", summary)
    .replaceAll("{{NOTES}}", esc(body.notes || ""))
    .replaceAll("{{FINDINGS_ROWS}}", findingsRows)
    .replaceAll("{{VIDEOS_BLOCK}}", videosBlock)
    .replaceAll("{{APPENDIX}}", appendixHtml)

  const pdf = await htmlToPdf(html)
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename=DroneReport_${body.contact.project.replace(/\s+/g, "_")}.pdf`)
  res.send(pdf)
})
