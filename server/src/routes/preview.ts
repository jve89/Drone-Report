import { Router } from "express";
import { draftsStore } from "../utils/draftsStore";
import { buildPreviewPageHtml } from "../pdf";

const router = Router();

/**
 * GET /api/drafts/:id/preview?page=<section>
 * Supported:
 *   cover | summary | overview | methodology | compliance
 *   detail:<n>      (1-based)
 *   appendix:<n>    (1-based)
 */
router.get("/drafts/:id/preview", async (req, res, next) => {
  try {
    const d = draftsStore.get(req.params.id);
    if (!d) return res.status(404).type("text/plain").send("not_found");

    const page = String(req.query.page || "cover");
    const html = await buildPreviewPageHtml(d.payload, page);
    res.status(200).type("text/html; charset=utf-8").send(html);
  } catch (e) {
    next(e);
  }
});

export default router;
