-- Migration 007: Add locale column to users table
-- Stores each user's preferred language for email and UI personalisation.
-- Default: 'en'. Set from Accept-Language header on registration; editable in user profile.
--
-- Run ONCE on existing databases. Safe to run multiple times (IF NOT EXISTS guard via IGNORE).

ALTER TABLE `users`
    ADD COLUMN `locale` VARCHAR(5) NOT NULL DEFAULT 'en' AFTER `status`;
