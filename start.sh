#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  Percy LMS — Development Startup Script
#  Usage: ./start.sh
#  Starts backend on :8000 and frontend on :5173
# ════════════════════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "  ██████╗ ███████╗██████╗  ██████╗██╗   ██╗"
  echo "  ██╔══██╗██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝"
  echo "  ██████╔╝█████╗  ██████╔╝██║      ╚████╔╝ "
  echo "  ██╔═══╝ ██╔══╝  ██╔══██╗██║       ╚██╔╝  "
  echo "  ██║     ███████╗██║  ██║╚██████╗   ██║   "
  echo "  ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   "
  echo -e "${NC}"
  echo -e "${CYAN}  Learning OS — Personal Edition${NC}"
  echo ""
}

check_deps() {
  # On Windows, Python may only be available as 'python'
  if ! command -v python3 &>/dev/null; then
    if command -v python &>/dev/null; then
      alias python3=python
    else
      echo -e "${RED}Error: python3 not found${NC}"
      exit 1
    fi
  fi
  if ! command -v node &>/dev/null; then
    echo -e "${RED}Error: Node.js not found${NC}"
    exit 1
  fi
}

setup_backend() {
  echo -e "${CYAN}[1/4] Setting up Python environment...${NC}"
  cd "$SCRIPT_DIR/backend"

  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi

  # Windows (Git Bash) uses Scripts/, Linux/macOS uses bin/
  if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
  else
    source .venv/bin/activate
  fi

  echo -e "${CYAN}[2/4] Installing Python dependencies...${NC}"
  python -m pip install -q --upgrade pip
  python -m pip install -q --upgrade setuptools wheel  # required by openai-whisper

  # On Windows, python-magic needs the binary bundle (includes libmagic DLL)
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    python -m pip install -q python-magic-bin
  fi

  python -m pip install -q -r requirements.txt

  if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${CYAN}[*] Creating .env from .env.example...${NC}"
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"

    # Auto-generate cryptographic secrets
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    FERNET_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

    sed -i "s/change_me_to_a_random_64_character_hex_string/$SECRET_KEY/" "$SCRIPT_DIR/.env"
    sed -i "s/change_me_to_a_fernet_key/$FERNET_KEY/" "$SCRIPT_DIR/.env"

    echo -e "${GREEN}[*] .env created with auto-generated secrets${NC}"
    echo -e "${CYAN}[*] Default admin password: changeme — CHANGE THIS in Settings!${NC}"
  fi

  mkdir -p "$SCRIPT_DIR/storage"/{videos,documents,thumbnails,subtitles,exports}
}

setup_frontend() {
  echo -e "${CYAN}[3/4] Installing frontend dependencies...${NC}"
  cd "$SCRIPT_DIR/frontend"
  if [ ! -d "node_modules" ]; then
    npm install --silent
  fi
}

start_servers() {
  echo -e "${CYAN}[4/4] Starting servers...${NC}"
  echo ""
  echo -e "${GREEN}  Backend : http://localhost:8000${NC}"
  echo -e "${GREEN}  Frontend: http://localhost:5173${NC}"
  echo -e "${GREEN}  API docs: http://localhost:8000/api/docs${NC}"
  echo ""
  echo -e "${CYAN}  Press Ctrl+C to stop${NC}"
  echo ""

  # Start backend
  cd "$SCRIPT_DIR/backend"
  if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
  else
    source .venv/bin/activate
  fi
  PYTHONPATH="$SCRIPT_DIR/backend" uvicorn app.main:app \
    --reload \
    --port 8000 \
    --host 127.0.0.1 \
    --log-level warning \
    --env-file "$SCRIPT_DIR/.env" &
  BACKEND_PID=$!

  # Start frontend
  cd "$SCRIPT_DIR/frontend"
  npm run dev -- --host 127.0.0.1 &
  FRONTEND_PID=$!

  # Cleanup on exit
  cleanup() {
    echo ""
    echo -e "${CYAN}Shutting down...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
  }
  trap cleanup SIGINT SIGTERM

  wait
}

banner
check_deps
setup_backend
setup_frontend
start_servers
