CREATE TABLE `pages` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content_md` text NOT NULL,
	`content_html` text DEFAULT '' NOT NULL,
	`excerpt` text,
	`frontmatter` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`show_in_nav` integer DEFAULT false NOT NULL,
	`nav_order` integer DEFAULT 0 NOT NULL,
	`author_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
