// server/src/routes/auth.ts
import { Router, type Response } from "express";
import { z } from "zod";
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  getUserById,
} from "../services/userService";
import { signSession, verifySession } from "../services/authService";

const router = Router();

const Email = z.string().email().max(320);
const Password = z.string().min(8).max(200);

const COOKIE = process.env.COOKIE_NAME || "dr_session";
const COOKIE_MAXAGE_MS = Number(
  process.env.COOKIE_MAXAGE_MS ?? 1000 * 60 * 60 * 24 * 7
); // 7d

// Decide cookie security based on environment/origin.
// On http://localhost we must NOT set SameSite=None; Secure (browser will drop it).
const ORIGIN =
  process.env.APP_ORIGIN ||
  process.env.CORS_ORIGIN ||
  "http://localhost:5173";

let originHost = "localhost";
try {
  originHost = new URL(ORIGIN).hostname || "localhost";
} catch {
  originHost = "localhost";
}
const isLocalDev =
  process.env.NODE_ENV !== "production" &&
  (originHost === "localhost" || originHost === "127.0.0.1");

const sameSiteForEnv: "lax" | "none" = isLocalDev ? "lax" : "none";
const secureForEnv = !isLocalDev;

function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: sameSiteForEnv,
    secure: secureForEnv,
    path: "/",
    maxAge: COOKIE_MAXAGE_MS,
  });
}

router.post("/auth/signup", async (req, res, next) => {
  try {
    const { email, password } = z
      .object({ email: Email, password: Password })
      .parse(req.body || {});
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "email_taken" });

    const user = await createUser(email, password);
    const token = signSession(user);
    setSessionCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (e) {
    next(e);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = z
      .object({ email: Email, password: Password })
      .parse(req.body || {});
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signSession(user);
    setSessionCookie(res, token);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (e) {
    next(e);
  }
});

router.post("/auth/logout", (req, res) => {
  // Mirror attributes to ensure deletion matches how we set it.
  res.clearCookie(COOKIE, {
    path: "/",
    sameSite: sameSiteForEnv,
    secure: secureForEnv,
  });
  res.status(204).end();
});

router.get("/auth/me", async (req, res) => {
  const cookieToken = req.cookies?.[COOKIE];
  const authHeader =
    req.header("authorization") || req.header("Authorization") || "";
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  const headerToken = bearerMatch?.[1];

  const raw = cookieToken || headerToken;
  if (!raw) return res.status(401).json({ error: "unauthorized" });

  try {
    const payload = verifySession(raw);
    const sub = payload?.sub;
    if (!sub) return res.status(401).json({ error: "unauthorized" });

    const user = await getUserById(sub);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    res.json({ user: { id: user.id, email: user.email } });
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
});

export default router;
