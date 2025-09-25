#!/bin/bash
set -euo pipefail

# HandyTech Solutions - Application Deployment Script
# Deploys code, installs dependencies, builds application

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="handytech"
APP_DIR="/opt/handytech"
APP_SOURCE_DIR="$APP_DIR/app"
BACKUP_DIR="$APP_DIR/backups"
SERVICE_NAME="handytech"

echo -e "${BLUE}HandyTech Solutions - Application Deployment${NC}"
echo "============================================="
echo "This script will:"
echo "• Download and extract application code"
echo "• Install Node.js dependencies (npm ci)"
echo "• Build the application (npm run build)"
echo "• Configure systemd service"
echo "• Validate deployment"
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

# Function to validate prerequisites
validate_prerequisites() {
    log "${BLUE}Validating prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}❌ Node.js not found${NC}"
        echo "Please run 00-bootstrap.sh first"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -lt 20 ]]; then
        echo -e "${RED}❌ Node.js version $NODE_VERSION found, requires 20+${NC}"
        echo "Please run 00-bootstrap.sh to upgrade Node.js"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    # Check user exists
    if ! id "$APP_USER" >/dev/null 2>&1; then
        echo -e "${RED}❌ User $APP_USER not found${NC}"
        echo "Please run 00-bootstrap.sh first"
        exit 1
    fi
    
    # Check directory exists
    if [[ ! -d "$APP_DIR" ]]; then
        echo -e "${RED}❌ Directory $APP_DIR not found${NC}"
        echo "Please run 00-bootstrap.sh first"
        exit 1
    fi
    
    log "${GREEN}✅ Prerequisites validated${NC}"
}

# Function to validate environment configuration
validate_environment() {
    log "${BLUE}Validating environment configuration...${NC}"
    
    if [[ ! -f "$APP_DIR/.env" ]]; then
        echo -e "${RED}❌ Environment file not found: $APP_DIR/.env${NC}"
        echo ""
        echo "Please create your environment file:"
        echo "1. Copy the template: cp $APP_DIR/.env.template $APP_DIR/.env"
        echo "2. Edit with your values: nano $APP_DIR/.env"
        echo "3. Run validation: ./validate-secrets.sh"
        exit 1
    fi
    
    # Source environment for validation
    set -a
    source "$APP_DIR/.env"
    set +a
    
    # Check critical variables
    if [[ -z "${DATABASE_URL:-}" ]]; then
        echo -e "${RED}❌ DATABASE_URL not set in .env${NC}"
        echo "Please configure your database connection string"
        exit 1
    fi
    
    if [[ -z "${SESSION_SECRET:-}" ]]; then
        echo -e "${RED}❌ SESSION_SECRET not set in .env${NC}"
        echo "Please set a secure session secret (32+ characters)"
        exit 1
    fi
    
    log "${GREEN}✅ Environment configuration validated${NC}"
}

# Function to get deployment source
get_deployment_source() {
    echo -e "${BLUE}Application Source Options:${NC}"
    echo "=========================="
    echo "1. Upload from local directory"
    echo "2. Download from Git repository"
    echo "3. Extract from uploaded archive"
    echo ""
    
    while true; do
        read -p "Choose deployment source (1/2/3): " choice
        case $choice in
            1)
                deploy_from_local
                break
                ;;
            2)
                deploy_from_git
                break
                ;;
            3)
                deploy_from_archive
                break
                ;;
            *)
                echo -e "${RED}❌ Invalid choice. Please enter 1, 2, or 3.${NC}"
                ;;
        esac
    done
}

# Function to deploy from local directory
deploy_from_local() {
    echo ""
    echo -e "${BLUE}Deploy from Local Directory${NC}"
    echo "==========================="
    echo ""
    echo "Please upload your HandyTech Solutions source code to this server."
    echo "The source should contain: package.json, server/, client/, shared/"
    echo ""
    
    while true; do
        read -p "Enter path to source directory: " source_path
        
        if [[ -d "$source_path" && -f "$source_path/package.json" ]]; then
            log "${BLUE}Copying source code from $source_path...${NC}"
            copy_source_code "$source_path"
            break
        else
            echo -e "${RED}❌ Invalid directory or package.json not found${NC}"
            echo "Please ensure the directory contains a valid Node.js project"
        fi
    done
}

# Function to deploy from Git repository
deploy_from_git() {
    echo ""
    echo -e "${BLUE}Deploy from Git Repository${NC}"
    echo "=========================="
    echo ""
    
    # Check if git is installed
    if ! command -v git >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Git not found, installing...${NC}"
        if command -v apt-get >/dev/null 2>&1; then
            apt-get update && apt-get install -y git
        elif command -v yum >/dev/null 2>&1; then
            yum install -y git
        fi
    fi
    
    read -p "Enter Git repository URL: " repo_url
    read -p "Enter branch name (default: main): " branch_name
    branch_name=${branch_name:-main}
    
    log "${BLUE}Cloning repository...${NC}"
    
    # Create temporary directory for cloning
    TEMP_DIR=$(mktemp -d)
    
    if git clone --branch "$branch_name" --depth 1 "$repo_url" "$TEMP_DIR"; then
        log "${GREEN}✅ Repository cloned successfully${NC}"
        copy_source_code "$TEMP_DIR"
        rm -rf "$TEMP_DIR"
    else
        echo -e "${RED}❌ Failed to clone repository${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
}

# Function to deploy from archive
deploy_from_archive() {
    echo ""
    echo -e "${BLUE}Deploy from Archive${NC}"
    echo "==================="
    echo ""
    echo "Supported formats: .zip, .tar.gz, .tar.bz2"
    echo ""
    
    while true; do
        read -p "Enter path to archive file: " archive_path
        
        if [[ -f "$archive_path" ]]; then
            extract_archive "$archive_path"
            break
        else
            echo -e "${RED}❌ Archive file not found: $archive_path${NC}"
        fi
    done
}

# Function to extract archive
extract_archive() {
    local archive_path="$1"
    local temp_dir=$(mktemp -d)
    
    log "${BLUE}Extracting archive...${NC}"
    
    case "$archive_path" in
        *.zip)
            if command -v unzip >/dev/null 2>&1; then
                unzip -q "$archive_path" -d "$temp_dir"
            else
                echo -e "${RED}❌ unzip command not found${NC}"
                exit 1
            fi
            ;;
        *.tar.gz)
            tar -xzf "$archive_path" -C "$temp_dir"
            ;;
        *.tar.bz2)
            tar -xjf "$archive_path" -C "$temp_dir"
            ;;
        *)
            echo -e "${RED}❌ Unsupported archive format${NC}"
            exit 1
            ;;
    esac
    
    # Find the extracted directory with package.json
    local source_dir=""
    for dir in "$temp_dir"/*; do
        if [[ -d "$dir" && -f "$dir/package.json" ]]; then
            source_dir="$dir"
            break
        fi
    done
    
    if [[ -n "$source_dir" ]]; then
        log "${GREEN}✅ Archive extracted successfully${NC}"
        copy_source_code "$source_dir"
    else
        echo -e "${RED}❌ No valid Node.js project found in archive${NC}"
        exit 1
    fi
    
    rm -rf "$temp_dir"
}

# Function to copy source code
copy_source_code() {
    local source_path="$1"
    
    log "${BLUE}Preparing application directory...${NC}"
    
    # Create backup of existing deployment
    if [[ -d "$APP_SOURCE_DIR" ]]; then
        local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
        log "${BLUE}Creating backup: $backup_name${NC}"
        mkdir -p "$BACKUP_DIR"
        mv "$APP_SOURCE_DIR" "$BACKUP_DIR/$backup_name"
    fi
    
    # Create fresh app directory
    mkdir -p "$APP_SOURCE_DIR"
    
    # Copy source code
    log "${BLUE}Copying source code...${NC}"
    cp -r "$source_path"/* "$APP_SOURCE_DIR/"
    
    # Set ownership
    chown -R "$APP_USER:$APP_USER" "$APP_SOURCE_DIR"
    
    log "${GREEN}✅ Source code deployed${NC}"
}

# Function to install dependencies
install_dependencies() {
    log "${BLUE}Installing Node.js dependencies...${NC}"
    
    cd "$APP_SOURCE_DIR"
    
    # Set npm configuration for production
    npm config set fund false
    npm config set audit false
    
    # Install dependencies using npm ci for production
    if sudo -u "$APP_USER" npm ci --production; then
        log "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        echo "Check package.json and npm logs for errors"
        exit 1
    fi
}

# Function to build application
build_application() {
    log "${BLUE}Building application...${NC}"
    
    cd "$APP_SOURCE_DIR"
    
    # Run build command
    if sudo -u "$APP_USER" npm run build; then
        log "${GREEN}✅ Application built successfully${NC}"
        
        # Verify build output
        if [[ -d "dist" ]]; then
            log "${GREEN}✅ Build output verified in dist/ directory${NC}"
        else
            echo -e "${YELLOW}⚠️  Build completed but dist/ directory not found${NC}"
        fi
    else
        echo -e "${RED}❌ Application build failed${NC}"
        echo "Check build logs for errors"
        exit 1
    fi
}

# Function to run database migration
run_database_migration() {
    log "${BLUE}Running database schema migration...${NC}"
    
    cd "$APP_SOURCE_DIR"
    
    # Copy environment file to app directory
    if [[ -f "$APP_DIR/.env" ]]; then
        cp "$APP_DIR/.env" "$APP_SOURCE_DIR/.env"
        chown "$APP_USER:$APP_USER" "$APP_SOURCE_DIR/.env"
        chmod 600 "$APP_SOURCE_DIR/.env"
    fi
    
    # Run database push
    if sudo -u "$APP_USER" npm run db:push; then
        log "${GREEN}✅ Database schema updated${NC}"
    else
        echo -e "${RED}❌ Database migration failed${NC}"
        echo "Check database connection and schema files"
        exit 1
    fi
}

# Function to create systemd service
create_systemd_service() {
    log "${BLUE}Creating systemd service...${NC}"
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=HandyTech Solutions - Professional Handyman Services Platform
Documentation=https://github.com/handytech-solutions/platform
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_SOURCE_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=30
Restart=always
RestartSec=10
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR /var/log/handytech /tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log "${GREEN}✅ Systemd service created and enabled${NC}"
}

# Function to test deployment
test_deployment() {
    log "${BLUE}Testing deployment...${NC}"
    
    # Start the service
    systemctl start "$SERVICE_NAME"
    
    # Wait for service to start
    sleep 10
    
    # Check service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "${GREEN}✅ Service started successfully${NC}"
        
        # Test HTTP endpoint
        if curl -f -s http://localhost:5000/api/health >/dev/null; then
            log "${GREEN}✅ Health check endpoint responding${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check endpoint not responding yet${NC}"
            echo "Service may still be starting up..."
        fi
    else
        echo -e "${RED}❌ Service failed to start${NC}"
        echo ""
        echo "Service status:"
        systemctl status "$SERVICE_NAME" --no-pager
        echo ""
        echo "Recent logs:"
        journalctl -u "$SERVICE_NAME" --no-pager --lines=20
        exit 1
    fi
}

# Function to display deployment summary
display_summary() {
    echo ""
    echo -e "${GREEN}🎉 Application deployment completed successfully!${NC}"
    echo "=================================================="
    echo ""
    echo -e "${BLUE}Deployment Information:${NC}"
    echo "• Application directory: $APP_SOURCE_DIR"
    echo "• Service name: $SERVICE_NAME"
    echo "• Service status: $(systemctl is-active $SERVICE_NAME)"
    echo "• Port: 5000"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "• Check service status: systemctl status $SERVICE_NAME"
    echo "• View logs: journalctl -u $SERVICE_NAME -f"
    echo "• Restart service: systemctl restart $SERVICE_NAME"
    echo "• Stop service: systemctl stop $SERVICE_NAME"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Run validation script: ./99-validate.sh"
    echo "2. Configure domain and SSL certificate"
    echo "3. Set up monitoring and backups"
    echo ""
    echo -e "${GREEN}Application should be accessible at:${NC}"
    echo "• Local: http://localhost:5000"
    echo "• Network: http://$(hostname -I | awk '{print $1}'):5000"
    echo ""
}

# Main execution
main() {
    log "${BLUE}Starting application deployment...${NC}"
    
    check_root
    validate_prerequisites
    validate_environment
    get_deployment_source
    install_dependencies
    build_application
    run_database_migration
    create_systemd_service
    test_deployment
    
    display_summary
}

# Execute main function
main "$@"