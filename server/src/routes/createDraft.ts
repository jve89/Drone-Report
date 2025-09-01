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
      `attachment; filename="${filenameBase}.pdf"`
    );
    res.status(200).send(pdfBuffer);

    // Fire-and-forget admin email (no tiers)
    const project = intake.contact?.project || "Untitled project";
    const company = intake.contact?.company || "—";
    const email = intake.contact?.email || "—";
    const date = intake.inspection?.date || "";

    const subject = `${project} — ${company}`;
    const body = `
      <p>New report generated.</p>
      <ul>
        <li><strong>Project:</strong> ${project}</li>
        <li><strong>Company:</strong> ${company}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Date:</strong> ${date}</li>
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
