-- Custom SQL migration file, put your code below! --
-- FTS5 full-text search index for public study sets.
-- Standalone virtual table (no content rowid linkage) so we can drive
-- INSERT/DELETE/UPDATE via explicit triggers on the `study_set` table.

CREATE VIRTUAL TABLE `study_set_fts` USING fts5(
	`study_set_id` UNINDEXED,
	`slug`,
	`title`,
	`description`,
	tokenize = 'trigram'
);--> statement-breakpoint

-- After a public, non-deleted study set is inserted, mirror it into the
-- FTS index. Private and soft-deleted rows must never appear in search.
CREATE TRIGGER IF NOT EXISTS `study_set_fts_ai`
AFTER INSERT ON `study_set`
WHEN NEW.visibility = 'PUBLIC' AND NEW.deleted_at IS NULL
BEGIN
	INSERT INTO study_set_fts (study_set_id, slug, title, description)
	VALUES (NEW.id, NEW.slug, NEW.title, COALESCE(NEW.description, ''));
END;--> statement-breakpoint

-- After a study set is hard-deleted, drop the matching FTS row by id.
-- Soft-delete flows through the UPDATE trigger (deleted_at change).
CREATE TRIGGER IF NOT EXISTS `study_set_fts_ad`
AFTER DELETE ON `study_set`
BEGIN
	DELETE FROM study_set_fts WHERE study_set_id = OLD.id;
END;--> statement-breakpoint

-- Keep the FTS row in sync with study_set column changes that affect
-- searchability. The WHEN clause filters out updates to unrelated
-- columns (e.g. owner_id) so the FTS index is not churned for noise.
CREATE TRIGGER IF NOT EXISTS `study_set_fts_au`
AFTER UPDATE OF `title`, `description`, `visibility`, `deleted_at` ON `study_set`
WHEN OLD.title IS NOT NEW.title
	OR OLD.description IS NOT NEW.description
	OR OLD.visibility IS NOT NEW.visibility
	OR OLD.deleted_at IS NOT NEW.deleted_at
BEGIN
	DELETE FROM study_set_fts WHERE study_set_id = OLD.id;
	INSERT INTO study_set_fts (study_set_id, slug, title, description)
	SELECT NEW.id, NEW.slug, NEW.title, COALESCE(NEW.description, '')
	WHERE NEW.visibility = 'PUBLIC' AND NEW.deleted_at IS NULL;
END;
