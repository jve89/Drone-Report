import { Router } from "express";
import { validateIntake } from "../utils/validate";
import { buildReportHtml, renderPdfViaGotenberg } from "../pdf";
import { sendAdminReportEmail } from "../utils/mailer";

const router = Router();

/**
 * POST /create-draft      (mounted under /api in index.ts → /api/create-draft)
 * Validates payload, renders HTML, converts to PDF via Gotenberg.
 */
router.post("/create-draft", async (req, res, next) => {
  try {
    const intake = validateIntake(req.body);
    const html = await buildReportHtml(intake);

    const filenameBase =
      intake?.contact?.project?.trim().replace(/[^\w\-]+/g, "_") || "report";
    const pdfBuffer = await renderPdfViaGotenberg(html);

    // Respond to client first
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${filenameBase}.pdf\"`
    );
    res.status(200).send(pdfBuffer);

    // Fire-and-forget admin email
    const tier = intake.tier || "raw";
    const tag = tier === "full" ? "[FULL]" : "[RAW]";
    const subject = `${tag} ${intake.contact.project} — ${intake.contact.company}`;
    const body = `
      <p>New ${tier.toUpperCase()} report generated.</p>
      <ul>
        <li><strong>Project:</strong> ${intake.contact.project}</li>
        <li><strong>Company:</strong> ${intake.contact.company}</li>
        <li><strong>Email:</strong> ${intake.contact.email}</li>
        <li><strong>Date:</strong> ${intake.inspection?.date || ""}</li>
      </ul>
      <p>PDF attached.</p>
    `;
    // Do not await; avoid delaying client
    sendAdminReportEmail(subject, body, pdfBuffer).catch((e) =>
      console.warn("[mail] failed to send admin email:", e?.message || e)
    );
  } catch (err) {
    return next(err);
  }
});

export default router;
