#!/usr/bin/env bash
# Run one target through every persona flow with Kane CLI.
# Usage: bash scripts/run-case.sh <targetId> [round]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh

TARGET_ID="${1:-}"
ROUND="${2:-1}"
TARGET_DIR="targets/$TARGET_ID"
[[ -d "$TARGET_DIR" ]] || { echo "no such target: $TARGET_ID" >&2; exit 2; }

PORT="${PORT:-3000}"
BASE_URL="${BASE_URL:-http://localhost:$PORT}"
TARGET_URL="$BASE_URL/t/$TARGET_ID"

OUT_DIR=".loop/runs/$TARGET_ID"
mkdir -p "$OUT_DIR" "$OUT_DIR/raw"

PERSONAS="lib/personas.json"

mapfile -t FLOWS < <(node -e "
const fs=require('fs');
const base=JSON.parse(fs.readFileSync('$PERSONAS','utf8'));
let ids=base.map(x=>x.id);
try{
  const j=JSON.parse(fs.readFileSync('$TARGET_DIR/flows.json','utf8'));
  const arr=j.flows||j;
  if(Array.isArray(arr)&&arr.length) ids=arr.map(x=>x.id);
}catch(e){}
console.log(ids.join('\n'));
")

ALL_PASS=1
for FID in "${FLOWS[@]}"; do
  [[ -z "$FID" ]] && continue
  OBJECTIVE="$(node -e "
const fs=require('fs');
const base=JSON.parse(fs.readFileSync('$PERSONAS','utf8'));
let o=(base.find(x=>x.id==='$FID')||{}).objective||'';
try{
  const j=JSON.parse(fs.readFileSync('$TARGET_DIR/flows.json','utf8'));
  const arr=j.flows||j;
  const c=arr.find(x=>x.id==='$FID');
  if(c&&c.objective) o=c.objective;
}catch(e){}
console.log(o);
")"
  RAW="$OUT_DIR/raw/$FID.ndjson"
  kane-cli run "$OBJECTIVE" --url "$TARGET_URL" --agent --headless --timeout 240 >"$RAW" 2>"$OUT_DIR/raw/$FID.log"
  CODE=$?
  node scripts/parse-kane.js "$RAW" "$CODE" > "$OUT_DIR/$FID.json"
  OK="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$OUT_DIR/$FID.json','utf8')).pass)}catch(e){console.log('false')}")"
  [[ "$OK" == "true" ]] || ALL_PASS=0
  echo "[$TARGET_ID][$FID] pass=$OK exit=$CODE"
done

node -e "
const fs=require('fs');
const dir='$OUT_DIR';
const ids=fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&f!=='round.json');
const flows=ids.map(f=>{
  const j=JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'));
  return {id:f.replace('.json',''),pass:j.pass,exitCode:j.exitCode,steps:j.steps,failures:j.failures};
});
const out={targetId:'$TARGET_ID',round:$ROUND,targetUrl:'$TARGET_URL',
  pass:flows.length>0 && flows.every(f=>f.pass),flows,generatedAt:new Date().toISOString()};
fs.mkdirSync('.loop',{recursive:true});
fs.writeFileSync('.loop/last-round.json',JSON.stringify(out,null,2));
fs.writeFileSync('.loop/round-$ROUND.json',JSON.stringify(out,null,2));
console.log(out.pass);
" > "$OUT_DIR/round-pass.txt"

PASS_FLAG="$(cat "$OUT_DIR/round-pass.txt")"
echo "ROUND $ROUND OVERALL: $PASS_FLAG"
[[ "$PASS_FLAG" == "true" ]] && exit 0 || exit 1
