#!/bin/bash

# Prepare deploy folder
rm -rf deploy_package
mkdir -p deploy_package/frontend
mkdir -p deploy_package/backend

# Build Angular frontend
cd src/frontend
npm install
ng build --configuration production
cd ../..

# Install Slim backend dependencies (production only, no dev)
cd src/backend
composer install --optimize-autoloader --no-dev
cd ../..

# Copy backend files (excluding dev artifacts)
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.env*' src/backend/ deploy_package/backend/

# Optional: Export database schema/data (uncomment and set credentials if needed)
# mysqldump --no-tablespaces -u itemloopuser -p itemloop > deploy_package/database.sql

echo ""
echo "✅ Build complete."
echo "Upload deploy_package/frontend/ to your web root (e.g. www/) via FTP."
echo "Upload deploy_package/backend/ to a directory outside the web root (e.g. api/) via FTP."
echo "Create a .env file in the backend directory on the server with your MySQL credentials."
