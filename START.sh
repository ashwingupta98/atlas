#!/bin/bash
# Atlas - Startup Script

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ATLAS - LIFE ADMIN                          ║"
echo "║         Starting development environment...                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${BLUE}Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found: $(python3 --version)${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found. Please install npm${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check MongoDB
echo -e "\n${BLUE}Checking MongoDB...${NC}"
if command -v docker &> /dev/null; then
    # Check if MongoDB container is running
    if docker ps | grep -q mongodb; then
        echo -e "${GREEN}✓ MongoDB container is running${NC}"
    else
        echo -e "${YELLOW}⚠ MongoDB container not running${NC}"
        echo "  To start MongoDB with Docker:"
        echo "  docker run -d -p 27017:27017 --name mongodb mongo:7.0"
    fi
else
    echo -e "${YELLOW}⚠ Docker not found. Please ensure MongoDB is running on localhost:27017${NC}"
fi

# Setup backend
echo -e "\n${BLUE}Setting up backend...${NC}"
cd /app/backend

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp ../.env.example .env
    echo -e "${YELLOW}⚠ Please edit backend/.env with your credentials${NC}"
fi

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo -e "${GREEN}✓ Backend environment ready${NC}"

# Setup frontend
echo -e "\n${BLUE}Setting up frontend...${NC}"
cd /app/frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
echo -e "${GREEN}✓ Frontend environment ready${NC}"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}${GREEN} ATLAS is ready to start! ${NC}${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}To start the application:${NC}"
echo ""
echo -e "${GREEN}Terminal 1 - Start Backend:${NC}"
echo "  cd /app/backend"
echo "  source venv/bin/activate"
echo "  python -m uvicorn server:app --reload --port 8000"
echo ""
echo -e "${GREEN}Terminal 2 - Start Frontend:${NC}"
echo "  cd /app/frontend"
echo "  npm start"
echo ""
echo -e "${YELLOW}Then open:${NC}"
echo "  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}API will be available at:${NC}"
echo "  ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  ${GREEN}See /app/SETUP.md for detailed setup and testing guide${NC}"
echo ""
