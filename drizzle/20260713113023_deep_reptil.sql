CREATE TABLE `admin_grant` (
	`duration_months` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`granted_at` integer NOT NULL,
	`granted_by` text,
	`id` text PRIMARY KEY NOT NULL,
	`note` text,
	`plan_key` text NOT NULL,
	`started_at` integer NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_grant_userId_expiresAt_idx` ON `admin_grant` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `admin_grant_grantedBy_grantedAt_idx` ON `admin_grant` (`granted_by`,`granted_at`);