import { Router } from "express";
import { validateIntake } from "../utils/validate";
import { draftsStore } from "../utils/draftsStore";
import { buildReportHtml, renderPdfViaGotenberg } from "../pdf";
import { sendAdminReportEmail } from "../utils/mailer";
import { verifySession } from "../services/authService";

const router = Router();

function getUserId(req: any): string | null {
  const raw =
    (req.cookies && req.cookies.dr_session) ||
    req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) return null;
  const payload = verifySession(raw);
  return payload?.sub || null;
}

/** Create a draft from an intake-like payload. Attaches owner if logged in. */
router.post("/drafts", (req, res, next) => {
  try {
    const intake = validateIntake(req.body || {}); // permissive
    const userId = getUserId(req);
    const draft = draftsStore.create(intake, userId || undefined);
    res.status(201).json({ draftId: draft.id });
  } catch (e) { next(e); }
});

/** List drafts for current user */
router.get("/drafts", (req, res) => {
  const mine = String(req.query.mine || "");
  if (mine !== "1") return res.status(400).json({ error: "bad_request" });
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const rows = draftsStore.listByOwner(userId).map(d => ({
    id: d.id,
    updated_at: d.updatedAt,
    status: d.status,
  }));
  res.json({ items: rows });
});

/** Claim a draft for current user */
router.post("/drafts/:id/claim", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const d = draftsStore.claim(req.params.id, userId);
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
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
