# HandyTech Solutions - Simple Deployment Guide

## 1. WHERE TO EXTRACT FILES
Extract the archive to your IONOS hosting directory (usually `/public_html` or `/app`)

## 2. COMMANDS TO RUN
```bash
npm install
npm run db:push
npm run build
npm start
```

## 3. ENVIRONMENT VARIABLES NEEDED

### Required:
```bash
DATABASE_URL=postgresql://username:password@hostname:port/database_name
SESSION_SECRET=your-secure-32-character-minimum-secret
ADMIN_PASS=YourAdminPassword123!
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/admin/google/callback
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
```

### Optional:
```bash
GOOGLE_CALENDAR_ID=contact@handytech-solutions.com
TZ=America/Chicago
PORT=5000
NODE_ENV=production
```

## 4. DATABASE SETUP
1. Create PostgreSQL database in IONOS control panel
2. Copy connection details to `DATABASE_URL`
3. Run `npm run db:push` to create tables

The application will start on port 5000 and be ready for use.