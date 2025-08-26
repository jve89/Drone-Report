import type { VercelRequest, VercelResponse } from '@vercel/node'
export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const mod = await import('@libsql/client').catch(e => { throw new Error('import:@libsql/client failed: ' + String(e)) })
    const { createClient } = mod as any

    const url = process.env.TURSO_DATABASE_URL
    const auth = process.env.TURSO_AUTH_TOKEN
    if (!url || !auth) return res.status(500).json({ ok:false, error:'Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN' })

    const db = createClient({ url, authToken: auth })
    const r = await db.execute('select 1 as ok')
    return res.json({ ok: true, result: r.rows[0], node: process.versions.node })
  } catch (e:any) {
    return res.status(500).json({ ok:false, error: String(e), node: process.versions.node })
  }
}
