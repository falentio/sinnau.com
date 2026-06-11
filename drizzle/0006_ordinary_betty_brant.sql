CREATE TABLE `quiz_session` (
	`chapter_id` text,
	`completed_at` integer,
	`correct_count` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`failing_chapter_ids` text,
	`id` text PRIMARY KEY NOT NULL,
	`incorrect_quiz_ids` text,
	`last_answered_at` integer,
	`last_question_text` text,
	`quiz_count` integer NOT NULL,
	`score` integer,
	`status` text NOT NULL,
	`study_set_id` text NOT NULL,
	`total_questions` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_session_userId_idx` ON `quiz_session` (`user_id`);--> statement-breakpoint
CREATE INDEX `quiz_session_studySetId_idx` ON `quiz_session` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `quiz_session_status_idx` ON `quiz_session` (`status`);--> statement-breakpoint
CREATE INDEX `quiz_session_createdAt_idx` ON `quiz_session` (`created_at`);--> statement-breakpoint
CREATE TABLE `quiz_session_answer` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text,
	`selected_option_ids` text DEFAULT '[]' NOT NULL,
	`session_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`session_id`) REFERENCES `quiz_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_session_answer_sessionId_idx` ON `quiz_session_answer` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_session_answer_session_quiz_unique` ON `quiz_session_answer` (`session_id`,`quiz_id`);