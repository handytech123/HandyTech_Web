# HandyTech Solutions v6.0.0 - Deployment Instructions

## Overview
This archive contains the complete HandyTech Solutions application with the redesigned customer portal, magic link authentication, maintenance plan management, and enterprise security features.

## What's New in v6.0.0
- ✅ **Redesigned Customer Portal** - Clean single-page dashboard replacing confusing 6-tab interface
- ✅ **Magic Link Authentication** - Secure passwordless customer login with 30-minute sessions
- ✅ **Maintenance Plan Management** - Full subscription lifecycle (subscribe/cancel/reactivate)
- ✅ **Service History Tracking** - Complete customer service records and spending totals
- ✅ **Enhanced Security** - CSRF protection, rate limiting, and production hardening
- ✅ **Database Integration** - Full PostgreSQL implementation with persistent data

## Prerequisites
- Node.js 20.x or higher
- npm 9.x or higher
- PostgreSQL database (recommended: Neon, AWS RDS, or self-hosted)
- SMTP email service (recommended: IONOS for hosting compatibility)

## Quick Start Deployment

### 1. Extract Archive
```bash
tar -xzf handytech-solutions-v6.0.0-deployment.tar.gz
cd handytech-solutions-v6.0.0
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file with the following required variables:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://username:password@hostname:port/database

# Security (REQUIRED)
SESSION_SECRET=your-strong-random-session-secret-at-least-32-characters-long

# Admin Access (REQUIRED)
ADMIN_PASS=SecureAdminPassword123!
ADMIN_EMAIL=contact@handytech-solutions.com

# Email Service (REQUIRED)
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
SMTP_PORT=587

# Production Settings
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://handytech-solutions.com,https://www.handytech-solutions.com
```

### 4. Optional Environment Variables
```env
# AI Chatbot (Optional - fallback responses used if not provided)
OPENAI_API_KEY=sk-proj-your-openai-api-key

# Business Information (Optional - defaults provided)
BUSINESS_NAME=HandyTech Solutions
BUSINESS_PHONE=(314) 325-4575
PUBLIC_BASE_URL=https://handytech-solutions.com

# Advanced Features (Optional)
BREVO_API_KEY=xkeysib-your-brevo-key
CALENDLY_PAT=your-calendly-personal-access-token
```

### 5. Initialize Database
```bash
npm run db:push
```

### 6. Build Application
```bash
npm run build
```

### 7. Start Production Server
```bash
npm start
```

## Application Features

### Customer Portal (/portal/login)
- **Magic Link Authentication** - Secure email-based login
- **Profile Management** - Update contact information
- **Service History** - View past services and total spending
- **Appointment Management** - View and reschedule appointments
- **Maintenance Plans** - Subscribe, cancel, or reactivate plans

### Admin Dashboard (/admin)
- **Appointment Management** - Full CRUD operations with conflict detection
- **Customer Database** - Complete customer relationship management
- **Quote Management** - Track and manage service requests
- **Service Management** - Configure services, pricing, and categories
- **Email Campaigns** - Automated follow-up and marketing
- **Live Chat Management** - Handle customer service inquiries

### Public Features (/)
- **Service Information** - Professional service display
- **Quote Requests** - Contact forms with automated responses
- **AI Chatbot** - Intelligent customer service assistance
- **Mobile Responsive** - Ohio State Buckeyes branded design

## Security Features
- **Enterprise Authentication** - httpOnly cookie sessions
- **CSRF Protection** - Required for all state-changing operations
- **Rate Limiting** - Multiple protection tiers
- **Security Headers** - Comprehensive Helmet configuration
- **Input Sanitization** - XSS protection middleware
- **Production Hardening** - Strict security policies

## Health Monitoring
- **Health Check Endpoint**: `GET /api/health`
- **API Status**: `GET /api` (returns 200 when healthy)
- **Database Monitoring**: Automatic connection health checks

## Troubleshooting

### Database Connection Issues
1. Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
2. Ensure database exists and is accessible
3. Check firewall rules for database port

### Email Service Issues
1. Verify SMTP credentials are correct
2. Test with `telnet smtp.ionos.com 587`
3. Check email provider settings (app passwords for Gmail)

### Authentication Problems
1. Ensure SESSION_SECRET is at least 32 characters
2. Verify ADMIN_PASS is set correctly
3. Check browser cookies are enabled

### Build/Start Issues
1. Verify Node.js version: `node --version` (should be 20.x+)
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check port availability: `lsof -i :5000`

## File Structure
```
handytech-solutions/
├── client/           # React frontend application
├── server/           # Express.js backend
├── shared/           # Shared TypeScript schemas
├── deploy.json       # Complete deployment configuration
├── package.json      # Dependencies and scripts
├── drizzle.config.ts # Database configuration
└── vite.config.ts    # Build configuration
```

## Support
- Technical Architecture: See `replit.md` in project root
- Business Type: Missouri-based professional handyman services
- Specialties: Home repairs, smart technology, electrical, plumbing, carpentry

## Production Checklist
- [ ] Database connection established
- [ ] Environment variables configured
- [ ] SMTP email service working
- [ ] Admin dashboard accessible
- [ ] Customer portal magic links working
- [ ] SSL certificate installed
- [ ] Health check endpoint responding
- [ ] Backups configured
- [ ] Monitoring set up

---
**HandyTech Solutions v6.0.0** - Complete business management platform with redesigned customer portal