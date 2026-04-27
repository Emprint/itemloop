#!/bin/bash
# Deploy Itemloop to OVH shared hosting
#
# Server layout:
#   ~/frontend/         → web root (your site URL)
#   ~/backend/          → Slim app (not web-accessible)
#   ~/frontend/api/     → entry point: requires ../../backend/public/index.php
#
# One-time setup (already done — do not repeat unless re-provisioning):
#   1. Create ~/frontend/api/index.php:
#        <?php require __DIR__ . '/../../backend/public/index.php';
#   2. Create ~/frontend/api/.htaccess (Slim routing + XSRF header passthrough)
#   3. Create ~/frontend/.htaccess (HTTPS redirect + Angular HTML5 routing)
#   4. Create ~/backend/.env from .env.example with production DB credentials
#   5. Create ~/frontend/storage/products/ for image uploads (web-accessible path)
#      Then set STORAGE_PATH in ~/backend/.env to the REAL filesystem path, e.g.:
#        STORAGE_PATH=/real/path/to/frontend/storage/products
#      On OVH: PHP-FPM open_basedir uses the real path, NOT the /home/username alias.
#      Run `echo $HOME` via SSH to find your real path.
#   6. Create ~/.user.ini and ~/backend/public/.user.ini for PHP-FPM upload limits
#   7. Import src/backend/sql/schema.sql via phpMyAdmin (one-time DB setup)
#
# Usage:
#   1. Copy deploy.env.example to deploy.env and fill in your values (gitignored)
#   2. SSH_PASS=<password> ./deploy.sh

set -e

# Load private config from deploy.env if present
if [ -f "$(dirname "$0")/deploy.env" ]; then
  # shellcheck source=deploy.env
  source "$(dirname "$0")/deploy.env"
fi

SSH_USER="${SSH_USER:-}"
SSH_HOST="${SSH_HOST:-}"
SSH_PORT="${SSH_PORT:-22}"
SSH_PASS="${SSH_PASS:-}"
SITE_URL="${SITE_URL:-https://yourdomain.com}"

if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ]; then
  echo "❌ SSH_USER and SSH_HOST are required."
  echo "   Copy deploy.env.example to deploy.env and fill in your values, then re-run."
  exit 1
fi

if [ -z "$SSH_PASS" ]; then
  echo "❌ SSH_PASS is required. Usage: SSH_PASS=yourpassword ./deploy.sh"
  exit 1
fi

RSYNC="sshpass -p '$SSH_PASS' rsync -az --no-perms -e 'ssh -o StrictHostKeyChecking=no -p $SSH_PORT'"

echo "🔨 Building Angular frontend..."
cd src/frontend
ng build --configuration production
cd ../..

echo "📦 Installing backend dependencies (production)..."
cd src/backend
composer install --optimize-autoloader --no-dev
cd ../..

echo "🚀 Deploying frontend (excluding .htaccess — managed on server)..."
sshpass -p "$SSH_PASS" rsync -az --no-perms \
  --exclude='.htaccess' \
  -e "ssh -o StrictHostKeyChecking=no -p $SSH_PORT" \
  deploy_package/frontend/ \
  "$SSH_USER@$SSH_HOST:~/frontend/"

echo "🚀 Deploying backend (excluding .env — managed on server)..."
sshpass -p "$SSH_PASS" rsync -az --no-perms \
  --exclude='.env' \
  -e "ssh -o StrictHostKeyChecking=no -p $SSH_PORT" \
  src/backend/ \
  "$SSH_USER@$SSH_HOST:~/backend/"

echo ""
echo "✅ Deploy complete! Site: $SITE_URL"
echo ""
echo "⚠️  Note: OVH caches .htaccess changes for ~35-60s. Wait before testing."
