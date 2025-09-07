# HandyTech Solutions VPS Deployment Guide

This guide will help you deploy HandyTech Solutions to your IONOS VPS.

## Prerequisites

- IONOS VPS with Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access to the server
- Domain name pointing to your VPS IP address (209.46.125.246)

## Step 1: Prepare Your VPS

1. **Connect to your VPS via SSH:**
   ```bash
   ssh root@209.46.125.246
   ```

2. **Create a new user for security (optional but recommended):**
   ```bash
   adduser handytech
   usermod -aG sudo handytech
   su - handytech
   ```

## Step 2: Upload Project Files

1. **Create project directory:**
   ```bash
   sudo mkdir -p /var/www/handytech-solutions
   sudo chown $USER:$USER /var/www/handytech-solutions
   ```

2. **Upload your project files to the VPS:**
   - Use SCP, SFTP, or your preferred method to upload all project files
   - Or clone from a Git repository if you have one set up

3. **Navigate to project directory:**
   ```bash
   cd /var/www/handytech-solutions
   ```

## Step 3: Run Deployment Script

1. **Make the deployment script executable:**
   ```bash
   chmod +x deploy.sh
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```

## Step 4: Configure Environment Variables

1. **Create environment file:**
   ```bash
   nano .env
   ```

2. **Add the following variables (update with your values):**
   ```env
   NODE_ENV=production
   PORT=5000
   
   # Database (created by deployment script)
   DATABASE_URL=postgresql://handytech_user:your_secure_password@localhost:5432/handytech_solutions
   PGHOST=localhost
   PGPORT=5432
   PGUSER=handytech_user
   PGPASSWORD=your_secure_password
   PGDATABASE=handytech_solutions
   
   # Sessions (generate a strong secret)
   SESSION_SECRET=your_very_secure_session_secret_here_make_it_long_and_random
   
   # OpenAI (optional - for chatbot feature)
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Step 5: Configure Nginx (Reverse Proxy)

1. **Install Nginx:**
   ```bash
   sudo apt install nginx -y
   ```

2. **Copy the nginx configuration:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/handytech-solutions
   ```

3. **Update the configuration file with your domain:**
   ```bash
   sudo nano /etc/nginx/sites-available/handytech-solutions
   ```
   Replace `yourdomain.com` with your actual domain name.

4. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/handytech-solutions /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Step 6: Start the Application

1. **Using PM2 (recommended):**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

2. **Or using systemd:**
   ```bash
   sudo cp handytech-solutions.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable handytech-solutions
   sudo systemctl start handytech-solutions
   ```

## Step 7: Configure Firewall

1. **Allow necessary ports:**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

## Step 8: SSL Certificate (Optional but Recommended)

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL certificate:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Step 9: Verify Deployment

1. **Check application status:**
   ```bash
   pm2 status  # if using PM2
   # or
   sudo systemctl status handytech-solutions  # if using systemd
   ```

2. **Check logs:**
   ```bash
   pm2 logs handytech-solutions  # if using PM2
   # or
   sudo journalctl -u handytech-solutions -f  # if using systemd
   ```

3. **Visit your website:**
   Open your browser and go to `https://yourdomain.com`

## Maintenance Commands

- **View logs:** `pm2 logs handytech-solutions`
- **Restart app:** `pm2 restart handytech-solutions`
- **Update app:** `git pull && npm run build && pm2 restart handytech-solutions`

## Troubleshooting

1. **Database connection issues:**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials in `.env` file
   - Test connection: `psql -U handytech_user -d handytech_solutions`

2. **Application won't start:**
   - Check logs for error messages
   - Verify all environment variables are set
   - Ensure port 5000 is not being used by another service

3. **Website not accessible:**
   - Check nginx status: `sudo systemctl status nginx`
   - Verify DNS settings point to your VPS IP
   - Check firewall rules

## Features Available After Deployment

✅ Customer review submission system  
✅ Admin dashboard for managing reviews, quotes, appointments  
✅ Customer portal  
✅ AI chatbot (with OpenAI API key)  
✅ Appointment scheduling  
✅ Quote management  
✅ Customer database  
✅ Email campaign tracking  

Your HandyTech Solutions platform is now fully deployed and operational!