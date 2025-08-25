import { Pool } from 'pg'

const cs = process.env.DATABASE_URL
if (!cs) throw new Error('Missing DATABASE_URL')

export const pool = new Pool({
  connectionString: cs,
  ssl: { rejectUnauthorized: false },
  max: 5, // serverless-friendly
})
