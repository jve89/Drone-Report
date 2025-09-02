// server/src/routes/templates.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { listTemplates, getTemplate } from "../services/templateService";

const router = Router();

// Mounted at /api
router.get("/templates", asyncHandler(async (_req, res) => {
  res.json(listTemplates());
}));

router.get("/templates/:id", asyncHandler(async (req, res) => {
  const t = getTemplate(req.params.id);
  if (!t) return res.status(404).json({ error: "template_not_found" });
  res.json(t);
}));

export default router;
