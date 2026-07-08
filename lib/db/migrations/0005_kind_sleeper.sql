CREATE TABLE `page_views` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`timestamp` text NOT NULL,
	`referrer` text
);
