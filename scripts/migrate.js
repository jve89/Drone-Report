// simple file-based migrator
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Missing DATABASE_URL')

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()

  await client.query(`create table if not exists schema_migrations(
    filename text primary key,
    applied_at timestamptz not null default now()
  )`)

  const dir = path.resolve(__dirname, '../migrations')
  const files = (await fs.readdir(dir)).filter(f => /^\d+_.+\.sql$/.test(f)).sort()
  for (const f of files) {
    const { rows } = await client.query('select 1 from schema_migrations where filename=$1', [f])
    if (rows.length) continue
    const sql = await fs.readFile(path.join(dir, f), 'utf8')
    console.log('Applying', f)
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations(filename) values($1)', [f])
      await client.query('commit')
      console.log('Applied', f)
    } catch (e) {
      await client.query('rollback')
      console.error('Failed', f, e)
      process.exit(1)
    }
  }
  await client.end()
  console.log('Migrations up to date')
}

main().catch(e => { console.error(e); process.exit(1) })
