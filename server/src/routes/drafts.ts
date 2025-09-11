// server/src/routes/drafts.ts
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getTemplate } from "../services/templateService";
import { createDraft, createDraftEmpty, getOwnedDraft, listDrafts, patchDraft, removeDraft } from "../services/draftService";
import { ensureUploadDirForDraft, urlFor, deleteMediaFile } from "../services/mediaService";
import type { Draft } from "@drone-report/shared/types/draft";
import type { MediaItem } from "@drone-report/shared/types/media";
import { renderDraftHTML } from "../pdf/render";
import crypto from "node:crypto";

const router = Router();

// dynamic storage: per-draft folder, stable stored filename
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const draftId = String((req.params as any).id || "");
    const dir = ensureUploadDirForDraft(draftId);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const id = crypto.randomBytes(8).toString("hex") + ext; // store id+ext as filename
    cb(null, id);
  },
});
const upload = multer({ storage, limits: { files: 64 } });

router.use(requireAuth);

router.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const drafts = await listDrafts(req.user!.id);
  res.json(drafts);
}));

router.post("/", asyncHandler(async (req: AuthedRequest, res) => {
  const { templateId, title } = req.body || {};

  if (!templateId || String(templateId).trim() === "") {
    const d = await createDraftEmpty(req.user!.id, title);
    res.status(201).json(d);
    return;
  }

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

// Upload media (images or zip). Returns updated media list.
router.post("/:id/media", upload.array("files", 64), asyncHandler(async (req: AuthedRequest, res) => {
  const draftId = req.params.id;
  const d = await getOwnedDraft(req.user!.id, draftId);
  if (!d) return res.status(404).json({ error: "not_found" });

  const files = ((req as any).files as Express.Multer.File[]) || [];
  const now = new Date().toISOString();

  const added: MediaItem[] = files.map((f) => {
    const ext = path.extname(f.originalname || "").toLowerCase();
    const mime = f.mimetype || "";
    const isImage = mime.startsWith("image/") || [".jpg",".jpeg",".png",".webp",".gif"].includes(ext);
    const kind: MediaItem["kind"] = isImage ? "image" : "file";
    return {
      id: path.basename(f.filename),            // stored filename (id+ext)
      filename: f.originalname,
      kind,
      url: urlFor(draftId, path.basename(f.filename)),
      // no thumbs generated yet
      size: f.size,
      createdAt: now,
      tags: [],
      folder: undefined,
      exif: undefined,
    };
  });

  const patched = await patchDraft(req.user!.id, draftId, { media: [...(d.media || []), ...added] } as any);
  res.json(patched!.media);
}));

// Delete a media item by id (stored filename). Returns 204.
router.delete("/:id/media/:mediaId", asyncHandler(async (req: AuthedRequest, res) => {
  const draftId = req.params.id;
  const mediaId = req.params.mediaId;

  const d = await getOwnedDraft(req.user!.id, draftId);
  if (!d) return res.status(404).json({ error: "not_found" });

  const current = Array.isArray((d as any).media) ? ((d as any).media as MediaItem[]) : [];
  const next = current.filter((m) => m.id !== mediaId);

  // delete file best-effort
  deleteMediaFile(draftId, mediaId);

  await patchDraft(req.user!.id, draftId, { media: next } as any);
  res.status(204).send();
}));

// Temporary: export as HTML
router.post("/:id/export/pdf", asyncHandler(async (req: AuthedRequest, res) => {
  const d = await getOwnedDraft(req.user!.id, req.params.id);
  if (!d) return res.status(404).json({ error: "not_found" });
  const html = renderDraftHTML(d);
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.send(html);
}));

export default router;
