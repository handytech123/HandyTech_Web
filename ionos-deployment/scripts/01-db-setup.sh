#!/bin/bash
set -euo pipefail

# HandyTech Solutions - Database Setup Script
# Supports both managed PostgreSQL and local installation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="handytech"
APP_DIR="/opt/handytech"
DB_NAME="handytech"
DB_USER="handytech"
POSTGRES_VERSION="15"

echo -e "${BLUE}HandyTech Solutions - Database Setup${NC}"
echo "===================================="
echo "This script supports two database options:"
echo "1. Managed PostgreSQL (IONOS Database service)"
echo "2. Local PostgreSQL installation"
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

# Function to check for existing DATABASE_URL
check_existing_database() {
    if [[ -f "$APP_DIR/.env" ]]; then
        if grep -q "^DATABASE_URL=" "$APP_DIR/.env" 2>/dev/null; then
            DATABASE_URL=$(grep "^DATABASE_URL=" "$APP_DIR/.env" | cut -d'=' -f2-)
            if [[ -n "$DATABASE_URL" && "$DATABASE_URL" != "postgresql://username:password@hostname:port/database" ]]; then
                log "${GREEN}✅ DATABASE_URL already configured in .env${NC}"
                echo -e "${BLUE}Testing existing database connection...${NC}"
                if test_database_connection "$DATABASE_URL"; then
                    log "${GREEN}✅ Database connection successful${NC}"
                    echo ""
                    echo -e "${GREEN}Database is already configured and working!${NC}"
                    echo "Skipping database setup."
                    exit 0
                else
                    log "${YELLOW}⚠️  Existing DATABASE_URL found but connection failed${NC}"
                    echo "Continuing with database setup..."
                fi
            fi
        fi
    fi
}

# Function to test database connection
test_database_connection() {
    local db_url="$1"
    
    # Extract connection details for testing
    if command -v psql >/dev/null 2>&1; then
        if timeout 10 psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function to prompt for database type
choose_database_option() {
    echo -e "${BLUE}Database Setup Options:${NC}"
    echo "======================"
    echo "1. Managed PostgreSQL (Recommended for production)"
    echo "   • Use IONOS Database service or external provider"
    echo "   • Provides automatic backups, high availability"
    echo "   • Requires manual setup through IONOS console"
    echo ""
    echo "2. Local PostgreSQL Installation"
    echo "   • Install PostgreSQL on this server"
    echo "   • Suitable for small deployments or testing"
    echo "   • Requires manual backup configuration"
    echo ""
    
    while true; do
        read -p "Choose database option (1 for managed, 2 for local): " choice
        case $choice in
            1)
                log "${BLUE}Selected: Managed PostgreSQL${NC}"
                setup_managed_database
                break
                ;;
            2)
                log "${BLUE}Selected: Local PostgreSQL Installation${NC}"
                install_local_postgresql
                break
                ;;
            *)
                echo -e "${RED}❌ Invalid choice. Please enter 1 or 2.${NC}"
                ;;
        esac
    done
}

# Function to setup managed database
setup_managed_database() {
    echo ""
    echo -e "${BLUE}Managed PostgreSQL Setup${NC}"
    echo "========================"
    echo ""
    echo -e "${YELLOW}To use a managed PostgreSQL database:${NC}"
    echo ""
    echo "1. Create a PostgreSQL database through your provider:"
    echo "   • IONOS: Control Panel → Databases → Create Database"
    echo "   • AWS RDS, Google Cloud SQL, or other providers"
    echo ""
    echo "2. Get your database connection string in this format:"
    echo "   postgresql://username:password@hostname:port/database"
    echo ""
    echo "3. Add the connection string to your .env file:"
    echo "   DATABASE_URL=postgresql://username:password@hostname:port/database"
    echo ""
    
    while true; do
        echo -e "${BLUE}Do you have a DATABASE_URL ready? (y/n):${NC}"
        read -p "> " has_url
        
        case $has_url in
            [Yy]*)
                read -p "Enter your DATABASE_URL: " db_url
                if [[ -n "$db_url" && "$db_url" =~ ^postgresql:// ]]; then
                    echo "Testing database connection..."
                    if test_database_connection "$db_url"; then
                        log "${GREEN}✅ Database connection successful${NC}"
                        save_database_url "$db_url"
                        log "${GREEN}✅ Managed database configured${NC}"
                        return 0
                    else
                        echo -e "${RED}❌ Database connection failed${NC}"
                        echo "Please check your connection string and try again."
                    fi
                else
                    echo -e "${RED}❌ Invalid DATABASE_URL format${NC}"
                    echo "Must start with 'postgresql://'"
                fi
                ;;
            [Nn]*)
                echo ""
                echo -e "${YELLOW}Please set up your managed database first:${NC}"
                echo ""
                echo "1. Create database through your provider"
                echo "2. Get the connection string"
                echo "3. Run this script again with the connection string"
                echo ""
                echo "Alternatively, choose option 2 for local installation."
                exit 1
                ;;
            *)
                echo -e "${RED}❌ Please answer y or n${NC}"
                ;;
        esac
    done
}

# Function to install local PostgreSQL
install_local_postgresql() {
    echo ""
    echo -e "${BLUE}Installing PostgreSQL $POSTGRES_VERSION locally...${NC}"
    
    case $OS in
        ubuntu|debian)
            install_postgresql_debian
            ;;
        centos|rhel|rocky|alma)
            install_postgresql_rhel
            ;;
        *)
            echo -e "${RED}❌ Unsupported OS for local PostgreSQL installation: $OS${NC}"
            exit 1
            ;;
    esac
    
    configure_local_postgresql
}

# Function to install PostgreSQL on Debian/Ubuntu
install_postgresql_debian() {
    log "${BLUE}Installing PostgreSQL on Debian/Ubuntu...${NC}"
    
    # Add PostgreSQL official repository
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    
    # Update package list
    apt-get update
    
    # Install PostgreSQL
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        "postgresql-$POSTGRES_VERSION" \
        "postgresql-contrib-$POSTGRES_VERSION" \
        postgresql-client-common \
        postgresql-common
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log "${GREEN}✅ PostgreSQL $POSTGRES_VERSION installed${NC}"
}

# Function to install PostgreSQL on RHEL/CentOS
install_postgresql_rhel() {
    log "${BLUE}Installing PostgreSQL on RHEL/CentOS...${NC}"
    
    # Install PostgreSQL repository
    yum install -y "https://download.postgresql.org/pub/repos/yum/reporpms/EL-$(rpm -E %{rhel})-x86_64/pgdg-redhat-repo-latest.noarch.rpm"
    
    # Install PostgreSQL
    yum install -y \
        "postgresql${POSTGRES_VERSION}-server" \
        "postgresql${POSTGRES_VERSION}" \
        "postgresql${POSTGRES_VERSION}-contrib"
    
    # Initialize database
    "/usr/pgsql-$POSTGRES_VERSION/bin/postgresql-$POSTGRES_VERSION-setup" initdb
    
    # Start and enable PostgreSQL
    systemctl start "postgresql-$POSTGRES_VERSION"
    systemctl enable "postgresql-$POSTGRES_VERSION"
    
    log "${GREEN}✅ PostgreSQL $POSTGRES_VERSION installed${NC}"
}

# Function to configure local PostgreSQL
configure_local_postgresql() {
    log "${BLUE}Configuring local PostgreSQL...${NC}"
    
    # Generate secure random password
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    # Configure PostgreSQL for local connections
    POSTGRES_CONF_DIR="/etc/postgresql/$POSTGRES_VERSION/main"
    if [[ ! -d "$POSTGRES_CONF_DIR" ]]; then
        # Try RHEL path
        POSTGRES_CONF_DIR="/var/lib/pgsql/$POSTGRES_VERSION/data"
    fi
    
    if [[ -d "$POSTGRES_CONF_DIR" ]]; then
        # Update postgresql.conf
        if [[ -f "$POSTGRES_CONF_DIR/postgresql.conf" ]]; then
            sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$POSTGRES_CONF_DIR/postgresql.conf"
        fi
        
        # Update pg_hba.conf for local connections
        if [[ -f "$POSTGRES_CONF_DIR/pg_hba.conf" ]]; then
            # Backup original
            cp "$POSTGRES_CONF_DIR/pg_hba.conf" "$POSTGRES_CONF_DIR/pg_hba.conf.backup"
            
            # Add rule for local application connection
            echo "local   $DB_NAME    $DB_USER                            md5" >> "$POSTGRES_CONF_DIR/pg_hba.conf"
        fi
    fi
    
    # Restart PostgreSQL to apply configuration
    systemctl restart postgresql || systemctl restart "postgresql-$POSTGRES_VERSION"
    
    # Create DATABASE_URL
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
    
    # Test connection
    if test_database_connection "$DATABASE_URL"; then
        log "${GREEN}✅ Local PostgreSQL configured successfully${NC}"
        save_database_url "$DATABASE_URL"
        
        # Save database credentials securely
        cat > "$APP_DIR/db-credentials.txt" << EOF
Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD
Connection String: $DATABASE_URL

IMPORTANT: Keep these credentials secure!
This file should be moved to a secure location and deleted from here.
EOF
        
        chown "$APP_USER:$APP_USER" "$APP_DIR/db-credentials.txt"
        chmod 600 "$APP_DIR/db-credentials.txt"
        
        log "${GREEN}✅ Database credentials saved to $APP_DIR/db-credentials.txt${NC}"
        log "${YELLOW}⚠️  Please move credentials file to a secure location${NC}"
    else
        echo -e "${RED}❌ Local PostgreSQL configuration failed${NC}"
        exit 1
    fi
}

# Function to save DATABASE_URL to .env file
save_database_url() {
    local db_url="$1"
    
    # Create or update .env file
    if [[ ! -f "$APP_DIR/.env" ]]; then
        if [[ -f "$APP_DIR/.env.template" ]]; then
            cp "$APP_DIR/.env.template" "$APP_DIR/.env"
        else
            touch "$APP_DIR/.env"
        fi
    fi
    
    # Update or add DATABASE_URL
    if grep -q "^DATABASE_URL=" "$APP_DIR/.env"; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$db_url|" "$APP_DIR/.env"
    else
        echo "DATABASE_URL=$db_url" >> "$APP_DIR/.env"
    fi
    
    # Set proper permissions
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    
    log "${GREEN}✅ DATABASE_URL saved to $APP_DIR/.env${NC}"
}

# Function to create backup script for local database
create_backup_script() {
    if [[ -f "$APP_DIR/db-credentials.txt" ]]; then
        log "${BLUE}Creating database backup script...${NC}"
        
        cat > "/usr/local/bin/handytech-db-backup" << 'EOF'
#!/bin/bash
# HandyTech Solutions - Database Backup Script

BACKUP_DIR="/opt/handytech/backups"
DB_NAME="handytech"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/handytech_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create database backup
sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "handytech_backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: ${BACKUP_FILE}.gz"
EOF
        
        chmod +x "/usr/local/bin/handytech-db-backup"
        
        # Create cron job for daily backups
        echo "0 2 * * * /usr/local/bin/handytech-db-backup" | crontab -u root -
        
        log "${GREEN}✅ Database backup script created${NC}"
        log "${GREEN}✅ Daily backup scheduled at 2:00 AM${NC}"
    fi
}

# Function to display database setup summary
display_summary() {
    echo ""
    echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
    echo "=========================================="
    echo ""
    
    if [[ -f "$APP_DIR/db-credentials.txt" ]]; then
        echo -e "${BLUE}Local PostgreSQL Configuration:${NC}"
        echo "• Database installed and configured"
        echo "• Application database and user created"
        echo "• Automatic daily backups scheduled"
        echo "• Credentials saved to $APP_DIR/db-credentials.txt"
        echo ""
        echo -e "${YELLOW}Security Reminder:${NC}"
        echo "• Move db-credentials.txt to a secure location"
        echo "• Delete the credentials file from $APP_DIR/"
        echo ""
    else
        echo -e "${BLUE}Managed PostgreSQL Configuration:${NC}"
        echo "• DATABASE_URL configured in .env file"
        echo "• Connection tested successfully"
        echo ""
    fi
    
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Verify environment configuration:"
    echo "   ./validate-secrets.sh"
    echo ""
    echo "2. Deploy the application:"
    echo "   ./02-deploy.sh"
    echo ""
}

# Main execution
main() {
    log "${BLUE}Starting database setup...${NC}"
    
    check_root
    detect_os
    check_existing_database
    choose_database_option
    create_backup_script
    
    display_summary
}

# Execute main function
main "$@"