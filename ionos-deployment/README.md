# IONOS VPS Deployment Kit - HandyTech Solutions

## Overview

This deployment kit provides a complete, automated setup for deploying HandyTech Solutions to an IONOS VPS server. It follows the exact deployment specifications from deploy.json and includes production-ready configurations.

## What's Included

### 🚀 Core Scripts
- **00-bootstrap.sh** - Installs Node.js 20, prerequisites, creates user/directories
- **01-db-setup.sh** - Sets up PostgreSQL (managed or local installation)
- **02-deploy.sh** - Deploys application code, builds, and configures
- **99-validate.sh** - Validates complete deployment with health checks

### ⚙️ Configuration
- **.env.example** - Complete environment template with all variables
- **validate-secrets.sh** - Validates all required environment variables
- **handytech.service** - Systemd service file for auto-start/restart

### 📚 Documentation
- **IONOS-SETUP-GUIDE.md** - Complete step-by-step IONOS setup instructions
- **DEPLOYMENT-GUIDE.md** - Detailed deployment process documentation

## Quick Start

1. **Upload to your IONOS VPS:**
   ```bash
   scp -r ionos-deployment/ root@your-server-ip:/opt/
   ```

2. **Set environment variables:**
   ```bash
   cd /opt/ionos-deployment
   cp config/.env.example /opt/handytech/.env
   nano /opt/handytech/.env  # Edit with your values
   ```

3. **Run deployment:**
   ```bash
   cd /opt/ionos-deployment
   chmod +x scripts/*.sh
   ./scripts/00-bootstrap.sh
   ./scripts/01-db-setup.sh
   ./scripts/02-deploy.sh
   ./scripts/99-validate.sh
   ```

## Requirements

- **Operating System**: Ubuntu 20.04+ or similar
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 10GB available space
- **Network**: Internet connection for package installation
- **Database**: PostgreSQL 12+ (managed service or local installation)

## Security Features

✅ **Non-root execution** - Application runs as dedicated handytech user  
✅ **Environment validation** - Validates all secrets before deployment  
✅ **Systemd integration** - Automatic service management and restart  
✅ **Health monitoring** - Built-in health checks and validation  
✅ **Production hardening** - Security headers, rate limiting, HTTPS ready  

## Architecture

**Application**: Node.js 20 + Express + React (Full-stack)  
**Database**: PostgreSQL with Drizzle ORM  
**Session Storage**: PostgreSQL-backed sessions  
**Email**: IONOS SMTP + optional Brevo integration  
**Security**: Cookie-based auth + CSRF protection  
**Monitoring**: Health endpoints + systemd integration  

## Support

This deployment follows the specifications in deploy.json and includes all features:
- Admin Dashboard with real-time notifications
- Customer Portal with magic link authentication  
- AI-powered chatbot with OpenAI integration
- Google Calendar sync capabilities
- Comprehensive email automation system
- Enterprise-grade security implementation

For technical support, refer to the detailed documentation in the docs/ directory.