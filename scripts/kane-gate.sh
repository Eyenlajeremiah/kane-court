#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh
STATE=".loop/gate-state.json"
MAX_CONT="${GATE_MAX_CONTINUES:-3}"
PORT="${PORT:-3000}"
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
if [[ "$LAST_TARGET" == "$TARGET_ID" && "$PASS" == "true" ]]; then
  EVIDENCE_OK=1
  node scripts/lock-files.js --verify >/dev/null 2>&1 || EVIDENCE_OK=0
  node -e "
import('./lib/evidence-attestation.js').then(async m=>{
 const fs=require('fs');
 let j=JSON.parse(fs.readFileSync('.loop/last-round.json','utf8'));
 if(!process.env.KANE_ATTESTATION_PUBLIC_KEY)process.exit(1);
 const files=fs.readdirSync('.loop').filter(f=>/^round-[0-9]+\\.attestation\\.json$/.test(f)).sort((a,b)=>Number(b.match(/[0-9]+/)[0])-Number(a.match(/[0-9]+/)[0]));
 if(!files.length)process.exit(1);
 const round=Number(files[0].match(/[0-9]+/)[0]);
 try{m.verifyAttestation({targetId:process.argv[1],round,targetUrl:j.targetUrl||j.url,publicKey:process.env.KANE_ATTESTATION_PUBLIC_KEY})}catch(e){process.exit(1)}
}).catch(()=>process.exit(1))
" "$TARGET_ID" || EVIDENCE_OK=0
  node -e "
const fs=require('fs');
const target=process.argv[1];
let j; try{j=JSON.parse(fs.readFileSync('.loop/last-round.json','utf8'))}catch(e){process.exit(1)}
if(j.targetId!==target&&j.target!==target)process.exit(1);
if(j.pass!==true||!Array.isArray(j.flows)||j.flows.length===0)process.exit(1);
const base=JSON.parse(fs.readFileSync('lib/personas.json','utf8')).map(x=>x.id);
let ids=base;
try{const custom=JSON.parse(fs.readFileSync('targets/'+target+'/flows.json','utf8'));const arr=custom.flows||custom;if(Array.isArray(arr)&&arr.length)ids=arr.map(x=>x.id)}catch(e){}
const actual=j.flows.map(f=>f.id).sort();
const expected=[...ids].sort();
if(actual.length!==expected.length||actual.some((id,i)=>id!==expected[i]))process.exit(1);
if(j.flows.some(f=>f.pass!==true||f.skipped===true))process.exit(1);
const generated=Date.parse(j.verifiedAt||j.generatedAt);
const now=Date.now();
if(!Number.isFinite(generated)||generated>now+60000||now-generated>30*60*1000)process.exit(1);
" "$TARGET_ID" || EVIDENCE_OK=0
  while IFS= read -r FID; do
    RAW=".loop/runs/$TARGET_ID/raw/$FID.ndjson"
    FLOW_JSON=".loop/runs/$TARGET_ID/$FID.json"
    [[ -f "$RAW" && -f "$FLOW_JSON" ]] || { EVIDENCE_OK=0; break; }
    CODE="$(node -e "try{const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.exitCode))}catch(e){process.exit(1)}" "$FLOW_JSON")" || EVIDENCE_OK=0
    OK="$(KANE_TARGET_URL="http://localhost:$PORT/t/$TARGET_ID" node scripts/parse-kane.js "$RAW" "$CODE" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).pass===true?'true':'false')}catch(e){process.exit(1)}}")" || EVIDENCE_OK=0
    [[ "$OK" == "true" ]] || EVIDENCE_OK=0
  done < <(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync('.loop/last-round.json','utf8'));for(const f of j.flows||[])console.log(f.id)}catch(e){}")
  if [[ "$EVIDENCE_OK" -eq 1 ]]; then echo '{"decision":"allow"}'; exit 0; fi
fi
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
