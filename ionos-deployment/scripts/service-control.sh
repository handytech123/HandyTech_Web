#!/bin/bash
set -euo pipefail

# HandyTech Solutions - Service Control Script
# Provides easy management of the HandyTech service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="handytech"
APP_DIR="/opt/handytech"

# Function to display usage
usage() {
    echo -e "${BLUE}HandyTech Solutions - Service Control${NC}"
    echo "===================================="
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs|enable|disable|health}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the HandyTech service"
    echo "  stop     - Stop the HandyTech service"
    echo "  restart  - Restart the HandyTech service"
    echo "  status   - Show service status"
    echo "  logs     - Show recent logs"
    echo "  enable   - Enable service auto-start on boot"
    echo "  disable  - Disable service auto-start on boot"
    echo "  health   - Run health check"
    echo ""
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        echo "Please run: sudo $0 $1"
        exit 1
    fi
}

# Function to start service
start_service() {
    echo -e "${BLUE}Starting HandyTech service...${NC}"
    if systemctl start "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ Service started successfully${NC}"
        sleep 3
        show_status
    else
        echo -e "${RED}❌ Failed to start service${NC}"
        exit 1
    fi
}

# Function to stop service
stop_service() {
    echo -e "${BLUE}Stopping HandyTech service...${NC}"
    if systemctl stop "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ Service stopped successfully${NC}"
    else
        echo -e "${RED}❌ Failed to stop service${NC}"
        exit 1
    fi
}

# Function to restart service
restart_service() {
    echo -e "${BLUE}Restarting HandyTech service...${NC}"
    if systemctl restart "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ Service restarted successfully${NC}"
        sleep 3
        show_status
    else
        echo -e "${RED}❌ Failed to restart service${NC}"
        exit 1
    fi
}

# Function to show service status
show_status() {
    echo -e "${BLUE}HandyTech Service Status:${NC}"
    echo "========================"
    
    # Service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "Status: ${GREEN}Active (Running)${NC}"
    else
        echo -e "Status: ${RED}Inactive (Stopped)${NC}"
    fi
    
    # Enabled status
    if systemctl is-enabled --quiet "$SERVICE_NAME"; then
        echo -e "Auto-start: ${GREEN}Enabled${NC}"
    else
        echo -e "Auto-start: ${YELLOW}Disabled${NC}"
    fi
    
    echo ""
    systemctl status "$SERVICE_NAME" --no-pager --lines=10
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}HandyTech Service Logs:${NC}"
    echo "======================"
    echo ""
    echo "Press Ctrl+C to exit log view"
    echo ""
    journalctl -u "$SERVICE_NAME" -f --no-pager
}

# Function to enable service
enable_service() {
    echo -e "${BLUE}Enabling HandyTech service auto-start...${NC}"
    if systemctl enable "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ Service auto-start enabled${NC}"
    else
        echo -e "${RED}❌ Failed to enable service${NC}"
        exit 1
    fi
}

# Function to disable service
disable_service() {
    echo -e "${BLUE}Disabling HandyTech service auto-start...${NC}"
    if systemctl disable "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ Service auto-start disabled${NC}"
    else
        echo -e "${RED}❌ Failed to disable service${NC}"
        exit 1
    fi
}

# Function to run health check
health_check() {
    echo -e "${BLUE}Running HandyTech Health Check:${NC}"
    echo "=============================="
    
    # Check service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ Service is running${NC}"
    else
        echo -e "${RED}❌ Service is not running${NC}"
        return 1
    fi
    
    # Check HTTP health endpoint
    if curl -f -s http://localhost:5000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
    else
        echo -e "${RED}❌ Health endpoint not responding${NC}"
        return 1
    fi
    
    # Check environment file
    if [[ -f "$APP_DIR/.env" ]]; then
        echo -e "${GREEN}✅ Environment file exists${NC}"
    else
        echo -e "${RED}❌ Environment file missing${NC}"
        return 1
    fi
    
    # Check database connection (if we can source env safely)
    if [[ -f "$APP_DIR/.env" ]]; then
        if grep -q "^DATABASE_URL=" "$APP_DIR/.env" 2>/dev/null; then
            echo -e "${GREEN}✅ Database URL configured${NC}"
        else
            echo -e "${YELLOW}⚠️  Database URL not configured${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Health check completed successfully${NC}"
}

# Main execution
main() {
    case "${1:-}" in
        start)
            check_root "start"
            start_service
            ;;
        stop)
            check_root "stop"
            stop_service
            ;;
        restart)
            check_root "restart"
            restart_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        enable)
            check_root "enable"
            enable_service
            ;;
        disable)
            check_root "disable"
            disable_service
            ;;
        health)
            health_check
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"