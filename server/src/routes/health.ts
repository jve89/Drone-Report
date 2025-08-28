import { Router } from "express";

const router = Router();

/**
 * Liveness probe
 * GET /health  → 200 { ok: true }
 */
router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
