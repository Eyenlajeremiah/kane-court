#!/usr/bin/env bash
# Author the persona flows once and save them as committed, replayable tests.
#
#   bash scripts/record-flows.sh <targetId>
#
# Each kane-cli run writes .testmuai/tests/<flow>_test.md plus an output-<flow>/
# recordings folder. Both must be committed together: a step only replays when
# its recording is present. After this, every future run is free.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh

TARGET_ID="${1:-atlas}"
TARGET_DIR="targets/$TARGET_ID"
[[ -d "$TARGET_DIR" ]] || { echo "no such target: $TARGET_ID" >&2; exit 2; }

PORT="${PORT:-3000}"
BASE_URL="${BASE_URL:-http://localhost:$PORT}"
TARGET_URL="$BASE_URL/t/$TARGET_ID"
mkdir -p .testmuai/tests

mapfile -t FLOWS < <(node -e "
const fs=require('fs');
const base=JSON.parse(fs.readFileSync('lib/personas.json','utf8'));
let ids=base.map(x=>x.id);
try{
  const j=JSON.parse(fs.readFileSync('$TARGET_DIR/flows.json','utf8'));
  const arr=j.flows||j;
  if(Array.isArray(arr)&&arr.length) ids=arr.map(x=>x.id);
}catch(e){}
console.log(ids.join('\n'));
")

for FID in "${FLOWS[@]}"; do
  [[ -z "$FID" ]] && continue
  OBJECTIVE="$(node -e "
const fs=require('fs');
const base=JSON.parse(fs.readFileSync('lib/personas.json','utf8'));
let o=(base.find(x=>x.id==='$FID')||{}).objective||'';
try{
  const j=JSON.parse(fs.readFileSync('$TARGET_DIR/flows.json','utf8'));
  const arr=j.flows||j;
  const c=arr.find(x=>x.id==='$FID');
  if(c&&c.objective) o=c.objective;
}catch(e){}
console.log(o);
")"
  echo "=== authoring flow: $FID ==="
  kane-cli run "$OBJECTIVE" --url "$TARGET_URL" --name "$FID" --agent --headless --timeout 240
  echo "exit=$?"
done

echo
echo "Saved tests:"
ls -1 .testmuai/tests/ 2>/dev/null || echo "(none - check that kane-cli is logged in)"
echo
echo "Commit BOTH the *_test.md files and their output-*/ folders."
