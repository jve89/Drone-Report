import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_db'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ ok:false, error:'Missing DATABASE_URL' })
    const pool = getPool()
    const { rows } = await pool.query('select now() as ts')
    res.json({ ok: true, ts: rows[0].ts })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
