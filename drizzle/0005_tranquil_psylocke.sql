CREATE TABLE `adminAccessRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicantUserId` int NOT NULL,
	`requestedMessage` varchar(1000),
	`status` enum('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`reviewerNote` varchar(1000),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminAccessRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `adminAccessRequests` ADD CONSTRAINT `adminAccessRequests_applicantUserId_users_id_fk` FOREIGN KEY (`applicantUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminAccessRequests` ADD CONSTRAINT `adminAccessRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_access_request_applicant_idx` ON `adminAccessRequests` (`applicantUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_access_request_status_idx` ON `adminAccessRequests` (`status`,`createdAt`);