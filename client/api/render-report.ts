import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

chromium.setHeadlessMode(true);
chromium.setGraphicsMode('disabled');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = { runtime: 'nodejs' };

function applyTemplate(template: string, payload: any): string {
  const contact = payload.contact ?? {};
  const notes = payload.notes ?? '';
  const logoUrl = payload.logoUrl ?? '/logo.svg';
  const brandColor = payload.brandColor ?? '#2563eb';
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
    .replace(/{{APPENDIX}}/g, payload.appendix ?? '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[render-report] start')
    const payload = req.body as any;

    const templatePath = path.resolve(__dirname, '../templates/report.html');
    const altPath = path.join(process.cwd(), 'client', 'templates', 'report.html');
    let template: string;
    try {
      template = await fs.readFile(templatePath, 'utf8');
    } catch {
      template = await fs.readFile(altPath, 'utf8');
    }

    const html: string = payload.html ?? applyTemplate(template, payload);
    if (!html) return res.status(400).send('Missing html and no template found');

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

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    res.send(pdf);
  } catch (err: any) {
    console.error('[render-report] error', err)
    if ((req as any)?.query?.debug === '1') {
      return res.status(500).json({ error: String(err), stack: err?.stack });
    }
    return res.status(500).send('Internal error');
  }
}
