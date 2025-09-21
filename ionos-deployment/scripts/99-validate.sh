#!/bin/bash
set -euo pipefail

# HandyTech Solutions - Complete Deployment Validation Script
# Validates deployment according to deploy.json requirements

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
SERVICE_NAME="handytech"

# Counters
ERRORS=0
WARNINGS=0
PASSED=0

echo -e "${BLUE}HandyTech Solutions - Deployment Validation${NC}"
echo "============================================="
echo "This script validates the complete deployment according to deploy.json requirements"
echo ""

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to test and track results
test_check() {
    local test_name="$1"
    local test_result="$2"
    local is_critical="${3:-true}"
    
    if [[ "$test_result" == "true" ]]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        ((PASSED++))
        return 0
    else
        if [[ "$is_critical" == "true" ]]; then
            echo -e "${RED}❌ $test_name${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  $test_name${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# Function to check Node.js version
check_nodejs() {
    log "${BLUE}Checking Node.js installation...${NC}"
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_VERSION" -ge 20 ]]; then
            test_check "Node.js version $NODE_VERSION (>= 20 required)" "true"
        else
            test_check "Node.js version $NODE_VERSION (>= 20 required)" "false"
        fi
    else
        test_check "Node.js installed" "false"
    fi
    
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        test_check "npm installed (version $NPM_VERSION)" "true"
    else
        test_check "npm installed" "false"
    fi
}

# Function to check required files
check_required_files() {
    log "${BLUE}Checking required files...${NC}"
    
    # Files from deploy.json preDeploymentChecks
    test_check "package.json exists" "$(test -f "$APP_SOURCE_DIR/package.json" && echo true || echo false)"
    test_check "server/index.ts exists" "$(test -f "$APP_SOURCE_DIR/server/index.ts" && echo true || echo false)"
    test_check "shared/schema.ts exists" "$(test -f "$APP_SOURCE_DIR/shared/schema.ts" && echo true || echo false)"
    
    # Additional critical files
    test_check "Environment file exists" "$(test -f "$APP_DIR/.env" && echo true || echo false)"
    test_check "Build output exists" "$(test -d "$APP_SOURCE_DIR/dist" && echo true || echo false)"
    test_check "Systemd service file exists" "$(test -f "/etc/systemd/system/$SERVICE_NAME.service" && echo true || echo false)"
}

# Function to validate environment variables
validate_environment() {
    log "${BLUE}Validating environment variables...${NC}"
    
    if [[ -f "$APP_DIR/.env" ]]; then
        # Source environment safely
        while IFS= read -r line; do
            if [[ "$line" =~ ^[A-Z_]+=.* ]]; then
                export "$line"
            fi
        done < <(grep "^[A-Z_]*=" "$APP_DIR/.env" 2>/dev/null || true)
        
        # Required variables from deploy.json
        test_check "DATABASE_URL configured" "$(test -n "${DATABASE_URL:-}" && echo true || echo false)"
        test_check "SESSION_SECRET configured" "$(test -n "${SESSION_SECRET:-}" && echo true || echo false)"
        test_check "ADMIN_PASSWORD configured" "$(test -n "${ADMIN_PASSWORD:-}" && echo true || echo false)"
        test_check "ADMIN_EMAIL configured" "$(test -n "${ADMIN_EMAIL:-}" && echo true || echo false)"
        test_check "SMTP_HOST configured" "$(test -n "${SMTP_HOST:-}" && echo true || echo false)"
        test_check "SMTP_USER configured" "$(test -n "${SMTP_USER:-}" && echo true || echo false)"
        test_check "SMTP_PASS configured" "$(test -n "${SMTP_PASS:-}" && echo true || echo false)"
        test_check "GOOGLE_CLIENT_ID configured" "$(test -n "${GOOGLE_CLIENT_ID:-}" && echo true || echo false)"
        test_check "GOOGLE_CLIENT_SECRET configured" "$(test -n "${GOOGLE_CLIENT_SECRET:-}" && echo true || echo false)"
        test_check "GOOGLE_REDIRECT_URI configured" "$(test -n "${GOOGLE_REDIRECT_URI:-}" && echo true || echo false)"
        
        # Optional but recommended
        test_check "OPENAI_API_KEY configured" "$(test -n "${OPENAI_API_KEY:-}" && echo true || echo false)" "false"
        test_check "NODE_ENV set to production" "$(test "${NODE_ENV:-}" = "production" && echo true || echo false)" "false"
    else
        test_check "Environment file readable" "false"
    fi
}

# Function to check database connection
check_database_connection() {
    log "${BLUE}Testing database connection...${NC}"
    
    if [[ -n "${DATABASE_URL:-}" ]]; then
        if command -v psql >/dev/null 2>&1; then
            if timeout 10 psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                test_check "Database connection successful" "true"
            else
                test_check "Database connection successful" "false"
            fi
        else
            test_check "psql available for database testing" "false" "false"
        fi
    else
        test_check "DATABASE_URL available for testing" "false"
    fi
}

# Function to check dependencies
check_dependencies() {
    log "${BLUE}Checking Node.js dependencies...${NC}"
    
    if [[ -d "$APP_SOURCE_DIR/node_modules" ]]; then
        test_check "node_modules directory exists" "true"
        
        # Check critical dependencies from deploy.json
        test_check "express installed" "$(test -d "$APP_SOURCE_DIR/node_modules/express" && echo true || echo false)"
        test_check "drizzle-orm installed" "$(test -d "$APP_SOURCE_DIR/node_modules/drizzle-orm" && echo true || echo false)"
        
        # Check if package-lock.json indicates clean install
        if [[ -f "$APP_SOURCE_DIR/package-lock.json" ]]; then
            test_check "package-lock.json exists (clean install)" "true"
        else
            test_check "package-lock.json exists (clean install)" "false" "false"
        fi
    else
        test_check "Node.js dependencies installed" "false"
    fi
}

# Function to check build output
check_build_output() {
    log "${BLUE}Checking build output...${NC}"
    
    # From deploy.json validation requirements
    if [[ -d "$APP_SOURCE_DIR/dist" ]]; then
        test_check "dist directory exists" "true"
        test_check "dist/public/index.html exists" "$(test -f "$APP_SOURCE_DIR/dist/public/index.html" && echo true || echo false)"
        test_check "dist/public/assets exists" "$(test -d "$APP_SOURCE_DIR/dist/public/assets" && echo true || echo false)"
        test_check "dist/index.js exists (server build)" "$(test -f "$APP_SOURCE_DIR/dist/index.js" && echo true || echo false)"
    else
        test_check "Build output directory exists" "false"
    fi
}

# Function to check service status
check_service_status() {
    log "${BLUE}Checking service status...${NC}"
    
    test_check "Service is active" "$(systemctl is-active --quiet "$SERVICE_NAME" && echo true || echo false)"
    test_check "Service is enabled" "$(systemctl is-enabled --quiet "$SERVICE_NAME" && echo true || echo false)"
    
    # Check if service is responding
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        sleep 2  # Give service a moment to fully start
        if curl -f -s http://localhost:5000/api/health >/dev/null 2>&1; then
            test_check "Service health endpoint responding" "true"
        else
            test_check "Service health endpoint responding" "false"
        fi
    else
        test_check "Service health endpoint responding" "false"
    fi
}

# Function to run post-deployment validation from deploy.json
run_post_deployment_validation() {
    log "${BLUE}Running post-deployment validation...${NC}"
    
    # Health Check from deploy.json
    local health_check=$(curl -f -s http://localhost:5000/api/health 2>/dev/null || echo "")
    if [[ "$health_check" =~ "healthy" ]] || curl -f -s http://localhost:5000/api/health >/dev/null 2>&1; then
        test_check "Health Check (200 response)" "true"
    else
        test_check "Health Check (200 response)" "false"
    fi
    
    # Admin Portal Access
    if curl -f -s http://localhost:5000/admin >/dev/null 2>&1; then
        test_check "Admin Portal Access (200 response)" "true"
    else
        test_check "Admin Portal Access (200 response)" "false"
    fi
    
    # Database Connection via API
    if curl -f -s http://localhost:5000/api/customers >/dev/null 2>&1; then
        test_check "Database Connection via API" "true"
    else
        test_check "Database Connection via API" "false"
    fi
}

# Function to check security configuration
check_security() {
    log "${BLUE}Checking security configuration...${NC}"
    
    # File permissions
    if [[ -f "$APP_DIR/.env" ]]; then
        ENV_PERMS=$(stat -f "%Mp%Lp" "$APP_DIR/.env" 2>/dev/null || stat -c "%a" "$APP_DIR/.env" 2>/dev/null || echo "unknown")
        if [[ "$ENV_PERMS" == "100600" ]] || [[ "$ENV_PERMS" == "600" ]]; then
            test_check "Environment file permissions (600)" "true"
        else
            test_check "Environment file permissions (600)" "false"
        fi
    fi
    
    # Service user
    test_check "Service runs as non-root user" "$(systemctl show "$SERVICE_NAME" -p User | grep -q "User=$APP_USER" && echo true || echo false)"
    
    # Session secret strength
    if [[ -n "${SESSION_SECRET:-}" ]]; then
        if [[ ${#SESSION_SECRET} -ge 32 ]]; then
            test_check "SESSION_SECRET length (32+ characters)" "true"
        else
            test_check "SESSION_SECRET length (32+ characters)" "false"
        fi
    fi
}

# Function to check system resources
check_system_resources() {
    log "${BLUE}Checking system resources...${NC}"
    
    # Memory usage
    local mem_usage=$(free | grep "Mem:" | awk '{printf "%.0f", $3/$2 * 100}')
    if [[ $mem_usage -lt 80 ]]; then
        test_check "Memory usage acceptable (<80%): ${mem_usage}%" "true" "false"
    else
        test_check "Memory usage acceptable (<80%): ${mem_usage}%" "false" "false"
    fi
    
    # Disk usage
    local disk_usage=$(df "$APP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -lt 90 ]]; then
        test_check "Disk usage acceptable (<90%): ${disk_usage}%" "true" "false"
    else
        test_check "Disk usage acceptable (<90%): ${disk_usage}%" "false" "false"
    fi
    
    # Service memory usage
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        local service_mem=$(systemctl show "$SERVICE_NAME" -p MemoryCurrent | cut -d'=' -f2)
        if [[ "$service_mem" != "[not set]" ]] && [[ $service_mem -gt 0 ]]; then
            local service_mem_mb=$((service_mem / 1024 / 1024))
            test_check "Service memory usage: ${service_mem_mb}MB" "true" "false"
        fi
    fi
}

# Function to display final summary
display_summary() {
    echo ""
    echo -e "${BLUE}Validation Summary${NC}"
    echo "=================="
    echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
    echo -e "Errors: ${RED}$ERRORS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo ""
    
    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}🎉 Deployment validation PASSED!${NC}"
        echo "HandyTech Solutions is ready for production use."
        echo ""
        echo -e "${BLUE}Application URLs:${NC}"
        echo "• Homepage: http://$(hostname -I | awk '{print $1}'):5000"
        echo "• Admin Portal: http://$(hostname -I | awk '{print $1}'):5000/admin"
        echo "• Customer Portal: http://$(hostname -I | awk '{print $1}'):5000/customer-portal"
        echo "• Health Check: http://$(hostname -I | awk '{print $1}'):5000/api/health"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Configure domain name and SSL certificate"
        echo "2. Set up monitoring and alerting"
        echo "3. Configure backup procedures"
        echo "4. Review security settings"
        
        if [[ $WARNINGS -gt 0 ]]; then
            echo ""
            echo -e "${YELLOW}Note: $WARNINGS warnings detected - review for optimization${NC}"
        fi
        
        exit 0
    else
        echo -e "${RED}❌ Deployment validation FAILED with $ERRORS critical errors${NC}"
        echo ""
        echo "Please resolve the errors above before proceeding to production."
        echo ""
        echo -e "${BLUE}Troubleshooting:${NC}"
        echo "• Check service logs: journalctl -u $SERVICE_NAME -n 50"
        echo "• Verify environment: ./validate-secrets.sh"
        echo "• Check service status: systemctl status $SERVICE_NAME"
        echo ""
        exit 1
    fi
}

# Main execution
main() {
    log "${BLUE}Starting deployment validation...${NC}"
    
    check_nodejs
    check_required_files
    validate_environment
    check_database_connection
    check_dependencies
    check_build_output
    check_service_status
    run_post_deployment_validation
    check_security
    check_system_resources
    
    display_summary
}

# Execute main function
main "$@"