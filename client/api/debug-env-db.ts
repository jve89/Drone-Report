import type { VercelRequest, VercelResponse } from '@vercel/node'
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ has_DATABASE_URL: Boolean(process.env.DATABASE_URL), node: process.versions.node })
}
