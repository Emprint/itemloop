-- Migration: 005_fix_missing_created_at
-- Date: 2026-05-03
-- Description: Fix users with NULL created_at by setting to updated_at or NOW().
-- Rollback: (data fix, no rollback needed)

UPDATE users SET created_at = COALESCE(updated_at, NOW()) WHERE created_at IS NULL;