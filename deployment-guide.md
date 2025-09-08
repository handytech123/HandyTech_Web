# HandyTech Solutions - Production Deployment Guide

## 🚀 Manual Deployment Instructions

Since direct SSH from this environment has limitations, here's your complete manual deployment guide:

## Prerequisites on Your VPS (74.2.8.149.78)

### 1. Server Setup Script
Upload and run the `server-setup.sh` script on your server:

```bash
# On your VPS as root
chmod +x server-setup.sh
./server-setup.sh
```

This will install:
- Node.js 20
- PM2 (Process Manager)
- Nginx (Web Server)
- PostgreSQL (Database)

### 2. Download and Extract Application

Transfer the `handytech-deployment.tar.gz` file to your VPS and extract:

```bash
# On your VPS
cd /var/www/handytech-solutions
# Upload the handytech-deployment.tar.gz file here
tar -xzf handytech-deployment.tar.gz
```

### 3. Install Dependencies

```bash
cd /var/www/handytech-solutions
npm install --production
```

### 4. Database Setup

```bash
# Set up PostgreSQL database
sudo -u postgres createdb handytech_solutions
sudo -u postgres psql -c "CREATE USER handytech WITH PASSWORD 'HandyTech2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE handytech_solutions TO handytech;"
```

### 5. Environment Variables

Create `/var/www/handytech-solutions/.env.production`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://handytech:HandyTech2024!@localhost:5432/handytech_solutions
OPENAI_API_KEY=your_openai_api_key_here
SESSION_SECRET=your_secure_random_session_secret_here
```

### 6. Database Migration

```bash
cd /var/www/handytech-solutions
npm run db:push
```

### 7. Start Application with PM2

```bash
cd /var/www/handytech-solutions
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 8. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx-config.conf /etc/nginx/sites-available/handytech-solutions
sudo ln -s /etc/nginx/sites-available/handytech-solutions /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9. SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d handytech-solutions.com -d www.handytech-solutions.com
```

### 10. Firewall Configuration

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Testing Deployment

1. Visit http://74.2.8.149.78 to test
2. Visit http://handytech-solutions.com (after DNS setup)
3. Test all features:
   - Contact forms
   - AI Chatbot
   - Admin portal (/admin with handytech/Savannah2)
   - Appointment scheduling

## Monitoring

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs handytech-solutions

# Restart if needed
pm2 restart handytech-solutions
```

## 🎯 Quick Commands Reference

```bash
# Application management
pm2 status                    # Check app status  
pm2 logs handytech-solutions # View logs
pm2 restart handytech-solutions # Restart app

# Nginx management
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload nginx
sudo systemctl status nginx   # Check status

# Database management
sudo -u postgres psql handytech_solutions # Connect to DB
```

Your HandyTech Solutions website will be live and fully functional once these steps are completed!