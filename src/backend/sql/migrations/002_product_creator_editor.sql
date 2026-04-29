-- Migration 002: Add created_by and updated_by to products
-- Apply this file to existing databases. schema.sql already includes these columns for fresh installs.

ALTER TABLE `products`
    ADD COLUMN `created_by` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `category_id`,
    ADD COLUMN `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `created_by`,
    ADD CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    ADD CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
