#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$PROJECT_DIR/.run"

GRACEFUL_WAIT_TICKS=10  # 10 × 0.5s = 5 seconds

stop_process() {
  local name="$1"
  local pid_file="$RUN_DIR/$name.pid"

  if [ ! -f "$pid_file" ]; then
    echo "  $name: not running (no PID file)"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    # Wait for graceful shutdown
    for _ in $(seq 1 "$GRACEFUL_WAIT_TICKS"); do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "  $name: stopped (PID: $pid)"
  else
    echo "  $name: not running (stale PID: $pid)"
  fi

  rm -f "$pid_file"
}

echo "Stopping Agentara..."
stop_process "server"
stop_process "web"
echo "Done."
