CREATE TABLE `catalogueCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`parentCategory` enum('handguns','rifles','shotguns','accessories') NOT NULL,
	`label` varchar(180) NOT NULL,
	`description` varchar(500) NOT NULL,
	`imageUrl` varchar(2048) NOT NULL,
	`mediaSource` varchar(255) NOT NULL,
	`mediaRightsStatus` enum('pending','verified') NOT NULL DEFAULT 'verified',
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalogueCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalogueCategories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `mediaAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int,
	`categorySlug` varchar(120),
	`kind` enum('primary','gallery','category') NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`sourceUrl` varchar(2048) NOT NULL,
	`storageKey` varchar(2048),
	`storageUrl` varchar(2048),
	`contentType` varchar(120),
	`checksum` varchar(128),
	`transferStatus` enum('pending','transferred','failed') NOT NULL DEFAULT 'pending',
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_asset_source_unique` UNIQUE(`sourceUrl`)
);
--> statement-breakpoint
CREATE TABLE `mediaImportBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(160) NOT NULL,
	`status` enum('pending','running','paused','completed','failed') NOT NULL DEFAULT 'pending',
	`requestedCount` int NOT NULL DEFAULT 0,
	`transferredCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`cursor` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaImportBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` varchar(32),
	`slug` varchar(180) NOT NULL,
	`name` varchar(240) NOT NULL,
	`brand` varchar(180) NOT NULL,
	`category` enum('handguns','rifles','shotguns','accessories') NOT NULL,
	`subCategory` varchar(120) NOT NULL DEFAULT 'general',
	`manufacturer` varchar(180) NOT NULL DEFAULT 'GunsMasterPro',
	`model` varchar(180) NOT NULL DEFAULT 'Standard',
	`excerpt` text NOT NULL,
	`description` text NOT NULL,
	`referencePriceCents` int NOT NULL,
	`priceCents` int NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`caliber` varchar(100) NOT NULL,
	`material` varchar(160) NOT NULL,
	`capacity` varchar(80) NOT NULL,
	`action` varchar(120) NOT NULL,
	`barrelLength` varchar(80) NOT NULL,
	`overallLength` varchar(80) NOT NULL,
	`weight` varchar(80) NOT NULL,
	`imageUrl` varchar(2048) NOT NULL,
	`gallery` json NOT NULL,
	`specifications` json,
	`mediaSource` varchar(255) NOT NULL,
	`mediaRightsStatus` enum('pending','verified') NOT NULL DEFAULT 'verified',
	`mediaTransferState` enum('pending','partial','complete') NOT NULL DEFAULT 'pending',
	`featured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sourceId_unique` UNIQUE(`sourceId`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD CONSTRAINT `mediaAssets_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `catalogueCategories` (`parentCategory`);--> statement-breakpoint
CREATE INDEX `categories_position_idx` ON `catalogueCategories` (`position`);--> statement-breakpoint
CREATE INDEX `media_product_idx` ON `mediaAssets` (`productId`);--> statement-breakpoint
CREATE INDEX `media_transfer_idx` ON `mediaAssets` (`transferStatus`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `products_sub_category_idx` ON `products` (`subCategory`);