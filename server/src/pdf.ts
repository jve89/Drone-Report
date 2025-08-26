const GOTENBERG_URL = process.env.GOTENBERG_URL || "https://drone-report.fly.dev"
const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS || 60000)

export async function htmlToPdf(html: string): Promise<Buffer> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), PDF_TIMEOUT_MS)
  try {
    const form = new FormData()
    form.append("files", new Blob([html], { type: "text/html" }), "index.html")
    form.append("paperWidth", "8.27")
    form.append("paperHeight", "11.69")
    form.append("marginTop", "0.5")
    form.append("marginBottom", "0.5")
    form.append("marginLeft", "0.5")
    form.append("marginRight", "0.5")
    form.append("printBackground", "true")
    const r = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, { method: "POST", body: form as any, signal: ctl.signal })
    if (!r.ok) throw new Error(`Gotenberg ${r.status}: ${await r.text().catch(() => "")}`)
    return Buffer.from(await r.arrayBuffer())
  } finally { clearTimeout(t) }
}
