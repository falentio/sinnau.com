CREATE TABLE `flashcard_session` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcard_session_studySetId_idx` ON `flashcard_session` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `flashcard_session_updatedAt_idx` ON `flashcard_session` (`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `flashcard_session_user_studySet` ON `flashcard_session` (`user_id`,`study_set_id`);--> statement-breakpoint
CREATE TABLE `flashcard_session_review` (
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
CREATE INDEX `flashcard_session_review_flashcardId_sessionId_idx` ON `flashcard_session_review` (`flashcard_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `flashcard_session_review_sessionId_reviewedAt_idx` ON `flashcard_session_review` (`session_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `flashcard_state` (
	`difficulty` real NOT NULL,
	`due` integer NOT NULL,
	`elapsed_days` integer NOT NULL,
	`flashcard_id` text NOT NULL,
	`introduced_at` integer,
	`lapses` integer NOT NULL,
	`last_review` integer,
	`learning_steps` integer NOT NULL,
	`reps` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`stability` real NOT NULL,
	`state` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `flashcard_id`),
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcard`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcard_state_userId_due_idx` ON `flashcard_state` (`user_id`,`due`);--> statement-breakpoint
CREATE INDEX `flashcard_state_userId_introducedAt_idx` ON `flashcard_state` (`user_id`,`introduced_at`);--> statement-breakpoint
CREATE INDEX `flashcard_studySetId_createdAt_idx` ON `flashcard` (`study_set_id`,`created_at`);