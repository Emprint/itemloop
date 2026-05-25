-- Migration: 010_app_name_and_admin_notify
-- Date: 2026-05-25
-- Description: Add notify_admin_emails column to users (admin opt-in for notification emails)
--              and add app_name to app_settings (configurable application name).
-- Rollback: ALTER TABLE users DROP COLUMN notify_admin_emails;
--           DELETE FROM app_settings WHERE `key` = 'app_name';

ALTER TABLE `users`
    ADD COLUMN `notify_admin_emails` TINYINT(1) NOT NULL DEFAULT 0
    AFTER `locale`;

-- Opt-in all existing admin users by default
UPDATE `users` SET `notify_admin_emails` = 1 WHERE `role` = 'admin';

INSERT INTO `app_settings` (`key`, `value`, `description`)
VALUES ('app_name', 'Itemloop', 'Application name shown in the UI and outgoing emails')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
