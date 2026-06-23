PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flashcard_session_review` (
	`flashcard_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`pre_difficulty` real NOT NULL,
	`pre_due` integer,
	`pre_lapses` integer NOT NULL,
	`pre_last_review` integer,
	`pre_learning_steps` integer NOT NULL,
	`pre_reps` integer NOT NULL,
	`pre_scheduled_days` integer NOT NULL,
	`pre_stability` real NOT NULL,
	`pre_state` text NOT NULL,
	`rating` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	`session_id` text NOT NULL,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcard`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `flashcard_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_flashcard_session_review`("flashcard_id", "id", "pre_difficulty", "pre_due", "pre_lapses", "pre_last_review", "pre_learning_steps", "pre_reps", "pre_scheduled_days", "pre_stability", "pre_state", "rating", "reviewed_at", "session_id") SELECT "flashcard_id", "id", "pre_difficulty", "pre_due", "pre_lapses", "pre_last_review", "pre_learning_steps", "pre_reps", "pre_scheduled_days", "pre_stability", "pre_state", "rating", "reviewed_at", "session_id" FROM `flashcard_session_review`;--> statement-breakpoint
DROP TABLE `flashcard_session_review`;--> statement-breakpoint
ALTER TABLE `__new_flashcard_session_review` RENAME TO `flashcard_session_review`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `flashcard_session_review_flashcardId_sessionId_idx` ON `flashcard_session_review` (`flashcard_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `flashcard_session_review_sessionId_reviewedAt_idx` ON `flashcard_session_review` (`session_id`,`reviewed_at`);