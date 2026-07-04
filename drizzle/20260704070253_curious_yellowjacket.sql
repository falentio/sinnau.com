ALTER TABLE `study_set` ADD `is_ai_generated` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `chapter` ADD `is_ai_generated` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `flashcard` ADD `is_ai_generated` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz` ADD `is_ai_generated` integer DEFAULT false NOT NULL;