# HandyTech Solutions - Deployment Guide

## Quick Start

This guide provides the fastest path to deploy HandyTech Solutions on IONOS VPS.

### Prerequisites Checklist

- [ ] IONOS VPS server (Ubuntu 22.04, 4GB RAM, 2 vCPU)
- [ ] Domain name pointed to server IP
- [ ] IONOS email hosting configured
- [ ] Google Cloud project with Calendar API enabled
- [ ] SSH access to server

### 5-Minute Deployment

1. **Upload deployment package**
   ```bash
   scp -r ionos-deployment/ root@your-server-ip:/opt/
   ```

2. **Connect to server**
   ```bash
   ssh root@your-server-ip
   cd /opt/ionos-deployment
   chmod +x scripts/*.sh
   ```

3. **Run automated setup**
   ```bash
   ./scripts/00-bootstrap.sh     # Install Node.js, create user
   ./scripts/01-db-setup.sh      # Setup database (choose managed/local)
   ```

4. **Configure environment**
   ```bash
   cp config/.env.example /opt/handytech/.env
   nano /opt/handytech/.env      # Fill in your values
   ./scripts/validate-secrets.sh # Validate configuration
   ```

5. **Deploy application**
   ```bash
   ./scripts/02-deploy.sh        # Deploy code and build
   ./scripts/99-validate.sh      # Final validation
   ```

6. **Access your application**
   - Homepage: `http://your-server-ip:5000`
   - Admin: `http://your-server-ip:5000/admin`

## Detailed Deployment Steps

### Environment Configuration

Copy and customize your environment file:

```bash
cp config/.env.example /opt/handytech/.env
```

**Required Variables:**
```env
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Security
SESSION_SECRET=your-32-character-secret-key
ADMIN_PASSWORD=your-admin-password

# Email (IONOS SMTP)
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback
```

### Application Source Options

The deployment script supports three source options:

1. **Local Upload** - Upload source code directory
2. **Git Repository** - Clone from GitHub/GitLab
3. **Archive File** - Extract from .zip/.tar.gz

### Service Management

Control the HandyTech service:

```bash
# Start/Stop/Restart
sudo ./scripts/service-control.sh start
sudo ./scripts/service-control.sh stop
sudo ./scripts/service-control.sh restart

# Status and logs
sudo ./scripts/service-control.sh status
sudo ./scripts/service-control.sh logs

# Health check
sudo ./scripts/service-control.sh health
```

### Validation and Health Checks

Run comprehensive validation:

```bash
./scripts/99-validate.sh
```

This checks:
- Node.js installation and version
- Required files and build output
- Environment configuration
- Database connection
- Service status and health endpoints
- Security configuration
- System resources

## Production Setup

### Reverse Proxy (Nginx)

1. **Install and configure Nginx:**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/handytech
   ```

2. **Basic configuration:**
   ```nginx
   server {
       listen 80;
       server_name handytech-solutions.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable and restart:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/handytech /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl restart nginx
   ```

### SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d handytech-solutions.com
```

### Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Troubleshooting

### Service Issues

**Service won't start:**
```bash
sudo journalctl -u handytech -n 50
sudo systemctl status handytech
```

**Build failures:**
```bash
cd /opt/handytech/app
sudo -u handytech npm run build
```

### Database Issues

**Connection failed:**
```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check database status (if local)
sudo systemctl status postgresql
```

### Environment Issues

**Invalid configuration:**
```bash
./scripts/validate-secrets.sh
```

**Missing variables:**
```bash
# Check environment file
cat /opt/handytech/.env

# Validate all required variables are set
grep -E "^[A-Z_]+=" /opt/handytech/.env
```

## Maintenance

### Updates

**Application updates:**
```bash
cd /opt/ionos-deployment
./scripts/02-deploy.sh  # Choose new source code
```

**System updates:**
```bash
sudo apt update && sudo apt upgrade -y
```

### Backups

**Database backup** (automatic for local PostgreSQL):
```bash
/usr/local/bin/handytech-db-backup
```

**Application backup:**
```bash
sudo tar -czf handytech-backup-$(date +%Y%m%d).tar.gz /opt/handytech/
```

### Monitoring

**Resource usage:**
```bash
htop
df -h
systemctl status handytech
```

**Application health:**
```bash
curl http://localhost:5000/api/health
./scripts/99-validate.sh
```

## Security

### File Permissions

```bash
# Verify environment file security
ls -la /opt/handytech/.env  # Should be 600

# Application directory ownership
ls -la /opt/handytech/      # Should be owned by handytech user
```

### Network Security

```bash
# Check open ports
sudo netstat -tlnp

# Verify firewall
sudo ufw status verbose
```

### Password Security

- Use strong passwords (12+ characters)
- Enable 2FA where possible
- Rotate secrets regularly
- Use SSH keys instead of passwords

## Performance Optimization

### System Resources

**Recommended specifications:**
- **Development**: 2 GB RAM, 1 vCPU
- **Production**: 4 GB RAM, 2 vCPU
- **High Traffic**: 8 GB RAM, 4 vCPU

### Database Optimization

**For managed PostgreSQL:**
- Choose appropriate performance tier
- Enable connection pooling
- Monitor query performance

**For local PostgreSQL:**
```bash
# Tune PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf

# Key settings:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
```

### Application Optimization

**Environment variables:**
```env
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=1024
```

**Service configuration:**
```bash
# Edit systemd service for resource limits
sudo systemctl edit handytech
```

## Success Validation

Your deployment is successful when:

- [ ] All scripts run without errors
- [ ] Validation script passes all checks
- [ ] Application accessible via web browser
- [ ] Admin login works
- [ ] Customer portal accessible
- [ ] Email notifications sending
- [ ] Database operations working
- [ ] Health endpoint returns "healthy"
- [ ] Service auto-starts after reboot

## Next Steps

After successful deployment:

1. **Configure domain and SSL**
2. **Set up monitoring and alerting**
3. **Configure automated backups**
4. **Test all functionality**
5. **Create admin user accounts**
6. **Import customer data (if migrating)**
7. **Set up Google Calendar integration**
8. **Configure email templates**

## Support Resources

- **Deployment validation**: `./scripts/99-validate.sh`
- **Service logs**: `journalctl -u handytech -f`
- **Environment validation**: `./scripts/validate-secrets.sh`
- **Service control**: `./scripts/service-control.sh help`
- **IONOS documentation**: Check IONOS-SETUP-GUIDE.md
- **Application logs**: Available through admin portal