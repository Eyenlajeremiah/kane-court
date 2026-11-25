#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh
STATE=".loop/gate-state.json"
MAX_CONT="${GATE_MAX_CONTINUES:-3}"
# Run a node expression and print a bare, colour-free scalar.
# Some environments force colour on stdout. An escape sequence inside a
# [[ ]] numeric comparison aborts the gate with a syntax error, which would
# silently turn "keep working" into "no output at all". Keep the strip.
_n() { node -e "$1" 2>/dev/null | sed -e 's/\x1b\[[0-9;]*m//g' | tr -d '\r' | head -1; }

COUNT="$(_n "try{const j=JSON.parse(require('fs').readFileSync('$STATE','utf8'));console.log(Number(j.count)||0)}catch(e){console.log(0)}")"
case "$COUNT" in ''|*[!0-9]*) COUNT=0 ;; esac
TARGET="$(ls -1dt targets/*/ 2>/dev/null | head -1 | sed 's#/$##')"
if [[ -z "$TARGET" ]]; then echo '{"decision":"allow"}'; exit 0; fi
TARGET_ID="$(basename "$TARGET")"
LAST="$(_n "try{const j=JSON.parse(require('fs').readFileSync('.loop/last-round.json','utf8'));const id=j.targetId||j.target||'';console.log(id+'|'+(j.pass===true?'true':'false'))}catch(e){console.log('|false')}")"
LAST_TARGET="${LAST%%|*}"
PASS="${LAST##*|}"
if [[ "$LAST_TARGET" == "$TARGET_ID" && "$PASS" == "true" ]]; then echo '{"decision":"allow"}'; exit 0; fi
if [[ ! -f ".loop/last-round.json" ]]; then
  REASON="Kane verification has not run yet for $TARGET_ID. Run: bash scripts/loop.sh $TARGET_ID"
else
  REASON="Kane CLI has NOT verified $TARGET_ID as green. Read .loop/pending-prompt.md, fix the app under targets/$TARGET_ID, then run: bash scripts/run-case.sh $TARGET_ID."
fi
if [[ "$COUNT" -ge "$MAX_CONT" ]]; then
  node -e "console.log(JSON.stringify({decision:'continue',reason:process.argv[1]}))" "Kane verification remains unverified after $MAX_CONT attempts. Fix the app and run: bash scripts/run-case.sh $TARGET_ID."
  exit 0
fi
NEWCOUNT=$((COUNT+1))
node -e "const fs=require('fs');fs.mkdirSync('.loop',{recursive:true});fs.writeFileSync('$STATE',JSON.stringify({count:$NEWCOUNT,target:'$TARGET_ID',at:new Date().toISOString()}));"
node -e "console.log(JSON.stringify({decision:'continue',reason:process.argv[1]}))" "$REASON"
