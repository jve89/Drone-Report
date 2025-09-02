import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getOwnedDraft } from "../services/draftService";
import { buildPreviewPageHtml } from "../pdf";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/drafts/:id/preview?page=<section>
 * page: cover | summary | overview | methodology | compliance | detail:<n> | appendix:<n>
 */
router.get("/drafts/:id/preview", asyncHandler(async (req: AuthedRequest, res) => {
  const draft = await getOwnedDraft(req.user!.id, req.params.id);
  if (!draft) return res.status(404).type("text/plain").send("not_found");
  // Stored intake lives in draft.data/payload, exposed via toDraft→fields used by preview builder
  const intake = draft as any; // your builder reads the intake-shaped fields inside
  const page = String(req.query.page || "cover");
  const html = await buildPreviewPageHtml(intake, page);
  res.status(200).type("text/html; charset=utf-8").send(html);
}));

export default router;
