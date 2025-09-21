# IONOS VPS Setup Guide - HandyTech Solutions

## Overview

This guide provides step-by-step instructions for deploying HandyTech Solutions on IONOS VPS infrastructure. It covers everything from server creation to production deployment.

## Prerequisites

- IONOS customer account with VPS service access
- Domain name (recommended: handytech-solutions.com)
- Email service setup (IONOS email hosting recommended)
- Basic familiarity with SSH and command line

## Part 1: IONOS VPS Server Setup

### Step 1: Create VPS Server

1. **Log into IONOS Control Panel**
   - Navigate to [ionos.com](https://www.ionos.com)
   - Sign in to your customer account

2. **Create New VPS**
   - Go to **Servers & Cloud** → **VPS**
   - Click **"Order VPS"**

3. **Server Configuration**
   ```
   Recommended Specifications:
   • Operating System: Ubuntu 22.04 LTS
   • vCPU: 2 cores (minimum)
   • RAM: 4 GB (minimum, 8 GB recommended)
   • Storage: 40 GB SSD (minimum)
   • Traffic: Unlimited
   • Location: Choose closest to your customers
   ```

4. **Security Configuration**
   - Choose **SSH Key authentication** (recommended)
   - Generate new SSH key pair if needed
   - Set strong root password as backup

5. **Order and Wait for Provisioning**
   - Complete order and wait for server provisioning (usually 5-15 minutes)
   - Note down server IP address from control panel

### Step 2: Initial Server Access

1. **Connect via SSH**
   ```bash
   ssh root@your-server-ip
   ```

2. **Update System**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install Basic Tools**
   ```bash
   apt install -y curl wget unzip git nano htop
   ```

## Part 2: Database Setup Options

### Option A: IONOS Managed Database (Recommended)

1. **Create Database Service**
   - In IONOS Control Panel: **Databases** → **Create Database**
   - Choose **PostgreSQL 15**
   - Select appropriate performance tier
   - Note connection details

2. **Database Configuration**
   ```
   Database Type: PostgreSQL
   Version: 15+
   Performance: Depends on expected load
   Backup: Automatic daily backups
   ```

3. **Get Connection String**
   ```
   Format: postgresql://username:password@hostname:port/database
   Example: postgresql://handytech:secret123@db.ionos.com:5432/handytech_prod
   ```

### Option B: Self-Hosted Database

- Our deployment scripts support automatic PostgreSQL installation
- Suitable for smaller deployments or cost optimization
- Requires manual backup configuration

## Part 3: Email Service Setup

### IONOS Email Hosting (Recommended)

1. **Set up Domain Email**
   - In IONOS Control Panel: **Email & Office** → **Email Hosting**
   - Create email accounts:
     - `contact@handytech-solutions.com` (primary)
     - `service@handytech-solutions.com` (system emails)

2. **SMTP Configuration**
   ```
   SMTP Host: smtp.ionos.com
   SMTP Port: 587 (STARTTLS) or 465 (SSL)
   Username: contact@handytech-solutions.com
   Password: Your email password
   Encryption: STARTTLS or SSL/TLS
   ```

## Part 4: Google Calendar Integration Setup

### Step 1: Google Cloud Console Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project: "HandyTech Solutions"

2. **Enable Calendar API**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Calendar API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Web Application**
   - Set authorized redirect URI: `https://handytech-solutions.com/api/admin/google/callback`

4. **Note Credentials**
   ```
   Client ID: 123456789-abc123def456.apps.googleusercontent.com
   Client Secret: GOCSPX-abc123def456789012345
   ```

## Part 5: Domain and SSL Setup

### Step 1: Domain Configuration

1. **Point Domain to Server**
   - In IONOS Control Panel: **Domains & SSL**
   - Update A record to point to your VPS IP
   - Add CNAME record for www subdomain

2. **DNS Configuration**
   ```
   A Record:    handytech-solutions.com    → Your VPS IP
   CNAME:       www                        → handytech-solutions.com
   ```

### Step 2: SSL Certificate

1. **Install Certbot** (done automatically by our scripts)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Generate Certificate**
   ```bash
   sudo certbot --nginx -d handytech-solutions.com -d www.handytech-solutions.com
   ```

## Part 6: Application Deployment

### Step 1: Upload Deployment Kit

1. **Download Deployment Package**
   - Extract `ionos-deployment.tar.gz` to your computer

2. **Upload to Server**
   ```bash
   scp -r ionos-deployment/ root@your-server-ip:/opt/
   ```

### Step 2: Run Deployment Scripts

1. **Set Permissions**
   ```bash
   cd /opt/ionos-deployment
   chmod +x scripts/*.sh
   ```

2. **Bootstrap System**
   ```bash
   ./scripts/00-bootstrap.sh
   ```
   - Installs Node.js 20, creates user, sets up directories

3. **Setup Database**
   ```bash
   ./scripts/01-db-setup.sh
   ```
   - Choose managed or local PostgreSQL
   - Configure database connection

4. **Configure Environment**
   ```bash
   cp config/.env.example /opt/handytech/.env
   nano /opt/handytech/.env
   ```
   
   **Fill in your values:**
   ```env
   DATABASE_URL=postgresql://username:password@hostname:port/database
   SESSION_SECRET=your-32-character-secret-key
   ADMIN_PASSWORD=your-admin-password
   ADMIN_EMAIL=contact@handytech-solutions.com
   SMTP_HOST=smtp.ionos.com
   SMTP_USER=contact@handytech-solutions.com
   SMTP_PASS=your-email-password
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback
   PUBLIC_BASE_URL=https://handytech-solutions.com
   ```

5. **Validate Configuration**
   ```bash
   ./scripts/validate-secrets.sh
   ```

6. **Deploy Application**
   ```bash
   ./scripts/02-deploy.sh
   ```
   - Choose deployment source (upload, git, or archive)
   - Builds and starts the application

7. **Final Validation**
   ```bash
   ./scripts/99-validate.sh
   ```

## Part 7: Production Configuration

### Step 1: Reverse Proxy Setup (Nginx)

1. **Install Nginx**
   ```bash
   sudo apt install nginx
   ```

2. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/handytech
   ```
   
   ```nginx
   server {
       listen 80;
       server_name handytech-solutions.com www.handytech-solutions.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name handytech-solutions.com www.handytech-solutions.com;

       ssl_certificate /etc/letsencrypt/live/handytech-solutions.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/handytech-solutions.com/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/handytech /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Step 2: Firewall Configuration

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable
```

### Step 3: Auto-SSL Renewal

```bash
sudo crontab -e
# Add line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Part 8: Monitoring and Maintenance

### Service Management

```bash
# Service control
sudo ./scripts/service-control.sh start|stop|restart|status|logs

# Health checks
sudo ./scripts/99-validate.sh

# View logs
sudo journalctl -u handytech -f
```

### Backup Configuration

1. **Database Backups** (if using local PostgreSQL)
   - Automatic daily backups at 2 AM
   - 30-day retention policy
   - Location: `/opt/handytech/backups/`

2. **Application Backups**
   ```bash
   # Create backup script
   sudo nano /usr/local/bin/handytech-backup
   ```

### Updates and Maintenance

1. **Application Updates**
   ```bash
   cd /opt/ionos-deployment
   ./scripts/02-deploy.sh  # Redeploy with new code
   ```

2. **System Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo reboot  # If kernel updates
   ```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   sudo journalctl -u handytech -n 50
   sudo systemctl status handytech
   ```

2. **Database Connection Failed**
   ```bash
   # Test connection manually
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

3. **Email Not Working**
   - Verify SMTP credentials in IONOS email settings
   - Check firewall allows outbound SMTP ports
   - Test with telnet: `telnet smtp.ionos.com 587`

4. **SSL Certificate Issues**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

### Log Locations

- Application logs: `journalctl -u handytech`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- Database logs: `/var/log/postgresql/` (if local)

## Security Best Practices

1. **Regular Updates**
   - Keep system packages updated
   - Monitor security advisories
   - Update application dependencies

2. **Access Control**
   - Use SSH keys instead of passwords
   - Disable root SSH login after setup
   - Implement fail2ban for intrusion prevention

3. **Monitoring**
   - Set up log monitoring
   - Monitor disk space and memory usage
   - Configure alerts for service failures

4. **Backup Strategy**
   - Regular database backups
   - Test backup restoration procedures
   - Store backups in separate location

## Support

For technical issues:
1. Check application logs: `journalctl -u handytech -f`
2. Run validation: `./scripts/99-validate.sh`
3. Check service status: `systemctl status handytech`
4. Review environment: `./scripts/validate-secrets.sh`

## Success Criteria

Your deployment is successful when:
- ✅ All validation checks pass
- ✅ Application accessible via HTTPS
- ✅ Admin portal working
- ✅ Customer portal working
- ✅ Email notifications sending
- ✅ Database operations working
- ✅ Google Calendar integration functional