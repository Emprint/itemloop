-- Migration: 001_create_orders
-- Date: 2026-04-28
-- Description: Add orders and order_items tables for the order placement feature.
-- Rollback: DROP TABLE order_items; DROP TABLE orders;

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
