// server/src/services/authService.ts
import * as jwt from "jsonwebtoken";
import type { User } from "./userService";

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "change_me";

export function signSession(user: User): string {
  // canonical payload uses { sub } for user id
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, {
    algorithm: "HS256",
    expiresIn: "30d",
  });
}

export function verifySession(token: string): { sub: string; email?: string } | null {
  try {
    return jwt.verify(token, SECRET) as any;
  } catch {
    return null;
  }
}
