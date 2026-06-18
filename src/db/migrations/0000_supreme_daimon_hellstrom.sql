CREATE TABLE `drills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`shot_type` text NOT NULL,
	`description` text,
	`is_custom` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE TABLE `session_drills` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`drill_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`drill_notes` text,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`drill_id`) REFERENCES `drills`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`ended_at` integer,
	`location` text,
	`overall_notes` text,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_drill_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`consecutive_hits` integer NOT NULL,
	`note` text,
	`recorded_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`session_drill_id`) REFERENCES `session_drills`(`id`) ON UPDATE no action ON DELETE cascade
);
