CREATE TABLE `favorite_meals` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`meal` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `tracking_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`goals` text NOT NULL
);
