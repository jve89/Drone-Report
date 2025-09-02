import jwt from "jsonwebtoken";
import type { User } from "./userService";

const SECRET = process.env.SESSION_SECRET || "dev_secret";

export function signSession(user: User): string {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { algorithm: "HS256" });
}

export function verifySession(token: string): { sub: string; email: string } | null {
  try {
    return jwt.verify(token, SECRET) as any;
  } catch {
    return null;
  }
}
