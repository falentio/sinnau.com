CREATE TABLE `ai_usage_log` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`feature_key` text NOT NULL,
	`amount` integer NOT NULL,
	`reference_id` text,
	`refunded_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
