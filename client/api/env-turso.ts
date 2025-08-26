import type { VercelRequest, VercelResponse } from '@vercel/node'
export const config = { runtime: 'nodejs' }
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.TURSO_DATABASE_URL || ''
  const token = process.env.TURSO_AUTH_TOKEN || ''
  res.json({
    has_url: Boolean(url),
    has_token: Boolean(token),
    node: process.versions.node
  })
}
