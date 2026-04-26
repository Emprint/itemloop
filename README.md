
# 📦 Itemloop – Open Source Inventory Webapp for Community Reuse Centers

## 🌍 Overview

**Itemloop** is a full-stack, multilingual web application for reuse and recycling centers to manage their inventory of second-hand items. It is optimized for collaborative, community-based use, supports desktop and mobile devices, and includes PWA features for offline access.

This project is open source and welcomes contributions under the AGPL v3 license.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 20+ (standalone components, signals, Angular CDK) |
| Backend | PHP 8.2+ · **Slim Framework 4** |
| Database | MySQL 5.7+ |
| Image processing | Intervention Image (GD driver) — WebP conversion + thumbnails |
| Hosting target | Shared PHP/MySQL hosting (e.g., OVH) — **no SSH required after deploy** |

> The backend is built on **Slim Framework 4** — fully assembled locally with no post-deploy server-side commands required.

---

## 🚀 Features

- **Product CRUD** — title, description, category, condition, color, quantity, estimated value, barcode, dimensions (L/W/H cm, weight kg), destination, visibility
- **Product list** — search, multi-filter (category, condition, location), grid/list toggle, pagination, CSV export
- **Product form** — 3-column layout: product info / characteristics + location / photos + quick info; view mode (read-only) and edit mode
- **Photo lightbox** — click any photo to view full-size; ←/→ navigation and Esc to close; keyboard support
- **Structured locations** — Building → Zone → Shelf with auto-generated, editable codes
- **Image management** — multiple images per product, WebP conversion, thumbnail generation, drag-to-reorder, cover image (first image by sort order)
- **Cart** — add-to-cart with quantity picker (max = available stock) on product view page; cart page with item list, price/line-total columns, grand total, clear and place-order actions; persisted in `localStorage`
- **Dashboard** — KPI cards (total products, total quantity, estimated value) + category donut chart
- **Role-based access** — Customer (browse + cart), Editor (full product/location CRUD), Admin (everything + user management)
- **Public / private visibility** — guests see only public products; editors/admins see all
- **Authentication** — register, login, logout (PHP session-based)
- **User management** (admin only)
- **Multilingual UI** — French + English, auto-detected from browser, manually switchable
- **Comboboxes with inline create** — colors and categories created on the fly
- **Angular CDK drag-and-drop** for image ordering
- **Centralized currency config** — `app-settings.ts` sets the currency code (default: `EUR`) used everywhere

---

## 🗂️ Project Structure

```
itemloop/
├── src/
│   ├── backend/              # Slim Framework 4 API
│   │   ├── public/           # Web root (index.php entry point, storage/)
│   │   │   └── storage/products/   # Uploaded images (WebP)
│   │   └── src/
│   │       ├── Controllers/  # ProductController, LocationController, etc.
│   │       └── Middleware/   # Auth, Editor, Admin, OptionalAuth, CSRF
│   └── frontend/             # Angular 20 app
│       └── src/
│           ├── app/          # Features: products, locations, users, auth, cart
│           └── assets/i18n/  # en.json, fr.json
├── deploy.sh                 # Local build script — generates deploy_package/ (no SSH needed)
└── REQUIREMENTS.md           # User stories and roadmap
```

---

## 🛠️ Getting Started

### Prerequisites

- PHP 8.2+ with the **GD extension** enabled
- Composer
- Node.js 18+ and npm
- MySQL 5.7+

### 1. Clone the repository

```sh
git clone https://github.com/Emprint/itemloop.git
cd itemloop
```

### 2. Backend setup

```sh
cd src/backend
composer install
cp .env.example .env
# Edit .env — set DB_HOST, DB_NAME, DB_USER, DB_PASS
```

> **Tip:** The [DevDB VS Code extension](https://marketplace.visualstudio.com/items?itemName=damms005.devdb) lets you browse and query the MySQL database directly from the editor.

Import the database schema (first time only):

```sh
mysql -u youruser -p yourdb < schema.sql
```

Start the backend dev server:

```sh
php -S localhost:8000 -t public
```

### 3. Frontend setup

```sh
cd src/frontend
npm install
npm start        # runs ng serve → http://localhost:4200
```

The dev server proxies `/api` and `/storage` to `http://localhost:8000` via `proxy.conf.json`.  
If you change `proxy.conf.json`, restart `ng serve` to pick up the new proxy rules.

**Before committing, format and lint:**

```sh
npx prettier --write src
ng lint
```

---

## 🔌 API Reference

All routes are prefixed with `/api`.

### Authentication

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| POST | `/register` | — | Register a new account |
| POST | `/login` | — | Login |
| GET | `/logout` | ✅ | Logout |
| GET | `/me` | — | Returns current user info (or `null`) |

### Products

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| GET | `/products` | optional | List products — all for editors/admins, public-only for guests |
| GET | `/products/{id}` | optional | Get a single product |
| POST | `/products` | Editor+ | Create product |
| PUT | `/products/{id}` | Editor+ | Update product |
| DELETE | `/products/{id}` | Editor+ | Delete product |

### Product Images

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| POST | `/products/{id}/images` | Editor+ | Upload images (`multipart/form-data`, field: `images[]`) |
| PATCH | `/products/{id}/images/reorder` | Editor+ | Reorder images — body: `{"ids":[3,1,2]}` |
| DELETE | `/products/{id}/images/{image_id}` | Editor+ | Delete image |

### Locations

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| GET | `/buildings` | — | List buildings |
| POST | `/buildings` | Editor+ | Create building |
| PUT | `/buildings/{id}` | Editor+ | Update building |
| DELETE | `/buildings/{id}` | Editor+ | Delete building |
| GET | `/zones` | — | List zones |
| POST | `/zones` | Editor+ | Create zone |
| PUT | `/zones/{id}` | Editor+ | Update zone |
| DELETE | `/zones/{id}` | Editor+ | Delete zone |
| GET | `/locations` | — | List locations (shelf level) |
| POST | `/locations` | Editor+ | Create location |
| PUT | `/locations/{id}` | Editor+ | Update location |
| DELETE | `/locations/{id}` | Editor+ | Delete location |

### Users *(Admin only)*

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| GET | `/users` | Admin | List all users |
| POST | `/users/save` | Admin | Create or update a user |
| POST | `/users/delete` | Admin | Delete a user |

### Metadata

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| GET | `/product-conditions` | — | List conditions |
| POST | `/product-conditions` | — | Create condition |
| GET | `/product-colors` | — | List colors |
| POST | `/product-colors` | — | Create color |
| GET | `/dashboard` | Editor+ | Dashboard statistics (total products, qty, estimated value, category breakdown) |

> **Cart**: The cart is entirely client-side (`localStorage`) — no backend endpoints. The "Place Order" button is a UI stub; order submission is on the roadmap.

---

## 🖼️ Image Handling

| Property | Value |
|----------|-------|
| Accepted formats | JPEG, PNG, WebP, GIF |
| Max upload size | 4 MB per image |
| Full image | Resized to max **1920×1920 px**, WebP quality 90 |
| Thumbnail | Resized to max **400×400 px**, WebP quality 80 |
| Storage | `src/backend/public/storage/products/` |
| URL | `/storage/products/{name}.webp` / `{name}_thumb.webp` |
| Cover image | First image by `sort_order` — drag to reorder in the form |
| Delete | Removes both full-size and thumbnail files from disk |

---

## 🚢 Deployment (OVH Shared Hosting)

No SSH access is required after uploading files.

```sh
./deploy.sh
```

This script builds the Angular frontend (production mode) and assembles the `deploy_package/` folder. Upload via FTP:

- `deploy_package/frontend/` → your public web root (e.g., `www/`)
- `deploy_package/backend/` → a directory outside the public root (e.g., `api/`)

Configure the backend `.env` on the server with your hosting MySQL credentials.

---

## 📋 Notes

- **Roles**: Customer (browse public items, cart), Editor (full product/location CRUD), Admin (everything + user management)
- **Password policy**: min 8 characters, at least 1 letter, 1 digit, 1 special character
- **Passwords**: hashed with PHP `password_hash()` (bcrypt / `PASSWORD_DEFAULT`)
- **Sessions**: PHP native session handling (no JWT, no Sanctum)
- **CSRF**: token-based protection on mutating API routes
- **Currency**: configured in `src/frontend/src/app/app-settings.ts` — change `currency: 'EUR'` to any ISO 4217 code

---

## 🔐 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

- Any modifications must be published under the same license.
- If you run the app as a network service, the source code must be made available to users.
- Commercial use is permitted for your own operations; reselling under a proprietary license is not.

See [LICENSE](./LICENSE) for full terms.

---

## 🤝 Contributions

Itemloop is developed as a community-driven project. Pull requests, feedback, and translations are welcome.

This app is developed with the help of GitHub Copilot.

Before contributing, please read the [LICENSE](./LICENSE) (AGPL-3.0) and respect the spirit of fair and open collaboration.
