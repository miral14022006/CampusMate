#!/usr/bin/env bash

# ==============================================================================
# CampusMate — Backend Services Startup Orchestrator (Backend-Only)
# Runs MongoDB, Redis & Node.js API Gateway
# ==============================================================================

set -e

# Terminal Colors
CYAN='\033[0;36m'
TEAL='\033[0;32m'
LIME='\033[1;32m'
AMBER='\033[0;33m'
CORAL='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}    CampusMate — Assistant Backend Services                      ${NC}"
echo -e "${CYAN}=================================================================${NC}"

# PID tracking for cleanup
PIDS=()

cleanup() {
    echo -e "\n${AMBER}[SHUTDOWN] Stopping all backend processes...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo -e "${TEAL}[SHUTDOWN] All backend services stopped cleanly. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 1. Check & Ensure Redis is Running (Port 6379)
# ------------------------------------------------------------------------------
echo -e "${TEAL}[1/3] Checking Redis cache service...${NC}"
if ! nc -z localhost 6379 2>/dev/null; then
    echo -e "${AMBER}      Redis is not running on 6379. Attempting to start via brew...${NC}"
    brew services start redis 2>/dev/null || redis-server --daemonize yes 2>/dev/null || true
    sleep 1
fi

if nc -z localhost 6379 2>/dev/null; then
    echo -e "${LIME}      ✓ Redis is active on port 6379${NC}"
else
    echo -e "${CORAL}      ✗ Warning: Could not connect to Redis on 6379. Cache fallbacks will be used.${NC}"
fi

# ------------------------------------------------------------------------------
# 2. Check & Ensure MongoDB is Running (Port 27017)
# ------------------------------------------------------------------------------
echo -e "${TEAL}[2/3] Checking MongoDB database...${NC}"
if ! nc -z localhost 27017 2>/dev/null; then
    echo -e "${AMBER}      MongoDB is not listening on 27017. Attempting to start...${NC}"
    brew services start mongodb-community 2>/dev/null || mongod --fork --logpath /tmp/mongod.log --dbpath /tmp/ 2>/dev/null || true
    sleep 1
fi

if nc -z localhost 27017 2>/dev/null; then
    echo -e "${LIME}      ✓ MongoDB is active on port 27017${NC}"
else
    echo -e "${CORAL}      ✗ Warning: Could not connect to MongoDB on 27017. Ensure mongod is started.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Start Node.js Express Gateway (Port 5005)
# ------------------------------------------------------------------------------
echo -e "${TEAL}[3/3] Starting Node.js API Gateway on http://localhost:5005...${NC}"
if lsof -Pi :5005 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${AMBER}      Port 5005 already occupied. Terminating existing process...${NC}"
    kill -9 $(lsof -ti:5005) 2>/dev/null || true
    sleep 1
fi

(PORT=5005 node "$ROOT_DIR/server/server.js") &
SERVER_PID=$!
PIDS+=($SERVER_PID)

# Wait for Gateway healthcheck
for i in {1..20}; do
    if curl -s http://localhost:5005/health >/dev/null 2>&1; then
        echo -e "${LIME}      ✓ Node.js Gateway healthy on port 5005${NC}"
        break
    fi
    sleep 0.5
done

sleep 1

echo -e "\n${CYAN}=================================================================${NC}"
echo -e "${LIME}  🎉  CampusMate Backend Services are Operational!               ${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo -e "  • ${TEAL}Node Gateway API:${NC}   http://localhost:5005"
echo -e "  • ${TEAL}Chat Endpoint:${NC}      POST http://localhost:5005/api/chat"
echo -e "  • ${TEAL}Admin Endpoints:${NC}    http://localhost:5005/api/admin"
echo -e "  • ${TEAL}API Health Endpoint:${NC}http://localhost:5005/health"
echo -e "${CYAN}=================================================================${NC}"
echo -e "${AMBER}Press [Ctrl + C] anytime to stop all backend services cleanly.${NC}\n"

# Wait for child processes
wait
