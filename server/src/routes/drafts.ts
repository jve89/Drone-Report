// server/src/routes/drafts.ts
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getTemplate } from "../services/templateService";
import { createDraft, getOwnedDraft, listDrafts, patchDraft, removeDraft } from "../services/draftService";
import { ensureUploadDir, urlFor } from "../services/mediaService";
import type { Draft, Media } from "../../../shared/types/template";
import { renderDraftHTML } from "../pdf/render";

const router = Router();
const upload = multer({ dest: ensureUploadDir() });

router.use(requireAuth);

router.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const drafts = await listDrafts(req.user!.id);
  res.json(drafts);
}));

router.post("/", asyncHandler(async (req: AuthedRequest, res) => {
  const { templateId, title } = req.body || {};
  const t = getTemplate(String(templateId));
  if (!t) return res.status(400).json({ error: "invalid_template" });
  const d = await createDraft(req.user!.id, t, title);
  res.status(201).json(d);
}));

router.get("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const d = await getOwnedDraft(req.user!.id, req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json(d);
}));

router.patch("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const body = req.body || {};
  const isObj = body && typeof body === "object" && !Array.isArray(body);
  const draftKeys = new Set(["status","media","annotations","pageInstances","templateId","title"]);
  const looksLikeDraftPatch = isObj && Object.keys(body).some(k => draftKeys.has(k));
  const patch = looksLikeDraftPatch ? (body as Partial<Draft>) : { __intake: body };

  const d = await patchDraft(req.user!.id, req.params.id, patch as any);
  if (!d) return res.status(404).json({ error: "not_found" });
  res.json(d);
}));

router.delete("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const ok = await removeDraft(req.user!.id, req.params.id);
  res.json({ ok });
}));

router.post("/:id/media", upload.array("files", 32), asyncHandler(async (req: AuthedRequest, res) => {
  const d = await getOwnedDraft(req.user!.id, req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  const files = (req.files as Express.Multer.File[]) || [];
  const added: Media[] = files.map(f => ({
    id: f.filename,
    url: urlFor(path.basename(f.filename)),
    kind: "image",
    filename: f.originalname
  }));
  const patched = await patchDraft(req.user!.id, req.params.id, { media: [...d.media, ...added] });
  res.json(patched!.media);
}));

// Temporary: export as HTML (PDF service uses this HTML)
router.post("/:id/export/pdf", asyncHandler(async (req: AuthedRequest, res) => {
  const d = await getOwnedDraft(req.user!.id, req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  const html = renderDraftHTML(d);
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.send(html);
}));

export default router;
