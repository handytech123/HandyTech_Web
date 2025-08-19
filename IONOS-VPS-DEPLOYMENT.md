# HandyTech Solutions - Ionos VPS Deployment Guide

## Prerequisites

- Fresh Ionos VPS with Ubuntu 24.04 LTS
- Root access to your VPS
- Brevo API key (from https://www.brevo.com)
- OpenAI API key (from https://platform.openai.com) - optional
- Deployment package: `handytech-complete-deployment.tar.gz`

## Step 1: Prepare Your VPS

### 1.1 Connect to your VPS
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Update system packages
```bash
apt update && apt upgrade -y
```

### 1.3 Install required system packages
```bash
apt install -y nodejs npm nginx postgresql postgresql-contrib ufw
```

### 1.4 Install PM2 process manager
```bash
npm install -g pm2
```

## Step 2: Configure PostgreSQL Database

### 2.1 Create database and user
```bash
sudo -u postgres psql
```

In PostgreSQL console:
```sql
CREATE DATABASE handytech_db;
CREATE USER handytech_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE handytech_db TO handytech_user;
ALTER USER handytech_user CREATEDB;
\q
```

### 2.2 Configure PostgreSQL for local connections
```bash
# Edit PostgreSQL configuration
nano /etc/postgresql/16/main/pg_hba.conf

# Add this line for local connections:
local   handytech_db    handytech_user                  md5

# Restart PostgreSQL
systemctl restart postgresql
```

## Step 3: Deploy HandyTech Solutions

### 3.1 Create application directory
```bash
mkdir -p /var/www
cd /var/www
```

### 3.2 Upload and extract deployment package
```bash
# Upload handytech-complete-deployment.tar.gz to /var/www/
tar -xzf handytech-complete-deployment.tar.gz
mv handytech-complete-deployment handytech
cd handytech
```

### 3.3 Install dependencies
```bash
npm install --production
```

### 3.4 Set environment variables
```bash
# Create environment file
cat > .env << EOF
DATABASE_URL="postgresql://handytech_user:YOUR_SECURE_PASSWORD@localhost:5432/handytech_db"
NODE_ENV=production
BREVO_API_KEY="your_brevo_api_key"
OPENAI_API_KEY="your_openai_api_key"
ADMIN_PASSWORD="HandyTech2024!"
PORT=3000
EOF

# Load environment variables
source .env
export $(cat .env | xargs)
```

### 3.5 Initialize database
```bash
npm run db:push
```

## Step 4: Start the Application

### 4.1 Start with PM2
```bash
pm2 start dist/server.js --name "handytech" --env-file .env
pm2 save
pm2 startup
```

### 4.2 Verify application is running
```bash
pm2 status
pm2 logs handytech --lines 10
```

## Step 5: Configure Nginx Reverse Proxy

### 5.1 Create Nginx configuration
```bash
cat > /etc/nginx/sites-available/handytech << 'EOF'
server {
    listen 80;
    server_name YOUR_VPS_IP;

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
EOF
```

### 5.2 Enable the site
```bash
ln -s /etc/nginx/sites-available/handytech /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx
```

## Step 6: Configure Firewall

### 6.1 Set up UFW firewall
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
```

## Step 7: Verify Deployment

### 7.1 Test the application
```bash
curl http://localhost:3000
curl http://YOUR_VPS_IP
```

### 7.2 Check all services
```bash
systemctl status nginx
systemctl status postgresql
pm2 status
```

## Access Your Application

- **Website**: http://YOUR_VPS_IP
- **Admin Panel**: http://YOUR_VPS_IP/admin
  - Username: `admin`
  - Password: `HandyTech2024!`

## Features Available

✅ **Complete Business Management System**
- Customer relationship management
- Appointment scheduling with automated reminders
- Quote request system
- Service management
- Review management
- Email automation with Brevo integration
- AI-powered customer service chatbot

✅ **Professional Website**
- Ohio State Buckeyes branded design
- Responsive mobile-first interface
- Contact forms and service information
- Authentic Home Depot Pro reviews integration

## Maintenance Commands

### View logs
```bash
pm2 logs handytech
tail -f /var/log/nginx/error.log
```

### Restart services
```bash
pm2 restart handytech
systemctl restart nginx
```

### Update application
```bash
cd /var/www/handytech
pm2 stop handytech
# Upload new deployment package and extract
npm install --production
pm2 start handytech
```

## Troubleshooting

### Application won't start
```bash
pm2 logs handytech --lines 20
```

### Database connection issues
```bash
sudo -u postgres psql -d handytech_db -U handytech_user
```

### Nginx configuration issues
```bash
nginx -t
systemctl status nginx
```

## Security Notes

- Change default admin password after first login
- Keep your VPS updated: `apt update && apt upgrade`
- Consider setting up SSL/TLS certificates for HTTPS
- Regularly backup your PostgreSQL database
- Monitor PM2 logs for any issues

---

**Your HandyTech Solutions platform is now deployed with full functionality on Ionos VPS!**