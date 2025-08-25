// client/api/env-db.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
export const config = { runtime: 'nodejs' }
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.DATABASE_URL || ''
  let host = ''
  try { host = new URL(url).hostname } catch {}
  res.json({ has_DATABASE_URL: Boolean(url), host })
}
