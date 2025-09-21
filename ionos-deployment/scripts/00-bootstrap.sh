#!/bin/bash
set -euo pipefail

# HandyTech Solutions - Bootstrap Script
# Installs Node.js 20, prerequisites, creates user/directories

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="handytech"
APP_DIR="/opt/handytech"
SERVICE_NAME="handytech"
NODE_VERSION="20"

echo -e "${BLUE}HandyTech Solutions - System Bootstrap${NC}"
echo "====================================="
echo "This script will:"
echo "• Install Node.js $NODE_VERSION"
echo "• Install system prerequisites"
echo "• Create dedicated user: $APP_USER"
echo "• Set up directory structure: $APP_DIR"
echo "• Configure basic security settings"
echo ""

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        echo "Please run: sudo $0"
        exit 1
    fi
}

# Function to detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        echo -e "${RED}❌ Cannot detect operating system${NC}"
        exit 1
    fi
    
    log "${GREEN}✅ Detected OS: $OS $VER${NC}"
}

# Function to update system packages
update_system() {
    log "${BLUE}Updating system packages...${NC}"
    
    case $OS in
        ubuntu|debian)
            apt-get update -y
            apt-get upgrade -y
            DEBIAN_FRONTEND=noninteractive apt-get install -y \
                curl \
                wget \
                gnupg \
                lsb-release \
                ca-certificates \
                software-properties-common \
                apt-transport-https \
                build-essential \
                git \
                unzip \
                sudo \
                ufw \
                htop \
                nano \
                vim
            ;;
        centos|rhel|rocky|alma)
            yum update -y
            yum groupinstall -y "Development Tools"
            yum install -y \
                curl \
                wget \
                gnupg \
                ca-certificates \
                git \
                unzip \
                sudo \
                firewalld \
                htop \
                nano \
                vim
            ;;
        *)
            echo -e "${RED}❌ Unsupported operating system: $OS${NC}"
            echo "Supported: Ubuntu, Debian, CentOS, RHEL, Rocky Linux, AlmaLinux"
            exit 1
            ;;
    esac
    
    log "${GREEN}✅ System packages updated${NC}"
}

# Function to install Node.js 20
install_nodejs() {
    log "${BLUE}Installing Node.js $NODE_VERSION...${NC}"
    
    # Check if Node.js is already installed with correct version
    if command -v node >/dev/null 2>&1; then
        CURRENT_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$CURRENT_VERSION" == "$NODE_VERSION" ]]; then
            log "${GREEN}✅ Node.js $NODE_VERSION already installed${NC}"
            return 0
        else
            log "${YELLOW}⚠️  Node.js $CURRENT_VERSION found, upgrading to $NODE_VERSION${NC}"
        fi
    fi
    
    # Install Node.js using NodeSource repository
    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|rocky|alma)
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
            yum install -y nodejs
            ;;
    esac
    
    # Verify installation
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        NODE_VER=$(node --version)
        NPM_VER=$(npm --version)
        log "${GREEN}✅ Node.js installed: $NODE_VER${NC}"
        log "${GREEN}✅ npm installed: v$NPM_VER${NC}"
    else
        echo -e "${RED}❌ Node.js installation failed${NC}"
        exit 1
    fi
    
    # Set npm global permissions
    npm config set fund false
    npm config set audit false
}

# Function to create application user
create_user() {
    log "${BLUE}Creating application user: $APP_USER${NC}"
    
    # Check if user already exists
    if id "$APP_USER" >/dev/null 2>&1; then
        log "${GREEN}✅ User $APP_USER already exists${NC}"
    else
        # Create system user with no login shell
        useradd --system --shell /bin/false --home-dir "$APP_DIR" --create-home "$APP_USER"
        log "${GREEN}✅ Created user: $APP_USER${NC}"
    fi
    
    # Add user to appropriate groups for logging
    case $OS in
        ubuntu|debian)
            usermod -a -G systemd-journal "$APP_USER" 2>/dev/null || true
            ;;
        centos|rhel|rocky|alma)
            usermod -a -G systemd-journal "$APP_USER" 2>/dev/null || true
            ;;
    esac
}

# Function to create directory structure
create_directories() {
    log "${BLUE}Creating directory structure...${NC}"
    
    # Create main directories
    mkdir -p "$APP_DIR"/{app,logs,config,backups}
    mkdir -p /var/log/handytech
    
    # Set permissions
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    chown -R "$APP_USER:$APP_USER" /var/log/handytech
    
    # Set directory permissions
    chmod 755 "$APP_DIR"
    chmod 755 "$APP_DIR"/{app,logs,config,backups}
    chmod 755 /var/log/handytech
    
    log "${GREEN}✅ Directory structure created:${NC}"
    log "   $APP_DIR/app     - Application files"
    log "   $APP_DIR/logs    - Application logs"
    log "   $APP_DIR/config  - Configuration files"
    log "   $APP_DIR/backups - Backup files"
    log "   /var/log/handytech - System logs"
}

# Function to configure firewall
configure_firewall() {
    log "${BLUE}Configuring firewall...${NC}"
    
    case $OS in
        ubuntu|debian)
            if command -v ufw >/dev/null 2>&1; then
                # Configure UFW
                ufw --force reset
                ufw default deny incoming
                ufw default allow outgoing
                
                # Allow SSH (preserve existing connection)
                ufw allow ssh
                
                # Allow HTTP and HTTPS
                ufw allow 80/tcp
                ufw allow 443/tcp
                
                # Allow application port
                ufw allow 5000/tcp
                
                # Enable firewall
                ufw --force enable
                
                log "${GREEN}✅ UFW firewall configured${NC}"
            fi
            ;;
        centos|rhel|rocky|alma)
            if command -v firewall-cmd >/dev/null 2>&1; then
                # Configure firewalld
                systemctl enable firewalld
                systemctl start firewalld
                
                # Allow HTTP and HTTPS
                firewall-cmd --permanent --add-service=http
                firewall-cmd --permanent --add-service=https
                
                # Allow application port
                firewall-cmd --permanent --add-port=5000/tcp
                
                # Reload configuration
                firewall-cmd --reload
                
                log "${GREEN}✅ firewalld configured${NC}"
            fi
            ;;
    esac
}

# Function to install additional tools
install_tools() {
    log "${BLUE}Installing additional tools...${NC}"
    
    case $OS in
        ubuntu|debian)
            apt-get install -y \
                logrotate \
                rsync \
                screen \
                tmux \
                tree \
                jq \
                certbot
            ;;
        centos|rhel|rocky|alma)
            yum install -y \
                logrotate \
                rsync \
                screen \
                tmux \
                tree \
                jq
            # Install certbot from EPEL if available
            yum install -y epel-release || true
            yum install -y certbot || true
            ;;
    esac
    
    log "${GREEN}✅ Additional tools installed${NC}"
}

# Function to create logrotate configuration
setup_logrotate() {
    log "${BLUE}Setting up log rotation...${NC}"
    
    cat > /etc/logrotate.d/handytech << 'EOF'
/var/log/handytech/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 handytech handytech
    postrotate
        systemctl reload handytech || true
    endscript
}
EOF
    
    log "${GREEN}✅ Log rotation configured${NC}"
}

# Function to create environment template
create_env_template() {
    log "${BLUE}Creating environment template...${NC}"
    
    if [[ ! -f "$APP_DIR/.env" ]]; then
        cat > "$APP_DIR/.env.template" << 'EOF'
# HandyTech Solutions - Environment Configuration
# Copy this template to .env and fill in your actual values

# Required Variables
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=generate-32-character-secret-key
ADMIN_PASSWORD=your-admin-password
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback

# System Variables
NODE_ENV=production
PORT=5000
EOF
        
        chown "$APP_USER:$APP_USER" "$APP_DIR/.env.template"
        chmod 600 "$APP_DIR/.env.template"
        
        log "${GREEN}✅ Environment template created at $APP_DIR/.env.template${NC}"
        log "${YELLOW}⚠️  Copy .env.template to .env and configure your values${NC}"
    else
        log "${GREEN}✅ Environment file already exists${NC}"
    fi
}

# Function to display summary
display_summary() {
    echo ""
    echo -e "${GREEN}🎉 Bootstrap completed successfully!${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}System Information:${NC}"
    echo "• OS: $OS $VER"
    echo "• Node.js: $(node --version)"
    echo "• npm: v$(npm --version)"
    echo "• User: $APP_USER"
    echo "• Directory: $APP_DIR"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Copy your environment file:"
    echo "   cp $APP_DIR/.env.template $APP_DIR/.env"
    echo "   nano $APP_DIR/.env"
    echo ""
    echo "2. Run database setup:"
    echo "   ./01-db-setup.sh"
    echo ""
    echo "3. Deploy the application:"
    echo "   ./02-deploy.sh"
    echo ""
    echo -e "${YELLOW}Important Security Notes:${NC}"
    echo "• Configure your .env file with secure values"
    echo "• Set strong passwords for all accounts"
    echo "• Update firewall rules as needed"
    echo "• Keep the system updated regularly"
    echo ""
}

# Main execution
main() {
    log "${BLUE}Starting bootstrap process...${NC}"
    
    check_root
    detect_os
    update_system
    install_nodejs
    create_user
    create_directories
    configure_firewall
    install_tools
    setup_logrotate
    create_env_template
    
    display_summary
}

# Execute main function
main "$@"