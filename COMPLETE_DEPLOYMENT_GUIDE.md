# HandyTech Solutions - Complete Deployment Guide for Ionos VPS

## Overview
This guide will help you deploy your HandyTech Solutions website to your Ionos VPS with SSL certificates, domain configuration, and all necessary services.

## Prerequisites
- Your Ionos VPS (already set up)
- Domain name (if using Ionos domain or external domain)
- SSH access to your Ionos VPS
- Windows computer with Command Prompt
- Basic command line knowledge

## Step 1: Ionos VPS Setup

### 1.1 Access Your Ionos VPS
**Ionos VPS Specifications:**
- Your current VPS configuration from Ionos control panel
- Ubuntu 24.04 LTS
- SSH access via Ionos-provided credentials

### 1.2 Connect to Your Ionos VPS from Windows Command Prompt

**Important Windows Setup:**
Windows 10/11 includes OpenSSH client by default. If you're on an older version, you may need to enable it:

1. Open Command Prompt as Administrator
2. Run: `dism /online /enable-feature /featurename:openssh.client`

**Connect using Windows Command Prompt:**
```cmd
REM Open Command Prompt (cmd) and connect to your VPS
ssh root@209.46.125.246

REM Or if you have a custom user:
ssh your-username@209.46.125.246

REM If this is your first connection, you'll see a fingerprint warning - type 'yes'
REM Enter the password when prompted (get credentials from Ionos control panel)
```

**Alternative SSH Tools for Windows:**
- **PuTTY**: Download from putty.org if you prefer a GUI
- **Windows Terminal**: Modern terminal with better features
- **PowerShell**: Also has SSH built-in

### 1.3 Initial Ionos VPS Configuration
**Note:** Some Ionos VPS instances come pre-configured. Check what's already installed:

```bash
# Check current OS and installed software
lsb_release -a
node --version 2>/dev/null || echo "Node.js not installed"
nginx -v 2>/dev/null || echo "Nginx not installed"
psql --version 2>/dev/null || echo "PostgreSQL not installed"

# Update system packages
sudo apt update && sudo apt upgrade -y

# Create a new user for the application (if not already done)
sudo adduser handytech
sudo usermod -aG sudo handytech

# Set up SSH key authentication (recommended)
sudo mkdir -p /home/handytech/.ssh
sudo cp ~/.ssh/authorized_keys /home/handytech/.ssh/ 2>/dev/null || echo "No SSH keys to copy"
sudo chown -R handytech:handytech /home/handytech/.ssh
sudo chmod 700 /home/handytech/.ssh
sudo chmod 600 /home/handytech/.ssh/authorized_keys 2>/dev/null

# Switch to new user
su - handytech
```

## Step 2: Install Required Software

### 2.1 Install Node.js
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.2 Install PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE handytech_db;
CREATE USER handytech_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE handytech_db TO handytech_user;
\q
```

### 2.3 Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 2.5 Install Certbot (for SSL certificates)
```bash
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

## Step 3: Ionos Domain Configuration

### 3.1 Configure Domain in Ionos Control Panel

**If using an Ionos domain:**
1. Log into your Ionos control panel
2. Go to "Domains & SSL" → "Domains"
3. Select your domain → "DNS Settings"
4. Create/update these DNS records:
   ```
   Type: A
   Name: @
   Value: 209.46.125.246
   TTL: 300

   Type: A  
   Name: www
   Value: 209.46.125.246
   TTL: 300
   ```

**If using external domain:**
- Point your domain's nameservers to Ionos:
  - ns1.ionos.com
  - ns2.ionos.com
- Or update A records at your current registrar to point to your Ionos VPS IP (209.46.125.246)

### 3.2 Verify DNS Propagation
```bash
# Check if domain points to your server
nslookup handytech-solutions.com
dig handytech-solutions.com
```

## Step 4: Deploy Your Application

### 4.1 Upload Your Code from Windows

**On your VPS (via SSH):**
```bash
# Create application directory
mkdir -p /home/handytech/handytech-solutions
cd /home/handytech/handytech-solutions
```

**Option 1: Upload using SCP from Windows Command Prompt**
```cmd
REM From your Windows Command Prompt (NOT connected to VPS)
REM Navigate to where you have the handytech-solutions-complete.tar.gz file
cd C:\path\to\your\download\folder

REM Upload the file to your VPS
scp handytech-solutions-complete.tar.gz handytech@209.46.125.246:/home/handytech/

REM You'll be prompted for the password
```

**Back on your VPS (via SSH):**
```bash
# Extract the uploaded file
cd /home/handytech
tar -xzf handytech-solutions-complete.tar.gz -C handytech-solutions --strip-components=1

# Clean up the archive
rm handytech-solutions-complete.tar.gz
```

**Option 2: Alternative Windows File Transfer Tools**
- **WinSCP**: GUI tool for file transfer (winscp.net)
- **FileZilla**: Free FTP/SFTP client with GUI
- **Windows PowerShell**: Use `scp` command similar to cmd

**Option 3: Clone from Git (if you have a repository)**
```bash
# On your VPS
git clone https://github.com/yourusername/handytech-solutions.git .
```

### 4.2 Install Dependencies
```bash
cd /home/handytech/handytech-solutions
npm install
```

### 4.3 Set Up Environment Variables
```bash
# Create production environment file
nano .env.production
```

Add these variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://handytech_user:your_secure_password_here@localhost:5432/handytech_db
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
BREVO_API_KEY=your_brevo_api_key_here
SESSION_SECRET=your_very_long_random_session_secret_here
```

### 4.4 Build the Application
```bash
npm run build
```

### 4.5 Set Up Database
```bash
# Push database schema
npm run db:push
```

## Step 5: Configure Process Manager

### 5.1 Create PM2 Configuration
```bash
nano ecosystem.config.js
```

Update the file:
```javascript
module.exports = {
  apps: [{
    name: 'handytech-solutions',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

### 5.2 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 6: Configure Nginx as Reverse Proxy

### 6.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/handytech-solutions
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name handytech-solutions.com www.handytech-solutions.com;
    
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

### 6.2 Enable the Site
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/handytech-solutions /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 7: SSL Certificate Setup (Let's Encrypt Recommended)

### 7.1 Option A: Use Let's Encrypt SSL Certificate (Recommended)

**Simple Let's Encrypt SSL Setup:**

```bash
# Get SSL certificate from Let's Encrypt (one command does everything!)
sudo certbot --nginx -d handytech-solutions.com -d www.handytech-solutions.com
```

Follow the prompts:
1. Enter your email address
2. Agree to terms of service
3. Choose whether to share email with EFF
4. Select option 2 (redirect HTTP to HTTPS)

**That's it!** Certbot automatically:
- ✅ Gets your SSL certificate
- ✅ Updates your Nginx configuration
- ✅ Sets up HTTPS redirects
- ✅ Configures automatic renewal

### 7.2 Option B: Use Ionos SSL Certificate (If You Prefer)
```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d handytech-solutions.com -d www.handytech-solutions.com
```

Follow the prompts:
1. Enter your email address
2. Agree to terms of service
3. Choose whether to share email with EFF
4. Select option 2 (redirect HTTP to HTTPS)

### 7.3 Verify SSL Certificate
```bash
# Check certificate status
sudo certbot certificates

# Test automatic renewal (Let's Encrypt only)
sudo certbot renew --dry-run
```

### 7.4 Set Up Automatic Renewal (Let's Encrypt only)
```bash
# Add renewal cron job
sudo crontab -e

# Add this line to check for renewal twice daily:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Configure Firewall (Ionos Considerations)

### 8.1 Check Ionos Firewall Settings
**Important:** Ionos may have its own firewall rules in the control panel.

1. Check Ionos control panel → "Infrastructure" → "Firewall"
2. Ensure these ports are open:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 3000 (Application, can be restricted to localhost)

### 8.2 Set Up UFW Firewall on VPS
```bash
# Check if UFW is already configured
sudo ufw status

# If not active, configure it
sudo ufw enable

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## Step 9: Final Configuration

### 9.1 Configure Log Rotation
```bash
sudo nano /etc/logrotate.d/handytech-solutions
```

Add:
```
/home/handytech/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0640 handytech handytech
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 9.2 Set Up Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Set up basic monitoring
pm2 monitor
```

## Step 10: Testing and Verification

### 10.1 Test Your Website
1. Visit `https://your-domain.com`
2. Check that SSL certificate is valid (green lock icon)
3. Test all main features:
   - Navigation
   - Contact forms
   - Admin login
   - Customer portal
   - Chatbot functionality

### 10.2 Performance Testing
```bash
# Check server status
sudo systemctl status nginx
pm2 status

# Monitor logs
pm2 logs handytech-solutions

# Check database connection
sudo -u postgres psql -d handytech_db -c "SELECT version();"
```

## Step 11: Ongoing Maintenance

### 11.1 Regular Updates
```bash
# Update system packages monthly
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /home/handytech/handytech-solutions
npm audit fix
```

### 11.2 Backup Strategy
```bash
# Create backup script
nano /home/handytech/backup.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")

# Backup database
sudo -u postgres pg_dump handytech_db > "/home/handytech/backups/db_backup_$DATE.sql"

# Backup application files
tar -czf "/home/handytech/backups/app_backup_$DATE.tar.gz" /home/handytech/handytech-solutions

# Keep only last 7 days of backups
find /home/handytech/backups -type f -mtime +7 -delete
```

```bash
# Make executable and set up cron job
chmod +x /home/handytech/backup.sh
mkdir -p /home/handytech/backups

# Add to crontab for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /home/handytech/backup.sh
```

## Troubleshooting Common Issues

### Issue 1: Application Won't Start
```bash
# Check PM2 logs
pm2 logs handytech-solutions

# Check environment variables
pm2 env 0

# Restart application
pm2 restart handytech-solutions
```

### Issue 2: SSL Certificate Issues
```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Issue 3: Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -d handytech_db
```

### Issue 4: High Memory Usage
```bash
# Check memory usage
free -h
pm2 monit

# Restart if needed
pm2 restart handytech-solutions
```

## Security Best Practices

1. **Keep Software Updated**: Regularly update all packages and dependencies
2. **Use Strong Passwords**: For database and admin accounts
3. **Monitor Logs**: Regularly check application and server logs
4. **Backup Regularly**: Automate daily backups
5. **Use HTTPS Only**: Redirect all HTTP traffic to HTTPS
6. **Limit Login Attempts**: Implement rate limiting for admin login
7. **Monitor Server Resources**: Set up alerts for high CPU/memory usage

## Performance Optimization

1. **Enable Gzip Compression** in Nginx
2. **Set Up Caching** for static assets
3. **Optimize Images** before uploading
4. **Monitor Database Performance** with slow query logs
5. **Use CDN** for static assets if needed

## Support and Maintenance

### Regular Monitoring Commands
```bash
# Check application status
pm2 status

# Monitor real-time logs
pm2 logs --lines 100

# Check server resources
htop
df -h

# Check SSL certificate expiry
sudo certbot certificates
```

### Emergency Recovery
If your site goes down:
1. Check PM2 status: `pm2 status`
2. Check Nginx status: `sudo systemctl status nginx`
3. Check database: `sudo systemctl status postgresql`
4. Check logs: `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`
5. Restart services if needed:
   ```bash
   pm2 restart handytech-solutions
   sudo systemctl restart nginx
   sudo systemctl restart postgresql
   ```

## Cost Estimates

**Monthly Costs:**
- VPS Hosting: $5-10/month
- Domain Name: $10-15/year
- SSL Certificate: Free (Let's Encrypt)
- **Total**: ~$6-11/month

**One-time Setup:**
- Domain registration: $10-15
- Initial setup time: 2-4 hours

## Conclusion

Following this guide will give you a production-ready HandyTech Solutions website with:
- ✅ SSL certificate and HTTPS
- ✅ Professional domain setup
- ✅ Automatic backups
- ✅ Process monitoring
- ✅ Security hardening
- ✅ Performance optimization

Your website will be accessible at `https://your-domain.com` with professional hosting that can handle real business traffic.

For any issues during deployment, check the troubleshooting section or review the logs using the commands provided.

## Getting Your API Keys

### OpenAI API Key (for chatbot functionality):
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to "API Keys" in your dashboard
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

### Brevo API Key (for email automation):
1. Go to https://www.brevo.com/ and create an account
2. Once logged in, go to "SMTP & API" → "API Keys"
3. Click "Generate a new API key"
4. Give it a name like "HandyTech Website"
5. Copy the key (it will look like a long string)

**Note:** Brevo is free for up to 300 emails per day, perfect for your handyman business email automation and contact forms.

Both keys go in your `.env.production` file on your VPS during the deployment process.

## Windows-Specific Troubleshooting

### SSH Connection Issues from Windows
```cmd
REM If SSH connection fails, check:
ssh -v root@209.46.125.246

REM Common Windows SSH issues:
REM 1. SSH client not installed - run as admin:
dism /online /enable-feature /featurename:openssh.client

REM 2. Firewall blocking - temporarily disable Windows Firewall
REM 3. Wrong IP address - verify from Ionos control panel

REM Test basic connectivity:
ping 209.46.125.246
telnet 209.46.125.246 22
```

### File Transfer Issues from Windows
```cmd
REM If SCP fails from Windows Command Prompt:
REM 1. Check file path (use quotes for paths with spaces)
scp "C:\path with spaces\handytech-solutions-complete.tar.gz" handytech@209.46.125.246:/home/handytech/

REM 2. Use PowerShell instead of cmd
powershell
scp handytech-solutions-complete.tar.gz handytech@209.46.125.246:/home/handytech/

REM 3. Use WinSCP as alternative GUI tool
```

### Windows Terminal Tips
- **Windows Terminal**: Download from Microsoft Store for better experience
- **Copy/Paste**: Ctrl+Shift+C and Ctrl+Shift+V in terminals
- **Multiple Tabs**: Keep one tab for SSH connection, another for local commands
- **Path Separators**: Use forward slashes (/) for SSH commands, backslashes (\) for Windows paths