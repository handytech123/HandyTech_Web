#!/usr/bin/env node

/**
 * Deployment preparation script
 * Moves files from dist/public to dist for static deployment compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(distDir, 'public');

console.log('🚀 Preparing deployment files...');

// Check if dist/public exists
if (!fs.existsSync(publicDir)) {
  console.error('❌ dist/public directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Check if index.html exists in dist/public
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html not found in dist/public. Build may have failed.');
  process.exit(1);
}

try {
  // Copy all files from dist/public to dist root
  const files = fs.readdirSync(publicDir);
  
  for (const file of files) {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    
    // Remove existing file if it exists
    if (fs.existsSync(destPath)) {
      if (fs.statSync(destPath).isDirectory()) {
        fs.rmSync(destPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(destPath);
      }
    }
    
    // Copy file or directory
    if (fs.statSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    
    console.log(`✅ Moved: ${file}`);
  }
  
  // Remove the public directory after copying
  fs.rmSync(publicDir, { recursive: true, force: true });
  console.log('🗑️  Cleaned up dist/public directory');
  
  console.log('✨ Deployment files prepared successfully!');
  console.log('📁 index.html is now in dist/ for static deployment');
  
} catch (error) {
  console.error('❌ Error preparing deployment files:', error.message);
  process.exit(1);
}