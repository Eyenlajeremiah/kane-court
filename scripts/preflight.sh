#!/usr/bin/env bash
# PRE-FLIGHT: check everything that can ruin a take, BEFORE you press record.
#
#   bash scripts/preflight.sh [targetId]
#
# Prints one line per check. Anything marked FAIL must be fixed before you
# start recording. Run it again after any setup change.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh

TARGET="${1:-atlas}"
PORT="${PORT:-3000}"
FAIL=0
ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; }

echo
echo "== 1. Repo state =="
if git diff --quiet -- targets/$TARGET/index.html 2>/dev/null; then
  ok "targets/$TARGET/index.html is the committed version"
else
  warn "targets/$TARGET/index.html has uncommitted edits (fine if you want them)"
fi
LOCK=$(node scripts/lock-files.js --verify 2>&1 | head -1)
if [[ "$LOCK" == integrity*OK* ]]; then
  ok "integrity lock: $LOCK"
else
  bad "integrity lock failed - run: node scripts/lock-files.js --init && git commit -am 're-pin'"
  echo "        $LOCK"
fi

echo
echo "== 2. Court server =="
if curl -fsS -o /dev/null "http://localhost:$PORT/t/$TARGET" 2>/dev/null; then
  ok "court is serving http://localhost:$PORT/t/$TARGET"
else
  bad "court is NOT running - run: npm start"
fi

echo
echo "== 3. Kane CLI login =="
if kane-cli whoami >/dev/null 2>&1 || kane-cli auth status >/dev/null 2>&1; then
  ok "kane-cli is authenticated"
else
  CRED=$(kane-cli credits 2>/dev/null | grep -o '[0-9][0-9,]*' | head -1)
  if [[ -n "${CRED:-}" ]]; then
    ok "kane-cli is authenticated (credits: $CRED)"
  else
    warn "cannot confirm kane-cli auth - run: kane-cli login --oauth"
  fi
fi

echo
echo "== 4. Recordings present (for the free replay path) =="
MISS=0
for F in newcomer skeptic mobile saver promised; do
  if [[ ! -f ".testmuai/tests/${F}_test.md" ]]; then
    bad "no spec for $F (.testmuai/tests/${F}_test.md)"
    MISS=1
  elif [[ ! -d ".testmuai/tests/output-$F" ]]; then
    bad "no recording for $F (.testmuai/tests/output-$F)"
    MISS=1
  fi
done
[[ $MISS -eq 0 ]] && ok "all five persona specs and recordings are committed"

echo
echo "== 5. Disc space (a crashed recorder usually means a full disk) =="
AVAIL=$(df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
if df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | grep -qE '^[0-9]+$'; then
  if [[ "${AVAIL:-0}" -lt 5 ]]; then
    bad "only ${AVAIL}G free - free space before recording"
  else
    ok "${AVAIL}G free"
  fi
else
  warn "cannot read disk space"
fi

echo
echo "== 6. Recording target is in its broken state =="
if cmp -s "targets/$TARGET/index.html" "targets/$TARGET/buggy.html" 2>/dev/null; then
  ok "target is the buggy page (round 1 will go red)"
else
  warn "target is NOT the buggy page - run: bash scripts/reset-demo.sh $TARGET"
fi

echo
echo "== 7. Is the court serving THIS repo? =="
# Resolve the process actually LISTENING on $PORT, not just any node process
# named server.js. Two checkouts running at once is exactly how you end up
# judging a page you never edited.
# ALL pids listening on the port. A port can be served by more than one
# process (a socat/tunnel proxy in front of the node server), so take them
# all and let the cwd check decide.
SERVER_PIDS_BY_PORT="$(ss -lptnH "sport = :$PORT" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ')"
SERVER_PID_BY_PORT="$(printf '%s' "$SERVER_PIDS_BY_PORT" | awk '{print $1}')"
SERVER_CWD="$(node -e '
const fs=require("fs");
const {execSync}=require("child_process");
const pids=[];
const byPort=(process.argv[1]||"").split(/\s+/).filter(Boolean);
for(const p of byPort) if(fs.existsSync("/proc/"+p)) pids.push(p);
if(!pids.length){
  try{
    const p=fs.readFileSync(".loop/server.pid","utf8").trim();
    if(p && fs.existsSync("/proc/"+p)) pids.push(p);
  }catch(e){}
  try{
    execSync("pgrep -f \"node server.js\"",{stdio:["ignore","pipe","ignore"]})
      .toString().split(/\s+/).filter(Boolean).forEach(p=>{ if(!pids.includes(p)) pids.push(p); });
  }catch(e){}
}
for(const pid of pids){
  try{
    // /proc/<pid>/cwd is a symlink, not a file: readlinkSync, not readFileSync.
    console.log(fs.readlinkSync("/proc/"+pid+"/cwd"));
    break;
  }catch(e){}
}
' "$SERVER_PIDS_BY_PORT" 2>/dev/null | sed -e 's/\x1b\[[0-9;]*m//g' | tr -d '\r' | head -1)"
REPO_DIR="$(pwd -P)"
MATCH_CWD=""
for PID in $SERVER_PIDS_BY_PORT; do
  CWD_RAW="$(readlink "/proc/$PID/cwd" 2>/dev/null)"
  if [[ -n "$CWD_RAW" ]]; then
    CWD_ABS="$(cd "$CWD_RAW" 2>/dev/null && pwd -P)"
    if [[ "$CWD_ABS" == "$REPO_DIR" ]]; then MATCH_CWD="$PID"; break; fi
  fi
done
if [[ -n "$MATCH_CWD" ]]; then
  ok "the server listening on port $PORT (pid $MATCH_CWD) is serving THIS repo"
elif [[ -n "$SERVER_PIDS_BY_PORT" ]]; then
  bad "nothing on port $PORT is serving this repo"
  for PID in $SERVER_PIDS_BY_PORT; do
    echo "        pid $PID runs from: $(readlink "/proc/$PID/cwd" 2>/dev/null || echo unknown)"
  done
  echo "        it is serving a DIFFERENT copy of the app - stop it and run: npm start"
else
  warn "cannot determine the server directory (nothing listening on port $PORT)"
fi
echo
echo "  live check - does the served page match the file on disk?"
node -e '
const http=require("http"); const fs=require("fs");
const port=process.argv[1], idx=process.argv[2];
http.get("http://localhost:"+port+"/t/atlas",r=>{
  let b=""; r.on("data",d=>b+=d); r.on("end",()=>{
    const disk=fs.readFileSync(idx,"utf8");
    // The court injects its stylesheet link before </head>. Strip whatever
    // was injected so we compare the two documents on their real content.
    const norm=s=>s.replace(/\r\n/g,"\n")
      .replace(/<link[^>]*rel="stylesheet"[^>]*>/g,"")
      .replace(/<\/head>/,"")
      .trim();
    if(norm(disk)===norm(b)) console.log("    \u2713 served page == file on disk");
    else {
      console.log("    \u2717 MISMATCH - the judge would see a different page than the file you edited");
      const a=norm(disk), c=norm(b);
      let i=0; while(i<a.length && i<c.length && a[i]===c[i]) i++;
      console.log("      first difference at char "+i);
      console.log("      on disk:  "+JSON.stringify(a.slice(i,i+90)));
      console.log("      served:   "+JSON.stringify(c.slice(i,i+90)));
    }
  });
}).on("error",e=>console.log("    (court not reachable: "+e.message+")"));
' "$PORT" "targets/$TARGET/index.html" 2>/dev/null
echo
echo "== 8. Queue worker (can spend Kane credits mid-take) =="
PENDING=$(node -e '
const fs=require("fs");
try{
  const q=JSON.parse(fs.readFileSync("data/queue.json","utf8"));
  const n=q.filter(x=>!x.finishedAt && ["queued","pending","running"].includes(String(x.status||""))).length;
  console.log(n);
}catch(e){console.log(0)}
' 2>/dev/null | sed -e 's/\x1b\[[0-9;]*m//g' | tr -d '\r' | head -1)
PENDING="$(printf '%s' "$PENDING" | tr -cd '0-9')"
if [[ "${PENDING:-0}" -gt 0 ]]; then
  bad "$PENDING queued target(s) will spend Kane credits while you record"
  echo "        the worker judges real websites. Clear data/queue.json, or start with QUEUE_WORKER=0 npm start"
elif pgrep -f "queue-worker.js" >/dev/null 2>&1; then
  ok "queue worker running but no pending targets - it will not spend credits"
else
  ok "no queue worker running"
fi
echo
if [[ $FAIL -eq 0 ]]; then
  echo "  ALL CHECKS PASSED - you are ready to record."
else
  echo "  $FAIL CHECK(S) FAILED - fix them before recording."
fi
echo
