# 📦 Itemloop – Open Source Inventory App for Community Reuse Centers

## 🌍 Overview

**Itemloop** is an open source, multilingual web application designed to help reuse and recycling centers manage their inventory of second-hand items. The tool is optimized for collaborative, community-based use, and built to support both desktop and mobile devices, including offline access through PWA features.

This project is developed with a non-commercial, open community spirit. Contributions are welcome under the terms of the AGPL v3 license.

---

## 🔧 Tech Stack

- **Frontend**: Angular 20+ (standalone components, signals, Angular CDK, PWA support)
- **Backend**: PHP 8.2+ · Slim Framework 4 (lightweight, FTP-deployable — no SSH or post-deploy commands needed)
- **Database**: MySQL 5.7+

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
| US3 | User | As a user, I want to add a product with a title, description, category, condition, color, quantity, estimated value, location (building → zone → shelf, all required), multiple photos, barcode, dimensions (L/W/H), weight, and destination so I can fully document inventory items. Location cascade is enforced: zone is disabled until a building is selected; shelf is disabled until a zone is selected. | High | 🔴 Complex | ✅ |
| US4 | User | As a user, I want to edit or delete product entries to keep information up to date. | High | 🟡 Medium | ✅ |
| US5 | User | As a user, I want to view and filter the product list (by condition, location, keyword) to find items easily. | High | 🔴 Complex | ✅ |
| US6 | User | As a user, I want to scan a barcode to quickly search or add an item. | Medium | 🔴 Complex | ⚪ |
| US7 | Public visitor | As a visitor, I want to browse available items so I can prepare for an in-person visit. | Medium | 🟡 Medium | ✅ (public visibility filter) |
| US8 | Customer | As a customer, I want to reserve items online to pick them up later. | Low | 🔴 Complex | ✅ (cart → order flow; staff manages pickup via Orders page) |
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
| US26 | User/System | As a user, I want a confirmation prompt before deleting any item (user, location, product, image, etc.) or performing irreversible actions (clearing a cart item, accepting/cancelling/reopening an order) so I don't accidentally trigger unintended changes. | High | ⚪ Simple | ✅ |
| US27 | Admin/User | As an admin or user, I want location codes to be generated automatically and be editable, so each shelf has a unique, human-readable, barcode-friendly code (e.g., BG1-ZOA-001). | Medium | 🟡 Medium | ✅ |
| US28 | System | As the system, I want to automatically generate a small thumbnail (max 400×400 px) alongside the full image on upload, so the product list loads faster with compact card images. | High | ⚪ Simple | ✅ |
| US29 | User | As a user, I want to drag and drop images in the product form to control their order, with the first image automatically becoming the cover image shown in lists and previews. | Medium | 🟡 Medium | ✅ |
| US30 | Customer | As a customer, I want to add items to a cart with a quantity picker (capped at available stock) on the product page, so I can prepare my pickup list. | Medium | 🟡 Medium | ✅ |
| US31 | Customer | As a customer, I want to view my cart with a list of selected items, unit prices, line totals, and a grand total, so I can review my order before placing it. | Medium | 🟡 Medium | ✅ |
| US32 | Customer | As a customer, I want to place an order from my cart so the reuse center knows what I intend to pick up. | Medium | 🔴 Complex | ✅ (cart → backend order API; cart cleared on success; redirects to My Orders) |
| US33 | Customer | As a customer, I want my cart to be saved between sessions (browser refresh) so I don't lose my selection. | Low | ⚪ Simple | ✅ (localStorage persistence) |
| US34 | User | As a user, I want to click on a product photo to view it full-size in a lightbox, and navigate between photos with arrows or keyboard (←/→/Esc). | Low | ⚪ Simple | ✅ |
| US35 | Developer | As a developer, I want to control the following application parameters via a central config so the app can be adapted to different community contexts without code changes: **(1) Currency** — ISO 4217 code used throughout the UI; **(2) Open registration** — whether new users can self-register (if disabled, only admins can create accounts and the register route/link are hidden); **(3) Public mode** — whether the app is publicly accessible to non-logged-in users (if disabled, unauthenticated visitors are redirected to login, and the backend API enforces auth on all routes including product listing); **(4) Language mode** — whether the app supports multiple languages (current: en/fr) or is locked to a single language (if single, the language switcher is hidden and the fixed locale is configurable); **(5) Shop mode** — whether cart, order, and checkout features are enabled (if disabled, all shop-related UI elements are hidden and the relevant API routes are restricted on the backend). | Medium | 🔴 Complex | ⚪ |
| US36 | Editor/Admin | As an editor or admin, I want a dedicated Orders page listing all orders from all customers, with the ability to view each order's items and mark an order as completed or cancelled (and reopen it to pending), so the team can manage in-person pickup and payment. | Medium | 🔴 Complex | ✅ |
| US37 | Developer | As a developer, I want dates displayed throughout the app to respect the user's selected language (locale-aware formatting for month names, date order, etc.), so that French users see "28 avr. 2026" and English users see "28 Apr 2026". | Low | ⚪ Simple | ✅ (shared `LocaleDatePipe`; product list, product form, My Orders, and Orders all use it) |
| US38 | Editor/Admin | As an editor or admin, I want to view the full history of each product — quantity changes, location moves, order events — with a timestamp and the responsible user, so the team has complete traceability over every item. | Medium | 🔴 Complex | ⚪ |
| US39 | Admin | As an admin, I want to view reuse impact statistics (total kg recovered, number of items redistributed, estimated value) derived from existing product data and completed orders, so I can report on the center's environmental and social activity. | Low | 🟡 Medium | ⚪ |
| US40 | Editor/Admin | As an editor or admin, I want to print or export shelf labels containing the location code (e.g. BG1-ZOA-001) as a barcode or QR code, so I can physically tag storage locations and scan them later. | Low | 🟡 Medium | ⚪ |
| US41 | User/Admin | As a user or admin, I want to receive notifications (in-app or email) when an order is placed or its status changes, so the team and customers are always informed without having to check manually. | Medium | 🔴 Complex | ⚪ |
| US42 | Admin | As an admin, I want to export inventory or order data as a formatted PDF report, so I can share or archive summaries without needing spreadsheet software. | Low | 🟡 Medium | ⚪ |
| US43 | User/Editor/Admin | As a user or editor, I want to see who added and last edited a product in the product's Quick Info panel, so I have traceability over inventory changes. | Low | 🟢 Simple | ✅ |

---

## ⚡ State Management

- The frontend uses **Angular signals** for state management wherever possible, including authentication, navigation, and feature modules, to ensure modern, reactive, and efficient UI updates.

---

## 📌 Roadmap Ideas

- Online payment integration
- PWA offline sync with conflict resolution

---

## 🛠️ Backlog / Next Session

_Nothing pending at this time._

---

## 🤝 Contributions

Itemloop is developed as a community-driven project.  
We welcome pull requests, feedback, and translations.

Before contributing, please read the [LICENSE](./LICENSE) (AGPL-3.0) and respect the spirit of fair and open collaboration.

