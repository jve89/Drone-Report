import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: '2025-01-27.acacia' as any
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sessionId = req.query.session_id as string
    if (!sessionId) return res.status(400).json({ error: 'Missing session_id' })

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') {
      return res.json({ paid: true })
    } else {
      return res.json({ paid: false })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
