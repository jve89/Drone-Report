import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

export const db = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const res = (await db.query(text, params)) as unknown as { rows: any[] };
  return { rows: res.rows as T[] };
}
