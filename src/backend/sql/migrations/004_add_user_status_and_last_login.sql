-- Migration: 004_add_user_status_and_last_login
-- Date: 2026-05-03
-- Description: Add status and last_login columns to users table.
-- Rollback: ALTER TABLE users DROP COLUMN status; ALTER TABLE users DROP COLUMN last_login;

ALTER TABLE users ADD COLUMN status ENUM('active', 'pending') NOT NULL DEFAULT 'active' AFTER role;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL AFTER status;