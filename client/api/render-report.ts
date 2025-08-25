import type { VercelRequest, VercelResponse } from '@vercel/node'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { html } = req.body as { html: string }
    if (!html) return res.status(400).send('Missing html')

    const executablePath = await chromium.executablePath()

    const headless =
      process.env.PUPPETEER_HEADLESS?.toLowerCase() === 'false' ? false : true

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    await browser.close()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf')
    res.send(pdf)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
