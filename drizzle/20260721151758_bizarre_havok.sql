CREATE TABLE `affiliate_relationship` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`referred_user_id` text NOT NULL,
	`referrer_user_id` text NOT NULL,
	FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_relationship_referred_user_id_unique` ON `affiliate_relationship` (`referred_user_id`);--> statement-breakpoint
CREATE TABLE `affiliate_subscription_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`points_awarded` real NOT NULL,
	`referred_user_id` text NOT NULL,
	`referrer_user_id` text NOT NULL,
	`relationship_id` text NOT NULL,
	`source_type` text NOT NULL,
	FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`relationship_id`) REFERENCES `affiliate_relationship`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_subscription_event_idempotency_key_unique` ON `affiliate_subscription_event` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `affiliate_profile` ADD `points` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `affiliate_profile` ADD `version` integer DEFAULT 1 NOT NULL;