# IONOS VPS Image Creation Guide

## Overview

After successfully deploying HandyTech Solutions to your IONOS VPS, create a custom server image for instant future deployments.

## Prerequisites

✅ **Working IONOS VPS** with HandyTech Solutions deployed  
✅ **All services running** (verified with `systemctl status handytech`)  
✅ **Health checks passing** (`sudo -u handytech /opt/handytech/scripts/99-validate.sh`)  

## Step 1: Prepare Server for Image Creation

### Clean Up Temporary Files
```bash
# Remove temporary files and logs
sudo rm -rf /tmp/*
sudo rm -rf /var/log/*.log
sudo rm -rf /root/.bash_history
sudo rm -rf /home/*/.bash_history

# Clear system logs
sudo journalctl --vacuum-time=1d

# Clean package cache
sudo apt clean
sudo apt autoremove -y
```

### Secure Configuration Files
```bash
# Ensure environment file has correct permissions
sudo chmod 600 /opt/handytech/.env
sudo chown handytech:handytech /opt/handytech/.env

# Stop services temporarily for image creation
sudo systemctl stop handytech
```

### Optional: Create Template Environment
```bash
# Backup current .env
sudo cp /opt/handytech/.env /opt/handytech/.env.backup

# Create template .env for new deployments
sudo cp /opt/handytech/.env.example /opt/handytech/.env.template
sudo chown handytech:handytech /opt/handytech/.env.template
```

## Step 2: Create IONOS Custom Image

### Access IONOS Cloud Panel
1. **Log into IONOS** → [https://cloud.ionos.com](https://cloud.ionos.com)
2. **Navigate to Images** → `Infrastructure` → `Images`
3. **Click "Create"** at the top of the page

### Configure Image Settings
1. **Select "Create an image"**
2. **Choose your VPS** (HandyTech Solutions server)
3. **Enter image name**: `HandyTech-Production-v1.0`
4. **Add description**: 
   ```
   HandyTech Solutions - Complete Production Setup
   Node.js 20, PostgreSQL, Systemd service, Security configured
   Ready for immediate deployment with .env configuration
   ```

### Create the Image
1. **Click "Create"** to start image creation
2. **Wait for completion** (typically 10-30 minutes)
3. **Verify image status** shows "Available"

⚠️ **Important**: Server will be temporarily unavailable during image creation

## Step 3: Deploy from Custom Image

### Create New VPS from Image
1. **Go to** `Infrastructure` → `Servers`
2. **Click "Create Server"**
3. **Select "My Images"** tab
4. **Choose** `HandyTech-Production-v1.0`
5. **Configure server** (same or larger size)
6. **Deploy server**

### Post-Deployment Configuration
The new server will have everything pre-installed. Only configuration needed:

```bash
# SSH into new server
ssh root@your-new-server-ip

# Configure environment variables
sudo nano /opt/handytech/.env
# Update: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET, domain-specific settings

# Validate configuration
sudo -u handytech /opt/handytech/scripts/validate-secrets.sh

# Start services
sudo systemctl start handytech
sudo systemctl enable handytech

# Verify deployment
sudo -u handytech /opt/handytech/scripts/99-validate.sh
```

## Step 4: Image Management

### Update Image (When Code Changes)
1. **Deploy updates** to existing server
2. **Test thoroughly**
3. **Create new image** with version number (v1.1, v1.2, etc.)
4. **Update documentation**

### Image Best Practices
- **Version naming**: `HandyTech-Production-v1.x`
- **Regular updates**: Monthly or after major features
- **Test images**: Create dev images for testing
- **Backup strategy**: Keep 2-3 recent image versions

## Step 5: Troubleshooting New Deployments

### Common Issues and Solutions

**Service Won't Start**
```bash
# Check service status
sudo systemctl status handytech

# Check logs
sudo journalctl -u handytech -f

# Verify environment
sudo -u handytech /opt/handytech/scripts/validate-secrets.sh
```

**Database Connection Issues**
```bash
# Test database connection
sudo -u handytech psql $DATABASE_URL -c "SELECT version();"

# Re-run database setup if needed
sudo /opt/handytech/scripts/01-db-setup.sh
```

**Health Check Failures**
```bash
# Manual health check
curl -f http://localhost:5000/api/health

# Check port binding
sudo netstat -tlnp | grep :5000

# Restart services
sudo systemctl restart handytech
```

## Production Deployment Checklist

Before creating your production image:

- [ ] **SSL Certificate** configured (Let's Encrypt)
- [ ] **Domain DNS** pointing to server
- [ ] **Firewall** configured (ports 22, 80, 443, 5000)
- [ ] **Email SMTP** tested and working
- [ ] **Google Calendar** integration tested
- [ ] **Admin portal** accessible and secure
- [ ] **Database backups** configured
- [ ] **Environment variables** all set correctly
- [ ] **Health checks** all passing

## Security Notes

### Image Security
- **No secrets** hardcoded in the image
- **Template files** for environment configuration
- **Secure permissions** on all application files
- **Updated packages** and security patches

### Deployment Security
- **Change default passwords** on new deployments
- **Generate new secrets** (SESSION_SECRET, JWT_SECRET)
- **Update database credentials** if using managed DB
- **Configure firewall** for your specific needs

## Support

For deployment issues:
1. **Check logs**: `sudo journalctl -u handytech -f`
2. **Run validation**: `/opt/handytech/scripts/99-validate.sh`
3. **Review configuration**: Environment variables and permissions
4. **Test components**: Database, health endpoints, admin access

---

**Next Steps**: With your custom IONOS image, you can deploy HandyTech Solutions to new servers in minutes instead of hours!