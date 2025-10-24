╔════════════════════════════════════════════════════════════════════════════╗
║              HANDYTECH SOLUTIONS - DEPLOYMENT PACKAGE                      ║
║                        October 24, 2025                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

📦 PACKAGE CONTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ DEPLOY-INSTRUCTIONS.txt  - Complete step-by-step deployment guide
✓ .env.production          - Production environment template (🔴 FILL IN PASSWORDS)
✓ deploy.sh                - Automated deployment script for PM2
✓ package.json             - Complete dependency list and npm scripts
✓ deploy.json              - Full technical deployment specification

🚀 QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. READ:   DEPLOY-INSTRUCTIONS.txt (complete deployment guide)
2. EDIT:   .env.production (fill in 🔴 marked fields)
3. UPLOAD: Deploy files to VPS /var/www/handytech/
4. RUN:    ./deploy.sh

📋 KEY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Entry Point:      server/index.ts
Production Start: npm start (runs: NODE_ENV=production node dist/index.js)
Build Command:    npm run build
Application Port: 5000 (hardcoded)
PM2 Process Name: handytech

🔴 REQUIRED SECRETS TO FILL IN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before deployment, you MUST set these in .env.production:

🔴 DATABASE_URL          - PostgreSQL connection string
🔴 SESSION_SECRET        - Generate with: openssl rand -base64 32
🔴 ADMIN_PASS            - Your admin portal password
🔴 SMTP_PASS             - IONOS email password
🔴 GOOGLE_CLIENT_ID      - Google Cloud Console OAuth
🔴 GOOGLE_CLIENT_SECRET  - Google Cloud Console OAuth
🔴 GOOGLE_REDIRECT_URI   - https://yourdomain.com/api/admin/google/callback

Optional (for enhanced features):
✓ OPENAI_API_KEY         - AI chatbot (has fallback if not provided)
✓ BREVO_API_KEY          - Marketing automation

📂 VPS DIRECTORY STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/var/www/handytech/
├── source/           # Git repository (GitHub clone)
├── releases/         # Timestamped deployments (auto-cleanup)
├── shared/.env       # Production environment file
├── current/          # Symlink to active release
└── deploy.sh         # Deployment automation script

🔄 UPDATE WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FROM REPLIT:
  git add .
  git commit -m "Your changes"
  git push origin main

ON VPS:
  ssh lou@74.208.149.78
  /var/www/handytech/deploy.sh

✅ PRE-FILLED VALUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The .env.production file already has these values filled in for you:

✓ NODE_ENV=production
✓ PORT=5000
✓ BUSINESS_NAME=HandyTech Solutions
✓ BUSINESS_PHONE=(314) 325-4575
✓ PUBLIC_BASE_URL=https://handytech-solutions.com
✓ ADMIN_EMAIL=contact@handytech-solutions.com
✓ SMTP_HOST=smtp.ionos.com
✓ SMTP_PORT=587
✓ SMTP_USER=contact@handytech-solutions.com
✓ FROM_EMAIL=service@handytech-solutions.com
✓ TZ=America/Chicago
✓ ALLOWED_ORIGINS=https://handytech-solutions.com,https://www.handytech-solutions.com

You only need to fill in passwords and API keys!

═══════════════════════════════════════════════════════════════════════════════
START HERE: Read DEPLOY-INSTRUCTIONS.txt for complete deployment steps
═══════════════════════════════════════════════════════════════════════════════
