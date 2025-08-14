#!/bin/bash

# HandyTech Solutions - VPS Deployment Fixes Script
# Run this script to prepare your project for VPS deployment

echo "🔧 Applying VPS deployment fixes..."

# 1. Install pg dependency for VPS PostgreSQL
echo "📦 Installing PostgreSQL driver for VPS..."
npm install pg @types/pg

# 2. Update package.json for VPS deployment
echo "📄 Backing up original package.json..."
cp package.json package-original.json

echo "📝 Updating package.json for VPS..."
cp vps-package.json package.json

# 3. Add pg dependency to the VPS package.json
echo "🔗 Adding PostgreSQL dependency..."
npm install --save pg @types/pg

# 4. Replace database connection for VPS compatibility  
echo "🔄 Updating database connection for VPS..."
cp server/db-vps.ts server/db.ts

# 5. Fix build configuration for VPS
echo "🔧 Updating build configuration for VPS..."
# Update package.json build script for VPS compatibility
sed -i 's/esbuild server\/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/esbuild server\/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist\/server.js/' package.json

# 6. Build the application
echo "🏗️ Building application for production..."
npm run build

# 7. Copy public files to proper location for deployment
echo "📁 Preparing deployment file structure..."
mkdir -p server/public
cp -r dist/* server/public/ 2>/dev/null || echo "No dist files to copy"

# 8. Create deployment archive  
echo "📦 Creating deployment archive..."
tar -czf handytech-vps-deployment.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=client \
  --exclude=migrations \
  server/ \
  shared/ \
  dist/ \
  package.json \
  tsconfig.json \
  drizzle.config.ts \
  setup-env.sh \
  fix-vps-deployment.sh \
  IONOS_VPS_DEPLOYMENT_GUIDE.md

echo "✅ VPS deployment fixes complete!"
echo ""
echo "📋 Next steps for VPS deployment:"
echo "   1. Upload handytech-vps-deployment.tar.gz to your VPS"
echo "   2. Extract: tar -xzf handytech-vps-deployment.tar.gz"
echo "   3. Run: npm install --production"
echo "   4. Run: ./setup-env.sh"
echo "   5. Run: npm run db:push"
echo "   6. Run: npm start"
echo ""
echo "🚀 Your HandyTech Solutions platform will be ready with full functionality!"