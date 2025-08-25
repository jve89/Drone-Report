import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { pool } from './_db'

export const config = { runtime: 'nodejs' }

const Finding = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  severity: z.enum(['low','medium','high']).nullable().optional(),
  coords: z.any().optional(),
  tags: z.array(z.string()).optional(),
  mediaRefs: z.array(z.string()).default([]) // e.g., ['IMG-001','IMG-007']
})
const Body = z.object({
  reportId: z.string().uuid(),
  findings: z.array(Finding).min(1)
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { reportId, findings } = parsed.data

  const client = await pool.connect()
  try {
    await client.query('begin')
    const out:any[] = []
    for (const f of findings) {
      let fid = f.id ?? null
      if (fid) {
        await client.query(
          `update findings set title=$1, caption=$2, severity=$3, coords=$4, tags=$5, updated_at=now()
           where id=$6 and report_id=$7`,
          [f.title||null,f.caption||null,f.severity||null,f.coords||null,f.tags||null,fid,reportId]
        )
        await client.query(`delete from finding_media using media
          where finding_media.finding_id=$1 and media.id=finding_media.media_id and media.report_id=$2`, [fid, reportId])
      } else {
        const r = await client.query(
          `insert into findings(report_id,title,caption,severity,coords,tags,created_by)
           values($1,$2,$3,$4,$5,$6,'user') returning id`,
          [reportId,f.title||null,f.caption||null,f.severity||null,f.coords||null,f.tags||null]
        )
        fid = r.rows[0].id
      }
      if (f.mediaRefs.length) {
        const mids = await client.query(
          `select id from media where report_id=$1 and ref_code = any($2::text[])`,
          [reportId, f.mediaRefs]
        )
        for (const row of mids.rows) {
          await client.query(`insert into finding_media(finding_id,media_id) values($1,$2) on conflict do nothing`, [fid, row.id])
        }
      }
      out.push({ id: fid })
    }
    await client.query('commit')
    return res.json({ ok: true, findings: out })
  } catch (e:any) {
    await client.query('rollback')
    return res.status(500).json({ error: String(e) })
  } finally {
    client.release()
  }
}
