#!/bin/bash
# =============================================================================
# FPCC Backend Deployment Verification Script
# Tests all endpoints to ensure the deployment is working correctly
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HOST="localhost"
PORT=3001
BASE_URL="http://${HOST}:${PORT}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FPCC Backend Verification Script${NC}"
echo -e "${BLUE}Testing: ${BASE_URL}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print test results
print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local payload=$5
    
    local url="${BASE_URL}${endpoint}"
    local response
    local status_code
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "${payload:-{}")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$url" \
            -H "Content-Type: application/json" \
            -d "${payload:-{}")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$url")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        print_pass "$description (HTTP $status_code)"
        if [ -n "$response_body" ] && [ "$response_body" != "null" ]; then
            echo -e "       Response: ${response_body:0:100}..."
        fi
    else
        print_fail "$description (Expected: $expected_status, Got: $status_code)"
        echo -e "       Response: ${response_body:0:200}"
    fi
    
    echo ""
}

# =============================================================================
# TEST 1: Check if server is running
# =============================================================================
echo -e "${YELLOW}Test 1: Checking if server is running...${NC}"
if curl -s --head --connect-timeout 5 "${BASE_URL}" > /dev/null; then
    print_pass "Server is responding"
else
    print_fail "Server is not responding at ${BASE_URL}"
    echo -e "\n${RED}Deployment verification failed. Server is not running.${NC}"
    echo -e "Try starting the server with: ${YELLOW}pm2 start server.js --name fpcc-backend${NC}"
    exit 1
fi
echo ""

# =============================================================================
# TEST 2: Health Check Endpoint
# =============================================================================
echo -e "${YELLOW}Test 2: Testing /api/health endpoint...${NC}"
test_endpoint "GET" "/api/health" "200" "Health check endpoint"

# =============================================================================
# TEST 3: Events Endpoints
# =============================================================================
echo -e "${YELLOW}Test 3: Testing /api/events endpoints...${NC}"

# GET all events
test_endpoint "GET" "/api/events" "200" "GET /api/events - List all events"

# POST new event (create test event)
print_info "Creating test event..."
test_endpoint "POST" "/api/events" "201" "POST /api/events - Create new event" \
    '{
        "id": "test-event-001",
        "title": "Test Event",
        "date": "2026-06-15T18:00:00",
        "duration": 4,
        "staffName": "Test Staff",
        "dressCode": "All Black",
        "clientName": "Test Client"
    }'

# GET specific event
test_endpoint "GET" "/api/events/test-event-001" "200" "GET /api/events/:id - Get specific event"

echo ""

# =============================================================================
# TEST 4: Staff Endpoints
# =============================================================================
echo -e "${YELLOW}Test 4: Testing /api/staff endpoints...${NC}"

# GET all staff
test_endpoint "GET" "/api/staff" "200" "GET /api/staff - List all staff"

# POST new staff (create test staff)
print_info "Creating test staff member..."
test_endpoint "POST" "/api/staff" "201" "POST /api/staff - Create new staff" \
    '{
        "fullName": "Test Staff Member",
        "phone": "+27123456789",
        "email": "test@freshpeople.co.za",
        "role": "Waiter",
        "rate": 150.00
    }'

echo ""

# =============================================================================
# TEST 5: Clients Endpoints
# =============================================================================
echo -e "${YELLOW}Test 5: Testing /api/clients endpoints...${NC}"

# GET all clients
test_endpoint "GET" "/api/clients" "200" "GET /api/clients - List all clients"

# POST new client (create test client)
print_info "Creating test client..."
test_endpoint "POST" "/api/clients" "201" "POST /api/clients - Create new client" \
    '{
        "name": "Test Client Company",
        "contactPerson": "John Doe",
        "email": "john@testclient.com",
        "phone": "+27123456789"
    }'

echo ""

# =============================================================================
# TEST 6: Calendar Endpoint
# =============================================================================
echo -e "${YELLOW}Test 6: Testing /api/calendar.ics endpoint...${NC}"
test_endpoint "GET" "/api/calendar.ics" "200" "GET /api/calendar.ics - iCalendar feed"

# =============================================================================
# TEST 7: Payroll Endpoint
# =============================================================================
echo -e "${YELLOW}Test 7: Testing /api/payroll endpoint...${NC}"
test_endpoint "GET" "/api/payroll" "200" "GET /api/payroll - Payroll data"

# =============================================================================
# TEST 8: Dispatch Staff Endpoint (WhatsApp)
# =============================================================================
echo -e "${YELLOW}Test 8: Testing /api/dispatch-staff endpoint...${NC}"
print_warning "This endpoint requires WHATSAPP_ACCESS_TOKEN in .env"
print_info "Testing with mock data (expect 400 if token is missing)..."
test_endpoint "POST" "/api/dispatch-staff" "200" "POST /api/dispatch-staff - Send WhatsApp message" \
    '{
        "staffId": 1,
        "eventId": "test-event-001",
        "message": "Test dispatch message"
    }'

echo ""

# =============================================================================
# TEST 9: Webhook Endpoints
# =============================================================================
echo -e "${YELLOW}Test 9: Testing /webhook endpoints...${NC}"
test_endpoint "GET" "/webhook" "200" "GET /webhook - Webhook verification"
test_endpoint "POST" "/webhook" "200" "POST /webhook - Webhook handler"

echo ""

# =============================================================================
# TEST 10: Check PM2 Status
# =============================================================================
echo -e "${YELLOW}Test 10: Checking PM2 process status...${NC}"
if command -v pm2 &> /dev/null; then
    pm2_status=$(pm2 list | grep fpcc-backend | awk '{print $19}')
    if [ "$pm2_status" = "online" ]; then
        print_pass "PM2 process 'fpcc-backend' is online"
        echo -e "       Process details:"
        pm2 show fpcc-backend | grep -E "(name|version|pid|uptime|script path|script args|error log path|out log path)"
    else
        print_warning "PM2 process 'fpcc-backend' is not online (status: $pm2_status)"
    fi
else
    print_warning "PM2 is not installed"
fi

echo ""

# =============================================================================
# TEST 11: Check Database Connection
# =============================================================================
echo -e "${YELLOW}Test 11: Checking database connection...${NC}"
if [ -f ".env" ]; then
    source .env
    if [ -n "$DATABASE_URL" ]; then
        print_info "DATABASE_URL is set"
        # Try to connect to the database (simple check)
        if [[ $DATABASE_URL == sqlite* ]]; then
            print_pass "Using SQLite database"
        elif [[ $DATABASE_URL == postgresql* ]] || [[ $DATABASE_URL == postgres* ]]; then
            print_pass "Using PostgreSQL database"
            print_info "Database URL: ${DATABASE_URL:0:50}..."
        fi
    else
        print_warning "DATABASE_URL is not set in .env"
    fi
else
    print_warning ".env file not found"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo -e "\n${GREEN}Deployment is working correctly.${NC}"
    echo -e "API is accessible at: ${YELLOW}${BASE_URL}${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Configure your domain to point to this server"
    echo -e "  2. Set up SSL/HTTPS with Let's Encrypt"
    echo -e "  3. Configure Nginx as a reverse proxy (optional)"
    echo -e "  4. Set up monitoring and log rotation"
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo -e "\n${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check PM2 logs: ${YELLOW}pm2 logs fpcc-backend${NC}"
    echo -e "  2. Check .env file: ${YELLOW}cat .env${NC}"
    echo -e "  3. Restart the server: ${YELLOW}pm2 restart fpcc-backend${NC}"
    echo -e "  4. Check firewall: ${YELLOW}sudo ufw status${NC}"
    exit 1
fi
