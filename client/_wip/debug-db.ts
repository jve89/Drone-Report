import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_db'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getPool()
    const { rows } = await pool.query('select now() as ts, current_user as usr')
    res.json({ ok: true, ts: rows[0].ts, user: rows[0].usr })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
