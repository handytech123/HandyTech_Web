#!/bin/bash

# Quick fix for VPS deployment path issues
# Run this on your VPS after extraction

echo "🔧 Fixing VPS deployment issues..."

# 1. Stop the errored application
echo "⏹️ Stopping application..."
pm2 stop handytech 2>/dev/null || echo "App not running"
pm2 delete handytech 2>/dev/null || echo "App not in PM2"

# 2. Fix the file structure
echo "📁 Fixing file structure..."
cd /var/www/handytech

# Move built files to expected location
if [ -d "server/public" ]; then
    echo "Moving server/public to root public..."
    mv server/public ./public 2>/dev/null || echo "Already moved"
fi

# Create public directory if it doesn't exist and copy from dist
if [ ! -d "public" ] && [ -d "dist" ]; then
    echo "Creating public directory from dist..."
    cp -r dist public
fi

# 3. Update the start script to use correct file
echo "📝 Updating start command..."
if [ -f "dist/server.js" ]; then
    START_FILE="dist/server.js"
elif [ -f "dist/index.js" ]; then
    START_FILE="dist/index.js"
else
    echo "❌ No server file found in dist/"
    exit 1
fi

# 4. Set correct working directory and environment
echo "🌍 Setting environment..."
export NODE_ENV=production
export PORT=3000

# 5. Restart application with PM2
echo "🚀 Starting application..."
pm2 start $START_FILE --name handytech --cwd /var/www/handytech

# 6. Save PM2 configuration
pm2 save

echo "✅ VPS deployment fix complete!"
echo ""
echo "🔍 Checking status..."
pm2 status
echo ""
echo "📋 To check logs: pm2 logs handytech"
echo "📋 To restart: pm2 restart handytech"
echo "📋 Your website should be available at: http://your-domain.com"