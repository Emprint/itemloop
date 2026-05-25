-- Migration 008: Create password_reset_tokens table
-- Stores one-time tokens for password reset emails (expires after 1 hour).
-- One token per email address (PRIMARY KEY on email); requesting a new token replaces the old one.
--
-- Run ONCE on existing databases. If the table already exists this is safe (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
    `email`      VARCHAR(255) NOT NULL PRIMARY KEY,
    `token`      VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
