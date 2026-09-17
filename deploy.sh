#!/bin/bash

# The Juggle - Deployment Script
# Usage: ./deploy.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_status "Docker is installed"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your settings"
    fi
}

# Build containers
build() {
    print_status "Building containers..."
    docker-compose build
    print_status "Build complete"
}

# Start services
start() {
    print_status "Starting services..."
    docker-compose up -d
    print_status "Services started"
}

# Stop services
stop() {
    print_status "Stopping services..."
    docker-compose down
    print_status "Services stopped"
}

# Restart services
restart() {
    stop
    start
}

# View logs
logs() {
    docker-compose logs -f
}

# Run migrations
migrate() {
    print_status "Running migrations..."
    docker-compose exec backend python manage.py migrate
    print_status "Migrations complete"
}

# Create superuser
createsuperuser() {
    print_status "Creating superuser..."
    docker-compose exec backend python manage.py createsuperuser
}

# Collect static files
collectstatic() {
    print_status "Collecting static files..."
    docker-compose exec backend python manage.py collectstatic --noinput
    print_status "Static files collected"
}

# Clear cache
clearcache() {
    print_status "Clearing cache..."
    docker-compose exec backend python manage.py shell -c "from django.core.cache import cache; cache.clear()"
    print_status "Cache cleared"
}

# Health check
health() {
    print_status "Checking health..."
    docker-compose ps
    echo ""
    print_status "Testing API..."
    curl -s http://localhost:8000/api/products/ | head -c 100
    echo ""
}

# Backup database
backup() {
    print_status "Backing up database..."
    mkdir -p backups
    docker-compose exec db pg_dump -U postgres thejuggle > backups/backup_$(date +%Y%m%d_%H%M%S).sql
    print_status "Backup complete"
}

# Restore database
restore() {
    if [ -z "$1" ]; then
        print_error "Please provide backup file: ./deploy.sh restore <backup_file>"
        exit 1
    fi
    print_status "Restoring database from $1..."
    docker-compose exec -T db psql -U postgres thejuggle < "$1"
    print_status "Restore complete"
}

# Show help
help() {
    echo "The Juggle - Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build          Build Docker containers"
    echo "  start          Start all services"
    echo "  stop           Stop all services"
    echo "  restart        Restart all services"
    echo "  logs           View logs"
    echo "  migrate        Run database migrations"
    echo "  createsuperuser Create admin superuser"
    echo "  collectstatic  Collect static files"
    echo "  clearcache     Clear Redis cache"
    echo "  health         Check health status"
    echo "  backup         Backup database"
    echo "  restore        Restore database from backup"
    echo "  help           Show this help"
}

# Main script
check_docker

case "$1" in
    build)
        check_env
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    migrate)
        migrate
        ;;
    createsuperuser)
        createsuperuser
        ;;
    collectstatic)
        collectstatic
        ;;
    clearcache)
        clearcache
        ;;
    health)
        health
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    help|*)
        help
        ;;
esac
