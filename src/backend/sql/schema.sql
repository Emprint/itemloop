-- Itemloop database schema
-- Import this file via phpMyAdmin or any MySQL client for a FRESH install.
-- No SSH or CLI required.
--
-- For EXISTING databases, apply only the incremental files in sql/migrations/
-- instead of re-importing this file. See sql/migrations/README.md for instructions.

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Users
-- ----------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`              VARCHAR(255)    NOT NULL,
    `email`             VARCHAR(255)    NOT NULL UNIQUE,
    `email_verified_at` TIMESTAMP       NULL DEFAULT NULL,
    `password`          VARCHAR(255)    NOT NULL,
    `role`              ENUM('admin','editor','member','customer') NOT NULL DEFAULT 'customer',
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Buildings
-- ----------------------------
CREATE TABLE IF NOT EXISTS `buildings` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255)    NOT NULL UNIQUE,
    `code`       VARCHAR(8)      NOT NULL UNIQUE,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Zones
-- ----------------------------
CREATE TABLE IF NOT EXISTS `zones` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(255)    NOT NULL,
    `code`        VARCHAR(8)      NOT NULL,
    `building_id` BIGINT UNSIGNED NOT NULL,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `zones_code_building_unique` (`code`, `building_id`),
    CONSTRAINT `fk_zones_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Locations (shelves)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `locations` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `shelf`       VARCHAR(255)    NOT NULL,
    `code`        VARCHAR(16)     NOT NULL,
    `zone_id`     BIGINT UNSIGNED NULL DEFAULT NULL,
    `building_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `locations_code_zone_unique` (`code`, `zone_id`),
    CONSTRAINT `fk_locations_zone`     FOREIGN KEY (`zone_id`)     REFERENCES `zones`     (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_locations_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Product conditions (e.g. "New", "Good", "Damaged")
-- ----------------------------
CREATE TABLE IF NOT EXISTS `product_conditions` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255)    NOT NULL UNIQUE,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Product colors
-- ----------------------------
CREATE TABLE IF NOT EXISTS `product_colors` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255)    NOT NULL UNIQUE,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Product categories
-- ----------------------------
CREATE TABLE IF NOT EXISTS `product_categories` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255)    NOT NULL UNIQUE,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Products
-- ----------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `title`           VARCHAR(255)     NOT NULL,
    `description`     TEXT             NULL DEFAULT NULL,
    `quantity`        INT UNSIGNED     NOT NULL DEFAULT 1,
    `estimated_value` DECIMAL(10,2)    NULL DEFAULT NULL,
    `location_id`     BIGINT UNSIGNED  NOT NULL,
    `barcode`         VARCHAR(255)     NULL DEFAULT NULL,
    `length`          DECIMAL(10,2)    NULL DEFAULT NULL,
    `width`           DECIMAL(10,2)    NULL DEFAULT NULL,
    `height`          DECIMAL(10,2)    NULL DEFAULT NULL,
    `weight`          DECIMAL(10,2)    NULL DEFAULT NULL,
    `destination`     VARCHAR(16)      NULL DEFAULT NULL,
    `visibility`      VARCHAR(10)      NOT NULL DEFAULT 'private',
    `condition_id`    BIGINT UNSIGNED  NULL DEFAULT NULL,
    `color_id`        BIGINT UNSIGNED  NULL DEFAULT NULL,
    `category_id`     BIGINT UNSIGNED  NULL DEFAULT NULL,
    `created_by`      BIGINT UNSIGNED  NULL DEFAULT NULL,
    `updated_by`      BIGINT UNSIGNED  NULL DEFAULT NULL,
    `created_at`      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_products_location`  FOREIGN KEY (`location_id`)  REFERENCES `locations`          (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_products_condition` FOREIGN KEY (`condition_id`) REFERENCES `product_conditions` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_products_color`     FOREIGN KEY (`color_id`)     REFERENCES `product_colors`     (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_products_category`  FOREIGN KEY (`category_id`)  REFERENCES `product_categories` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`)  REFERENCES `users`              (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`)  REFERENCES `users`              (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Product images
-- ----------------------------
CREATE TABLE IF NOT EXISTS `images` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id`     BIGINT UNSIGNED NOT NULL,
    `path`           VARCHAR(512)    NOT NULL,
    `thumbnail_path` VARCHAR(512)    NULL DEFAULT NULL,
    `format`         VARCHAR(16)     NOT NULL DEFAULT 'webp',
    `width`          INT UNSIGNED    NULL DEFAULT NULL,
    `height`         INT UNSIGNED    NULL DEFAULT NULL,
    `sort_order`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Orders
-- ----------------------------
CREATE TABLE IF NOT EXISTS `orders` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`    BIGINT UNSIGNED NOT NULL,
    `status`     ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
    `notes`      TEXT            NULL DEFAULT NULL,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Order items
-- ----------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`   BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `quantity`   INT UNSIGNED    NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10,2)   NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_order_items_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders`   (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- App settings (centralized configuration)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `app_settings` (
    `key`         VARCHAR(50)  NOT NULL PRIMARY KEY,
    `value`       VARCHAR(255) NOT NULL DEFAULT '',
    `description` VARCHAR(255) NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `app_settings` (`key`, `value`, `description`) VALUES
    ('currency',            'EUR',  'ISO 4217 currency code used throughout the UI'),
    ('open_registration',   '1',    'Whether new users can self-register (1 = yes, 0 = no)'),
    ('public_mode',         '1',    'Whether the app is publicly accessible to non-logged-in users (1 = yes, 0 = no)'),
    ('language_mode',       'multi','Language mode: "multi" for multi-language, "single" for fixed locale'),
    ('fixed_locale',        'en',   'Fixed locale when language_mode is "single"'),
    ('shop_mode',           '1',    'Whether cart, order, and checkout features are enabled (1 = yes, 0 = no)')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
