#!/bin/bash

# Health check and monitoring script
set -e

# Configuration
SERVICE_NAME="crawling-system"
API_URL="http://localhost:3000"
WS_URL="ws://localhost:3001"
SLACK_WEBHOOK_URL="" # Add your Slack webhook URL here
EMAIL_TO="" # Add email for alerts

# Function to send alerts
send_alert() {
    local message=$1
    local severity=$2
    
    # Log to file
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$severity] $message" >> /var/log/$SERVICE_NAME-monitor.log
    
    # Send to Slack if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[$severity] $SERVICE_NAME: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null
    fi
    
    # Send email if configured
    if [ -n "$EMAIL_TO" ]; then
        echo "$message" | mail -s "[$severity] $SERVICE_NAME Alert" "$EMAIL_TO"
    fi
}

# Check if service is running
check_service() {
    if systemctl is-active --quiet $SERVICE_NAME; then
        return 0
    else
        send_alert "Service is not running" "CRITICAL"
        # Try to restart
        sudo systemctl restart $SERVICE_NAME
        sleep 10
        if systemctl is-active --quiet $SERVICE_NAME; then
            send_alert "Service restarted successfully" "INFO"
        else
            send_alert "Service restart failed" "CRITICAL"
        fi
        return 1
    fi
}

# Check HTTP endpoint
check_http() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    if [ "$response" -eq 200 ]; then
        return 0
    else
        send_alert "HTTP health check failed (status: $response)" "WARNING"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local mem_usage=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $4}' | head -1)
    if (( $(echo "$mem_usage > 80" | bc -l) )); then
        send_alert "High memory usage: $mem_usage%" "WARNING"
    fi
}

# Check disk space
check_disk() {
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        send_alert "High disk usage: $disk_usage%" "WARNING"
    fi
}

# Check Redis connection
check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        return 0
    else
        send_alert "Redis connection failed" "CRITICAL"
        return 1
    fi
}

# Main monitoring loop
main() {
    echo "Starting monitoring for $SERVICE_NAME..."
    
    # Run checks
    check_service
    check_http
    check_memory
    check_disk
    check_redis
    
    # Log status
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check completed" >> /var/log/$SERVICE_NAME-monitor.log
}

# Run main function
main