CREATE TABLE `catalogueImportBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(2048),
	`format` enum('csv','xlsx','json') NOT NULL,
	`mode` enum('create','upsert') NOT NULL,
	`status` enum('validated','completed','failed') NOT NULL,
	`receivedRows` int NOT NULL DEFAULT 0,
	`createdRows` int NOT NULL DEFAULT 0,
	`updatedRows` int NOT NULL DEFAULT 0,
	`errorSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalogueImportBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalogueImportBatches` ADD CONSTRAINT `catalogueImportBatches_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `catalogue_import_actor_created_idx` ON `catalogueImportBatches` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `catalogue_import_status_created_idx` ON `catalogueImportBatches` (`status`,`createdAt`);