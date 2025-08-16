
# 📦 Itemloop – Open Source Inventory Webapp for Community Reuse Centers

## 🌍 Overview

**Itemloop** is a full-stack, multilingual web application for reuse and recycling centers to manage their inventory of second-hand items. It is optimized for collaborative, community-based use, supporting desktop and mobile devices, and includes offline access via PWA features.

This project is open source and welcomes contributions under the AGPL v3 license.

---

## 🔧 Tech Stack

- **Frontend**: Angular (PWA support for installable and offline-capable app)
- **Backend**: PHP 8+ (Laravel API)
- **Database**: MySQL
- **Image processing**: Server-side resizing and WebP conversion
- **Hosting target**: Compatible with inexpensive hosting providers supporting PHP and MySQL (no need for complex cloud infrastructure)

---

## 🚀 Features
- Product CRUD (title, description, condition, quantity, value, location, barcode, date)
- Location CRUD (structured: building, zone, shelf)
- Image upload (multiple images per product, resizing, WebP conversion, aspect ratio preserved)
- Separate endpoints for product data and image management
- Filtering by condition, location, keyword
- Authentication via Laravel Sanctum
- Multilingual UI (French, English)
- PWA: offline access, installable on mobile/desktop
- Admin features: user management, location management, export to CSV/PDF

---

## 🛠️ Getting Started

### 1. Clone the repository
```sh
git clone https://github.com/Emprint/itemloop.git
cd itemloop/src/api
```

### 2. Install backend dependencies
```sh
composer install
```

### 3. Set up environment

**Tip:** Developers can use the [DevDB extension](https://marketplace.visualstudio.com/items?itemName=damms005.devdb) to manage the MySQL database directly from within Visual Studio Code.
Copy `.env.example` to `.env` and set your database credentials:
```sh
cp .env.example .env
```
Edit `.env` and set `DB_USERNAME` and `DB_PASSWORD`.

### 4. Generate app key
```sh
php artisan key:generate
```

### 5. Run migrations
```sh
php artisan migrate
```

### 6. Start the backend server
For Laravel 11+:
```sh
php -S localhost:8000 -t public
```

### 7. Frontend setup (Angular)
Navigate to the frontend directory (to be created):
```sh
cd ../frontend
npm install
npm start
```

**Before committing changes, ensure the solution is formatted and linted:**

```sh
npx prettier --write src
ng lint
```

---

## 📋 API Endpoints

### Products
- `GET /api/products` — List products
- `GET /api/products/{id}` — Get product details
- `POST /api/products` — Create product
- `PUT /api/products/{id}` — Update product
- `DELETE /api/products/{id}` — Delete product

### Product Images
- `POST /api/products/{id}/images` — Add images to product (multipart/form-data, field: `images[]`)
- `DELETE /api/products/{id}/images/{image_id}` — Remove image from product

### Locations
- `GET /api/locations` — List locations
- `POST /api/locations` — Create location
- `PUT /api/locations/{id}` — Update location
- `DELETE /api/locations/{id}` — Delete location

### Authentication
- Register: `POST /api/register`
- Login: `POST /api/login`
- Logout: `POST /api/logout`

---

## 🖼️ Image Handling
- Multiple images per product
- Images resized on upload to max 1920x1920 px
- Images converted to WebP
- Optimized for fast load and reduced hosting usage

---

## 📁 Notes and Constraints
- Internationalization: French and English, auto-detect by browser, user override
- Locations: Building → Zone → Shelf, managed by admins
- Images: stored in `storage/app/public/products`, served via `public/storage/products`
- PWA: offline access, sync when reconnected

---

## 🔐 License
This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

You are free to use, modify, and redistribute this software under the following conditions:

- Any modifications must be published under the same license (AGPL-3.0).
- If you run the app as a service (e.g., website), the source code must be made available to users.
- Commercial use is allowed for your own operations, but reselling the code under a proprietary license is strictly forbidden.

See [LICENSE](./LICENSE) for full terms.

---

## 🤝 Contributions

Itemloop is developed as a community-driven project. Pull requests, feedback, and translations are welcome.

This app is developed with the help of GitHub Copilot.

Before contributing, please read the [LICENSE](./LICENSE) (AGPL-3.0) and respect the spirit of fair and open collaboration.
