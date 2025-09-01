import { Router } from "express";
import { validateIntake } from "../utils/validate";
import { draftsStore } from "../utils/draftsStore";
import { buildReportHtml, renderPdfViaGotenberg } from "../pdf";
import { sendAdminReportEmail } from "../utils/mailer";

const router = Router();

/** Create a draft from an intake-like payload */
router.post("/drafts", (req, res, next) => {
  try {
    const intake = validateIntake(req.body); // permissive schema
    const draft = draftsStore.create(intake);
    res.status(201).json({ draftId: draft.id });
  } catch (e) { next(e); }
});

/** Read a draft */
router.get("/drafts/:id", (req, res) => {
  const d = draftsStore.get(req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json(d);
});

/** Update a draft (partial) */
router.patch("/drafts/:id", (req, res) => {
  const d = draftsStore.update(req.params.id, req.body || {});
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

/** Finalize a draft → PDF */
router.post("/drafts/:id/finalize", async (req, res, next) => {
  try {
    const d = draftsStore.get(req.params.id);
    if (!d) return res.status(404).json({ error: "not_found" });

    const html = await buildReportHtml(d.payload);
    const pdfBuffer = await renderPdfViaGotenberg(html);

    // Email admin as today (no tiers)
    const project = d.payload.contact?.project || "Untitled project";
    const company = d.payload.contact?.company || "—";
    const email = d.payload.contact?.email || "—";
    const date = d.payload.inspection?.date || "";
    const subject = `${project} — ${company}`;
    const body = `
      <p>Finalized report.</p>
      <ul>
        <li><strong>Project:</strong> ${project}</li>
        <li><strong>Company:</strong> ${company}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Date:</strong> ${date}</li>
      </ul>
      <p>PDF attached.</p>
    `;
    sendAdminReportEmail(subject, body, pdfBuffer).catch(() => {});

    draftsStore.markFinalized(d.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${project.replace(/[^\w\-]+/g,"_") || "report"}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (e) { next(e); }
});

export default router;
