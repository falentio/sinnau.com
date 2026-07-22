CREATE INDEX `user_affiliated_by_idx` ON `user` (`affiliated_by`);--> statement-breakpoint
CREATE INDEX `affiliate_commission_user_status_idx` ON `affiliate_commission` (`affiliate_user_id`,`status`);