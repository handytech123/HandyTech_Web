#!/bin/bash

# Quick deployment script for HandyTech Solutions
# Run this script on your VPS server after uploading files

set -e

echo "🚀 Starting HandyTech Solutions Quick Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the application directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Set up proper permissions
echo "🔐 Setting up permissions..."
chown -R www-data:www-data /var/www/handytech-solutions
chmod -R 755 /var/www/handytech-solutions

# Create environment file if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo "⚙️  Creating environment file..."
    cat > .env.production << EOL
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://handytech:HandyTech2024!@localhost:5432/handytech_solutions
OPENAI_API_KEY=your_openai_api_key_here
SESSION_SECRET=$(openssl rand -base64 32)
EOL
    echo "📝 Please update .env.production with your actual API keys"
fi

# Run database migration
echo "🗄️  Running database migration..."
npm run db:push

# Start/restart with PM2
echo "🔄 Starting application with PM2..."
pm2 delete handytech-solutions 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# Configure Nginx
echo "🌐 Configuring Nginx..."
cp nginx-config.conf /etc/nginx/sites-available/handytech-solutions
ln -sf /etc/nginx/sites-available/handytech-solutions /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: http://74.2.8.149.78"
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs handytech-solutions"