DROP TABLE `affiliate_relationship`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_affiliate_subscription_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`points_awarded` real NOT NULL,
	`referred_user_id` text NOT NULL,
	`referrer_user_id` text NOT NULL,
	`source_type` text NOT NULL,
	FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_affiliate_subscription_event`("created_at", "id", "idempotency_key", "points_awarded", "referred_user_id", "referrer_user_id", "source_type") SELECT "created_at", "id", "idempotency_key", "points_awarded", "referred_user_id", "referrer_user_id", "source_type" FROM `affiliate_subscription_event`;--> statement-breakpoint
DROP TABLE `affiliate_subscription_event`;--> statement-breakpoint
ALTER TABLE `__new_affiliate_subscription_event` RENAME TO `affiliate_subscription_event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_subscription_event_idempotency_key_unique` ON `affiliate_subscription_event` (`idempotency_key`);