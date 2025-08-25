// client/api/debug-db.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.DATABASE_URL
    if (!url) return res.status(500).json({ ok: false, error: 'Missing DATABASE_URL' })
    const sql = neon(url)
    const rows = await sql`select now() as ts`
    res.json({ ok: true, ts: rows[0].ts })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
