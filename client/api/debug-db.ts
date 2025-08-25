import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_db'
const pool = getPool()

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getPool()
    const { rows } = await pool.query('select now() as ts')
    res.json({ ok: true, ts: rows[0].ts })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
