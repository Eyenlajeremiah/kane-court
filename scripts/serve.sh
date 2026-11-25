#!/usr/bin/env bash
# Start the court as a detached background process that survives closing the
# terminal. Use this before recording the demo video, or whenever you want the
# localhost page to stay up between terminal windows.
#
#   bash scripts/serve.sh          # start (if not already running)
#   bash scripts/serve.sh stop     # stop it
#   bash scripts/serve.sh status   # is it up?
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
PORT="${PORT:-3000}"
BASE_URL="${BASE_URL:-http://localhost:$PORT}"
mkdir -p .loop

is_up() {
  node -e 'const http=require("http");const req=http.get(process.argv[1]+"/data-version",r=>process.exit(r.statusCode===200?0:1));req.on("error",()=>process.exit(1));req.setTimeout(2000,()=>{req.destroy();process.exit(1)});' "$BASE_URL" >/dev/null 2>&1
}

case "${1:-start}" in
  stop)
    if [[ -f .loop/server.pid ]]; then
      kill "$(cat .loop/server.pid)" 2>/dev/null && echo "stopped the court"
      rm -f .loop/server.pid
    else
      pkill -f 'node server.js' 2>/dev/null && echo "stopped the court"
    fi
    ;;
  status)
    if is_up; then echo "court is UP on $BASE_URL"; else echo "court is DOWN"; fi
    ;;
  start|*)
    if is_up; then echo "court is already up on $BASE_URL"; exit 0; fi
    # setsid detaches the server from this terminal's session, so it keeps
    # running after the terminal is closed.
    setsid nohup node server.js > .loop/server.log 2>&1 < /dev/null &
    echo $! > .loop/server.pid
    for _ in $(seq 1 40); do sleep 0.25; is_up && break; done
    if is_up; then echo "court is up on $BASE_URL (pid $(cat .loop/server.pid))"; else
      echo "could not start the court; see .loop/server.log" >&2; exit 2; fi
    ;;
esac
