CREATE TABLE IF NOT EXISTS `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`period` text NOT NULL,
	`items` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meals_user_date` ON `meals` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meals_user_created` ON `meals` (`user_id`,`created_at`);
CREATE TABLE IF NOT EXISTS tracking_preferences (
 user_id TEXT PRIMARY KEY NOT NULL,
 goals TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorite_meals (
 user_id TEXT NOT NULL,
 id TEXT NOT NULL,
 meal TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY (user_id,id)
);
