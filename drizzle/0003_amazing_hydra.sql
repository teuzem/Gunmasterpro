CREATE TABLE `adminActivityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`targetUserId` int,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(120),
	`action` varchar(120) NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminActivityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whatsappNumber` varchar(80),
	`telegramHandle` varchar(120),
	`locationNoticeVersion` varchar(32) NOT NULL DEFAULT 'v1',
	`locationRetentionDays` int NOT NULL DEFAULT 30,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitorLocationConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` varchar(96) NOT NULL,
	`userId` int,
	`consented` boolean NOT NULL DEFAULT false,
	`noticeVersion` varchar(32) NOT NULL,
	`consentedAt` timestamp,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitorLocationConsents_id` PRIMARY KEY(`id`),
	CONSTRAINT `visitorLocationConsents_visitorId_unique` UNIQUE(`visitorId`)
);
--> statement-breakpoint
CREATE TABLE `visitorLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consentId` int NOT NULL,
	`visitorId` varchar(96) NOT NULL,
	`userId` int,
	`countryCode` varchar(8) NOT NULL,
	`country` varchar(120) NOT NULL,
	`region` varchar(180),
	`city` varchar(180),
	`latitude` double,
	`longitude` double,
	`source` varchar(80) NOT NULL DEFAULT 'country.is',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitorLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','banned') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedByUserId` int;--> statement-breakpoint
ALTER TABLE `adminActivityLogs` ADD CONSTRAINT `adminActivityLogs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminActivityLogs` ADD CONSTRAINT `adminActivityLogs_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platformSettings` ADD CONSTRAINT `platformSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorLocationConsents` ADD CONSTRAINT `visitorLocationConsents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorLocations` ADD CONSTRAINT `visitorLocations_consentId_visitorLocationConsents_id_fk` FOREIGN KEY (`consentId`) REFERENCES `visitorLocationConsents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorLocations` ADD CONSTRAINT `visitorLocations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_activity_created_idx` ON `adminActivityLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_activity_target_idx` ON `adminActivityLogs` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `visitor_consent_user_idx` ON `visitorLocationConsents` (`userId`);--> statement-breakpoint
CREATE INDEX `visitor_consent_active_idx` ON `visitorLocationConsents` (`consented`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `visitor_location_country_idx` ON `visitorLocations` (`countryCode`,`createdAt`);--> statement-breakpoint
CREATE INDEX `visitor_location_consent_idx` ON `visitorLocations` (`consentId`);--> statement-breakpoint
CREATE INDEX `visitor_location_expiry_idx` ON `visitorLocations` (`expiresAt`);