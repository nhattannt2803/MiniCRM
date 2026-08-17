#!/bin/bash

# exit on error
set -e

echo "=============================================="
echo " Starting SSL Setup (Let's Encrypt Certbot) "
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo (e.g., sudo ./setup_ssl.sh)"
  exit 1
fi

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
  echo "📦 Installing Certbot and Nginx plugin..."
  apt update
  apt install -y certbot python3-certbot-nginx
fi

# Ask for domain and email
read -p "Enter your domain name (e.g., crm.yourdomain.com): " DOMAIN
read -p "Enter your email (for SSL expiration alerts): " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "❌ Domain and Email cannot be empty!"
  exit 1
fi

echo "🔒 Generating SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --non-interactive --redirect

echo "=============================================="
echo " 🎉 SSL has been configured successfully!"
echo " Your CRM is now accessible via: https://$DOMAIN"
echo ""
echo " ⚠️ IMPORTANT: Update CLIENT_URL in /var/www/minicrm/server/.env:"
echo " CLIENT_URL=\"https://$DOMAIN\""
echo " Then run: pm2 restart minicrm-backend"
echo "=============================================="
