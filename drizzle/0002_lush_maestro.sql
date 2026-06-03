CREATE TABLE `chapter` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`study_set_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapter_studySetId_slug_unique` ON `chapter` (lower("slug"),`study_set_id`);--> statement-breakpoint
CREATE INDEX `chapter_studySetId_idx` ON `chapter` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `chapter_ownerId_idx` ON `chapter` (`owner_id`);--> statement-breakpoint
CREATE TABLE `flashcard` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text,
	`study_set_id` text NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`hint` text,
	`importance` integer DEFAULT 0 NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcard_ownerId_idx` ON `flashcard` (`owner_id`);--> statement-breakpoint
CREATE INDEX `flashcard_studySetId_idx` ON `flashcard` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `flashcard_chapterId_idx` ON `flashcard` (`chapter_id`);