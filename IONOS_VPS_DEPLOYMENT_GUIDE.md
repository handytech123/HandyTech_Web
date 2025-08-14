# HandyTech Solutions - Ionos VPS Deployment Guide

Complete step-by-step instructions for deploying your full-stack HandyTech Solutions platform on Ionos VPS with Ubuntu 22.04 LTS.

## Prerequisites

- Ionos VPS account
- Domain name (for professional appearance)
- Basic command line familiarity
- Environment secrets ready (OpenAI API key, email service credentials)

## Step 1: Create Ionos VPS

### 1.1 VPS Configuration
1. **Log into Ionos Control Panel**
2. **Navigate to VPS section**
3. **Create new VPS with these specs:**
   - **Operating System:** Ubuntu 22.04 LTS
   - **RAM:** Minimum 2GB (recommended 4GB for smooth operation)
   - **Storage:** Minimum 40GB SSD
   - **CPU:** 2 vCPUs minimum
   - **Location:** Choose closest to your target audience

### 1.2 Initial Setup
1. **Note your VPS IP address** (you'll need this)
2. **Set root password** or upload SSH key
3. **Wait for VPS provisioning** (usually 5-10 minutes)

## Step 2: Connect to Your VPS

### 2.1 SSH Connection
```bash
# Replace YOUR_VPS_IP with actual IP address
ssh root@YOUR_VPS_IP
```
Enter your password when prompted.

### 2.2 Update System
```bash
# Update package lists
apt update

# Upgrade installed packages
apt upgrade -y
```

## Step 3: Install Required Software

### 3.1 Install Node.js 18+
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.2 Install PostgreSQL
```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE handytech_db;"
sudo -u postgres psql -c "CREATE USER handytech_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE handytech_db TO handytech_user;"
sudo -u postgres psql -c "ALTER USER handytech_user CREATEDB;"
```

### 3.3 Install Nginx (Web Server)
```bash
# Install Nginx
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
```

### 3.4 Install PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2
```

### 3.5 Install Git
```bash
# Install Git
apt install -y git
```

## Step 4: Configure Firewall

```bash
# Install UFW firewall
apt install -y ufw

# Allow SSH (important - don't lock yourself out!)
ufw allow ssh

# Allow HTTP and HTTPS
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable
```

## Step 5: Deploy Your Application

### 5.1 Create Application Directory
```bash
# Create directory for your app
mkdir -p /var/www/handytech
cd /var/www/handytech
```

### 5.2 Prepare and Upload Your Code

**Step 1: Run VPS Deployment Fixes (in Replit)**
```bash
# In your Replit console
./vps-deployment-fixes.sh
```
This script:
- Installs PostgreSQL driver for VPS
- Updates database connection for standard PostgreSQL
- Builds the application for production
- Creates optimized deployment package

**Step 2: Upload Deployment Package**
```bash
# Download handytech-vps-deployment.tar.gz from Replit
# Upload using SCP to your VPS:
scp handytech-vps-deployment.tar.gz root@YOUR_VPS_IP:/var/www/handytech/
```

**Step 3: Extract on VPS**
```bash
cd /var/www/handytech
tar -xzf handytech-vps-deployment.tar.gz
```

### 5.3 Install Dependencies
```bash
# Install production dependencies only
npm install --production

# The application is already built and ready to run
```

### 5.4 Set Up Environment Variables
```bash
# Create environment file
nano .env
```

**Add these variables:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://handytech_user:your_secure_password@localhost:5432/handytech_db
OPENAI_API_KEY=your_openai_api_key
ADMIN_PASSWORD=your_admin_password
BREVO_API_KEY=your_brevo_api_key
# Add other environment variables as needed
```

### 5.5 Initialize Database
```bash
# Push database schema
npm run db:push
```

## Step 6: Configure Nginx

### 6.1 Create Nginx Configuration
```bash
# Create site configuration
nano /etc/nginx/sites-available/handytech
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
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

### 6.2 Enable Site
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/handytech /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 7: Set Up SSL Certificate (Free)

### 7.1 Install Certbot
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx
```

### 7.2 Get SSL Certificate
```bash
# Replace with your actual domain
certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7.3 Set Up Auto-Renewal
```bash
# Test renewal
certbot renew --dry-run

# Auto-renewal is already set up via systemd timer
```

## Step 8: Start Your Application

### 8.1 Start with PM2
```bash
cd /var/www/handytech

# Start application with PM2
pm2 start npm --name "handytech" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### 8.2 Verify Application
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs handytech

# Check if app is responding
curl http://localhost:3000
```

## Step 9: Configure Domain

### 9.1 Update DNS Records
In your domain registrar's control panel:
1. **Create A record:** `@` pointing to your VPS IP
2. **Create A record:** `www` pointing to your VPS IP
3. **Wait for DNS propagation** (can take up to 24 hours)

### 9.2 Test Your Website
Visit your domain in a browser. You should see your HandyTech Solutions website with all functionality working.

## Step 10: Post-Deployment Tasks

### 10.1 Test All Features
- **Main website:** Homepage, about page, services
- **Contact form:** Submit test contact form
- **Admin dashboard:** Login and test all management features
- **AI chatbot:** Test chat functionality
- **Email system:** Send test appointment reminders

### 10.2 Set Up Monitoring
```bash
# Check system resources
htop

# Monitor application logs
pm2 logs --lines 50

# Check Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 10.3 Create Backup Script
```bash
# Create backup script
nano /root/backup-handytech.sh
```

**Add backup script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump handytech_db > /root/backups/db_backup_$DATE.sql
tar -czf /root/backups/app_backup_$DATE.tar.gz /var/www/handytech
```

```bash
# Make executable
chmod +x /root/backup-handytech.sh

# Create backups directory
mkdir -p /root/backups

# Set up daily backup cron job
crontab -e
# Add: 0 2 * * * /root/backup-handytech.sh
```

## Troubleshooting

### Common Issues

**Application won't start:**
```bash
pm2 logs handytech
# Check for errors in logs
```

**Database connection issues:**
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test database connection
sudo -u postgres psql -d handytech_db
```

**Nginx not serving site:**
```bash
# Check Nginx status
systemctl status nginx

# Check configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log
```

**SSL certificate issues:**
```bash
# Renew certificate manually
certbot renew

# Check certificate status
certbot certificates
```

## Maintenance Commands

### Regular Updates
```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies
cd /var/www/handytech
npm update

# Restart application
pm2 restart handytech
```

### Performance Monitoring
```bash
# Check system resources
htop

# Check application performance
pm2 monit

# Check disk usage
df -h

# Check memory usage
free -h
```

## Security Best Practices

1. **Regular Updates:** Keep system and applications updated
2. **Strong Passwords:** Use complex passwords for all accounts
3. **Firewall:** Keep UFW enabled with minimal open ports
4. **SSL Certificates:** Keep certificates up to date
5. **Backup Strategy:** Regular automated backups
6. **Monitor Logs:** Regular log review for suspicious activity

## Support Resources

- **Ionos VPS Documentation:** [Ionos Help Center](https://www.ionos.com/help/)
- **Ubuntu Server Guide:** [Ubuntu Server Documentation](https://ubuntu.com/server/docs)
- **Node.js Documentation:** [Node.js Docs](https://nodejs.org/docs/)
- **PM2 Documentation:** [PM2 Process Manager](https://pm2.keymetrics.io/docs/)

---

**Your HandyTech Solutions platform is now live with full functionality on Ionos VPS!**

All features are operational:
✅ Complete business management dashboard
✅ Customer and appointment management  
✅ Automated email reminder system
✅ AI-powered customer service chatbot
✅ Contact form processing
✅ Professional Ohio State Buckeyes branding
✅ SSL security and global accessibility