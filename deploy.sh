#!/bin/bash


# Prepare deploy folder
rm -rf deploy_package
mkdir -p deploy_package/frontend
mkdir -p deploy_package/backend

# Build Angular frontend (outputPath set in angular.json)
cd src/frontend
npm install
ng build --configuration production
cd ../..

# Build Laravel backend
cd src/backend
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
cd ../..

# Copy backend files (excluding node_modules, .git, .env, etc.)
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.env*' src/backend/ deploy_package/backend/

# Optional: Export database (uncomment and set credentials if needed)
# mysqldump --no-tablespaces -u itemloopuser -pyourpassword itemloop > deploy_package/database.sql

echo "Build complete. Upload deploy_package to your server via FTP or SCP."
