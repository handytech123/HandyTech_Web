#!/bin/bash

# Build script for deployment that ensures files are in the correct location
# This script handles the mismatch between vite build output and static serving expectations

echo "Building application for deployment..."

# Run the standard build process
npm run build

# Ensure server/public directory exists
mkdir -p server/public

# Copy built frontend assets to the location where server expects them
cp -r dist/public/* server/public/

# Also copy to root dist for static deployment compatibility
cp -r dist/public/* dist/

echo "Build complete! Files are now ready for static deployment."
echo "Frontend assets available at:"
echo "- dist/ (for static deployment)"
echo "- server/public/ (for production server)"