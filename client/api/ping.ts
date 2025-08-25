// client/api/ping.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
export const config = { runtime: 'nodejs' }
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).send('ok')
}
