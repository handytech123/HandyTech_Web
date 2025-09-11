# HandyTech Solutions v4.0.0 - Enterprise Security Deployment Guide

## Overview

HandyTech Solutions v4.0.0 introduces enterprise-grade security features with cookie-based authentication, CSRF protection, and comprehensive security hardening. This deployment archive contains all necessary components for secure production deployment.

## 🔒 New Security Features (v4.0.0)

### Cookie-Based Authentication
- **Replaced JWT with secure httpOnly cookies** for admin authentication
- **PostgreSQL session storage** using connect-pg-simple for scalability
- **8-hour session timeout** with rolling expiration on activity
- **SameSite=Lax protection** against CSRF attacks

### CSRF Protection
- **CSRF tokens required** for all POST/PUT/DELETE operations
- **`/api/csrf` endpoint** provides tokens for frontend requests
- **Automatic validation** on all state-changing admin operations
- **Session-based token management** with secure storage

### Security Headers & Hardening
- **Helmet.js implementation** with comprehensive security headers:
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection enabled
- **Rate limiting** with multiple tiers:
  - Public endpoints: 300 requests/15min
  - Sensitive operations: 60 requests/15min
  - Authentication attempts: 10 attempts/15min

### CORS & Input Security
- **Environment-based CORS policy**:
  - Development: Automatic localhost/replit domains
  - Production: Whitelist-only (ALLOWED_ORIGINS required)
  - No wildcards allowed in production
- **Input sanitization** middleware for XSS prevention
- **Request validation** and error handling

## 📋 Required Environment Variables

### Critical Security Secrets (Production Required)
```bash
SESSION_SECRET=your-strong-random-session-secret-32-chars-minimum
ADMIN_PASS=YourSecureAdminPassword123!
DATABASE_URL=postgresql://username:password@hostname:port/database
```

### Production Security Requirements
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
```

### Optional Services
```bash
# AI Chatbot
OPENAI_API_KEY=sk-proj-your-openai-key

# Email Services
BREVO_API_KEY=xkeysib-your-brevo-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Business Configuration
BUSINESS_NAME=HandyTech Solutions
BUSINESS_PHONE=(314) 325-4575
PUBLIC_BASE_URL=https://yourdomain.com
```

## 🚀 Deployment Instructions

### 1. Environment Setup
1. Set all required environment variables
2. Ensure PostgreSQL database is accessible
3. Validate SESSION_SECRET is 32+ characters
4. Configure ALLOWED_ORIGINS for production

### 2. Database Setup
```bash
npm install
npm run db:push
```

### 3. Application Startup
```bash
npm run build
npm start
```

### 4. Security Validation
- Visit `/api/csrf` to verify CSRF token generation
- Check browser console for security headers
- Verify admin login works with password-only authentication
- Test rate limiting on excessive requests

## 🛡️ Security Architecture

### Authentication Flow
1. **Admin Login**: POST to `/api/admin/login` with password
2. **Session Creation**: Secure httpOnly cookie set with 8-hour expiration
3. **Request Authorization**: Session validation on protected routes
4. **CSRF Protection**: Token required for state-changing operations
5. **Auto Logout**: Session expires after 8 hours or on explicit logout

### Session Management
- **PostgreSQL Storage**: Sessions persisted in database
- **Auto Cleanup**: Expired sessions removed every 15 minutes
- **Rolling Expiration**: Activity extends session lifetime
- **Secure Cookies**: httpOnly, Secure (HTTPS), SameSite protection

### API Security
- **Protected Routes**: `/api/admin/*` requires valid session
- **Rate Limiting**: Prevents abuse and brute force attacks
- **Input Sanitization**: XSS protection on all user inputs
- **Error Handling**: Secure error responses without sensitive info

## 📊 Application Features

### Complete Admin Dashboard
- Full appointment CRUD operations
- Customer relationship management
- Quote request tracking and status management
- Review approval system
- Service management with pricing
- Live chat administration
- Email campaign management
- Availability rules and blocked times management

### Customer Portal
- Appointment booking with duration selection
- Self-service rescheduling
- Quote request submission
- Review and testimonial submission
- AI-powered customer service chat

### Business Automation
- Automated email confirmations and reminders
- AI chatbot with OpenAI integration
- Calendar integration with .ics attachments
- Maintenance plan tracking
- Project gallery management

## 🔧 Production Checklist

### Security Requirements
- [ ] SESSION_SECRET set (32+ characters)
- [ ] ADMIN_PASS configured (strong password)
- [ ] DATABASE_URL accessible
- [ ] ALLOWED_ORIGINS configured (no wildcards)
- [ ] SSL/HTTPS enabled
- [ ] Security headers verified

### Optional Services
- [ ] OpenAI API key for AI chatbot
- [ ] Email service configured (Brevo or SMTP)
- [ ] Business information updated
- [ ] Domain and branding configured

### Database
- [ ] PostgreSQL database created
- [ ] Database schema migrated (`npm run db:push`)
- [ ] Session table created automatically
- [ ] Connection pooling configured

## 📁 Archive Contents

```
handytech-solutions-enterprise-security-v4.tar.gz
├── client/                    # React frontend
├── server/                    # Express backend with security
├── shared/                    # Database schema and types
├── package.json              # Dependencies and scripts
├── deploy.json               # Complete deployment config
├── replit.md                 # Project documentation
└── Configuration files       # Vite, TypeScript, Tailwind, etc.
```

## 🆕 Changes from v3.0.0

### Security Upgrades
- ✅ **Replaced JWT authentication** with secure cookie sessions
- ✅ **Added CSRF protection** for all admin operations
- ✅ **Implemented PostgreSQL session storage** for scalability
- ✅ **Added comprehensive security headers** via Helmet
- ✅ **Implemented multi-tier rate limiting**
- ✅ **Hardened CORS policy** for production
- ✅ **Added input sanitization** middleware

### Architecture Improvements
- ✅ **Environment-based security validation** on startup
- ✅ **Production-ready session management**
- ✅ **Scalable database-backed sessions**
- ✅ **Improved error handling and logging**

### Deployment Enhancements
- ✅ **Updated deploy.json** with complete security specifications
- ✅ **New environment variable structure**
- ✅ **Production hardening checklist**
- ✅ **Comprehensive security documentation**

## 🔗 Support & Documentation

For additional support:
- Review `replit.md` for project history and preferences
- Check `deploy.json` for complete deployment specifications
- Verify security implementation in `server/security.ts`
- Test endpoints documented in API routes

---

**HandyTech Solutions v4.0.0** - Enterprise Security Edition  
Deployment Archive: `handytech-solutions-enterprise-security-v4.tar.gz`  
Release Date: September 11, 2025