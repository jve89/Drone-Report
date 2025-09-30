// server/src/routes/preview.ts
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getOwnedDraft } from "../services/draftService";
import { buildPreviewPageHtml } from "../pdf";

const router = Router();
router.use(requireAuth);

// Accept only known page tokens or detail:/appendix: with a number
const PAGE_SCHEMA = z
  .string()
  .regex(/^(cover|summary|overview|methodology|compliance|detail:\d+|appendix:\d+)$/);

router.get(
  "/drafts/:id/preview",
  asyncHandler(async (req: AuthedRequest, res) => {
    const draft = await getOwnedDraft(req.user!.id, req.params.id);
    if (!draft) return res.status(404).type("text/plain").send("not_found");

    // Validate/sanitize page param (defaults to "cover")
    const rawPage = (req.query.page ?? "cover") as string;
    const page = PAGE_SCHEMA.safeParse(rawPage).success ? rawPage : "cover";

    // Note: buildPreviewPageHtml currently consumes an intake-like shape
    const intake = draft as any;

    const html = await buildPreviewPageHtml(intake, page);
    res.status(200).type("text/html; charset=utf-8").send(html);
  })
);

export default router;
