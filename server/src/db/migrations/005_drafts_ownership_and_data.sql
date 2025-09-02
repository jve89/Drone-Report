-- 005_drafts_ownership_and_data.sql
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

UPDATE drafts d
SET user_id = (SELECT id FROM users ORDER BY created_at NULLS LAST LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE drafts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE drafts
  ADD CONSTRAINT drafts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
