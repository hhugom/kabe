PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_drills`;--> statement-breakpoint
CREATE TABLE `__new_drills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`metric` text NOT NULL,
	`target` integer NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_drills`("id", "name", "category", "metric", "target", "notes", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "category", "metric", COALESCE("target", CASE "metric" WHEN 'duration' THEN 120 WHEN 'accuracy' THEN 65 ELSE 20 END), "notes", "created_at", "updated_at", "deleted_at" FROM `drills`;--> statement-breakpoint
DROP TABLE `drills`;--> statement-breakpoint
ALTER TABLE `__new_drills` RENAME TO `drills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;