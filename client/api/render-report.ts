import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

// Ensure Node runtime (not Edge)
export const config = { runtime: 'nodejs' }

// Helper to fill placeholders
function applyTemplate(template: string, payload: any): string {
  const contact = payload.contact ?? {};
  const notes = payload.notes ?? '';
  const logoUrl = payload.logoUrl ?? '/logo.svg';
  const brandColor = payload.brandColor ?? '#2563eb'; // default blue

  return template
    .replace(/{{PROJECT}}/g, contact.project ?? '')
    .replace(/{{COMPANY}}/g, contact.company ?? '')
    .replace(/{{EMAIL}}/g, contact.email ?? '')
    .replace(/{{DATE}}/g, new Date().toISOString().slice(0, 10))
    .replace(/{{LOGO_URL}}/g, logoUrl)
    .replace(/{{BRAND_COLOR}}/g, brandColor)
    .replace(/{{NOTES}}/g, notes)
    // leave blocks if not provided
    .replace(/{{SUMMARY_ITEMS}}/g, payload.summaryItems ?? '')
    .replace(/{{FINDINGS_ROWS}}/g, payload.findingsRows ?? '')
    .replace(/{{VIDEOS_BLOCK}}/g, payload.videosBlock ?? '')
    .replace(/{{APPENDIX}}/g, payload.appendix ?? '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const payload = req.body as any;

    // Resolve template path
    const templatePath = path.resolve(__dirname, '../templates/report.html');
    const altPath = path.join(process.cwd(), 'client', 'templates', 'report.html');

    let template: string;
    try {
      template = await fs.readFile(templatePath, 'utf8');
    } catch {
      template = await fs.readFile(altPath, 'utf8');
    }

    // If request provides raw html, use it; else fill template
    let html: string = payload.html ?? applyTemplate(template, payload);
    if (!html) return res.status(400).send('Missing html and no template found');

    const executablePath = await chromium.executablePath();
    const headless =
      process.env.PUPPETEER_HEADLESS?.toLowerCase() === 'false' ? false : true;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    res.send(pdf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
