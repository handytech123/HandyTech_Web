# HandyTech Solutions v5.0.0 - Complete Deployment Guide

## Overview

HandyTech Solutions v5.0.0 is a comprehensive professional handyman services platform featuring enterprise-grade security, automated email notifications, AI-powered customer service, and complete business management capabilities.

## 🚀 New Features in v5.0.0

### **Professional Email Notification System**
- **IONOS SMTP Integration** - Optimized for IONOS hosting with `contact@handytech-solutions.com`
- **Automated Admin Notifications** - Instant email alerts for all new appointments
- **Professional Email Templates** - Branded HTML emails with HandyTech Solutions styling
- **Calendar Integration** - ICS attachments for easy appointment management
- **Automated Reminder System** - 24-hour and 2-hour appointment reminders
- **Customer Confirmations** - Professional appointment confirmations with reschedule links

### **Enterprise Security System**
- **Cookie-Based Authentication** - Secure httpOnly session management
- **CSRF Protection** - Complete protection for all admin operations
- **PostgreSQL Session Storage** - Scalable session management with connect-pg-simple
- **Security Headers** - Comprehensive security via Helmet middleware
- **Rate Limiting** - Multi-tier protection (public, sensitive, auth)
- **Production Hardening** - Strict security policies for production deployment

## 📧 Email System Configuration

### **Primary Email System (IONOS SMTP)**

The application uses a dual email system with IONOS SMTP as the primary service:

```javascript
// Primary SMTP Configuration
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_PORT=587
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
```

### **Email Features**

1. **Admin Notifications**
   - Instant email alerts to `contact@handytech-solutions.com` for all new appointments
   - Detailed appointment information including customer details and service type
   - Professional HTML formatting with business branding

2. **Customer Communications**
   - Appointment confirmation emails with calendar attachments (ICS files)
   - Branded email templates with Ohio State Buckeyes colors (#BB0000)
   - Professional business information and contact details
   - Reschedule links for customer self-service

3. **Automated Reminder System**
   - 24-hour appointment reminders
   - 2-hour pre-appointment notifications
   - Follow-up emails for completed services
   - Runs automatically every 15 minutes

4. **Email Security**
   - TLS encryption for all SMTP communications
   - Secure authentication with IONOS email accounts
   - Error handling with fallback mechanisms

## 🔧 Required Environment Variables

### **Critical Production Variables**
```bash
# Database & Security (REQUIRED)
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your-strong-random-session-secret-at-least-32-characters-long
ADMIN_PASS=SecureAdminPassword123!

# Email System (REQUIRED for notifications)
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
SMTP_PORT=587

# Production Security
ALLOWED_ORIGINS=https://handytech-solutions.com,https://www.handytech-solutions.com
NODE_ENV=production
```

### **Optional Enhancement Variables**
```bash
# AI Integration
OPENAI_API_KEY=sk-proj-... # For intelligent chatbot

# Business Information
BUSINESS_NAME=HandyTech Solutions
BUSINESS_PHONE=(314) 325-4575
PUBLIC_BASE_URL=https://handytech-solutions.com
FROM_EMAIL=contact@handytech-solutions.com

# Alternative Email Services
BREVO_API_KEY=xkeysib-... # For advanced email marketing

# Legacy/Fallback
JWT_SECRET=your-jwt-secret-for-legacy-operations
```

## 🏗️ Architecture Overview

### **Frontend Architecture**
- **React 18** with TypeScript and Vite
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Shadcn/ui** components with Ohio State Buckeyes branding
- **Tailwind CSS** with custom theming

### **Backend Architecture**
- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Session-based authentication** with cookie security
- **Dual email system** (SMTP + Brevo)
- **OpenAI integration** for intelligent chatbot
- **Automated scheduling** with conflict detection

### **Database Schema**
- **Users**: Admin authentication
- **Customers**: Customer relationship management
- **Appointments**: Scheduling with timezone support
- **Services**: Dynamic service management
- **Reviews**: Customer feedback system
- **Quotes**: Lead management
- **Availability Rules**: Business hours configuration
- **Blocked Times**: Holiday and closure management

## 📦 Deployment Steps

### **1. Environment Setup**
```bash
# Clone and setup
git clone <repository>
cd handytech-solutions
npm install

# Configure environment variables
cp .env.example .env
# Add all required variables listed above
```

### **2. Database Setup**
```bash
# Setup PostgreSQL database
# Create database and get connection string

# Push database schema
npm run db:push
```

### **3. Email Configuration**

For IONOS hosting:
1. **Setup Email Account**: Create `contact@handytech-solutions.com` in IONOS
2. **Configure SMTP**: Use `smtp.ionos.com:587` with TLS
3. **Test Email**: Verify email sending before production

For other providers:
- **Gmail**: Use `smtp.gmail.com:587` with app-specific password
- **Outlook**: Use `smtp-mail.outlook.com:587` with app password

### **4. Security Configuration**
```bash
# Generate secure session secret (32+ characters)
openssl rand -base64 32

# Set strong admin password
# Configure CORS for production domains
```

### **5. Production Build**
```bash
# Build application
npm run build

# Start production server
npm start
```

## 🔐 Security Features

### **Authentication System**
- Cookie-based admin authentication with httpOnly cookies
- Secure session management with PostgreSQL storage
- CSRF token protection for all admin operations
- Automatic session expiration (8 hours)

### **Security Headers**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options protection
- X-Content-Type-Options
- Referrer Policy configuration

### **Rate Limiting**
- **Public API**: 300 requests per 15 minutes
- **Sensitive Operations**: 60 requests per 15 minutes
- **Authentication**: 10 attempts per 15 minutes

## 🎯 Business Features

### **Admin Dashboard** (`/admin`)
- Complete appointment management (CRUD operations)
- Customer relationship management
- Service and pricing configuration
- Availability rules and blocked times
- Review approval system
- Live chat administration
- Email campaign management
- System health monitoring

### **Customer Portal** (`/customer-portal`)
- Appointment booking with duration selection (2h/4h/6h)
- Self-service appointment rescheduling
- Quote request submission
- Review and testimonial submission
- Service browsing and information

### **AI-Powered Features**
- Intelligent customer service chatbot with OpenAI integration
- Automatic customer record creation from chat interactions
- Context-aware appointment assistance
- Fallback responses when AI is unavailable

### **Email Automation**
- Automatic appointment confirmations
- Admin notifications for new bookings
- Automated reminder campaigns
- Follow-up emails for service feedback
- Professional branded templates

## 📊 Monitoring & Health Checks

### **Health Check Endpoint**
```
GET /api/health
```
Returns:
- Database connectivity status
- Session configuration health
- CSRF functionality
- Security headers verification

### **Log Monitoring**
- Email service initialization logs
- SMTP connection status
- Appointment creation tracking
- Security event logging
- Error tracking and reporting

## 🚀 Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connected and migrated
- [ ] Email system tested (IONOS SMTP)
- [ ] Admin account created and tested
- [ ] CSRF protection verified
- [ ] CORS origins configured
- [ ] SSL certificate installed
- [ ] Health checks passing
- [ ] Security headers active
- [ ] Rate limiting functional
- [ ] Backup strategy implemented

## 🛠️ Troubleshooting

### **Email Issues**
1. **SMTP Connection Failed**
   - Verify IONOS email account is active
   - Check SMTP credentials and port (587)
   - Ensure firewall allows SMTP traffic

2. **Admin Notifications Not Received**
   - Verify `ADMIN_EMAIL` is set correctly
   - Check spam/junk folders
   - Review email service logs

3. **Customer Emails Not Sending**
   - Check email format validation
   - Verify SMTP authentication
   - Review nodemailer error logs

### **Security Issues**
1. **CSRF Token Errors**
   - Verify session configuration
   - Check cookie settings
   - Ensure HTTPS in production

2. **Authentication Failures**
   - Verify `ADMIN_PASS` environment variable
   - Check session storage connectivity
   - Review cookie security settings

## 📞 Support & Contact

**Business Information:**
- **Business Name**: HandyTech Solutions
- **Phone**: (314) 325-4575
- **Email**: contact@handytech-solutions.com
- **Location**: Missouri, USA

**Technical Support:**
- Check application logs for detailed error information
- Use health check endpoint for system status
- Review email service logs for delivery issues
- Contact system administrator for database issues

---

**HandyTech Solutions v5.0.0** - Professional handyman services platform with enterprise security and automated communications.