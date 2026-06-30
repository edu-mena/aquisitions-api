#!/bin/bash

# Development startup script for Acquisition App with Neon Local
# This script starts the application in development mode with Neon Local

# Always run from the project root, regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Starting Acquisition App in Development Mode"
echo "============================================="

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo "Error: .env.development file not found!"
    echo "   Please copy .env.development from the template and update with your Neon credentials."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

# Create .neon_local directory if it doesn't exist
mkdir -p .neon_local

# Add .neon_local to .gitignore if not already present
if ! grep -q ".neon_local/" .gitignore 2>/dev/null; then
    echo ".neon_local/" >> .gitignore
    echo "Added .neon_local/ to .gitignore"
fi

echo "Building and starting development containers..."
echo "   - Neon Local proxy will create an ephemeral database branch"
echo "   - Migrations run automatically on container startup (docker-entrypoint.sh)"
echo "   - Application will run with hot reload enabled"
echo ""

# Start development environment.
# - neon-local starts first; the app container waits for its healthcheck (depends_on: service_healthy).
# - docker-entrypoint.sh runs 'node scripts/migrate.js' before the app process begins.
docker compose -f docker-compose.dev.yml up --build

echo ""
echo "Development environment stopped."
echo "   To clean up containers: docker compose -f docker-compose.dev.yml down"
