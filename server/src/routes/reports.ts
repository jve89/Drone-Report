import { Router } from "express";

const router = Router();

/** Legacy stub. Real PDF is handled by /api/create-draft in createDraft.ts */
router.get("/reports/ping", (_req, res) => {
  res.json({ ok: true });
});

export { router as reports };
