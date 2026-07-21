CREATE TABLE `referral_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_profile_userId_unique` ON `referral_profile` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `referral_profile_slug_unique` ON `referral_profile` (lower("slug"));--> statement-breakpoint
CREATE INDEX `referral_profile_slug_idx` ON `referral_profile` (`slug`);--> statement-breakpoint
CREATE TABLE `referral_relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_user_id` text NOT NULL,
	`referred_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_relationship_referredUserId_unique` ON `referral_relationship` (`referred_user_id`);--> statement-breakpoint
CREATE INDEX `referral_relationship_referrerUserId_idx` ON `referral_relationship` (`referrer_user_id`);--> statement-breakpoint
CREATE TABLE `referral_subscription_event` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`referrer_user_id` text NOT NULL,
	`referred_user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`points_awarded` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `referral_relationship`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_subscription_event_idempotencyKey_unique` ON `referral_subscription_event` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `referral_subscription_event_referrerUserId_idx` ON `referral_subscription_event` (`referrer_user_id`);--> statement-breakpoint
CREATE INDEX `referral_subscription_event_referredUserId_idx` ON `referral_subscription_event` (`referred_user_id`);--> statement-breakpoint
CREATE INDEX `referral_subscription_event_relationshipId_idx` ON `referral_subscription_event` (`relationship_id`);