CREATE TABLE `study_set_content` (
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_set_content_studySetId_idx` ON `study_set_content` (`study_set_id`);--> statement-breakpoint
CREATE TABLE `study_set_content_to_chapter` (
	`content_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	PRIMARY KEY(`content_id`, `chapter_id`),
	FOREIGN KEY (`content_id`) REFERENCES `study_set_content`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ssc_to_chapter_chapterId_idx` ON `study_set_content_to_chapter` (`chapter_id`);