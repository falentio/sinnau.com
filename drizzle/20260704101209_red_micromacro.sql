CREATE TABLE `affiliate_commission` (
	`id` text PRIMARY KEY NOT NULL,
	`affiliate_user_id` text NOT NULL,
	`purchaser_user_id` text NOT NULL,
	`purchase_amount` real NOT NULL,
	`commission_amount` real NOT NULL,
	`transaction_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payout_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`affiliate_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchaser_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payout_id`) REFERENCES `affiliate_payout`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_commission_transaction_id_unique` ON `affiliate_commission` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `affiliate_payout` (
	`id` text PRIMARY KEY NOT NULL,
	`affiliate_user_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text,
	`reference` text,
	`note` text,
	`processed_by_admin_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`affiliate_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`processed_by_admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `affiliate_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`name_snapshot` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_profile_user_id_unique` ON `affiliate_profile` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_profile_slug_unique` ON `affiliate_profile` (`slug`);--> statement-breakpoint
ALTER TABLE `user` ADD `affiliated_by` text REFERENCES user(id);