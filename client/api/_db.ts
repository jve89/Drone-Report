import { Pool } from 'pg'
let _pool: Pool | null = null
export function getPool(): Pool {
  if (_pool) return _pool
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error('Missing DATABASE_URL')
  _pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 })
  return _pool
}
