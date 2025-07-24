# 📦 Itemloop – Open Source Inventory App for Community Reuse Centers

## 🌍 Overview

**Itemloop** is an open source, multilingual web application designed to help reuse and recycling centers manage their inventory of second-hand items. The tool is optimized for collaborative, community-based use, and built to support both desktop and mobile devices, including offline access through PWA features.

This project is developed with a non-commercial, open community spirit. Contributions are welcome under the terms of the AGPL v3 license.

---

## 🔧 Tech Stack

- **Frontend**: Angular (with PWA support for installable and offline-capable app)
- **Backend**: PHP 8+ (Laravel recommended)
- **Database**: MySQL
- **Image processing**: Server-side resizing and format conversion to WebP
- **Hosting target**: Shared hosting on OVH (PHP/MySQL compatible)

---

## 🔐 License

Itemloop is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)**.

- You are free to use, modify, and redistribute the software,
- You **must** publish any modifications if you provide access to the app (e.g., SaaS or web interface),
- Commercial proprietary reuse of the code is **not allowed** without sharing the changes under the same license.

---

## 📋 Core Features (User Stories)

| ID  | Role             | User Story                                                                                         | Priority | Complexity |
|-----|------------------|-----------------------------------------------------------------------------------------------------|----------|------------|
| US1 | User             | As a user, I want to log in with a username and password so I can access the app.                  | High     | 🟡 Medium  |
| US2 | Admin            | As an admin, I want to create, edit, and delete user accounts to manage access control.             | High     | 🟡 Medium  |
| US3 | User             | As a user, I want to add a product with a title, description, condition, quantity, estimated value, location, multiple photos, barcode, and date so I can track inventory items. | High | 🔴 Complex |
| US4 | User             | As a user, I want to edit or delete product entries to keep information up to date.                 | High     | 🟡 Medium  |
| US5 | User             | As a user, I want to view and filter the product list (by condition, location, keyword) to find items easily. | High | 🔴 Complex |
| US6 | User             | As a user, I want to scan a barcode to quickly search or add an item.                              | Medium   | 🔴 Complex |
| US7 | Public visitor   | As a visitor, I want to browse available items so I can prepare for an in-person visit.             | Medium   | 🟡 Medium  |
| US8 | Public visitor   | As a visitor, I want to reserve items online to pick them up later.                                 | Low      | 🔴 Complex |
| US9 | User             | As a user, I want to use the app from a smartphone or browser so I can manage inventory anywhere.   | High     | 🟡 Medium  |
| US10| User             | As a user, I want to use the app offline and sync data when reconnected so I can keep working without internet. | Medium | 🔴 Complex |
| US11| User             | As a user, I want to be notified if data fails to sync so I don't lose updates.                    | Medium   | 🟡 Medium  |
| US12| Admin            | As an admin, I want to export inventory data to CSV or PDF for backup or reporting.                | Low      | 🟡 Medium  |
| US13| User             | As a user, I want to view product photos to better identify each item.                             | High     | ⚪ Simple   |
| US14| Admin            | As an admin, I want to see statistics (total quantity, estimated value, etc.) to monitor reuse activity. | Low  | 🔴 Complex |
| US15| Developer        | As a developer, I want the app to support multiple languages (French, English) so it's accessible to a wider community. | High | 🟡 Medium |
| US16| User             | As a user, I want to upload **multiple photos per item** to fully document its condition.          | High     | 🟡 Medium  |
| US17| System           | As the system, I want to **automatically resize images** to reduce storage and upload time.         | High     | 🟡 Medium  |
| US18| System           | As the system, I want to **convert images to WebP format** and **limit resolution to 1600x1200**.   | High     | 🟡 Medium  |
| US19| User             | As a user, I want to assign products to a **structured location** (building, zone, shelf) to track physical storage. | High | 🔴 Complex |
| US20| Admin            | As an admin, I want to **manage the list of storage locations** so the inventory stays organized.  | Medium   | 🟡 Medium  |

---

## 📁 Notes and Constraints

### ✅ Internationalization (i18n)
- All UI text must be externalized in translation files (e.g., JSON or PO format)
- Default languages: **French and English**
- Language auto-detection by browser, with user override

### 🖼️ Image Handling
- Users can upload **multiple images per product**
- Images must be **resized on upload** to **max 1600x1200 px**
- Images must be converted to **WebP** (with JPEG fallback if needed)
- Optimized for fast load and reduced hosting usage

### 🗂️ Storage Locations
- Products are assigned to structured locations: **Building → Zone → Shelf**
- Admins can manage and customize the list of locations dynamically
- Locations are stored in a dedicated DB table and referenced by products

---

## 📌 Roadmap Ideas (Future)
- Public item browsing with reservation requests
- User notification system (email, browser alerts)
- Item history & audit log
- Role-based permissions (viewer / editor / manager)
- Weight/volume tracking for reuse impact reporting

---

## 🤝 Contributions

Itemloop is developed as a community-driven project.  
We welcome pull requests, feedback, and translations.

Before contributing, please read the [LICENSE](./LICENSE) (AGPL-3.0) and respect the spirit of fair and open collaboration.

