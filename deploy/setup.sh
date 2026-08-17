#!/bin/bash

# exit on error
set -e

# Configurable variables
DB_NAME="minicrm"
DB_USER="minicrm_user"
DB_PASS="MatKhauBaoMat123!"

echo "=============================================="
echo " Starting Server Setup for Mini CRM "
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo (e.g., sudo ./setup.sh)"
  exit 1
fi

# 1. Update system packages
echo "🔄 Updating system packages..."
apt update && apt upgrade -y
apt install -y git curl build-essential software-properties-common ufw

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

# Create database and user if not exists
echo "🔑 Provisioning MySQL database & user..."
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "✅ MySQL setup completed."

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
echo " 3. Run deploy.sh"
echo "=============================================="
