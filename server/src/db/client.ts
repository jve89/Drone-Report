import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // load root .env

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing (root .env).");
}

const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;

try {
  const u = new URL(connectionString);
  // mask creds
  console.log("[db] connecting", `${u.protocol}//${u.hostname}:${u.port}/${u.pathname.slice(1)}`, "ssl:", !!ssl);
} catch {}

export const db = new Pool({ connectionString, ssl });

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const res = await db.query(text, params);
  return { rows: res.rows as T[] };
}
