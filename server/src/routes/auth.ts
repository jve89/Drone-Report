import { Router } from "express";
import { z } from "zod";
import { createUser, findUserByEmail, verifyPassword, getUserById } from "../services/userService";
import { signSession, verifySession } from "../services/authService";

const router = Router();
const Email = z.string().email().max(320);
const Password = z.string().min(8).max(200);

function setCookie(res: any, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("dr_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });
}

router.post("/auth/signup", async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: Email, password: Password }).parse(req.body || {});
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "email_taken" });
    const user = await createUser(email, password);
    const token = signSession(user);
    setCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (e) { next(e); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: Email, password: Password }).parse(req.body || {});
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "invalid_credentials" });
    const ok = await verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });
    const token = signSession(user);
    setCookie(res, token);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (e) { next(e); }
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("dr_session", { path: "/" });
  res.status(204).end();
});

router.get("/auth/me", async (req: any, res) => {
  const raw = (req.cookies && req.cookies.dr_session) || req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) return res.status(401).json({ error: "unauthorized" });
  const payload = verifySession(raw);
  if (!payload) return res.status(401).json({ error: "unauthorized" });
  const user = await getUserById(payload.sub);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ user: { id: user.id, email: user.email } });
});

export default router;
