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
CREATE TABLE `catalogueActivityEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`productId` int,
	`eventType` enum('cart_added','wishlist_toggled','request_created') NOT NULL,
	`locale` enum('fr','en','de') NOT NULL DEFAULT 'fr',
	`countryCode` varchar(8),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalogueActivityEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `catalogueRequestEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`status` enum('received','under_review','information_required','closed') NOT NULL,
	`note` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalogueRequestEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalogueRequestItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPriceCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalogueRequestItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalogueRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(64) NOT NULL,
	`userId` int,
	`customerName` varchar(180) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(80) NOT NULL,
	`locale` enum('fr','en','de') NOT NULL DEFAULT 'fr',
	`countryCode` varchar(8),
	`countryContextConsent` boolean NOT NULL DEFAULT false,
	`couponCode` varchar(80),
	`subtotalCents` int NOT NULL,
	`totalCents` int NOT NULL,
	`status` enum('received','under_review','information_required','closed') NOT NULL DEFAULT 'received',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalogueRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalogueRequests_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `collectionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`productId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `collection_product_unique` UNIQUE(`collectionId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `homeHeroSlides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`position` int NOT NULL,
	`categorySlug` varchar(120),
	`targetPath` varchar(320) NOT NULL,
	`storageKey` varchar(2048) NOT NULL,
	`imageUrl` varchar(2048) NOT NULL,
	`altText` json NOT NULL,
	`eyebrow` json NOT NULL,
	`title` json NOT NULL,
	`description` json NOT NULL,
	`ctaLabel` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homeHeroSlides_id` PRIMARY KEY(`id`),
	CONSTRAINT `hero_position_unique` UNIQUE(`position`)
);
--> statement-breakpoint
CREATE TABLE `mediaAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int,
	`categorySlug` varchar(120),
	`kind` enum('primary','gallery','category') NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`sourceUrl` varchar(700) NOT NULL,
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
CREATE TABLE `newsletterSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`locale` enum('fr','en','de') NOT NULL DEFAULT 'fr',
	`consentAt` timestamp NOT NULL DEFAULT (now()),
	`unsubscribedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletterSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletterSubscriptions_email_unique` UNIQUE(`email`)
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
CREATE TABLE `productReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderatedByUserId` int,
	`moderationNote` text,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_user_product_unique` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `productSpecificationAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`fieldName` varchar(120) NOT NULL,
	`value` text NOT NULL,
	`sourceLabel` varchar(255) NOT NULL,
	`sourceUrl` varchar(2048),
	`verificationStatus` enum('verified','unconfirmed','not_applicable') NOT NULL DEFAULT 'unconfirmed',
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productSpecificationAudits_id` PRIMARY KEY(`id`),
	CONSTRAINT `spec_audit_product_field_unique` UNIQUE(`productId`,`fieldName`)
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
CREATE TABLE `reviewMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`storageKey` varchar(2048) NOT NULL,
	`storageUrl` varchar(2048) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userCollections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`isSystemSaved` boolean NOT NULL DEFAULT false,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCollections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('super_admin','admin','user') NOT NULL DEFAULT 'user',
	`accountStatus` enum('active','banned') NOT NULL DEFAULT 'active',
	`bannedAt` timestamp,
	`banReason` text,
	`bannedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
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
CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `wishlist_user_product_unique` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
ALTER TABLE `adminAccessRequests` ADD CONSTRAINT `adminAccessRequests_applicantUserId_users_id_fk` FOREIGN KEY (`applicantUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminAccessRequests` ADD CONSTRAINT `adminAccessRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminActivityLogs` ADD CONSTRAINT `adminActivityLogs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminActivityLogs` ADD CONSTRAINT `adminActivityLogs_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueActivityEvents` ADD CONSTRAINT `catalogueActivityEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueActivityEvents` ADD CONSTRAINT `catalogueActivityEvents_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueImportBatches` ADD CONSTRAINT `catalogueImportBatches_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestEvents` ADD CONSTRAINT `catalogueRequestEvents_requestId_catalogueRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `catalogueRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestEvents` ADD CONSTRAINT `catalogueRequestEvents_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestItems` ADD CONSTRAINT `catalogueRequestItems_requestId_catalogueRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `catalogueRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestItems` ADD CONSTRAINT `catalogueRequestItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequests` ADD CONSTRAINT `catalogueRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collectionItems` ADD CONSTRAINT `collectionItems_collectionId_userCollections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `userCollections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collectionItems` ADD CONSTRAINT `collectionItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD CONSTRAINT `mediaAssets_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platformSettings` ADD CONSTRAINT `platformSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platformWorkflowEvents` ADD CONSTRAINT `platformWorkflowEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productReviews` ADD CONSTRAINT `productReviews_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productReviews` ADD CONSTRAINT `productReviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productReviews` ADD CONSTRAINT `productReviews_moderatedByUserId_users_id_fk` FOREIGN KEY (`moderatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productSpecificationAudits` ADD CONSTRAINT `productSpecificationAudits_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewMedia` ADD CONSTRAINT `reviewMedia_reviewId_productReviews_id_fk` FOREIGN KEY (`reviewId`) REFERENCES `productReviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userCollections` ADD CONSTRAINT `userCollections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorConnectionEvents` ADD CONSTRAINT `visitorConnectionEvents_consentId_visitorLocationConsents_id_fk` FOREIGN KEY (`consentId`) REFERENCES `visitorLocationConsents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorConnectionEvents` ADD CONSTRAINT `visitorConnectionEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorLocationConsents` ADD CONSTRAINT `visitorLocationConsents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorLocations` ADD CONSTRAINT `visitorLocations_consentId_visitorLocationConsents_id_fk` FOREIGN KEY (`consentId`) REFERENCES `visitorLocationConsents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visitorLocations` ADD CONSTRAINT `visitorLocations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_access_request_applicant_idx` ON `adminAccessRequests` (`applicantUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_access_request_status_idx` ON `adminAccessRequests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_activity_created_idx` ON `adminActivityLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_activity_target_idx` ON `adminActivityLogs` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_event_created_idx` ON `catalogueActivityEvents` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `catalogueActivityEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `catalogueCategories` (`parentCategory`);--> statement-breakpoint
CREATE INDEX `categories_position_idx` ON `catalogueCategories` (`position`);--> statement-breakpoint
CREATE INDEX `catalogue_import_actor_created_idx` ON `catalogueImportBatches` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `catalogue_import_status_created_idx` ON `catalogueImportBatches` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `request_events_idx` ON `catalogueRequestEvents` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `request_items_request_idx` ON `catalogueRequestItems` (`requestId`);--> statement-breakpoint
CREATE INDEX `request_email_reference_idx` ON `catalogueRequests` (`customerEmail`,`reference`);--> statement-breakpoint
CREATE INDEX `request_status_created_idx` ON `catalogueRequests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collection_items_position_idx` ON `collectionItems` (`collectionId`,`position`);--> statement-breakpoint
CREATE INDEX `hero_active_position_idx` ON `homeHeroSlides` (`isActive`,`position`);--> statement-breakpoint
CREATE INDEX `media_product_idx` ON `mediaAssets` (`productId`);--> statement-breakpoint
CREATE INDEX `media_transfer_idx` ON `mediaAssets` (`transferStatus`);--> statement-breakpoint
CREATE INDEX `workflow_event_created_idx` ON `platformWorkflowEvents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `workflow_event_type_created_idx` ON `platformWorkflowEvents` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workflow_event_user_created_idx` ON `platformWorkflowEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `review_product_status_idx` ON `productReviews` (`productId`,`status`);--> statement-breakpoint
CREATE INDEX `spec_audit_status_idx` ON `productSpecificationAudits` (`verificationStatus`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `products_sub_category_idx` ON `products` (`subCategory`);--> statement-breakpoint
CREATE INDEX `review_media_position_idx` ON `reviewMedia` (`reviewId`,`position`);--> statement-breakpoint
CREATE INDEX `collection_user_idx` ON `userCollections` (`userId`,`isArchived`);--> statement-breakpoint
CREATE INDEX `connection_visitor_created_idx` ON `visitorConnectionEvents` (`visitorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_user_created_idx` ON `visitorConnectionEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `connection_event_created_idx` ON `visitorConnectionEvents` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `visitor_consent_user_idx` ON `visitorLocationConsents` (`userId`);--> statement-breakpoint
CREATE INDEX `visitor_consent_active_idx` ON `visitorLocationConsents` (`consented`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `visitor_location_country_idx` ON `visitorLocations` (`countryCode`,`createdAt`);--> statement-breakpoint
CREATE INDEX `visitor_location_consent_idx` ON `visitorLocations` (`consentId`);--> statement-breakpoint
CREATE INDEX `visitor_location_expiry_idx` ON `visitorLocations` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `wishlist_user_idx` ON `wishlists` (`userId`);