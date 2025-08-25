// client/api/debug-db.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { pool } from './_db'

export const config = { runtime: 'nodejs' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { rows } = await pool.query('select now() as ts')
    res.json({ ok: true, ts: rows[0].ts })
  } catch (e:any) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
