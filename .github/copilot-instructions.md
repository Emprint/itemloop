# Itemloop – Copilot Instructions

Itemloop is a full-stack inventory management app for community reuse centers.  
**Backend**: Slim Framework 4 (PHP 8.2+) in `src/backend/`  
**Frontend**: Angular 20 (PWA) in `src/frontend/`  
**Legacy**: Original Laravel 12 backend preserved in `src/backend-laravel/` (do not delete).

---

## Commands

### Backend (`cd src/backend`)
```sh
php -S localhost:8000 -t public            # Start dev server on :8000
composer install                           # Install dependencies (run locally before FTP deploy)
```
No artisan, no migrations — schema is in `sql/schema.sql`, imported once via phpMyAdmin.

### Frontend (`cd src/frontend`)
```sh
npm start                                  # Dev server on :4200 (proxies /api → :8000)
ng test                                    # Run all tests (Karma/Jasmine)
ng test --include='**/foo.spec.ts'         # Run a single spec file
ng lint                                    # ESLint
npx prettier --write src                   # Format (run before committing)
ng build                                   # Production build
```

---

## Architecture

### Request flow
Angular (`:4200`) → proxy `/api/*` → Slim (`:8000/api/*`)  
Proxy config: `src/frontend/src/proxy.conf.json`  
API base URL in Angular: `environment.apiUrl` = `http://localhost:4200/api/`

### Backend structure (`src/backend/`)
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
.env / .env.example  # DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_CHARSET, APP_URL
```

### Authentication
- **Session-based** (not Bearer tokens — PHP `$_SESSION`).
- Login flow: `GET /api/csrf-cookie` → server sets `XSRF-TOKEN` cookie + `$_SESSION['csrf_token']` → POST with `X-XSRF-TOKEN` header validated by `CsrfMiddleware`.
- The `XsrfInterceptor` (`src/frontend/src/app/auth/xsrf.interceptor.ts`) attaches `X-XSRF-TOKEN` automatically.
- Session is restored on app init by calling `GET /api/me`.

### User roles
Four roles as MySQL ENUM: `admin`, `editor`, `member`, `customer`.
- First registered user on an empty database is automatically assigned `admin`.
- Product visibility (`public`/`private`): customers and unauthenticated users only see `public` products.
- Navigation links are role-gated: Locations (editor+), Users (admin only).

### Location hierarchy
Three-level hierarchy: **Building → Zone → Location (shelf)**.  
Code uniqueness: building code globally unique; zone code unique per building; location code unique per zone.  
API groups: `/api/buildings`, `/api/zones`, `/api/locations`.

### Product attributes – upsert pattern
`condition`, `color`, and `category` support inline creation: send `condition_id: 0` + `condition: { name: "..." }` to create a new entry on the fly. `ProductController::resolveRelations()` handles `firstOrCreate` internally.

### Image handling
- Uploaded via `POST /api/products/{id}/images` (field: `images[]`, multipart).
- Backend (Intervention Image 3 + GD driver): scaled to max 1920×1920, converted to WebP (quality 90).
- Stored at `public/storage/products/` (no symlink needed — directly web-accessible).
- Path stored in DB as `storage/products/filename.webp`.

### Frontend structure
Feature modules with lazy loading: `products`, `locations`, `auth`, `cart`, `admin`.  
Core layout (navbar, footer, home) lives in `core/`.  
Shared UI components in `shared/` (confirm modal, combobox).

### State management
- **Angular signals** are used throughout for reactive state (auth user, nav links, UI toggles).
- `AuthService` exposes `user` as a readonly signal; components consume it with `authService.user()`.
- **No NgRx or BehaviorSubject** – prefer signals and plain RxJS observables.
- `provideZonelessChangeDetection()` is enabled — do not rely on Zone.js-triggered CD.

### i18n
- `@ngx-translate` with JSON files at `src/frontend/src/assets/i18n/en.json` and `fr.json`.
- Translation keys are **SCREAMING_SNAKE_CASE** (e.g., `"PRODUCTS"`, `"LOGIN"`).
- Language auto-detected from browser; user can switch manually. Fallback: `en`.
- Add new keys to **both** locale files when adding UI strings.

---

## Key conventions

- **All routes** defined in `src/backend/public/index.php`. No separate routes file.
- **Public routes**: `GET /api/products`, `GET /api/product-categories`; everything else requires `AuthMiddleware`.
- **Editor routes** add `EditorMiddleware` on top of the auth group; **admin routes** add `AdminMiddleware`.
- **Backend controllers** live in `src/backend/src/Controllers/` in the `App\Controllers` namespace.
- **Database access**: use `Database::get()` (PDO singleton) — no ORM.
- **Angular components** use `inject()` (not constructor DI) and standalone `imports: []` arrays.
- **Prettier config** lives in `package.json` (`printWidth: 100`, `singleQuote: true`, Angular parser for HTML).

## Deployment (shared hosting — no SSH required)
1. `cd src/backend && composer install` locally
2. FTP upload the entire `src/backend/` folder
3. Import `src/backend/sql/schema.sql` via phpMyAdmin (one-time)
4. Copy `.env.example` → `.env` on server and fill in DB credentials
5. Done — no artisan, no migrations, no storage:link
