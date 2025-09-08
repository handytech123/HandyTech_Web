#!/bin/bash

# HandyTech Solutions - VPS Deployment Script
# Run as: ./deploy-vps.sh

set -e

echo "🚀 Starting HandyTech Solutions deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo "🗄️ Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Install Nginx
echo "🌐 Installing Nginx..."
apt-get install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/handytech
cd /var/www/handytech

# Extract application files (assumes deployment.tar.gz is in current directory)
echo "📂 Extracting application files..."
tar -xzf /root/handytech-deployment.tar.gz -C /var/www/handytech --strip-components=1

# Install dependencies
echo "📦 Installing application dependencies..."
npm ci --production

# Setup PostgreSQL database
echo "🗄️ Setting up database..."
sudo -u postgres createuser handytech || true
sudo -u postgres createdb handytech_db || true
sudo -u postgres psql -c "ALTER USER handytech PASSWORD 'SecurePass123!';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE handytech_db TO handytech;" || true

# Set environment variables
echo "🔧 Setting up environment..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://handytech:SecurePass123!@localhost:5432/handytech_db
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Run database migrations
echo "🗄️ Running database setup..."
npm run db:push

# Setup Nginx
echo "🌐 Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/handytech
ln -sf /etc/nginx/sites-available/handytech /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup SSL with Let's Encrypt
echo "🔒 Setting up SSL..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d handytech-solutions.com --non-interactive --agree-tos --email admin@handytech-solutions.com

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://handytech-solutions.com"
echo "📊 Monitor with: pm2 monit"
echo "📋 View logs with: pm2 logs"