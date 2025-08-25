import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.DATABASE_URL
  if (!url) return res.status(500).json({ ok: false, error: 'Missing DATABASE_URL' })

  let neonFn: any
  try {
    const mod = await import('@neondatabase/serverless') // avoid import-time crash
    neonFn = mod.neon
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: `import failed: ${String(e)}`, node: process.versions.node })
  }

  try {
    const sql = neonFn(url)
    const rows = await sql`select now() as ts, current_user as usr`
    return res.json({ ok: true, ts: rows[0].ts, user: rows[0].usr })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e) })
  }
}
