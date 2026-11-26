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
if [[ $FAIL -eq 0 ]]; then
  echo "  ALL CHECKS PASSED - you are ready to record."
else
  echo "  $FAIL CHECK(S) FAILED - fix them before recording."
fi
echo
