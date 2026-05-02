-- Migration: 003_app_settings
-- Date: 2026-04-30
-- Description: Add app_settings table for centralized configuration (currency,
--   open_registration, public_mode, language_mode, fixed_locale, shop_mode).
-- Rollback: DROP TABLE IF EXISTS app_settings;

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
