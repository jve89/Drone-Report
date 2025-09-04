// server/src/services/authService.ts
import * as jwt from "jsonwebtoken";
import type { User } from "./userService";

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "change_me";

if (process.env.DEBUG_AUTH === "1") {
  console.log("[authService] SECRET.len", SECRET.length, "value starts with", SECRET.slice(0, 4));
}

export function signSession(user: User): string {
  // canonical payload uses { sub } for user id
  const token = jwt.sign({ sub: user.id, email: user.email }, SECRET, {
    algorithm: "HS256",
    expiresIn: "30d",
  });
  if (process.env.DEBUG_AUTH === "1") {
    console.log("[authService] issued token for user", user.id);
  }
  return token;
}

export function verifySession(token: string): { sub: string; email?: string } | null {
  try {
    return jwt.verify(token, SECRET) as any;
  } catch (err: any) {
    if (process.env.DEBUG_AUTH === "1") {
      console.log("[authService] verify failed:", err?.name, err?.message);
    }
    return null;
  }
}
