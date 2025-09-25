# HandyTech Solutions - Quick Start

## 🚀 One-Click IONOS Deployment

This package contains everything needed to deploy HandyTech Solutions on IONOS VPS.

### Prerequisites
- IONOS VPS (Ubuntu 22.04, 4GB RAM recommended)
- Domain name
- Email service (IONOS email recommended)
- Google Cloud project for calendar integration

### Deploy in 5 Minutes

1. **Upload to server:**
   ```bash
   scp -r ionos-deployment/ root@your-server-ip:/opt/
   ```

2. **Run deployment:**
   ```bash
   cd /opt/ionos-deployment
   chmod +x scripts/*.sh
   ./scripts/00-bootstrap.sh     # System setup
   ./scripts/01-db-setup.sh      # Database setup
   ```

3. **Configure environment:**
   ```bash
   cp config/.env.example /opt/handytech/.env
   nano /opt/handytech/.env      # Edit with your values
   ./scripts/validate-secrets.sh
   ```

4. **Deploy application:**
   ```bash
   ./scripts/02-deploy.sh        # Deploy & build
   ./scripts/99-validate.sh      # Validate
   ```

### What's Included

- ✅ **Automated Node.js 20 installation**
- ✅ **PostgreSQL setup (managed or local)**
- ✅ **Complete environment validation**
- ✅ **Systemd service configuration**
- ✅ **Health checks and monitoring**
- ✅ **Production security hardening**
- ✅ **Comprehensive documentation**

### Access Your Application
- Homepage: `http://your-server-ip:5000`
- Admin Portal: `http://your-server-ip:5000/admin`
- Customer Portal: `http://your-server-ip:5000/customer-portal`

### Need Help?
- Check `docs/DEPLOYMENT-GUIDE.md` for detailed instructions
- Run `./scripts/99-validate.sh` for troubleshooting
- View logs: `journalctl -u handytech -f`