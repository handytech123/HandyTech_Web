# HandyTech Solutions - IONOS Deployment Instructions

## Overview
HandyTech Solutions is a professional handyman services platform with Google Calendar integration, customer management, appointment scheduling, and automated email marketing. This guide provides complete deployment instructions for IONOS hosting.

## Version Information
- **Version**: 6.0.0-production
- **Architecture**: Full-stack Node.js with React frontend
- **Database**: PostgreSQL required
- **Platform**: IONOS hosting optimized

## Prerequisites

### IONOS Hosting Requirements
- Node.js hosting plan (18.x or 20.x)
- PostgreSQL database access
- Domain with SSL certificate
- Email hosting for SMTP configuration

### Google Cloud Console Setup
1. Create Google Cloud Console project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Configure authorized redirect URIs

## Environment Variables Setup

### Required Environment Variables

Copy the following template and configure with your values:

```bash
# Database Configuration (Required)
DATABASE_URL=postgresql://username:password@hostname:port/database_name

# Security Configuration (Required)
SESSION_SECRET=your-secure-session-encryption-key-32-chars-minimum
ADMIN_PASS=SecureAdminPassword123!

# Production CORS Security (Required)
ALLOWED_ORIGINS=https://handytech-solutions.com,https://www.handytech-solutions.com

# Google Calendar Integration (Required)
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456789012345
GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback

# Email Configuration (Required)
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
```

### Optional Environment Variables

```bash
# Google Calendar Specific
GOOGLE_CALENDAR_ID=contact@handytech-solutions.com
TZ=America/Chicago

# Email Configuration
SMTP_PORT=587
FROM_EMAIL=service@handytech-solutions.com

# Business Information
BUSINESS_NAME=HandyTech Solutions
BUSINESS_PHONE=(314) 325-4575
PUBLIC_BASE_URL=https://handytech-solutions.com

# AI Integration (Optional)
OPENAI_API_KEY=sk-proj-your-openai-key

# Advanced Email Marketing (Optional)
BREVO_API_KEY=xkeysib-your-brevo-key

# Legacy/Fallback
JWT_SECRET=your-strong-random-jwt-secret-at-least-32-characters-long
ADMIN_USERNAME=admin
JWT_EXPIRES_IN=24h

# System Configuration
NODE_ENV=production
PORT=5000
```

## Google Calendar Setup

### Step 1: Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure authorized redirect URIs:
   ```
   https://handytech-solutions.com/api/admin/google/callback
   https://www.handytech-solutions.com/api/admin/google/callback
   ```
5. Copy Client ID and Client Secret to environment variables

### Step 3: OAuth Authorization (One-time setup)
1. Deploy application with Google credentials
2. Access admin panel at `/admin`
3. Navigate to Google Calendar section
4. Click "Connect to Google Calendar"
5. Complete OAuth flow to authorize calendar access

## Deployment Steps

### Step 1: Database Setup
1. Create PostgreSQL database in IONOS control panel
2. Note connection details (host, port, database name, username, password)
3. Construct DATABASE_URL: `postgresql://username:password@hostname:port/database`

### Step 2: File Upload
1. Extract deployment archive to IONOS hosting directory
2. Upload all files maintaining directory structure
3. Ensure proper file permissions

### Step 3: Environment Configuration
1. Create `.env` file in root directory
2. Configure all required environment variables
3. Test configuration with health check endpoint

### Step 4: Database Migration
1. SSH into IONOS server or use file manager
2. Run database migration:
   ```bash
   npm install
   npm run db:push
   ```

### Step 5: Application Start
1. Install dependencies: `npm install`
2. Build application: `npm run build`
3. Start application: `npm start`
4. Verify running on port 5000

## Post-Deployment Configuration

### Email Testing
1. Test SMTP configuration in admin panel
2. Send test appointment confirmation
3. Verify magic link authentication emails

### Google Calendar Testing
1. Create test appointment in admin panel
2. Verify appointment appears in Google Calendar
3. Test appointment modifications and deletions

### Security Verification
1. Verify HTTPS is enabled
2. Test CORS policy with allowed origins
3. Confirm session security is working
4. Validate CSRF protection on admin operations

## Monitoring and Health Checks

### Health Check Endpoint
- URL: `https://handytech-solutions.com/api/health`
- Checks: Database connection, session configuration, security headers

### Application Monitoring
- Monitor appointment creation/modification
- Track email delivery success rates
- Watch for Google Calendar API quota limits
- Monitor session storage performance

## Troubleshooting

### Common Issues

**Google Calendar Not Syncing**
- Verify OAuth credentials in Google Cloud Console
- Check redirect URI configuration
- Confirm Calendar API is enabled
- Re-authorize if tokens expired

**Email Not Sending**
- Verify SMTP credentials
- Check IONOS email hosting configuration
- Test with different SMTP ports (587/465)
- Confirm sender email is authorized

**Database Connection Issues**
- Verify DATABASE_URL format
- Check PostgreSQL service status
- Confirm firewall settings
- Test connection with database client

**Session/Authentication Problems**
- Verify SESSION_SECRET is set and >= 32 characters
- Check PostgreSQL session table
- Confirm cookie security settings
- Test with incognito/private browsing

### Support Resources
- IONOS Support: https://www.ionos.com/help/
- Google Calendar API Documentation: https://developers.google.com/calendar/api
- Application Documentation: See included MD files

## Security Notes

### Production Security Checklist
- ✅ Strong SESSION_SECRET (32+ characters)
- ✅ HTTPS enabled with valid SSL certificate
- ✅ CORS configured with specific domains (no wildcards)
- ✅ Admin password meets complexity requirements
- ✅ Database credentials secured
- ✅ Google OAuth credentials secured
- ✅ Email credentials secured

### Ongoing Security Maintenance
- Regularly rotate SESSION_SECRET
- Monitor for failed login attempts
- Keep dependencies updated
- Review access logs periodically
- Backup database regularly

---

**For technical support, contact the HandyTech Solutions development team.**