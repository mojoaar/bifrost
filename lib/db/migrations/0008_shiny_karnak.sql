ALTER TABLE `users` ADD `mfa_enabled` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_recovery` text;