import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDB } from './_db'

export const config = { runtime: 'nodejs' }

const SQL = `
create table if not exists reports(
  id text primary key,
  project text not null,
  company text not null,
  contact_name text,
  email text not null,
  phone text,
  site_address text,
  inspection_date text,
  brand_color text,
  logo_url text,
  created_at text default (datetime('now'))
);
create table if not exists media(
  id text primary key,
  report_id text not null,
  kind text check (kind in ('image','video')) not null,
  url text not null,
  thumb text,
  filename text,
  mime text,
  size_bytes integer,
  capture_time text,
  exif text,
  camera text,
  ref_code text,
  position integer,
  created_at text default (datetime('now'))
);
create table if not exists findings(
  id text primary key,
  report_id text not null,
  title text,
  caption text,
  severity text check (severity in ('low','medium','high')),
  coords text,
  tags text,
  created_by text,
  updated_at text default (datetime('now'))
);
create table if not exists finding_media(
  finding_id text not null,
  media_id text not null,
  unique(finding_id, media_id)
);
`;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDB()
    const stmts = SQL.split(';').map(s => s.trim()).filter(Boolean).map(sql => ({ sql }))
    await db.batch(stmts)
    res.json({ ok: true })
  } catch (e:any) {
    res.status(500).json({ ok:false, error:String(e) })
  }
}
