// server/src/services/authService.ts
import * as jwt from "jsonwebtoken";
import type { User } from "./userService";

interface SessionPayload {
  sub: string;
  email?: string;
}

const RAW_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";
if (!RAW_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("[authService] JWT secret not configured (SESSION_SECRET or JWT_SECRET)");
}
const SECRET = RAW_SECRET || "change_me"; // dev fallback only

if (process.env.DEBUG_AUTH === "1") {
  console.log(
    "[authService] SECRET.len",
    SECRET.length,
    "value starts with",
    SECRET.slice(0, 4)
  );
}

export function signSession(user: User): string {
  const payload: SessionPayload = { sub: String(user.id), email: user.email };
  const token = jwt.sign(payload, SECRET, {
    algorithm: "HS256",
    expiresIn: "30d",
  });
  if (process.env.DEBUG_AUTH === "1") {
    console.log("[authService] issued token for user", user.id);
  }
  return token;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    const sub = typeof decoded.sub === "string" ? decoded.sub : undefined;
    const email = typeof decoded.email === "string" ? decoded.email : undefined;
    if (!sub) return null;
    return { sub, email };
  } catch (err: any) {
    if (process.env.DEBUG_AUTH === "1") {
      console.log("[authService] verify failed:", err?.name, err?.message);
    }
    return null;
  }
}
