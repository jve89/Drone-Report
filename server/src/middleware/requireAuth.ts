// server/src/middleware/requireAuth.ts
import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const COOKIE = process.env.COOKIE_NAME || "dr_session";

export type AuthedRequest = Request & { user?: { id: string } };

function readToken(req: Request): string | null {
  const fromCookie = req.cookies?.[COOKIE] || req.cookies?.["dr_session"];
  if (fromCookie) return fromCookie;
  const h = req.header("authorization") || req.header("Authorization");
  if (!h) return null;
  const m = h.match(/^(?:Bearer|Token)\s+(.+)$/i);
  return m ? m[1] : h.trim();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Read env lazily so dotenv has already run
  const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "change_me";
  const DEBUG = process.env.DEBUG_AUTH === "1";

  const token = readToken(req);

  if (DEBUG) {
    // Avoid leaking secret contents; length is enough.
    console.log("[requireAuth] SECRET.length:", SECRET ? String(SECRET.length) : "0");
    console.log("[auth] path:", req.method, req.originalUrl);
    console.log("[auth] cookie keys:", Object.keys(req.cookies || {}));
    console.log("[auth] COOKIE name expected:", COOKIE);
    console.log("[auth] has cookie?", Boolean(req.cookies?.[COOKIE] || req.cookies?.["dr_session"]));
    console.log("[auth] auth header present?", Boolean(req.header("authorization") || req.header("Authorization")));
  }

  if (!token) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
    return res.status(401).json({ error: "unauthenticated" });
  }

  try {
    const payload = jwt.verify(token, SECRET) as JwtPayload | string;
    const sub = typeof payload === "string" ? undefined : (payload.sub as string | undefined);
    const id = typeof payload === "string" ? undefined : (payload as any).id;
    const uid = sub || id;
    if (!uid) return res.status(401).json({ error: "invalid_session" });
    req.user = { id: uid };
    next();
  } catch (err: any) {
    if (DEBUG) console.log("[auth] verify failed:", err?.name, err?.message);
    res.status(401).json({ error: "invalid_session" });
  }
}
