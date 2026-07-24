CREATE TABLE `affiliate_payout_account` (
	`account_holder_name` text NOT NULL,
	`account_number` text NOT NULL,
	`bank_name` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`method` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_payout_account_user_id_unique` ON `affiliate_payout_account` (`user_id`);