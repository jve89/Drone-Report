// client/api/_db.ts
import { Pool } from '@neondatabase/serverless'

let _pool: Pool | null = null

export function getPool(): Pool {
  if (_pool) return _pool
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error('Missing DATABASE_URL')
  _pool = new Pool({ connectionString: cs }) // HTTP/WS, serverless-safe
  return _pool
}
