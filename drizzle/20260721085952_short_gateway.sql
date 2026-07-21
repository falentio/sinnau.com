PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_referral_subscription_event` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text,
	`referrer_user_id` text NOT NULL,
	`referred_user_id` text,
	`idempotency_key` text NOT NULL,
	`points_awarded` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `referral_relationship`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_referral_subscription_event`("id", "relationship_id", "referrer_user_id", "referred_user_id", "idempotency_key", "points_awarded", "created_at") SELECT "id", "relationship_id", "referrer_user_id", "referred_user_id", "idempotency_key", "points_awarded", "created_at" FROM `referral_subscription_event`;--> statement-breakpoint
DROP TABLE `referral_subscription_event`;--> statement-breakpoint
ALTER TABLE `__new_referral_subscription_event` RENAME TO `referral_subscription_event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `referral_subscription_event_idempotencyKey_unique` ON `referral_subscription_event` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `referral_subscription_event_referrerUserId_idx` ON `referral_subscription_event` (`referrer_user_id`);--> statement-breakpoint
CREATE INDEX `referral_subscription_event_referredUserId_idx` ON `referral_subscription_event` (`referred_user_id`);--> statement-breakpoint
CREATE INDEX `referral_subscription_event_relationshipId_idx` ON `referral_subscription_event` (`relationship_id`);