CREATE TABLE `account` (
	`access_token` text,
	`access_token_expires_at` integer,
	`account_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`id_token` text,
	`password` text,
	`provider_id` text NOT NULL,
	`refresh_token` text,
	`refresh_token_expires_at` integer,
	`scope` text,
	`updated_at` integer NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`impersonated_by` text,
	`ip_address` text,
	`token` text NOT NULL,
	`updated_at` integer NOT NULL,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`ban_expires` integer,
	`ban_reason` text,
	`banned` integer DEFAULT false,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image` text,
	`name` text NOT NULL,
	`role` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `study_set` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	`description` text,
	`files` text DEFAULT '[]' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`visibility` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_set_slug_unique` ON `study_set` (lower("slug"));--> statement-breakpoint
CREATE INDEX `study_set_ownerId_idx` ON `study_set` (`owner_id`);--> statement-breakpoint
CREATE INDEX `study_set_visibility_idx` ON `study_set` (`visibility`);--> statement-breakpoint
CREATE TABLE `study_set_visit` (
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`user_id` text NOT NULL,
	`visited_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_set_visit_user_studySet_unique` ON `study_set_visit` (`user_id`,`study_set_id`);--> statement-breakpoint
CREATE INDEX `study_set_visit_userId_idx` ON `study_set_visit` (`user_id`);--> statement-breakpoint
CREATE INDEX `study_set_visit_studySetId_idx` ON `study_set_visit` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `study_set_visit_visitedAt_idx` ON `study_set_visit` (`visited_at`);--> statement-breakpoint
CREATE TABLE `chapter` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`slug` text NOT NULL,
	`study_set_id` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapter_studySetId_slug_unique` ON `chapter` (lower("slug"),`study_set_id`);--> statement-breakpoint
CREATE INDEX `chapter_studySetId_idx` ON `chapter` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `chapter_ownerId_idx` ON `chapter` (`owner_id`);--> statement-breakpoint
CREATE TABLE `flashcard` (
	`back` text NOT NULL,
	`chapter_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`front` text NOT NULL,
	`hint` text,
	`id` text PRIMARY KEY NOT NULL,
	`importance` integer DEFAULT 0 NOT NULL,
	`owner_id` text NOT NULL,
	`study_set_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcard_ownerId_idx` ON `flashcard` (`owner_id`);--> statement-breakpoint
CREATE INDEX `flashcard_studySetId_idx` ON `flashcard` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `flashcard_chapterId_idx` ON `flashcard` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `flashcard_studySetId_createdAt_idx` ON `flashcard` (`study_set_id`,`created_at`);--> statement-breakpoint
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
CREATE TABLE `quiz` (
	`chapter_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`question_text` text NOT NULL,
	`study_set_id` text NOT NULL,
	`type` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_ownerId_idx` ON `quiz` (`owner_id`);--> statement-breakpoint
CREATE INDEX `quiz_studySetId_idx` ON `quiz` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `quiz_chapterId_idx` ON `quiz` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `quiz_option` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`explanation` text,
	`id` text PRIMARY KEY NOT NULL,
	`is_correct` integer NOT NULL,
	`option_text` text NOT NULL,
	`quiz_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_option_quizId_idx` ON `quiz_option` (`quiz_id`);--> statement-breakpoint
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
	`selected_option_ids` text NOT NULL,
	`session_id` text NOT NULL,
	`session_quiz_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `quiz_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_quiz_id`) REFERENCES `quiz_session_quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_session_answer_sessionId_idx` ON `quiz_session_answer` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_session_answer_session_sessionQuiz` ON `quiz_session_answer` (`session_id`,`session_quiz_id`);--> statement-breakpoint
CREATE TABLE `quiz_session_quiz` (
	`chapter_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`original_quiz_id` text,
	`position` integer NOT NULL,
	`question_text` text NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`original_quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`session_id`) REFERENCES `quiz_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_session_quiz_sessionId_idx` ON `quiz_session_quiz` (`session_id`);--> statement-breakpoint
CREATE INDEX `quiz_session_quiz_originalQuizId_idx` ON `quiz_session_quiz` (`original_quiz_id`);--> statement-breakpoint
CREATE TABLE `quiz_session_quiz_option` (
	`explanation` text,
	`id` text PRIMARY KEY NOT NULL,
	`is_correct` integer NOT NULL,
	`option_text` text NOT NULL,
	`position` integer NOT NULL,
	`session_quiz_id` text NOT NULL,
	FOREIGN KEY (`session_quiz_id`) REFERENCES `quiz_session_quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_session_quiz_option_sessionQuizId_idx` ON `quiz_session_quiz_option` (`session_quiz_id`);--> statement-breakpoint
CREATE TABLE `study_set_content` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_set_content_studySetId_idx` ON `study_set_content` (`study_set_id`);--> statement-breakpoint
CREATE TABLE `study_set_content_to_chapter` (
	`chapter_id` text NOT NULL,
	`content_id` text NOT NULL,
	PRIMARY KEY(`content_id`, `chapter_id`),
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_id`) REFERENCES `study_set_content`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ssc_to_chapter_chapterId_idx` ON `study_set_content_to_chapter` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `generate` (
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`status` text NOT NULL,
	`study_set_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generate_ownerId_idx` ON `generate` (`owner_id`);--> statement-breakpoint
CREATE INDEX `generate_studySetId_idx` ON `generate` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `generate_status_idx` ON `generate` (`status`);--> statement-breakpoint
CREATE TABLE `generate_chunk_result` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`generate_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`index` integer NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`generate_id`) REFERENCES `generate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generate_chunk_result_generateId_idx` ON `generate_chunk_result` (`generate_id`);--> statement-breakpoint
CREATE INDEX `generate_chunk_result_generateId_index_idx` ON `generate_chunk_result` (`generate_id`,`index`);--> statement-breakpoint
CREATE TABLE `generate_input` (
	`generate_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`input` text NOT NULL,
	`is_input_truncated` integer NOT NULL,
	FOREIGN KEY (`generate_id`) REFERENCES `generate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generate_input_generateId_unique` ON `generate_input` (`generate_id`);