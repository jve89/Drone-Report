import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getPool } from './_db'
const pool = getPool()

export const config = { runtime: 'nodejs' }

const Media = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().url(),
  thumb: z.string().url().optional(),
  filename: z.string().optional(),
  mime: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  captureTime: z.string().datetime().optional(),
  exif: z.any().optional(),
  camera: z.any().optional(),
})

const Body = z.object({
  project: z.string().min(1),
  company: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  siteAddress: z.string().optional(),
  inspectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  brandColor: z.string().optional(),
  logoUrl: z.string().url().optional(),
  files: z.array(Media).min(1).max(203),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const b = parsed.data

  const pool = await getPool()
  const client = await pool.connect()
  try {
    await client.query('begin')

    const r = await client.query(
      `insert into reports(project,company,contact_name,email,phone,site_address,inspection_date,brand_color,logo_url)
       values($1,$2,$3,$4,$5,$6,coalesce($7,current_date),$8,$9)
       returning id`,
      [b.project, b.company, b.contactName, b.email, b.phone, b.siteAddress, b.inspectionDate, b.brandColor, b.logoUrl]
    )
    const reportId = r.rows[0].id

    const images = b.files.filter(f => f.type === 'image')
    const videos = b.files.filter(f => f.type === 'video')

    let pos = 0
    for (const list of [images, videos]) {
      for (const f of list) {
        pos += 1
        const ref = (f.type === 'image' ? 'IMG' : 'VID') + '-' + String(pos).padStart(3, '0')
        await client.query(
          `insert into media(report_id,kind,url,thumb,filename,mime,size_bytes,capture_time,exif,camera,phash,ref_code,position)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,null,$11,$12)`,
          [
            reportId,
            f.type,
            f.url,
            f.thumb || null,
            f.filename || null,
            f.mime || null,
            f.size || null,
            f.captureTime || null,
            f.exif || null,
            f.camera || null,
            ref,
            pos,
          ]
        )
      }
    }

    await client.query('commit')
    return res.json({ reportId })
  } catch (e: any) {
    await client.query('rollback')
    return res.status(500).json({ error: String(e) })
  } finally {
    client.release()
  }
}
