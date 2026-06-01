CREATE TABLE `study_set` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`visibility` text NOT NULL,
	`owner_id` text NOT NULL,
	`files` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_set_slug_unique` ON `study_set` (lower("slug"));--> statement-breakpoint
CREATE INDEX `study_set_ownerId_idx` ON `study_set` (`owner_id`);--> statement-breakpoint
CREATE INDEX `study_set_visibility_idx` ON `study_set` (`visibility`);--> statement-breakpoint
CREATE TABLE `study_set_visit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`study_set_id` text NOT NULL,
	`visited_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_set_visit_user_studySet_unique` ON `study_set_visit` (`user_id`,`study_set_id`);--> statement-breakpoint
CREATE INDEX `study_set_visit_userId_idx` ON `study_set_visit` (`user_id`);--> statement-breakpoint
CREATE INDEX `study_set_visit_studySetId_idx` ON `study_set_visit` (`study_set_id`);--> statement-breakpoint
CREATE INDEX `study_set_visit_visitedAt_idx` ON `study_set_visit` (`visited_at`);--> statement-breakpoint
ALTER TABLE `session` ADD `impersonated_by` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text;--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires` integer;