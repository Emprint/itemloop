-- Migration: 009_create_email_logs
-- Date: 2026-05-25
-- Description: Create email_logs table for admin email audit trail.
--              Recipient is stored masked (e.g. j***@example.com) for privacy.
-- Rollback: DROP TABLE IF EXISTS email_logs;

CREATE TABLE IF NOT EXISTS `email_logs` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `recipient`  VARCHAR(255)    NOT NULL COMMENT 'Masked email address',
    `template`   VARCHAR(100)    NULL DEFAULT NULL,
    `subject`    VARCHAR(255)    NOT NULL,
    `status`     ENUM('sent','failed') NOT NULL,
    `error`      TEXT            NULL DEFAULT NULL,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_email_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
