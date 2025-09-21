#!/bin/bash
set -euo pipefail

# HandyTech Solutions - Environment Variables Validation Script
# Validates all required environment variables before deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

echo -e "${BLUE}HandyTech Solutions - Environment Validation${NC}"
echo "=================================================="

# Function to check required variable
check_required() {
    local var_name="$1"
    local description="$2"
    local min_length="${3:-1}"
    
    if [[ -z "${!var_name:-}" ]]; then
        echo -e "${RED}❌ REQUIRED: $var_name${NC}"
        echo -e "   Description: $description"
        ((ERRORS++))
        return 1
    elif [[ ${#!var_name} -lt $min_length ]]; then
        echo -e "${RED}❌ TOO SHORT: $var_name${NC}"
        echo -e "   Description: $description"
        echo -e "   Current length: ${#!var_name}, minimum required: $min_length"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✅ $var_name${NC}"
        return 0
    fi
}

# Function to check optional variable
check_optional() {
    local var_name="$1"
    local description="$2"
    local default_value="${3:-}"
    
    if [[ -z "${!var_name:-}" ]]; then
        if [[ -n "$default_value" ]]; then
            echo -e "${YELLOW}⚠️  OPTIONAL: $var_name (will use default: $default_value)${NC}"
        else
            echo -e "${YELLOW}⚠️  OPTIONAL: $var_name (not set)${NC}"
        fi
        echo -e "   Description: $description"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ $var_name${NC}"
    fi
}

# Function to validate URL format
validate_url() {
    local url="$1"
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate email format
validate_email() {
    local email="$1"
    if [[ $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

echo -e "\n${BLUE}Checking Required Environment Variables:${NC}"
echo "----------------------------------------"

# Database Configuration
check_required "DATABASE_URL" "PostgreSQL database connection string"
if [[ -n "${DATABASE_URL:-}" ]] && [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ DATABASE_URL must start with 'postgresql://'${NC}"
    ((ERRORS++))
fi

# Security Configuration
check_required "SESSION_SECRET" "Secret key for session encryption" 32
check_required "ADMIN_PASSWORD" "Admin portal login password" 8

# Email Configuration
check_required "ADMIN_EMAIL" "Admin email address for notifications"
if [[ -n "${ADMIN_EMAIL:-}" ]] && ! validate_email "$ADMIN_EMAIL"; then
    echo -e "${RED}❌ ADMIN_EMAIL must be a valid email address${NC}"
    ((ERRORS++))
fi

check_required "SMTP_HOST" "SMTP server hostname"
check_required "SMTP_USER" "SMTP authentication username"
if [[ -n "${SMTP_USER:-}" ]] && ! validate_email "$SMTP_USER"; then
    echo -e "${RED}❌ SMTP_USER must be a valid email address${NC}"
    ((ERRORS++))
fi

check_required "SMTP_PASS" "SMTP authentication password"

# Google Calendar Integration
check_required "GOOGLE_CLIENT_ID" "Google OAuth Client ID"
check_required "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret"
check_required "GOOGLE_REDIRECT_URI" "Google OAuth redirect URI"
if [[ -n "${GOOGLE_REDIRECT_URI:-}" ]] && ! validate_url "$GOOGLE_REDIRECT_URI"; then
    echo -e "${RED}❌ GOOGLE_REDIRECT_URI must be a valid HTTPS URL${NC}"
    ((ERRORS++))
fi

echo -e "\n${BLUE}Checking Optional Environment Variables:${NC}"
echo "----------------------------------------"

# Google Calendar Settings
check_optional "GOOGLE_CALENDAR_ID" "Target Google Calendar ID" "primary"
check_optional "TZ" "Timezone for appointments" "America/Chicago"

# AI Services
check_optional "OPENAI_API_KEY" "OpenAI API key for AI chatbot"

# Email Marketing
check_optional "BREVO_API_KEY" "Brevo API key for email automation"

# Business Information
check_optional "FROM_EMAIL" "Default sender email address" "service@handytech-solutions.com"
check_optional "BUSINESS_NAME" "Business name" "HandyTech Solutions"
check_optional "BUSINESS_PHONE" "Business phone number" "(314) 325-4575"
check_optional "PUBLIC_BASE_URL" "Public website URL" "https://handytech-solutions.com"

# SMTP Configuration
check_optional "SMTP_PORT" "SMTP server port" "587"

# Security Configuration
check_optional "ALLOWED_ORIGINS" "Allowed CORS origins for production"

# Legacy Configuration
check_optional "JWT_SECRET" "Legacy JWT secret" 32
if [[ -n "${JWT_SECRET:-}" ]] && [[ ${#JWT_SECRET} -lt 32 ]]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET should be at least 32 characters${NC}"
    ((WARNINGS++))
fi

check_optional "ADMIN_USERNAME" "Legacy admin username" "admin"
check_optional "JWT_EXPIRES_IN" "JWT token expiration" "24h"

# System Variables
echo -e "\n${BLUE}Checking System Environment Variables:${NC}"
echo "--------------------------------------"
check_optional "NODE_ENV" "Node.js environment" "production"
check_optional "PORT" "Application port" "5000"

# Final validation
echo -e "\n${BLUE}Validation Summary:${NC}"
echo "=================="
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

# Production-specific validations
if [[ "${NODE_ENV:-}" == "production" ]]; then
    echo -e "\n${BLUE}Production Environment Checks:${NC}"
    echo "-----------------------------"
    
    # Check HTTPS URLs in production
    if [[ -n "${GOOGLE_REDIRECT_URI:-}" ]] && [[ ! "$GOOGLE_REDIRECT_URI" =~ ^https:// ]]; then
        echo -e "${RED}❌ GOOGLE_REDIRECT_URI must use HTTPS in production${NC}"
        ((ERRORS++))
    fi
    
    if [[ -n "${PUBLIC_BASE_URL:-}" ]] && [[ ! "$PUBLIC_BASE_URL" =~ ^https:// ]]; then
        echo -e "${YELLOW}⚠️  PUBLIC_BASE_URL should use HTTPS in production${NC}"
        ((WARNINGS++))
    fi
    
    # Check strong passwords
    if [[ -n "${ADMIN_PASSWORD:-}" ]] && [[ ${#ADMIN_PASSWORD} -lt 12 ]]; then
        echo -e "${YELLOW}⚠️  ADMIN_PASSWORD should be at least 12 characters in production${NC}"
        ((WARNINGS++))
    fi
fi

# Exit with appropriate code
if [[ $ERRORS -gt 0 ]]; then
    echo -e "\n${RED}❌ Environment validation FAILED with $ERRORS errors${NC}"
    echo -e "Please fix the errors above before proceeding with deployment."
    exit 1
else
    echo -e "\n${GREEN}✅ Environment validation PASSED${NC}"
    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}Note: $WARNINGS optional settings are using defaults${NC}"
    fi
    echo "Ready for deployment!"
    exit 0
fi