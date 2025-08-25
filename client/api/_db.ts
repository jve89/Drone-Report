import type { Pool as PGPool } from 'pg'

let _pool: PGPool | null = null

export async function getPool(): Promise<PGPool> {
  if (_pool) return _pool
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error('Missing DATABASE_URL')
  const { Pool } = await import('pg') // dynamic import for serverless
  _pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 5 })
  return _pool
}
