// server/src/services/userService.ts
import { query } from "../db/client";
import bcrypt from "bcryptjs";

export type User = { id: string; email: string; created_at: string };
export type UserWithPassword = User & { password_hash: string };

export async function createUser(email: string, password: string): Promise<User> {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query<User>(
    `insert into users (email, password_hash) values (lower($1), $2)
     returning id, email, created_at`,
    [email, hash]
  );
  return rows[0];
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const { rows } = await query<UserWithPassword>(
    `select id, email, password_hash, created_at from users where email = lower($1)`,
    [email]
  );
  return rows[0] ?? null;
}

export async function verifyPassword(user: { password_hash: string }, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await query<User>(
    `select id, email, created_at from users where id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
