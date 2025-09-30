// server/src/routes/drafts.ts
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";

import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getTemplate } from "../services/templateService";
import {
  createDraft,
  createDraftEmpty,
  getOwnedDraft,
  listDrafts,
  patchDraft,
  removeDraft,
} from "../services/draftService";
import {
  ensureUploadDirForDraft,
  urlFor,
  deleteMediaFile,
} from "../services/mediaService";

import type { Draft } from "@drone-report/shared/types/draft";
import type { MediaItem } from "@drone-report/shared/types/media";
import { renderDraftHTML } from "../pdf/render";

const router = Router();

// ---------------- Upload constraints ----------------
const MAX_FILES = Number(process.env.UPLOAD_MAX_FILES ?? 64);
const MAX_FILE_MB = Number(process.env.UPLOAD_MAX_FILE_MB ?? 25);
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// allow common images + zip; extend if needed
const ALLOWED_MIME = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/zip",
]);
const ALLOWED_EXT = new Set<string>([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".zip",
]);

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

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ALLOWED_MIME.has(mime) || ALLOWED_EXT.has(ext)) return cb(null, true);
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", `blocked-type:${mime || ext}`));
};

const upload = multer({
  storage,
  limits: { files: MAX_FILES, fileSize: MAX_FILE_BYTES },
  fileFilter,
});

// ---------------- Validation ----------------
const CreateDraftBody = z.object({
  templateId: z.string().trim().optional(),
  title: z.string().trim().max(500).optional(),
});

const PatchDraftBodyLoose = z.object({}).catchall(z.unknown()); // keep loose; we gate field names below

// ---------------- Routes ----------------
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const drafts = await listDrafts(req.user!.id);
    res.json(drafts);
  }),
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { templateId, title } = CreateDraftBody.parse(req.body || {});

    if (!templateId) {
      const d = await createDraftEmpty(req.user!.id, title);
      res.status(201).json(d);
      return;
    }

    const t = getTemplate(String(templateId));
    if (!t) return res.status(400).json({ error: "invalid_template" });

    const d = await createDraft(req.user!.id, t, title);
    res.status(201).json(d);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const d = await getOwnedDraft(req.user!.id, req.params.id);
    if (!d) return res.status(404).json({ error: "not_found" });
    res.json(d);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = PatchDraftBodyLoose.parse(req.body || {});
    const draftKeys = new Set([
      "status",
      "media",
      "annotations",
      "pageInstances",
      "templateId",
      "title",
      "payload",
    ]);
    const looksLikeDraftPatch =
      body && typeof body === "object" && Object.keys(body).some((k) => draftKeys.has(k));
    const patch = looksLikeDraftPatch ? (body as Partial<Draft>) : { __intake: body };

    const d = await patchDraft(req.user!.id, req.params.id, patch as any);
    if (!d) return res.status(404).json({ error: "not_found" });
    res.json(d);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const ok = await removeDraft(req.user!.id, req.params.id);
    res.json({ ok });
  }),
);

// Upload media (images or zip). Returns updated media list.
router.post(
  "/:id/media",
  (req, res, next) => {
    upload.array("files", MAX_FILES)(req, res, (err: any) => {
      if (!err) return next();
      // Normalize Multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(413)
            .json({ error: "file_too_large", limitMB: MAX_FILE_MB });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res
            .status(413)
            .json({ error: "too_many_files", limit: MAX_FILES });
        }
        if (String(err.code || "").startsWith("LIMIT_")) {
          return res.status(400).json({ error: err.code });
        }
        return res.status(400).json({ error: "upload_error", detail: err.message });
      }
      // Other errors
      return res.status(400).json({ error: "upload_error", detail: String(err?.message || err) });
    });
  },
  asyncHandler(async (req: AuthedRequest, res) => {
    const draftId = req.params.id;
    const d = await getOwnedDraft(req.user!.id, draftId);
    if (!d) return res.status(404).json({ error: "not_found" });

    const files = ((req as any).files as Express.Multer.File[]) || [];
    const now = new Date().toISOString();

    const added: MediaItem[] = files.map((f) => {
      const ext = path.extname(f.originalname || "").toLowerCase();
      const mime = (f.mimetype || "").toLowerCase();
      const isImage = mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      const kind: MediaItem["kind"] = isImage ? "image" : "file";
      return {
        id: path.basename(f.filename), // stored filename (id+ext)
        filename: f.originalname,
        kind,
        url: urlFor(draftId, path.basename(f.filename)),
        size: f.size,
        createdAt: now,
        tags: [],
        folder: undefined,
        exif: undefined,
      };
    });

    const patched = await patchDraft(req.user!.id, draftId, {
      media: [...(d.media || []), ...added],
    } as any);
    res.json(patched!.media);
  }),
);

// Delete a media item by id (stored filename). Returns 204.
router.delete(
  "/:id/media/:mediaId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const draftId = req.params.id;
    const mediaId = path.basename(req.params.mediaId); // normalize

    const d = await getOwnedDraft(req.user!.id, draftId);
    if (!d) return res.status(404).json({ error: "not_found" });

    const current = Array.isArray((d as any).media) ? ((d as any).media as MediaItem[]) : [];
    const next = current.filter((m) => m.id !== mediaId);

    // delete file best-effort (no await)
    deleteMediaFile(draftId, mediaId);

    await patchDraft(req.user!.id, draftId, { media: next } as any);
    res.status(204).send();
  }),
);

// Temporary: export as HTML (used by client preview/“Export PDF” flow)
router.post(
  "/:id/export/pdf",
  asyncHandler(async (req: AuthedRequest, res) => {
    const d = await getOwnedDraft(req.user!.id, req.params.id);
    if (!d) return res.status(404).json({ error: "not_found" });

    const html = renderDraftHTML({
      id: d.id,
      title:
        (d as any).title ||
        String((d as any)?.payload?.meta?.title || "") ||
        "Inspection report",
      pageInstances: (d as any).pageInstances || [],
      media: (d as any).media || [],
      payload: (d as any).payload || {},
    });

    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(html);
  }),
);

export default router;
