#!/bin/bash

# exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/server/.env"
ENV_EXAMPLE="$PROJECT_ROOT/server/.env.example"

# Auto-create server/.env from server/.env.example if missing
if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "📋 Created server/.env from server/.env.example"
fi

# Fallback default values
DB_NAME="${DB_NAME:-minicrm}"
DB_USER="${DB_USER:-minicrm_user}"
DB_PASS="${DB_PASS:-ChangeMeStrongPass123!}"

# Automatically read DB_NAME, DB_USER, DB_PASS or DATABASE_URL from server/.env if available
if [ -f "$ENV_FILE" ]; then
  echo "📖 Reading database configuration from $ENV_FILE..."
  ENV_DB_USER=$(grep "^DB_USER=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  ENV_DB_PASS=$(grep "^DB_PASS=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  ENV_DB_NAME=$(grep "^DB_NAME=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

  [ -n "$ENV_DB_USER" ] && DB_USER="$ENV_DB_USER"
  [ -n "$ENV_DB_PASS" ] && DB_PASS="$ENV_DB_PASS"
  [ -n "$ENV_DB_NAME" ] && DB_NAME="$ENV_DB_NAME"

  # Fallback to parsing DATABASE_URL if individual variables were missing
  if [ -z "$ENV_DB_USER" ] || [ -z "$ENV_DB_PASS" ] || [ -z "$ENV_DB_NAME" ]; then
    DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$DB_URL" ]; then
      PARSED_USER=$(echo "$DB_URL" | sed -n 's|.*mysql://\([^:]*\):.*|\1|p')
      PARSED_PASS=$(echo "$DB_URL" | sed -n 's|.*mysql://[^:]*:\([^@]*\)@.*|\1|p')
      PARSED_NAME=$(echo "$DB_URL" | sed -n 's|.*mysql://[^/]*/\([^?]*\).*|\1|p' | cut -d '?' -f1)

      [ -n "$PARSED_USER" ] && DB_USER="$PARSED_USER"
      [ -n "$PARSED_PASS" ] && DB_PASS="$PARSED_PASS"
      [ -n "$PARSED_NAME" ] && DB_NAME="$PARSED_NAME"
    fi
  fi
  echo "✅ Extracted DB credentials from .env -> User: $DB_USER, Database: $DB_NAME"
fi

echo "=============================================="
echo " Starting Server Setup for Mini CRM "
echo " Target Database: ${DB_NAME}"
echo " Target DB User:  ${DB_USER}"
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo (e.g., sudo ./setup.sh)"
  exit 1
fi

# 1. Update system packages
echo "🔄 Updating system packages..."
apt update && apt upgrade -y
apt install -y git curl build-essential software-properties-common ufw certbot python3-certbot-nginx

# 2. Install Node.js v20 LTS
echo "📦 Installing Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "✅ Node.js version: $(node -v)"
echo "✅ NPM version: $(npm -v)"

# 3. Install MySQL Server 8.x
echo "🗄️ Installing MySQL Server..."
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Create database and user in MySQL using credentials read from .env
echo "🔑 Provisioning MySQL database & user..."
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "✅ MySQL database & user setup completed successfully."

# 4. Install Redis Server
echo "🚀 Installing Redis Server..."
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server
echo "✅ Redis status: $(redis-cli ping)"

# 5. Install PM2 globally
echo "💻 Installing PM2 process manager..."
npm install -g pm2
echo "✅ PM2 version: $(pm2 -v)"

# 6. Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 7. Configure Firewall
echo "🛡️ Configuring Firewall (UFW)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# Enable UFW without prompting
ufw --force enable

echo "=============================================="
echo " 🎉 Server setup completed successfully!"
echo " Next steps:"
echo " 1. Configure Nginx config file"
echo " 2. Clone/deploy your code to /var/www/minicrm"
echo " 3. For FRESH install with sample seed data: bash deploy.sh --seed"
echo " 4. For regular code updates (safely keep data): bash deploy.sh"
echo "=============================================="
