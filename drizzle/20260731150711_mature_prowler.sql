ALTER TABLE `generate` ADD `extraction_type` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `generate` ADD `language_style` text DEFAULT 'student-friendly' NOT NULL;--> statement-breakpoint
ALTER TABLE `generate` ADD `log_id` text;