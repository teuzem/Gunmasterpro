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
CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `wishlist_user_product_unique` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
ALTER TABLE `catalogueActivityEvents` ADD CONSTRAINT `catalogueActivityEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueActivityEvents` ADD CONSTRAINT `catalogueActivityEvents_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestEvents` ADD CONSTRAINT `catalogueRequestEvents_requestId_catalogueRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `catalogueRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestEvents` ADD CONSTRAINT `catalogueRequestEvents_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestItems` ADD CONSTRAINT `catalogueRequestItems_requestId_catalogueRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `catalogueRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequestItems` ADD CONSTRAINT `catalogueRequestItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalogueRequests` ADD CONSTRAINT `catalogueRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collectionItems` ADD CONSTRAINT `collectionItems_collectionId_userCollections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `userCollections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collectionItems` ADD CONSTRAINT `collectionItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productReviews` ADD CONSTRAINT `productReviews_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productReviews` ADD CONSTRAINT `productReviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productReviews` ADD CONSTRAINT `productReviews_moderatedByUserId_users_id_fk` FOREIGN KEY (`moderatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productSpecificationAudits` ADD CONSTRAINT `productSpecificationAudits_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewMedia` ADD CONSTRAINT `reviewMedia_reviewId_productReviews_id_fk` FOREIGN KEY (`reviewId`) REFERENCES `productReviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userCollections` ADD CONSTRAINT `userCollections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_event_created_idx` ON `catalogueActivityEvents` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `catalogueActivityEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `request_events_idx` ON `catalogueRequestEvents` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `request_items_request_idx` ON `catalogueRequestItems` (`requestId`);--> statement-breakpoint
CREATE INDEX `request_email_reference_idx` ON `catalogueRequests` (`customerEmail`,`reference`);--> statement-breakpoint
CREATE INDEX `request_status_created_idx` ON `catalogueRequests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collection_items_position_idx` ON `collectionItems` (`collectionId`,`position`);--> statement-breakpoint
CREATE INDEX `hero_active_position_idx` ON `homeHeroSlides` (`isActive`,`position`);--> statement-breakpoint
CREATE INDEX `review_product_status_idx` ON `productReviews` (`productId`,`status`);--> statement-breakpoint
CREATE INDEX `spec_audit_status_idx` ON `productSpecificationAudits` (`verificationStatus`);--> statement-breakpoint
CREATE INDEX `review_media_position_idx` ON `reviewMedia` (`reviewId`,`position`);--> statement-breakpoint
CREATE INDEX `collection_user_idx` ON `userCollections` (`userId`,`isArchived`);--> statement-breakpoint
CREATE INDEX `wishlist_user_idx` ON `wishlists` (`userId`);