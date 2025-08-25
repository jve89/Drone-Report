import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { runtime: 'nodejs' }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const got = process.env.GOTENBERG_URL ? 'set' : 'missing'
  const timeout = process.env.PDF_TIMEOUT_MS || 'missing'
  const vite = process.env.VITE_UPLOADCARE_PUBLIC_KEY ? 'set' : 'missing'
  res.json({ GOTENBERG_URL: got, PDF_TIMEOUT_MS: timeout, VITE_UPLOADCARE_PUBLIC_KEY: vite })
}
