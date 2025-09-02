// server/src/services/draftService.ts
import db from "../db/client";
import { newId } from "../utils/id";
import type { Draft, PageInstance, Template } from "../../../shared/types/template";

type RawDraftRow = {
  id: string;
  user_id: string;
  status: string;
  data: any;
  payload: any;
  created_at: string;
  updated_at: string;
};

const toDraft = (r: RawDraftRow): Draft => {
  const src = (r.data ?? r.payload) || {};
  const meta = src.meta || {};
  return {
    id: r.id,
    userId: r.user_id,
    templateId: meta.templateId ?? "",
    title: meta.title ?? "",
    status: (r.status as any) || "draft",
    media: src.media ?? [],
    annotations: src.annotations ?? [],
    pageInstances: src.pageInstances ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
};

export async function listDrafts(userId: string): Promise<Draft[]> {
  const q = `
    SELECT id, user_id, status, data, payload, created_at, updated_at
    FROM drafts
    WHERE user_id = $1
    ORDER BY updated_at DESC
  `;
  const { rows } = await db.query(q, [userId]);
  return rows.map(toDraft);
}

export async function createDraft(userId: string, template: Template, title?: string): Promise<Draft> {
  const id = newId();
  const pageInstances: PageInstance[] = template.pages.map(p => ({
    id: newId(),
    templatePageId: p.id,
    values: {},
    userBlocks: []
  }));

  const base = {
    meta: { templateId: template.id, title: title ?? template.name },
    media: [],
    annotations: [],
    pageInstances
  };

  const q = `
    INSERT INTO drafts (id, user_id, status, data, payload)
    VALUES ($1, $2, 'draft', $3, $3)
    RETURNING id, user_id, status, data, payload, created_at, updated_at
  `;
  const { rows } = await db.query(q, [id, userId, base]);
  return toDraft(rows[0]);
}

export async function getOwnedDraft(userId: string, draftId: string): Promise<Draft | null> {
  const q = `
    SELECT id, user_id, status, data, payload, created_at, updated_at
    FROM drafts
    WHERE id = $1 AND user_id = $2
  `;
  const { rows } = await db.query(q, [draftId, userId]);
  return rows[0] ? toDraft(rows[0]) : null;
}

export async function patchDraft(userId: string, draftId: string, patch: any): Promise<Draft | null> {
  const current = await getOwnedDraft(userId, draftId);
  if (!current) return null;

  // Full intake payload save path
  if (patch && typeof patch === "object" && patch.__intake) {
    const intake = patch.__intake;
    const q = `
      UPDATE drafts
      SET data = $1,
          payload = $1,
          updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING id, user_id, status, data, payload, created_at, updated_at
    `;
    const { rows } = await db.query(q, [intake, draftId, userId]);
    return rows[0] ? toDraft(rows[0]) : null;
  }

  // Merge path for Draft-shaped patches
  const nextStatus = (patch.status as Draft["status"]) ?? current.status;
  const nextMedia = patch.media ?? current.media;
  const nextAnnotations = patch.annotations ?? current.annotations;
  const nextPageInstances = patch.pageInstances ?? current.pageInstances;

  const nextMeta = {
    templateId: patch.templateId ?? current.templateId,
    title: patch.title ?? current.title
  };

  const nextData = {
    meta: nextMeta,
    media: nextMedia,
    annotations: nextAnnotations,
    pageInstances: nextPageInstances
  };

  const q = `
    UPDATE drafts
    SET status = $1,
        data   = $2,
        payload= $2,
        updated_at = NOW()
    WHERE id = $3 AND user_id = $4
    RETURNING id, user_id, status, data, payload, created_at, updated_at
  `;
  const { rows } = await db.query(q, [nextStatus, nextData, draftId, userId]);
  return rows[0] ? toDraft(rows[0]) : null;
}

export async function removeDraft(userId: string, draftId: string): Promise<boolean> {
  const q = `DELETE FROM drafts WHERE id = $1 AND user_id = $2`;
  const { rowCount } = await db.query(q, [draftId, userId]);
  return rowCount > 0;
}
