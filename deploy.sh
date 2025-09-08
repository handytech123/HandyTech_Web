#!/bin/bash

# HandyTech Solutions Deployment Script
set -e

echo "🚀 Starting HandyTech Solutions Deployment..."

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment archive
echo "🗜️  Creating deployment archive..."
tar -czf handytech-deployment.tar.gz \
  dist/ \
  package.json \
  ecosystem.config.js \
  shared/ \
  server/db.ts \
  server/storage.ts \
  drizzle.config.ts \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=client/src

echo "✅ Deployment archive created: handytech-deployment.tar.gz"
echo "📋 Ready for server transfer"