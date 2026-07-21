CREATE TABLE `affiliate_commission` (
	`affiliate_user_id` text NOT NULL,
	`commission_amount` real NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`payout_id` text,
	`purchase_amount` real NOT NULL,
	`purchaser_user_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`transaction_id` text NOT NULL,
	FOREIGN KEY (`affiliate_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payout_id`) REFERENCES `affiliate_payout`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`purchaser_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_commission_transaction_id_unique` ON `affiliate_commission` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `affiliate_payout` (
	`affiliate_user_id` text NOT NULL,
	`amount` real NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`method` text,
	`note` text,
	`processed_by_admin_id` text NOT NULL,
	`reference` text,
	FOREIGN KEY (`affiliate_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`processed_by_admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `affiliate_profile` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name_snapshot` text NOT NULL,
	`slug` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_profile_slug_unique` ON `affiliate_profile` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_profile_user_id_unique` ON `affiliate_profile` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `affiliated_by` text REFERENCES user(id);