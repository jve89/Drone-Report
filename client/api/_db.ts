import { createClient, type Client } from '@libsql/client'

let db: Client | null = null
export function getDB(): Client {
  if (db) return db
  const url = process.env.TURSO_DATABASE_URL
  const auth = process.env.TURSO_AUTH_TOKEN
  if (!url || !auth) throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  db = createClient({ url, authToken: auth })
  return db
}
