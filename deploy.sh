#!/bin/bash

# Deployment script for Crawling System
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="crawling-system"
APP_DIR="/home/ubuntu/$APP_NAME"
SERVICE_NAME="crawling-system.service"
BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/var/log/$APP_NAME-deploy.log"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Create log file if it doesn't exist
sudo touch "$LOG_FILE"
sudo chown ubuntu:ubuntu "$LOG_FILE"

log "Starting deployment of $APP_NAME"

# 1. Update system packages
log "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install required dependencies
log "Installing dependencies..."
# Node.js 18.x
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Other dependencies
sudo apt-get install -y \
    git \
    nginx \
    redis-server \
    build-essential \
    python3 \
    certbot \
    python3-certbot-nginx

# 3. Create application directory
log "Setting up application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R ubuntu:ubuntu "$APP_DIR"

# 4. Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    log "Updating existing repository..."
    cd "$APP_DIR"
    git pull origin main
else
    log "Cloning repository..."
    # Replace with your actual repository URL
    git clone https://github.com/your-username/crawling-system.git "$APP_DIR"
    cd "$APP_DIR"
fi

# 5. Create backup
log "Creating backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$APP_DIR/node_modules" ]; then
    tar -czf "$BACKUP_DIR/$APP_NAME-$(date +%Y%m%d-%H%M%S).tar.gz" \
        --exclude="$APP_DIR/node_modules" \
        --exclude="$APP_DIR/logs" \
        "$APP_DIR"
fi

# 6. Install Node.js dependencies
log "Installing Node.js dependencies..."
npm ci --production

# 7. Setup environment file
if [ ! -f "$APP_DIR/.env" ]; then
    log "Creating .env file from template..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    warning "Please edit $APP_DIR/.env with your configuration"
fi

# 8. Create necessary directories
log "Creating necessary directories..."
mkdir -p "$APP_DIR/logs"
sudo mkdir -p /var/log/$APP_NAME

# 9. Setup systemd service
log "Setting up systemd service..."
sudo cp "$APP_DIR/$SERVICE_NAME" "/etc/systemd/system/$SERVICE_NAME"
sudo systemctl daemon-reload

# 10. Configure Nginx
log "Configuring Nginx..."
sudo cp "$APP_DIR/nginx.conf" "/etc/nginx/sites-available/$APP_NAME"
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/"
sudo nginx -t || error "Nginx configuration test failed"

# 11. Configure Redis
log "Configuring Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 12. Setup firewall
log "Configuring firewall..."
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow 3000/tcp # API (remove in production, use Nginx only)
sudo ufw allow 3001/tcp # WebSocket (remove in production, use Nginx only)
sudo ufw --force enable

# 13. Start services
log "Starting services..."
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl restart nginx

# 14. Check service status
sleep 5
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Service is running successfully"
else
    error "Service failed to start. Check logs: sudo journalctl -u $SERVICE_NAME -n 50"
fi

# 15. Setup SSL (optional)
read -p "Do you want to setup SSL with Let's Encrypt? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name: " DOMAIN
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"
fi

# 16. Setup log rotation
log "Setting up log rotation..."
cat << EOF | sudo tee /etc/logrotate.d/$APP_NAME
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

log "Deployment completed successfully!"
log "Service status: sudo systemctl status $SERVICE_NAME"
log "View logs: sudo journalctl -u $SERVICE_NAME -f"
log "Application URL: http://$(curl -s ifconfig.me):3000"