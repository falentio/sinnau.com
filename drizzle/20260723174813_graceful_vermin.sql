CREATE TABLE `affiliate_application` (
	`advantage` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`instagram_handle` text,
	`reviewed_at` integer,
	`reviewed_by_admin_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`tiktok_handle` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`youtube_handle` text,
	FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `affiliate_application_user_status_idx` ON `affiliate_application` (`user_id`,`status`);