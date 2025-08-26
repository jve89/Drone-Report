import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDB } from './_db'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDB()
    const r = await db.execute('select 1 as ok')
    res.json({ ok: true, result: r.rows[0] })
  } catch (e:any) {
    res.status(500).json({ ok:false, error:String(e) })
  }
}
