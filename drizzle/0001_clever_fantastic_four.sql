CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(100),
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`street` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`region` varchar(100),
	`postalCode` varchar(20),
	`country` varchar(100) NOT NULL,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`totalOrders` int DEFAULT 0,
	`totalRevenue` decimal(12,2) DEFAULT '0',
	`totalUsers` int DEFAULT 0,
	`totalProducts` int DEFAULT 0,
	`totalSellers` int DEFAULT 0,
	`averageOrderValue` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `browsingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`categoryId` int NOT NULL,
	`viewDuration` int,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `browsingHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cartItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cartItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`image` text,
	`icon` text,
	`slug` varchar(255) NOT NULL,
	`parentId` int,
	`displayOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`type` enum('earn','redeem','bonus','adjustment') NOT NULL,
	`points` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`sellerId` int NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) DEFAULT '0',
	`subtotal` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`status` enum('pending','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
	`subtotal` decimal(12,2) NOT NULL,
	`tax` decimal(12,2) DEFAULT '0',
	`shippingCost` decimal(12,2) DEFAULT '0',
	`discount` decimal(12,2) DEFAULT '0',
	`loyaltyPointsUsed` int DEFAULT 0,
	`total` decimal(12,2) NOT NULL,
	`paymentMethod` enum('mada','creditCard','stcPay') NOT NULL,
	`paymentStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`shippingAddressId` int NOT NULL,
	`billingAddressId` int,
	`trackingNumber` varchar(100),
	`estimatedDelivery` timestamp,
	`deliveredAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`price` decimal(12,2) NOT NULL,
	`originalPrice` decimal(12,2),
	`sku` varchar(100) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`rating` decimal(3,2) DEFAULT '0',
	`reviewCount` int DEFAULT 0,
	`images` json,
	`thumbnail` text,
	`slug` varchar(255) NOT NULL,
	`isActive` boolean DEFAULT true,
	`isFeatured` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`image` text,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` decimal(12,2) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isActive` boolean DEFAULT true,
	`applicableCategories` json,
	`applicableProducts` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255),
	`comment` text,
	`images` json,
	`isVerified` boolean DEFAULT false,
	`helpful` int DEFAULT 0,
	`unhelpful` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeName` varchar(255) NOT NULL,
	`storeDescription` text,
	`storeImage` text,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320) NOT NULL,
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`rating` decimal(3,2) DEFAULT '0',
	`totalSales` int DEFAULT 0,
	`isVerified` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`commissionRate` decimal(5,2) DEFAULT '10',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','seller') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `loyaltyPoints` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `browsingHistory` ADD CONSTRAINT `browsingHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `browsingHistory` ADD CONSTRAINT `browsingHistory_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `browsingHistory` ADD CONSTRAINT `browsingHistory_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cartItems` ADD CONSTRAINT `cartItems_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cartItems` ADD CONSTRAINT `cartItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyaltyTransactions` ADD CONSTRAINT `loyaltyTransactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyaltyTransactions` ADD CONSTRAINT `loyaltyTransactions_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_sellerId_sellers_id_fk` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_shippingAddressId_addresses_id_fk` FOREIGN KEY (`shippingAddressId`) REFERENCES `addresses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_sellerId_sellers_id_fk` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlistItems` ADD CONSTRAINT `wishlistItems_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlistItems` ADD CONSTRAINT `wishlistItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `address_userId_idx` ON `addresses` (`userId`);--> statement-breakpoint
CREATE INDEX `analytics_date_idx` ON `analytics` (`date`);--> statement-breakpoint
CREATE INDEX `browsingHistory_userId_idx` ON `browsingHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `browsingHistory_productId_idx` ON `browsingHistory` (`productId`);--> statement-breakpoint
CREATE INDEX `browsingHistory_viewedAt_idx` ON `browsingHistory` (`viewedAt`);--> statement-breakpoint
CREATE INDEX `cartItem_userId_idx` ON `cartItems` (`userId`);--> statement-breakpoint
CREATE INDEX `cartItem_productId_idx` ON `cartItems` (`productId`);--> statement-breakpoint
CREATE INDEX `category_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `category_parentId_idx` ON `categories` (`parentId`);--> statement-breakpoint
CREATE INDEX `loyaltyTransaction_userId_idx` ON `loyaltyTransactions` (`userId`);--> statement-breakpoint
CREATE INDEX `loyaltyTransaction_orderId_idx` ON `loyaltyTransactions` (`orderId`);--> statement-breakpoint
CREATE INDEX `orderItem_orderId_idx` ON `orderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `orderItem_productId_idx` ON `orderItems` (`productId`);--> statement-breakpoint
CREATE INDEX `orderItem_sellerId_idx` ON `orderItems` (`sellerId`);--> statement-breakpoint
CREATE INDEX `order_userId_idx` ON `orders` (`userId`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `order_orderNumber_idx` ON `orders` (`orderNumber`);--> statement-breakpoint
CREATE INDEX `product_sellerId_idx` ON `products` (`sellerId`);--> statement-breakpoint
CREATE INDEX `product_categoryId_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `product_slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `product_sku_idx` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `promotion_isActive_idx` ON `promotions` (`isActive`);--> statement-breakpoint
CREATE INDEX `review_productId_idx` ON `reviews` (`productId`);--> statement-breakpoint
CREATE INDEX `review_userId_idx` ON `reviews` (`userId`);--> statement-breakpoint
CREATE INDEX `seller_userId_idx` ON `sellers` (`userId`);--> statement-breakpoint
CREATE INDEX `wishlistItem_userId_idx` ON `wishlistItems` (`userId`);--> statement-breakpoint
CREATE INDEX `wishlistItem_productId_idx` ON `wishlistItems` (`productId`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);