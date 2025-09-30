// server/src/routes/templates.ts
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { listTemplates, getTemplate } from "../services/templateService";

const router = Router();

// Mounted at /api
router.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    res.type("application/json").json(listTemplates());
  })
);

const IdSchema = z.string().min(1);

router.get(
  "/templates/:id",
  asyncHandler(async (req, res) => {
    const parse = IdSchema.safeParse(req.params.id);
    if (!parse.success) {
      return res.status(400).json({ error: "invalid_template_id" });
    }

    const t = getTemplate(parse.data);
    if (!t) return res.status(404).json({ error: "template_not_found" });
    res.type("application/json").json(t);
  })
);

export default router;
