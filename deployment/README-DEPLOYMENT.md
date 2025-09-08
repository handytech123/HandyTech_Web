# HandyTech Solutions - VPS Deployment Guide

## Quick Deployment Instructions

### 1. Upload Files to VPS
```bash
# Upload the deployment archive to your VPS
scp handytech-deployment.tar.gz root@74.2.8.149.78:/root/
```

### 2. Connect to VPS and Deploy
```bash
# SSH into your VPS
ssh root@74.2.8.149.78

# Run the deployment script
cd /root
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### 3. Configuration Details

**Server Specifications:**
- IP: 74.2.8.149.78
- Domain: handytech-solutions.com
- OS: Ubuntu/Debian (recommended)
- Node.js: v20.x
- Database: PostgreSQL
- Web Server: Nginx
- Process Manager: PM2

**Environment Configuration:**
- Production build optimized (674KB frontend, 50KB backend)
- PostgreSQL database with secure credentials
- SSL certificate via Let's Encrypt
- Nginx reverse proxy with security headers
- PM2 cluster mode for scalability

**Database Setup:**
- Database: handytech_db
- User: handytech
- Password: SecurePass123! (change in production)
- Automatic schema deployment via Drizzle

### 4. Post-Deployment

**Monitor Application:**
```bash
pm2 status                 # Check application status
pm2 logs handytech-solutions  # View logs
pm2 monit                  # Real-time monitoring
```

**Manage Services:**
```bash
systemctl status nginx     # Check Nginx
systemctl status postgresql # Check PostgreSQL
```

**SSL Certificate Renewal:**
```bash
certbot renew --dry-run    # Test renewal
```

### 5. Troubleshooting

**If deployment fails:**
1. Check logs: `pm2 logs`
2. Verify database connection: `psql -U handytech -d handytech_db`
3. Test Nginx config: `nginx -t`
4. Check firewall: `ufw status`

**Required Ports:**
- 80 (HTTP - redirects to HTTPS)
- 443 (HTTPS)
- 22 (SSH)

### 6. Security Notes

- Change default database password
- Configure firewall (ufw)
- Regular security updates
- Monitor access logs
- Backup database regularly

The deployment script handles everything automatically, including SSL setup and service configuration.