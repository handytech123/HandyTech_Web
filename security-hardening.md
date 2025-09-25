# HandyTech Solutions - Security Hardening Guide

## Critical Security Actions Required

### 1. Immediate Actions (After Deployment)

#### Rotate Database Credentials
```bash
# 1. Generate new strong password
NEW_DB_PASSWORD=$(openssl rand -base64 32)

# 2. Update PostgreSQL user password
sudo -u postgres psql -c "ALTER USER handy PASSWORD '$NEW_DB_PASSWORD';"

# 3. Update DATABASE_URL in environment
DATABASE_URL="postgresql://handy:$NEW_DB_PASSWORD@localhost:5432/handydb"

# 4. Restart application
pm2 restart handytech-api --update-env
```

#### Secure Environment Variables
```bash
# Generate strong secrets (32+ characters)
SESSION_SECRET=$(openssl rand -base64 48)
JWT_SECRET=$(openssl rand -base64 48)

# Update .env file with new secrets
echo "SESSION_SECRET=$SESSION_SECRET" >> .env
echo "JWT_SECRET=$JWT_SECRET" >> .env

# Secure .env file permissions
chmod 600 .env
chown www-data:www-data .env
```

### 2. CORS Security Lockdown

Update ALLOWED_ORIGINS to restrict access:

```bash
# Production domains only - NO wildcards
ALLOWED_ORIGINS=https://handytech-solutions.com,https://www.handytech-solutions.com
```

### 3. Email Security

#### For IONOS SMTP
```bash
# Use app-specific password instead of main password
SMTP_PASS=your-ionos-app-specific-password
```

#### For Gmail (if used)
```bash
# Use App Password (2FA required)
SMTP_PASS=your-gmail-app-password
```

### 4. Google Calendar Security

Ensure OAuth2 configuration is exact:

```bash
# Must match Google Cloud Console exactly
GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback

# Verify in Google Cloud Console:
# 1. Go to APIs & Services > Credentials
# 2. Edit OAuth 2.0 Client
# 3. Authorized redirect URIs must include exact URL above
```

### 5. Server Security Hardening

#### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Block direct access to Node.js port (behind nginx)
sudo ufw deny 5000
```

#### Nginx Security Headers
```nginx
# Add to nginx config
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

#### File Permissions
```bash
# Secure application files
chmod 750 /var/www/handytech
chown -R www-data:www-data /var/www/handytech

# Secure upload directory
chmod 755 /var/www/handytech/app/server/public/uploads
chown www-data:www-data /var/www/handytech/app/server/public/uploads
```

### 6. Database Security

#### PostgreSQL Configuration
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf

# Secure settings:
listen_addresses = 'localhost'
max_connections = 20
shared_preload_libraries = 'pg_stat_statements'
log_statement = 'all'
log_min_duration_statement = 1000
```

#### Database Access Control
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Secure local access only:
local   handydb     handy                                md5
host    handydb     handy     127.0.0.1/32              md5
```

### 7. Application Security Validation

Run security audit after deployment:

```bash
# Check for security vulnerabilities
npm audit --audit-level high

# Fix any issues
npm audit fix

# Update dependencies
npm update
```

### 8. Monitoring & Logging

#### Setup Log Monitoring
```bash
# Configure logrotate for PM2
sudo pm2 install pm2-logrotate

# Configure retention
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

#### Security Monitoring
```bash
# Monitor failed login attempts
sudo tail -f /var/log/auth.log | grep "authentication failure"

# Monitor application errors
pm2 logs handytech-api --err
```

### 9. SSL/TLS Security (with Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d handytech-solutions.com -d www.handytech-solutions.com

# Test renewal
sudo certbot renew --dry-run
```

### 10. Backup Security

#### Database Backups
```bash
# Create secure backup script
cat > /var/www/handytech/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/handytech"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U handy -h localhost handydb | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Secure permissions
chmod 600 $BACKUP_DIR/db_$DATE.sql.gz
EOF

# Make executable and secure
chmod 700 /var/www/handytech/backup.sh
chown root:root /var/www/handytech/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /var/www/handytech/backup.sh" | sudo crontab -
```

### 11. Regular Security Maintenance

#### Weekly Tasks
- Review application logs for suspicious activity
- Check for failed authentication attempts
- Monitor disk space and performance
- Verify backups are working

#### Monthly Tasks
- Update Node.js dependencies (`npm audit && npm update`)
- Review and rotate API keys if needed
- Check SSL certificate expiration
- Update system packages (`sudo apt update && sudo apt upgrade`)

#### Security Incident Response
1. If suspicious activity detected:
   - Immediately change all passwords and API keys
   - Review logs for breach indicators
   - Consider temporary service shutdown if needed
2. Document all security incidents
3. Update security measures based on findings

### 12. Environment Validation Script

```bash
# Create security validation script
cat > /var/www/handytech/security-check.sh << 'EOF'
#!/bin/bash
echo "🔒 HandyTech Security Check"
echo "=========================="

# Check environment variable lengths
check_env_length() {
    local var_name=$1
    local min_length=$2
    local value=$(printenv $var_name)
    
    if [ -z "$value" ]; then
        echo "❌ $var_name: Not set"
    elif [ ${#value} -lt $min_length ]; then
        echo "⚠️  $var_name: Too short (${#value} chars, need $min_length+)"
    else
        echo "✅ $var_name: OK (${#value} chars)"
    fi
}

check_env_length "SESSION_SECRET" 32
check_env_length "JWT_SECRET" 32
check_env_length "ADMIN_PASSWORD" 12
check_env_length "SMTP_PASS" 8

# Check file permissions
echo ""
echo "📁 File Permissions:"
ls -la /var/www/handytech/.env 2>/dev/null || echo "❌ .env file not found"

# Check database connection
echo ""
echo "🗄️  Database:"
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL: Running"
else
    echo "❌ PostgreSQL: Not responding"
fi

echo ""
echo "Security check complete."
EOF

chmod +x /var/www/handytech/security-check.sh
```

## Security Compliance Checklist

- [ ] Database credentials rotated from defaults
- [ ] Strong SESSION_SECRET and JWT_SECRET (32+ chars)
- [ ] CORS origins restricted to production domains
- [ ] Email using app-specific passwords
- [ ] Google OAuth redirect URI exactly configured
- [ ] Firewall configured (ports 80, 443 only)
- [ ] SSL/TLS certificates installed
- [ ] File permissions secured (600 for .env, 750 for app)
- [ ] Database access restricted to localhost
- [ ] Automated backups configured
- [ ] Log rotation enabled
- [ ] Security monitoring in place
- [ ] Regular maintenance schedule established