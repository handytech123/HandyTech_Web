# HandyTech Solutions - Deployment Validation Guide

## Quick Deployment Validation

### 1. Run Automated Smoke Tests

```bash
# Make executable and run
chmod +x smoke-tests.sh
./smoke-tests.sh
```

### 2. Manual API Testing

```bash
# Health checks
curl -s http://127.0.0.1:5000/health
curl -s http://127.0.0.1:5000/api/health | jq .

# New availability endpoints (fixed in deployment)
curl -s http://127.0.0.1:5000/api/availability/rules | jq .
curl -s http://127.0.0.1:5000/api/availability/rules/active | jq .

# Test availability with proper parameters
FROM=$(date -u +"%Y-%m-%dT00:00:00Z")
TO=$(date -u -d "+7 days" +"%Y-%m-%dT23:59:59Z")

# Using hours parameter (works without serviceId)
curl -s "http://127.0.0.1:5000/api/availability?from=$FROM&to=$TO&hours=2&timezone=America/New_York" | jq .
```

### 3. Environment Validation

The application performs comprehensive environment validation on startup. Check the console output for:

- ✅ Database connection verified
- ✅ All required environment variables set
- ✅ Email configuration validated
- ✅ Google Calendar OAuth configured

### 4. Database Migration

```bash
# Ensure database schema is up to date
npm run db:push
```

### 5. Production Checklist

#### Required Environment Variables
```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://handy:password@localhost:5432/handydb

# Security (REQUIRED)
SESSION_SECRET=your-session-secret-minimum-32-characters-long
JWT_SECRET=your-jwt-secret-minimum-32-characters-long

# Admin Access (REQUIRED)
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password

# Email (REQUIRED)
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_PORT=587
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password

# Google Calendar (REQUIRED)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback
```

#### Security Follow-ups
1. **Rotate Database Password** - Change from any test passwords
2. **Strong SMTP Credentials** - Use app-specific passwords where possible
3. **Secure Google OAuth** - Verify redirect URI matches exactly
4. **CORS Origins** - Set ALLOWED_ORIGINS for production domains only

### 6. PM2 Management

```bash
# Start application
npm run build
pm2 start ecosystem.config.js

# Restart with new environment
pm2 restart handytech-api --update-env

# Check status
pm2 status
pm2 logs handytech-api
```

### 7. Common Issues & Solutions

#### Issue: /api/availability/rules returns HTML instead of JSON
**Solution**: Route ordering fixed - API routes now properly mounted before static files.

#### Issue: Database connection fails
**Solution**: 
1. Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
2. Ensure PostgreSQL is running
3. Check firewall/network access

#### Issue: Health checks fail
**Solution**:
1. Verify application is running on port 5000
2. Check for port conflicts
3. Review application logs for startup errors

#### Issue: CORS errors in browser
**Solution**: Set ALLOWED_ORIGINS environment variable with your domain(s)

### 8. Monitoring Endpoints

- **Health**: `GET /health` - Simple "OK" response
- **API Health**: `GET /api/health` - Detailed JSON with uptime
- **Availability Rules**: `GET /api/availability/rules` - All rules
- **Active Rules**: `GET /api/availability/rules/active` - Active rules only

### 9. Security Validation

The application includes comprehensive security measures:

- ✅ CSRF Protection on all forms
- ✅ Rate limiting on all endpoints
- ✅ Input sanitization middleware
- ✅ Security headers (Helmet)
- ✅ PostgreSQL session storage
- ✅ httpOnly secure cookies

### 10. Performance Verification

Check these performance aspects:
- Database query efficiency
- Static file caching headers
- Image optimization for uploads
- Session cleanup processes