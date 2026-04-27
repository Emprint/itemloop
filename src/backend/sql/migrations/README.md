# Database Migrations

## Convention

- **`../schema.sql`** — always reflects the **full current schema**. Use this for fresh installs (import once via phpMyAdmin).
- **`migrations/`** — incremental changes for **existing databases**. Run only the files you haven't applied yet.

## File naming

```
NNN_short_description.sql
```

- `NNN` is a zero-padded sequence number: `001`, `002`, `003`, …
- Description uses underscores, e.g. `001_add_weight_to_products.sql`

## How to apply a migration

1. Open the file and read the comment header — it explains what it does.
2. Run it against your database via phpMyAdmin (Import tab) or MySQL CLI:
   ```sh
   mysql -u youruser -p yourdb < 001_add_weight_to_products.sql
   ```
3. Once applied, you do **not** need to re-import `schema.sql`.

## How to write a migration

1. Create the next numbered file in this folder.
2. Add a comment header with date, description, and the reverse (rollback) SQL as a comment.
3. Update `../schema.sql` to reflect the new full schema state.

### Template

```sql
-- Migration: 001_short_description
-- Date: YYYY-MM-DD
-- Description: What this migration does.
-- Rollback: ALTER TABLE foo DROP COLUMN bar;

ALTER TABLE foo ADD COLUMN bar VARCHAR(255) NULL DEFAULT NULL AFTER baz;
```

## Baseline

The starting point for this migration system is the schema defined in `../schema.sql`
as of **2026-04-28** (all tables: users, buildings, zones, locations, product_conditions,
product_colors, product_categories, products, images).

If your database was created from `schema.sql` on or after this date, start from migration `001`.
If it was created earlier, compare your schema manually and apply only the relevant changes.
