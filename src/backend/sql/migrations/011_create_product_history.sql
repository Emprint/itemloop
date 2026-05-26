-- Migration: 011_create_product_history
-- Date: 2026-05-26
-- Description: Add product_history table — stock movement ledger and general audit trail.
--              All quantity changes after product creation flow through this table.
--              products.quantity is a denormalized cache always kept in sync atomically.
-- Rollback: DROP TABLE IF EXISTS `product_history`;

CREATE TABLE IF NOT EXISTS `product_history` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT UNSIGNED NOT NULL,
    `event_type`  VARCHAR(50)     NOT NULL COMMENT 'initial_stock|stock_adjustment|order_placed|order_cancelled|order_reopened|order_completed|location_move|field_update',
    `delta`       INT             NULL DEFAULT NULL COMMENT 'Signed quantity change (+N / -N). NULL for non-quantity events.',
    `user_id`     BIGINT UNSIGNED NULL DEFAULT NULL,
    `meta`        JSON            NULL DEFAULT NULL COMMENT 'order_id, reason, old/new location codes, etc.',
    `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_product_history_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_product_history_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE SET NULL,
    KEY `idx_product_history_product` (`product_id`),
    KEY `idx_product_history_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
