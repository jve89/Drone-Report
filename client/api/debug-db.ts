import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Client } from 'pg'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.DATABASE_URL
  if (!url) return res.status(500).json({ ok: false, error: 'Missing DATABASE_URL' })
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    const r = await client.query('select now() as ts, current_user as usr, version() as ver')
    res.json({ ok: true, ts: r.rows[0].ts, user: r.rows[0].usr, pg: r.rows[0].ver, node: process.versions.node })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e), node: process.versions.node })
  } finally {
    try { await client.end() } catch {}
  }
}
