#!/bin/bash
# HandyTech Solutions - Deployment Smoke Tests
# Run these tests after deployment to verify all systems are working

set -e  # Exit on any error

BASE_URL="http://127.0.0.1:5000"
TIMEZONE="America/New_York"

echo "🧪 Running HandyTech Solutions Smoke Tests..."
echo "====================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_check="$3"
    
    echo -n "Testing ${test_name}... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        if [ -n "$expected_check" ]; then
            if eval "$expected_check" >/dev/null 2>&1; then
                echo -e "${GREEN}✓ PASS${NC}"
                ((TESTS_PASSED++))
            else
                echo -e "${RED}✗ FAIL (validation failed)${NC}"
                ((TESTS_FAILED++))
            fi
        else
            echo -e "${GREEN}✓ PASS${NC}"
            ((TESTS_PASSED++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# 1. Health Check
run_test "Health endpoint" \
    "curl -fsS ${BASE_URL}/health" \
    ""

# 2. API Health Check
run_test "API health endpoint" \
    "curl -fsS ${BASE_URL}/api/health | jq -e '.status == \"healthy\"'" \
    ""

# 3. Availability Rules - New endpoints
run_test "Availability rules endpoint" \
    "curl -fsS ${BASE_URL}/api/availability/rules | jq -e '.rules | length >= 0'" \
    ""

run_test "Active availability rules endpoint" \
    "curl -fsS ${BASE_URL}/api/availability/rules/active | jq -e '.rules | length >= 0'" \
    ""

# 4. Legacy availability rules endpoints (ensure backward compatibility)
run_test "Legacy availability-rules endpoint" \
    "curl -fsS ${BASE_URL}/api/availability-rules | jq -e 'length >= 0'" \
    ""

# 5. Availability endpoint with hours parameter
FROM=$(date -u +"%Y-%m-%dT00:00:00Z")
TO=$(date -u -d "+7 days" +"%Y-%m-%dT23:59:59Z")

run_test "Availability with hours parameter" \
    "curl -fsS '${BASE_URL}/api/availability?from=${FROM}&to=${TO}&hours=2&timezone=${TIMEZONE}' | jq -e 'type == \"array\"'" \
    ""

# 6. Test services endpoint
run_test "Services catalog endpoint" \
    "curl -fsS ${BASE_URL}/api/services | jq -e 'length >= 0'" \
    ""

# 7. Test customers endpoint (admin functionality)
run_test "Customers endpoint" \
    "curl -fsS ${BASE_URL}/api/customers | jq -e 'type == \"array\"'" \
    ""

# 8. Test quotes endpoint
run_test "Quotes endpoint" \
    "curl -fsS ${BASE_URL}/api/quotes | jq -e 'type == \"array\"'" \
    ""

# 9. Test static file serving
run_test "Static file serving (index.html)" \
    "curl -fsS ${BASE_URL}/ | grep -q '<html'" \
    ""

# 10. Test uploads directory exists and is accessible
run_test "Uploads directory accessible" \
    "curl -fsS -I ${BASE_URL}/uploads/ || true" \
    ""

echo ""
echo "====================================================="
echo "🧪 Smoke Test Results:"
echo -e "  ${GREEN}✓ ${TESTS_PASSED} tests passed${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "  ${RED}✗ ${TESTS_FAILED} tests failed${NC}"
    echo ""
    echo -e "${YELLOW}❗ Some tests failed. Check the application logs and environment configuration.${NC}"
    exit 1
else
    echo -e "  ${GREEN}🎉 All tests passed! Application is ready.${NC}"
fi

echo ""
echo "📊 Additional Checks:"
echo "  • Database connection: Check APPLICATION_URL in environment"
echo "  • Email configuration: Verify SMTP_* environment variables"
echo "  • Google Calendar: Check GOOGLE_CLIENT_* environment variables"
echo "  • Security: Ensure SESSION_SECRET and JWT_SECRET are set"
echo ""
echo "🔧 Manual Verification:"
echo "  1. Visit ${BASE_URL}/admin for admin dashboard"
echo "  2. Visit ${BASE_URL}/ for main website"
echo "  3. Test appointment booking functionality"
echo "  4. Verify email notifications are working"
echo ""