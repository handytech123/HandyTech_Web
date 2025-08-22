#!/bin/bash

# HandyTech Solutions - VPS Deployment Script
# Run this script on your VPS after uploading the files

echo "🚀 Starting HandyTech Solutions deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (if not already installed)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (if not already installed)
echo "🗄️ Installing PostgreSQL..."
sudo apt install postgresql postgresql-contrib -y

# Install PM2 globally for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Setup database
echo "🗄️ Setting up database..."
sudo -u postgres createuser -s handytech_user
sudo -u postgres createdb handytech_solutions -O handytech_user

# Set password for database user
sudo -u postgres psql -c "ALTER USER handytech_user PASSWORD 'your_secure_password';"

# Push database schema
npm run db:push

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up your environment variables (DATABASE_URL, SESSION_SECRET, etc.)"
echo "2. Configure nginx as reverse proxy"
echo "3. Start the application: pm2 start ecosystem.config.js"
echo "4. Set up PM2 to start on boot: pm2 startup"
echo ""
echo "Your application will be available on port 5000"