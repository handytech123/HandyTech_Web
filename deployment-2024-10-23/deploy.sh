#!/bin/bash
# ========================================
# HANDYTECH SOLUTIONS - VPS DEPLOYMENT SCRIPT
# PM2-Based Deployment with Zero Downtime
# ========================================

set -e  # Exit on any error

echo "========================================="
echo "HandyTech Solutions - Deployment Script"
echo "========================================="
echo ""

# Configuration
APP_NAME="handytech"
VPS_ROOT="/var/www/handytech"
SOURCE_DIR="$VPS_ROOT/source"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_DIR="$VPS_ROOT/releases/$TIMESTAMP"
SHARED_DIR="$VPS_ROOT/shared"
CURRENT_LINK="$VPS_ROOT/current"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Pull latest code from GitHub
echo -e "${YELLOW}[1/8]${NC} Pulling latest code from GitHub..."
cd "$SOURCE_DIR"
git pull origin main
echo -e "${GREEN}✓${NC} Code updated from GitHub"
echo ""

# Step 2: Create new release directory
echo -e "${YELLOW}[2/8]${NC} Creating release directory..."
mkdir -p "$VPS_ROOT/releases"
cp -r "$SOURCE_DIR" "$RELEASE_DIR"
echo -e "${GREEN}✓${NC} Release created: $RELEASE_DIR"
echo ""

# Step 3: Link shared .env file
echo -e "${YELLOW}[3/8]${NC} Linking environment variables..."
if [ ! -f "$SHARED_DIR/.env" ]; then
  echo -e "${RED}ERROR:${NC} $SHARED_DIR/.env not found!"
  echo "Please create $SHARED_DIR/.env with your production environment variables"
  exit 1
fi
ln -sf "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
echo -e "${GREEN}✓${NC} Environment variables linked"
echo ""

# Step 4: Install dependencies
echo -e "${YELLOW}[4/8]${NC} Installing dependencies..."
cd "$RELEASE_DIR"
npm ci --production
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 5: Build application
echo -e "${YELLOW}[5/8]${NC} Building application..."
npm run build
echo -e "${GREEN}✓${NC} Application built successfully"
echo ""

# Step 6: Update current symlink
echo -e "${YELLOW}[6/8]${NC} Updating current release symlink..."
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
echo -e "${GREEN}✓${NC} Current release updated"
echo ""

# Step 7: Restart PM2 application
echo -e "${YELLOW}[7/8]${NC} Restarting application..."
cd "$CURRENT_LINK"

# Check if app is already running in PM2
if pm2 list | grep -q "$APP_NAME"; then
  echo "Reloading existing PM2 process..."
  pm2 reload "$APP_NAME" --update-env
else
  echo "Starting new PM2 process..."
  pm2 delete "$APP_NAME" 2>/dev/null || true  # Clean up any stopped processes
  pm2 start npm --name "$APP_NAME" -- start
  pm2 save
fi
echo -e "${GREEN}✓${NC} Application restarted"
echo ""

# Step 8: Verify deployment
echo -e "${YELLOW}[8/8]${NC} Verifying deployment..."
sleep 3
if pm2 list | grep -q "$APP_NAME.*online"; then
  echo -e "${GREEN}✓${NC} Application is running"
  
  # Health check
  if curl -f http://localhost:5000/api/health &>/dev/null; then
    echo -e "${GREEN}✓${NC} Health check passed"
  else
    echo -e "${YELLOW}⚠${NC} Health check failed - app may still be starting"
  fi
else
  echo -e "${RED}✗${NC} Application failed to start"
  echo "Check logs with: pm2 logs $APP_NAME"
  exit 1
fi
echo ""

# Cleanup old releases (keep last 5)
echo "Cleaning up old releases (keeping last 5)..."
cd "$VPS_ROOT/releases"
ls -t | tail -n +6 | xargs -r rm -rf
echo -e "${GREEN}✓${NC} Old releases cleaned up"
echo ""

echo "========================================="
echo -e "${GREEN}DEPLOYMENT SUCCESSFUL!${NC}"
echo "========================================="
echo "Release: $TIMESTAMP"
echo "Location: $RELEASE_DIR"
echo "Current: $CURRENT_LINK"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs $APP_NAME  - View logs"
echo "  pm2 monit           - Monitor resources"
echo "========================================="
