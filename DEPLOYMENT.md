# Deployment Guide

## Static Deployment Fix

This project has been configured to work with static deployment platforms that expect `index.html` to be in the root of the distribution directory.

### Issue Resolution

The deployment issue was caused by a mismatch between:
- **Vite build output**: `dist/public/` (configured in vite.config.ts)
- **Static deployment expectation**: `dist/` (index.html at root)

### Solution

A deployment preparation script has been created at `scripts/prepare-deploy.js` that:

1. Moves all files from `dist/public/` to `dist/`
2. Places `index.html` at the root level for static deployment
3. Cleans up the nested directory structure
4. Maintains all asset references correctly

### Deployment Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Prepare for static deployment**:
   ```bash
   node scripts/prepare-deploy.js
   ```

3. **Deploy the `dist/` directory** to your static hosting platform

### File Structure After Preparation

```
dist/
├── index.html          # Main HTML file (required at root)
├── index.js           # Server bundle (not used in static deployment)
└── assets/            # Frontend assets (CSS, JS)
    ├── index-[hash].css
    └── index-[hash].js
```

### Automated Deployment

For CI/CD pipelines, combine both commands:

```bash
npm run build && node scripts/prepare-deploy.js
```

### Notes

- The `index.js` file in `dist/` is the server bundle and not needed for static deployment
- All frontend assets maintain their correct paths after the file reorganization
- The script is idempotent and can be run multiple times safely