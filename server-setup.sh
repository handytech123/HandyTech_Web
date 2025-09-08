#!/bin/bash

# Server setup script for HandyTech Solutions
set -e

echo "🔧 Setting up HandyTech Solutions on server..."

# Update system
echo "⬆️  Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
echo "🔄 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "🌐 Installing Nginx..."
apt-get install -y nginx

# Install PostgreSQL
echo "🗄️  Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/handytech-solutions
cd /var/www/handytech-solutions

# Set up PostgreSQL database
echo "🗄️  Setting up PostgreSQL database..."
sudo -u postgres createdb handytech_solutions || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER handytech WITH PASSWORD 'HandyTech2024!';" || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE handytech_solutions TO handytech;" || echo "Privileges already granted"

echo "✅ Server setup complete!"
echo "📋 Next: Upload application files and configure"