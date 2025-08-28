import { Router } from "express";
import { validateIntake } from "../utils/validate";
import { buildReportHtml, renderPdfViaGotenberg } from "../pdf";

const router = Router();

/**
 * POST /api/create-draft
 * Validates payload, renders HTML, converts to PDF via Gotenberg.
 */
router.post("/api/create-draft", async (req, res, next) => {
  try {
    const intake = validateIntake(req.body);
    const html = await buildReportHtml(intake);

    const filenameBase =
      intake?.contact?.project?.trim().replace(/[^\w\-]+/g, "_") || "report";
    const pdfBuffer = await renderPdfViaGotenberg(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filenameBase}.pdf"`
    );
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    return next(err);
  }
});

export default router;
