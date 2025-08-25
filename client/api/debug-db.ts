import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.DATABASE_URL
  if (!url) return res.status(500).json({ ok:false, error:'Missing DATABASE_URL' })

  let Client: any
  try {
    // dynamic import to avoid build-time issues
    const mod = await import('pg')
    Client = mod.Client
  } catch (e:any) {
    return res.status(500).json({ ok:false, stage:'import', error:String(e) })
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    const r = await client.query('select now() as ts, current_user as usr')
    return res.json({ ok:true, ts: r.rows[0].ts, user: r.rows[0].usr, node: process.versions.node })
  } catch (e:any) {
    return res.status(500).json({ ok:false, stage:'connect/query', error:String(e) })
  } finally {
    try { await client.end() } catch {}
  }
}
