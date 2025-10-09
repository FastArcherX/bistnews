#!/usr/bin/env bash

# Minimal runner for BIST News on Raspberry Pi (no systemd, no nginx)
# Uses a PID file to manage the Node process

set -Eeuo pipefail

APP_DIR="/opt/bistnews"
NODE_BIN="node"
PORT="${PORT:-3001}"
PID_FILE="${APP_DIR}/bistnews.pid"
LOG_FILE="${APP_DIR}/bistnews.log"

# Auto-load environment variables from .env (if present)
if [[ -f "${APP_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "${APP_DIR}/.env"
  set +a
  # Re-apply default for PORT if still undefined
  PORT="${PORT:-3001}"
fi

usage() {
  cat <<USAGE
Usage: $0 <command>

Commands:
  start         Start the Node server (background)
  stop          Stop the Node server
  restart       Restart the Node server
  status        Show PID status
  logs          Tail the log file
  health        Curl backend health endpoint

Environment:
  PORT          Port to run the server on (default: 3001)

Examples:
  PORT=3001 $0 start
  $0 logs
USAGE
}

start_server() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Already running with PID $(cat "$PID_FILE")"; return 0
  fi
  cd "$APP_DIR"
  echo "Starting server on port ${PORT}..."
  ( PORT="$PORT" "$NODE_BIN" server.js >>"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE" )
  sleep 1
  echo "Started with PID $(cat "$PID_FILE")"
}

stop_server() {
  if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "Stopping PID $PID..."
      kill "$PID" || true
      sleep 1
      if kill -0 "$PID" 2>/dev/null; then
        echo "Force killing PID $PID..."
        kill -9 "$PID" || true
      fi
    fi
    rm -f "$PID_FILE"
  else
    echo "Not running"
  fi
}

cmd=${1:-}
case "$cmd" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server || true
    start_server
    ;;
  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Running (PID $(cat "$PID_FILE")) on port ${PORT}"
    else
      echo "Not running"
    fi
    ;;
  logs)
    tail -n 100 -F "$LOG_FILE"
    ;;
  health)
    curl -sS "http://127.0.0.1:${PORT}/api/health" | jq . || curl -sS "http://127.0.0.1:${PORT}/api/health"
    ;;
  *)
    usage
    exit 1
    ;;
esac

echo "Done."
