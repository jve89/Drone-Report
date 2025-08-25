// client/api/_db.ts
import { Pool } from 'pg'

export type DBPool = Pool

let _pool: DBPool | null = null

export function getPool(): DBPool {
  if (_pool) return _pool
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error('Missing DATABASE_URL')
  _pool = new Pool({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  })
  return _pool
}
