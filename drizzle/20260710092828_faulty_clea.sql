CREATE TABLE `plan_order` (
	`applied_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`duration_months` integer NOT NULL,
	`expires_at` integer,
	`gross_amount` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`plan_key` text NOT NULL,
	`sku` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_order_userId_idx` ON `plan_order` (`user_id`);--> statement-breakpoint
CREATE INDEX `plan_order_status_expiresAt_idx` ON `plan_order` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `payment` (
	`amount` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`gateway` text NOT NULL,
	`gateway_order_id` text NOT NULL,
	`gateway_transaction_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payload` text,
	`status` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `plan_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_gateway_transactionId_unique` ON `payment` (`gateway`,`gateway_transaction_id`);--> statement-breakpoint
CREATE INDEX `payment_orderId_idx` ON `payment` (`order_id`);--> statement-breakpoint
CREATE INDEX `payment_userId_idx` ON `payment` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_plan` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`plan_key` text NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_plan_userId_unique` ON `user_plan` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_plan_userId_expiresAt_idx` ON `user_plan` (`user_id`,`expires_at`);