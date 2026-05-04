# AGENTS.md

This document helps AI agents work effectively in the Itemloop codebase.

## Project Overview

Itemloop is a full-stack inventory management app for community reuse centers:
- **Backend**: Slim Framework 4 (PHP 8.2+) in `src/backend/`
- **Frontend**: Angular 20 (PWA) in `src/frontend/`
- **Legacy**: Original Laravel 12 backend preserved in `src/backend-laravel/` (do not delete)

## Essential Commands

### Backend (`cd src/backend`)
```sh
php -S localhost:8000 -t public            # Start dev server on :8000
composer install                           # Install dependencies (run locally before FTP deploy)
```

### Frontend (`cd src/frontend`)
```sh
npm start                                  # Dev server on :4200 (proxies /api → :8000)
ng test                                    # Run all tests (Karma/Jasmine)
ng test --include='**/foo.spec.ts'         # Run a single spec file
ng lint                                    # ESLint
npx prettier --write src                   # Format (run before committing)
ng build                                   # Production build
```

## Architecture

### Request Flow
Angular (`:4200`) → proxy `/api/*` → Slim (`:8000/api/*`)
- Proxy config: `src/frontend/src/proxy.conf.json`
- API base URL in Angular: `environment.apiUrl` = `http://localhost:4200/api/`

### Backend Structure (`src/backend/`)
```
public/
  .htaccess          # mod_rewrite: all requests → index.php
  index.php          # Slim app entry point + ALL routes defined here
  storage/products/  # WebP images (served directly — no storage:link needed)
src/
  Controllers/       # AuthController, ProductController, LocationController, UserController, etc.
  Middleware/        # AuthMiddleware, CsrfMiddleware, EditorMiddleware, AdminMiddleware
  Database.php       # PDO singleton (Database::get())
sql/
  schema.sql         # Full MySQL schema — import via phpMyAdmin to create tables
  migrations/        # Incremental changes for existing DBs
.env / .env.example  # DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_CHARSET, APP_URL
```

### Frontend Structure
Feature modules with lazy loading: `products`, `locations`, `auth`, `cart`, `admin`, `orders`.
Core layout (navbar, footer, home) lives in `core/`.
Shared UI components in `shared/` (confirm modal, combobox, list-shell).

## Key Patterns & Conventions

### Backend
- **All routes defined in `src/backend/public/index.php`** — no separate routes file
- **Public routes**: `GET /api/products`, `GET /api/product-categories`; everything else requires `AuthMiddleware`
- **Editor routes** add `EditorMiddleware` on top of the auth group; **admin routes** add `AdminMiddleware`
- Controllers live in `src/backend/src/Controllers/` in the `App\Controllers` namespace
- Database access: use `Database::get()` (PDO singleton) — no ORM
- No artisan, no migrations command — schema.sql for fresh installs, manual SQL migrations for existing DBs

### Authentication
- **Session-based** (not Bearer tokens — PHP `$_SESSION`)
- Login flow: `GET /api/csrf-cookie` → server sets `XSRF-TOKEN` cookie + `$_SESSION['csrf_token']` → POST with `X-XSRF-TOKEN` header validated by `CsrfMiddleware`
- The `XsrfInterceptor` (`src/frontend/src/app/auth/xsrf.interceptor.ts`) attaches `X-XSRF-TOKEN` automatically
- Session is restored on app init by calling `GET /api/me`

### User Roles
Four roles as MySQL ENUM: `admin`, `editor`, `member`, `customer`
- First registered user on an empty database is automatically assigned `admin`
- Product visibility (`public`/`private`): customers and unauthenticated users only see `public` products
- Navigation links are role-gated: Locations (editor+), Users (admin only)

### Location Hierarchy
Three-level hierarchy: **Building → Zone → Location (shelf)**
- Code uniqueness: building code globally unique; zone code unique per building; location code unique per zone
- API groups: `/api/buildings`, `/api/zones`, `/api/locations`

### Product Attributes – Upsert Pattern
`condition`, `color`, and `category` support inline creation:
- Send `condition_id: 0` + `condition: { name: "..." }` to create a new entry on the fly
- `ProductController::resolveRelations()` handles `firstOrCreate` internally

### Image Handling
- Uploaded via `POST /api/products/{id}/images` (field: `images[]`, multipart)
- Backend (Intervention Image 3 + GD driver): scaled to max 1920×1920, converted to WebP (quality 90)
- Stored at `frontend/storage/products/` (web-accessible path, configured via STORAGE_PATH in .env)
- Path stored in DB as `storage/products/filename.webp`
- Storage folder is secured with `.htaccess` containing "Options -Indexes" to disable directory listing

### Frontend
- **Angular signals** are used throughout for reactive state (auth user, nav links, UI toggles)
- `AuthService` exposes `user` as a readonly signal; components consume it with `authService.user()`
- **No NgRx or BehaviorSubject** – prefer signals and plain RxJS observables
- `provideZonelessChangeDetection()` is enabled — do not rely on Zone.js-triggered CD
- Components use `inject()` (not constructor DI) and standalone `imports: []` arrays

### i18n
- `@ngx-translate` with JSON files at `src/frontend/src/assets/i18n/en.json` and `fr.json`
- Translation keys are **SCREAMING_SNAKE_CASE** (e.g., `"PRODUCTS"`, `"LOGIN"`)
- Language auto-detected from browser; user can switch manually. Fallback: `en`
- Add new keys to **both** locale files when adding UI strings

### Global Styles
Before adding CSS to a component, check `src/frontend/src/styles.scss` for existing utilities. Never reimplement layout, typography, feedback states, or empty states in component SCSS. Key globals to reuse:
- `.page` — 960px constrained content column (forms, focused pages)
- `.page-wide` — full-width content column (tables, dashboards, lists)
- `.page-empty` — centred icon + message empty state
- `.page-loading` / `.page-error` — inline feedback text
- `.card`, `.form-card`, `.form-field`, `.buttons-list`, `.error`, `.req`
- `h2`, `button`, `input`, `select`, `textarea` — globally styled; do not override in components unless strictly necessary

### Code Formatting
- Prettier config in `package.json`: `printWidth: 100`, `singleQuote: true`, Angular parser for HTML
- Run `npx prettier --write src` before committing

## Database Schema Changes

**Two files required** when adding or modifying columns/tables:
1. Update `src/backend/sql/schema.sql` to reflect the full new state
2. Create the next numbered migration file in `src/backend/sql/migrations/NNN_description.sql` with only the incremental `ALTER TABLE` / `CREATE TABLE` SQL

See `src/backend/sql/migrations/README.md` for the template and migration process.

## Deployment (Shared Hosting)

The project includes a `deploy.sh` script that automates deployment to OVH shared hosting:

### One-time Setup (already done — do not repeat unless re-provisioning):
1. Create `~/frontend/api/index.php`:
   ```php
   <?php require __DIR__ . '/../../backend/public/index.php';
   ```
2. Create `~/frontend/api/.htaccess` (Slim routing + XSRF header passthrough)
3. Create `~/frontend/.htaccess` (HTTPS redirect + Angular HTML5 routing)
4. Create `~/backend/.env` from `.env.example` with production DB credentials
   - **IMPORTANT**: Set `APP_DEBUG=false` in `.env` to hide error stacktraces in production
5. Create `~/frontend/storage/products/` for image uploads (web-accessible path)
   - Then set `STORAGE_PATH` in `~/backend/.env` to the REAL filesystem path, e.g.:
     ```
     STORAGE_PATH=/real/path/to/frontend/storage/products
     ```
   - On OVH: PHP-FPM open_basedir uses the real path, NOT the `/home/username` alias
   - Run `echo $HOME` via SSH to find your real path
6. Create `~/.user.ini` and `~/backend/public/.user.ini` for PHP-FPM upload limits
7. Import `src/backend/sql/schema.sql` via phpMyAdmin (one-time DB setup)

### Regular Deployment:
1. Copy `deploy.env.example` to `deploy.env` and fill in your values (gitignored)
2. Run: `SSH_PASS=<password> ./deploy.sh`

The deploy script:
- Builds Angular frontend with `ng build --configuration production`
- Cleans old chunks with `rsync --delete`
- Installs backend dependencies with `composer install --optimize-autoloader --no-dev`
- Deploys frontend to `~/frontend/` (excluding storage folder)
- Deploys backend to `~/backend/` (excluding .env and public folder)
- Copies only `backend/public/index.php` (required by frontend API)
- Secures storage folders with `.htaccess` files (only creates if they don't exist)

## Important Gotchas

- **Never commit or push without explicit user approval** — always show changes and ask "Ready to commit?" first
- Backend has no ORM — use raw PDO with prepared statements
- All routes are in one file (`index.php`) — don't look for a separate routes file
- Images are stored in `frontend/storage/products/` and served directly — no storage:link needed
- First user on empty DB becomes admin automatically
- Zoneless change detection is enabled — don't rely on Zone.js for automatic change detection
- `backend/public/` folder is not web-accessible — only `index.php` is copied during deployment
- `backend/public/storage/` folder is unused — images are stored in `frontend/storage/products/`

### User Status & Pending Validation (US44)
When `public_mode=OFF` and `open_registration=ON`:
- New registrations create `pending` users (status column)
- Pending users **cannot log in** — get `ACCOUNT_PENDING` error
- Pending users are **blocked from all protected API routes** via `PendingUserMiddleware`
- Admins see a **pending count badge** on the Users nav link
- Users list has **Date Added** and **Last Login** columns
- Users can be **Deactivated** (admin action) — goes back to `pending`
- Deactivated users cannot log in until reactivated by admin
- `last_login` column tracks user activity; updated on each login
- `GET /api/users/pending/count` returns pending count for nav badge
- Global styles are comprehensive — check `styles.scss` before adding component-specific CSS

### Barcode Scanner (US6)
- Uses `@zxing/library` with `BrowserMultiFormatReader` for cross-platform barcode scanning
- Integrated into products list search box and product form barcode input field
- **Permissions API**: Checks camera permission state before accessing camera via `navigator.permissions.query({ name: 'camera' })`
- Listens for permission changes to automatically restart scanner when permission is granted
- Shows appropriate error messages for different permission states (granted, denied, prompt, not found)
- Button styling is consistent across all breakpoints (integrated in search field, not a separate green button)
- Scanner modal shows permission request UI with "Request Permission" button for retry after denial
- Camera access is requested with `getUserMedia` using environment-facing camera at 640×480 resolution
