CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL,
	`actor_id` text,
	`actor_label` text,
	`actor_type` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`status` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`metadata` text
);
