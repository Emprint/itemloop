# 📦 Itemloop – Open Source Inventory App for Community Reuse Centers

## 🌍 Overview

**Itemloop** is an open source, multilingual web application designed to help reuse and recycling centers manage their inventory of second-hand items. The tool is optimized for collaborative, community-based use, and built to support both desktop and mobile devices, including offline access through PWA features.

This project is developed with a non-commercial, open community spirit. Contributions are welcome under the terms of the AGPL v3 license.

---

## 🔧 Tech Stack

- **Frontend**: Angular 20+ (standalone components, signals, Angular CDK, PWA support)
- **Backend**: PHP 8.2+ · **Slim Framework 4** (lightweight, no-framework-lock-in API)
- **Database**: MySQL 5.7+
- **Image processing**: Intervention Image (GD driver) — resize, WebP conversion, thumbnail generation
- **Hosting target**: Shared PHP/MySQL hosting (e.g., OVH) — no SSH required after deploying files

> The backend was rewritten from Laravel to Slim Framework 4 to eliminate the need for server-side commands (no `artisan`, no migrations to run on the server), making FTP-only deployment viable.

---

## 🔐 License

Itemloop is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)**.

- You are free to use, modify, and redistribute the software.
- You **must** publish any modifications if you provide access to the app (e.g., SaaS or web interface).
- Commercial proprietary reuse of the code is **not allowed** without sharing changes under the same license.

---

## 📋 User Stories

> Legend: ✅ Implemented · 🔲 Planned · ⚪ Not started

| ID  | Role | User Story | Priority | Complexity | Status |
|-----|------|-----------|----------|------------|--------|
| US1 | User | As a user, I want to log in with a username and password so I can access the app. | High | 🟡 Medium | ✅ |
| US2 | Admin | As an admin, I want to create, edit, and delete user accounts to manage access control. | High | 🟡 Medium | ✅ |
| US3 | User | As a user, I want to add a product with a title, description, condition, quantity, estimated value, location, multiple photos, barcode, and date so I can track inventory items. | High | 🔴 Complex | ✅ |
| US4 | User | As a user, I want to edit or delete product entries to keep information up to date. | High | 🟡 Medium | ✅ |
| US5 | User | As a user, I want to view and filter the product list (by condition, location, keyword) to find items easily. | High | 🔴 Complex | ✅ |
| US6 | User | As a user, I want to scan a barcode to quickly search or add an item. | Medium | 🔴 Complex | ⚪ |
| US7 | Public visitor | As a visitor, I want to browse available items so I can prepare for an in-person visit. | Medium | 🟡 Medium | ✅ (public visibility filter) |
| US8 | Public visitor | As a visitor, I want to reserve items online to pick them up later. | Low | 🔴 Complex | ⚪ |
| US9 | User | As a user, I want to use the app from a smartphone or browser so I can manage inventory anywhere. | High | 🟡 Medium | 🔲 (responsive layout in progress) |
| US10 | User | As a user, I want to use the app offline and sync data when reconnected so I can keep working without internet. | Medium | 🔴 Complex | ⚪ |
| US11 | User | As a user, I want to be notified if data fails to sync so I don't lose updates. | Medium | 🟡 Medium | ⚪ |
| US12 | Admin | As an admin, I want to export inventory data to CSV for backup or reporting. | Low | 🟡 Medium | ✅ (CSV export on products page) |
| US13 | User | As a user, I want to view product photos to better identify each item. | High | ⚪ Simple | ✅ |
| US14 | Admin | As an admin, I want to see statistics (total quantity, estimated value, etc.) to monitor reuse activity. | Low | 🔴 Complex | ✅ (dashboard with donut chart, KPI cards) |
| US15 | Developer | As a developer, I want the app to support multiple languages (French, English) so it's accessible to a wider community. | High | 🟡 Medium | ✅ |
| US16 | User | As a user, I want to upload **multiple photos per item** to fully document its condition. | High | 🟡 Medium | ✅ |
| US17 | System | As the system, I want to automatically resize images on upload (max 1920×1920 px) and convert them to WebP format to optimize storage and web delivery. | High | 🟡 Medium | ✅ |
| US18 | User | As a user, I want to assign products to a **structured location** (building, zone, shelf) to track physical storage. | High | 🔴 Complex | ✅ |
| US19 | Admin | As an admin, I want to **manage the list of storage locations** so the inventory stays organized. | Medium | 🟡 Medium | ✅ |
| US20 | User | As a user, I want the app interface to automatically detect my system language and allow me to manually switch between English and French. | High | 🟡 Medium | ✅ |
| US21 | User | As a user, I want to assign products to structured locations (Building → Zone → Shelf) and manage these locations myself, so that inventory stays organized and easy to find. | High | 🟡 Medium | ✅ |
| US22 | System/User | As a user, I want the app to support different account types: Customer, Editor, and Admin — each with appropriate permissions. | High | 🔴 Complex | ✅ |
| US23 | System | As the system, if there are no user accounts in the database, I want the app to prompt to create the first admin account. | High | 🟡 Medium | ✅ |
| US24 | User/System | As a user or visitor, I want the frontend navigation to update contextually based on my role (guest / customer / editor / admin). | High | 🟡 Medium | ✅ |
| US25 | User | As a user, I want to set a secure password requiring at least 8 characters, one letter, one digit, and one special character. | High | 🟡 Medium | ✅ |
| US26 | User/System | As a user, I want a confirmation prompt before deleting any item (user, location, product, image, etc.) so I don't accidentally lose data. | High | ⚪ Simple | ✅ |
| US27 | Admin/User | As an admin or user, I want location codes to be generated automatically and be editable, so each shelf has a unique, human-readable, barcode-friendly code (e.g., BG1-ZOA-001). | Medium | 🟡 Medium | ✅ |
| US28 | System | As the system, I want to automatically generate a small thumbnail (max 400×400 px) alongside the full image on upload, so the product list loads faster with compact card images. | High | ⚪ Simple | ✅ |
| US29 | User | As a user, I want to drag and drop images in the product form to control their order, with the first image automatically becoming the cover image shown in lists and previews. | Medium | 🟡 Medium | ✅ |
| US30 | Customer | As a customer, I want to add items to a cart with a quantity picker (capped at available stock) on the product page, so I can prepare my pickup list. | Medium | 🟡 Medium | ✅ |
| US31 | Customer | As a customer, I want to view my cart with a list of selected items, unit prices, line totals, and a grand total, so I can review my order before placing it. | Medium | 🟡 Medium | ✅ |
| US32 | Customer | As a customer, I want to place an order from my cart so the reuse center knows what I intend to pick up. | Medium | 🔴 Complex | ⚪ (UI stub — backend order submission not yet implemented) |
| US33 | Customer | As a customer, I want my cart to be saved between sessions (browser refresh) so I don't lose my selection. | Low | ⚪ Simple | ✅ (localStorage persistence) |

---

## ⚡ State Management

- The frontend uses **Angular signals** for state management wherever possible, including authentication, navigation, and feature modules, to ensure modern, reactive, and efficient UI updates.

---

## 📌 Roadmap Ideas

- **Order submission** — backend API to receive cart orders and notify staff (US32)
- **Order history** — customers can view past orders
- Barcode scanning for quick product lookup or creation
- User notification system (email, browser alerts)
- Item history & audit log
- Export to PDF (admin reporting)
- PWA offline sync with conflict resolution
- Weight / volume tracking for reuse impact reporting
- Barcode / QR code on location labels (using generated codes)

---

## 🤝 Contributions

Itemloop is developed as a community-driven project.  
We welcome pull requests, feedback, and translations.

Before contributing, please read the [LICENSE](./LICENSE) (AGPL-3.0) and respect the spirit of fair and open collaboration.

