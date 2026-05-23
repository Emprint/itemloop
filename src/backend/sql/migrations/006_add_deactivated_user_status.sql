-- Migration: 006_add_deactivated_user_status.sql
-- Date: 2026-05-24
-- Description: Adds 'deactivated' to the users.status ENUM so deactivated users
--              are distinguishable from pending (newly registered) users.
--
-- Rollback: ALTER TABLE users MODIFY COLUMN status ENUM('active','pending') NOT NULL DEFAULT 'active';
--           UPDATE users SET status = 'pending' WHERE status = 'deactivated';

ALTER TABLE users
    MODIFY COLUMN status ENUM('active', 'pending', 'deactivated') NOT NULL DEFAULT 'active';
