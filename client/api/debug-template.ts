import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'node:fs/promises'
import path from 'node:path'

export const config = { runtime: 'nodejs' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const rel = path.join(process.cwd(), 'client', 'templates', 'report.html')
    const alt = path.resolve(__dirname, '../templates/report.html')

    let picked: string
    try {
      await fs.access(rel)
      picked = rel
    } catch {
      try {
        await fs.access(alt)
        picked = alt
      } catch {
        return res.status(404).json({ ok: false, error: 'report.html not found' })
      }
    }

    const size = (await fs.stat(picked)).size
    return res.json({ ok: true, path: picked, size })
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
