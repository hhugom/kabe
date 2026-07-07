CREATE TABLE `routine_items` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`drill_id` text NOT NULL,
	`planned_sets` integer,
	`position` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
