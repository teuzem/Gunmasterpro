CREATE TABLE `platformWorkflowEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`visitorId` varchar(96),
	`eventType` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(120),
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platformWorkflowEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitorConnectionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consentId` int,
	`visitorId` varchar(96) NOT NULL,
	`userId` int,
	`eventType` enum('consent_granted','consent_withdrawn','visit_recorded','location_unavailable') NOT NULL,
	`countryCode` varchar(8),
	`country` varchar(120),
	`region` varchar(180),
	`city` varchar(180),
	`latitude` double,
	`longitude` double,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitorConnectionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `platformWorkflowEvents` ADD CONSTRAINT `platformWorkflowEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorConnectionEvents` ADD CONSTRAINT `visitorConnectionEvents_consentId_visitorLocationConsents_id_fk` FOREIGN KEY (`consentId`) REFERENCES `visitorLocationConsents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorConnectionEvents` ADD CONSTRAINT `visitorConnectionEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `workflow_event_created_idx` ON `platformWorkflowEvents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `workflow_event_type_created_idx` ON `platformWorkflowEvents` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workflow_event_user_created_idx` ON `platformWorkflowEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_visitor_created_idx` ON `visitorConnectionEvents` (`visitorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_user_created_idx` ON `visitorConnectionEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_event_created_idx` ON `visitorConnectionEvents` (`eventType`,`createdAt`);