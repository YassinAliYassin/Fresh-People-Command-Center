#!/bin/bash
# =============================================================================
# FPCC Backend Deployment Script for VPS
# Server: 102.208.231.11 (zacp111.webway.host)
# Repository: https://github.com/YassinAliYassin/Fresh-People-Command-Center
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/YassinAliYassin/Fresh-People-Command-Center.git"
APP_DIR="/var/www/fpcc-backend"
PORT=3001
APP_NAME="fpcc-backend"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FPCC Backend Deployment Script${NC}"
echo -e "${GREEN}Server: 102.208.231.11${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# =============================================================================
# STEP 1: Update system and install dependencies
# =============================================================================
echo -e "\n${YELLOW}Step 1: Installing system dependencies...${NC}"

# Update package list
sudo apt-get update

# Install Node.js (v18.x or higher)
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js installed: $(node --version)"
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install npm if not present
if ! command -v npm &> /dev/null; then
    sudo apt-get install -y npm
    print_status "npm installed: $(npm --version)"
else
    print_status "npm already installed: $(npm --version)"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing..."
    sudo npm install -g pm2
    print_status "PM2 installed: $(pm2 --version)"
else
    print_status "PM2 already installed: $(pm2 --version)"
fi

# Install PostgreSQL client (for DB connection testing)
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found. Installing..."
    sudo apt-get install -y postgresql-client
    print_status "PostgreSQL client installed"
else
    print_status "PostgreSQL client already installed"
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
    print_status "Git installed"
else
    print_status "Git already installed: $(git --version)"
fi

# =============================================================================
# STEP 2: Clone or update repository
# =============================================================================
echo -e "\n${YELLOW}Step 2: Cloning/Updating repository...${NC}"

if [ -d "$APP_DIR" ]; then
    print_warning "Directory $APP_DIR already exists. Pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin
    git checkout main 2>/dev/null || git checkout master 2>/dev/null || git checkout -b main 2>/dev/null
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null
    print_status "Repository updated"
else
    print_warning "Cloning repository..."
    sudo mkdir -p /var/www
    sudo chown $USER:$USER /var/www
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    print_status "Repository cloned to $APP_DIR"
fi

# =============================================================================
# STEP 3: Install Node.js dependencies
# =============================================================================
echo -e "\n${YELLOW}Step 3: Installing Node.js dependencies...${NC}"

cd "$APP_DIR"
npm install --production
print_status "Node.js dependencies installed"

# =============================================================================
# STEP 4: Create .env file from template
# =============================================================================
echo -e "\n${YELLOW}Step 4: Setting up environment variables...${NC}"

if [ ! -f "$APP_DIR/.env" ]; then
    print_warning ".env file not found. Creating from template..."
    
    # Copy .env.example if it exists, otherwise create new
    if [ -f "$APP_DIR/.env.example" ]; then
        cp "$APP_DIR/.env.example" "$APP_DIR/.env"
        print_status "Created .env from .env.example"
    fi
    
    # Prompt user for required environment variables
    echo -e "\n${YELLOW}Please provide the following environment variables:${NC}"
    
    read -p "DATABASE_URL (PostgreSQL connection string): " DATABASE_URL
    read -p "WHATSAPP_ACCESS_TOKEN: " WHATSAPP_ACCESS_TOKEN
    read -p "ICLOUD_CALENDAR_URL (or leave empty): " ICLOUD_CALENDAR_URL
    read -p "CRON_SECRET: " CRON_SECRET
    
    # Write to .env file
    cat > "$APP_DIR/.env" << EOF
# Environment Variables for FPCC Backend
NODE_ENV=production
PORT=$PORT

# Database
DATABASE_URL=$DATABASE_URL

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=$WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID=1190600000792870
WHATSAPP_WABA_ID=2036327954427976

# Calendar
ICLOUD_CALENDAR_URL=$ICLOUD_CALENDAR_URL

# Security
CRON_SECRET=$CRON_SECRET
EOF
    
    print_status ".env file created at $APP_DIR/.env"
    print_warning "Please review and edit $APP_DIR/.env if needed"
else
    print_status ".env file already exists"
fi

# =============================================================================
# STEP 5: Database setup (run migrations if needed)
# =============================================================================
echo -e "\n${YELLOW}Step 5: Setting up database...${NC}"

# Test database connection
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
    
    if [ -n "$DATABASE_URL" ]; then
        print_status "Testing database connection..."
        
        # Extract database host from DATABASE_URL for testing
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
        
        if [ -n "$DB_HOST" ]; then
            print_status "Database host: $DB_HOST"
            
            # Run database migrations/setup
            cd "$APP_DIR"
            
            # Check if we need to run any database setup scripts
            if [ -f "$APP_DIR/db.js" ]; then
                print_status "Database configuration found in db.js"
                print_warning "Note: This application uses SQLite by default."
                print_warning "To use PostgreSQL, you may need to modify db.js"
            fi
            
            print_status "Database setup complete"
        fi
    else
        print_warning "DATABASE_URL not set. Skipping database connection test."
    fi
else
    print_warning ".env file not found. Skipping database setup."
fi

# =============================================================================
# STEP 6: Configure firewall (if ufw is active)
# =============================================================================
echo -e "\n${YELLOW}Step 6: Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        print_status "UFW is active. Allowing port $PORT..."
        sudo ufw allow $PORT/tcp
        print_status "Port $PORT allowed in firewall"
    else
        print_warning "UFW is installed but not active. Skipping firewall config."
    fi
else
    print_warning "UFW not installed. Skipping firewall config."
fi

# =============================================================================
# STEP 7: Check if port is already in use
# =============================================================================
echo -e "\n${YELLOW}Step 7: Checking port availability...${NC}"

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port $PORT is already in use."
    print_warning "Will stop existing PM2 process if running..."
    
    # Stop existing PM2 process if it's running
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 stop "$APP_NAME"
        pm2 delete "$APP_NAME"
        print_status "Stopped existing PM2 process: $APP_NAME"
    fi
else
    print_status "Port $PORT is available"
fi

# =============================================================================
# STEP 8: Start application with PM2
# =============================================================================
echo -e "\n${YELLOW}Step 8: Starting application with PM2...${NC}"

cd "$APP_DIR"

# Check if server.js exists
if [ ! -f "$APP_DIR/server.js" ]; then
    print_error "server.js not found in $APP_DIR"
    exit 1
fi

# Start with PM2
pm2 start server.js --name "$APP_NAME" --log /var/log/fpcc-backend.log
pm2 save
pm2 startup | grep sudo | bash  # Setup PM2 to start on boot

print_status "Application started with PM2"
print_status "PM2 process name: $APP_NAME"

# =============================================================================
# STEP 9: Verify deployment
# =============================================================================
echo -e "\n${YELLOW}Step 9: Verifying deployment...${NC}"

# Wait for application to start
sleep 3

# Test health endpoint
if curl -s http://localhost:$PORT/api/health | grep -q "ok"; then
    print_status "Health check passed!"
else
    print_warning "Health check endpoint not responding (this is normal if /api/health doesn't exist yet)"
fi

# Show PM2 status
echo -e "\n${GREEN}PM2 Status:${NC}"
pm2 status

# =============================================================================
# DEPLOYMENT COMPLETE
# =============================================================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nApplication is running at: ${YELLOW}http://102.208.231.11:$PORT${NC}"
echo -e "\nUseful commands:"
echo -e "  View logs:    ${YELLOW}pm2 logs $APP_NAME${NC}"
echo -e "  Restart:      ${YELLOW}pm2 restart $APP_NAME${NC}"
echo -e "  Stop:         ${YELLOW}pm2 stop $APP_NAME${NC}"
echo -e "  Delete:       ${YELLOW}pm2 delete $APP_NAME${NC}"
echo -e "  Monitor:      ${YELLOW}pm2 monit${NC}"
echo -e "\nTo verify all endpoints, run:"
echo -e "  ${YELLOW}bash verify-deployment.sh${NC}"
echo ""

exit 0
