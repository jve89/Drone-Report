import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const COOKIE = process.env.COOKIE_NAME || "dr_session";
const SECRET = process.env.SESSION_SECRET || "change_me";

export type AuthedRequest = Request & { user?: { id: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "unauthenticated" });
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    if (!payload?.sub) return res.status(401).json({ error: "invalid_session" });
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: "invalid_session" });
  }
}
