# HandyTech Solutions - Complete Deployment Guide

## Overview
This guide will help you deploy your HandyTech Solutions website to a production server with SSL certificates, domain configuration, and all necessary services.

## Prerequisites
- A domain name (e.g., handytechsolutions.com)
- A VPS or cloud server (DigitalOcean, Linode, AWS EC2, etc.)
- SSH access to your server
- Basic command line knowledge

## Step 1: Server Setup

### 1.1 Choose Your Server
**Recommended Options:**
- **DigitalOcean Droplet**: $6/month for 1GB RAM, 1 vCPU
- **Linode**: $5/month for 1GB RAM, 1 vCPU  
- **AWS EC2**: t2.micro (free tier eligible)
- **Vultr**: $6/month for 1GB RAM

**Server Requirements:**
- Ubuntu 20.04 or 22.04 LTS
- Minimum 1GB RAM
- 25GB SSD storage
- 1 vCPU

### 1.2 Initial Server Configuration
```bash
# Connect to your server
ssh root@your-server-ip

# Update system packages
apt update && apt upgrade -y

# Create a new user (replace 'handytech' with your preferred username)
adduser handytech
usermod -aG sudo handytech

# Set up SSH key authentication (recommended)
mkdir -p /home/handytech/.ssh
cp ~/.ssh/authorized_keys /home/handytech/.ssh/
chown -R handytech:handytech /home/handytech/.ssh
chmod 700 /home/handytech/.ssh
chmod 600 /home/handytech/.ssh/authorized_keys

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

## Step 3: Domain Configuration

### 3.1 Point Your Domain to Server
In your domain registrar's DNS settings, create these records:
```
Type: A
Name: @
Value: your-server-ip
TTL: 300

Type: A  
Name: www
Value: your-server-ip
TTL: 300
```

### 3.2 Verify DNS Propagation
```bash
# Check if domain points to your server
nslookup your-domain.com
```

## Step 4: Deploy Your Application

### 4.1 Upload Your Code
```bash
# Create application directory
mkdir -p /home/handytech/handytech-solutions
cd /home/handytech/handytech-solutions

# Option 1: Upload using SCP
# From your local machine:
scp handytech-solutions-complete.tar.gz handytech@your-server-ip:/home/handytech/

# On server:
tar -xzf handytech-solutions-complete.tar.gz -C handytech-solutions --strip-components=1

# Option 2: Clone from Git (if you have a repository)
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

## Step 7: SSL Certificate Setup

### 7.1 Obtain SSL Certificate
```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts:
1. Enter your email address
2. Agree to terms of service
3. Choose whether to share email with EFF
4. Select option 2 (redirect HTTP to HTTPS)

### 7.2 Verify SSL Certificate
```bash
# Check certificate status
sudo certbot certificates

# Test automatic renewal
sudo certbot renew --dry-run
```

### 7.3 Set Up Automatic Renewal
```bash
# Add renewal cron job
sudo crontab -e

# Add this line to check for renewal twice daily:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Configure Firewall

### 8.1 Set Up UFW Firewall
```bash
# Enable UFW
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