#!/bin/bash

# exit on error
set -e

PROJECT_DIR="/var/www/minicrm"
SEED_DATA=false

# Check if user passed --seed parameter or SEED=true env variable
if [ "$1" == "--seed" ] || [ "$SEED" == "true" ]; then
  SEED_DATA=true
fi

echo "=============================================="
echo " Starting Application Deployment for Mini CRM "
if [ "$SEED_DATA" = true ]; then
  echo " 🟢 Mode: FRESH SERVER INSTALLATION (WITH SEED DATA 🌱)"
else
  echo " 🔒 Mode: CODE UPDATE ONLY (SAFE - NO SEED DATA)"
fi
echo "=============================================="

# Go to project directory
cd "$PROJECT_DIR"

# 1. Update source code if using git
if [ -d ".git" ]; then
  echo "📥 Fetching latest code from Git..."
  git pull origin main # Hoặc tên branch của bạn (e.g. master, dev)
else
  echo "ℹ️ Skipping Git pull (Not a git repository or manually uploaded)"
fi

# 2. Deploy Backend
echo "⚙️ Deploying Backend..."
cd "$PROJECT_DIR/server"

# Install backend dependencies
echo "📦 Installing backend packages..."
npm install --production=false

# Generate Prisma Client & Migrate database
echo "🗄️ Running Prisma migrations & generator..."
npx prisma generate
npx prisma db push

if [ "$SEED_DATA" = true ]; then
  echo "🌱 [FRESH INSTALL] Populating database with initial seed data..."
  npm run prisma:seed
else
  echo "ℹ️ [UPDATE MODE] Skipped DB seed to protect existing live data."
fi

# Build Backend TypeScript to JS
echo "🛠️ Compiling Backend TypeScript..."
npm run build

# Restart or Start app in PM2
echo "💻 Managing PM2 process..."
if pm2 show minicrm-backend > /dev/null 2>&1; then
  echo "🔄 Restarting existing PM2 process..."
  pm2 restart minicrm-backend
else
  echo "🚀 Starting new PM2 process..."
  pm2 start dist/server.js --name "minicrm-backend"
fi

# 3. Deploy Frontend
echo "⚙️ Deploying Frontend..."
cd "$PROJECT_DIR/client"

# Install frontend dependencies
echo "📦 Installing frontend packages..."
npm install

# Build static files
echo "🛠️ Building React production bundle..."
npm run build

# 4. Reload Nginx to apply any configuration changes
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx

echo "=============================================="
echo " 🎉 Deployment completed successfully!"
echo " Server is live!"
echo "=============================================="