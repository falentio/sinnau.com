CREATE TABLE `quiz` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text,
	`study_set_id` text NOT NULL,
	`type` text NOT NULL,
	`question_text` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_ownerId_idx` ON `quiz` (`owner_id`);--> statement-breakpoint
CREATE INDEX `quiz_studySetId_idx` ON `quiz` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `quiz_chapterId_idx` ON `quiz` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `quiz_option` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`option_text` text NOT NULL,
	`is_correct` integer NOT NULL,
	`explanation` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_option_quizId_idx` ON `quiz_option` (`quiz_id`);