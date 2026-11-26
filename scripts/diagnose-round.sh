#!/usr/bin/env bash
# Diagnose a Kane round: was the app actually fixed, and why did the judge fail?
#
#   bash scripts/diagnose-round.sh atlas [round]
#
# Answers four questions a failed round always raises:
#   1. Did the agent's edits reach targets/<id>/index.html on disk?
#   2. Is the page still byte-identical to the planted-buggy version?
#   3. Is the page identical to the committed green version?
#   4. What exactly did the judge report as the failure?
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh

TARGET="${1:-atlas}"
ROUND="${2:-1}"
TARGET_DIR="targets/$TARGET"
INDEX="$TARGET_DIR/index.html"
BUGGY="$TARGET_DIR/buggy.html"

echo "=============================================================="
echo " 1. On-disk state of $INDEX"
echo "=============================================================="
if [[ ! -f "$INDEX" ]]; then
  echo "MISSING: $INDEX"
  exit 2
fi
echo "  size:      $(wc -c < "$INDEX") bytes"
echo "  modified:  $(date -r "$INDEX" 2>/dev/null || stat -c '%y' "$INDEX" 2>/dev/null)"
echo
echo "  git status for the target:"
git status --porcelain -- "$TARGET_DIR" 2>/dev/null | sed 's/^/    /'
echo
if [[ -f "$BUGGY" ]]; then
  if cmp -s "$INDEX" "$BUGGY"; then
    echo "  >>> STILL THE BUGGY PAGE (byte-identical to $BUGGY)"
    echo "  >>> The agent's fix never reached this file."
  else
    echo "  page differs from the buggy version (a fix is present)"
  fi
fi
echo
echo "  git diff vs the committed green version (--stat):"
git diff --stat -- "$INDEX" 2>/dev/null | sed 's/^/    /'
if git diff --quiet -- "$INDEX" 2>/dev/null; then
  echo "    (identical to committed green - the agent did NOT change this file)"
fi
echo

echo "=============================================================="
echo " 2. Is the court serving this same file?"
echo "=============================================================="
PORT="${PORT:-3000}"
node -e '
const http=require("http");
const fs=require("fs");
const port=process.argv[1], idx=process.argv[2];
http.get("http://localhost:"+port+"/t/atlas",r=>{
  let b=""; r.on("data",d=>b+=d); r.on("end",()=>{
    const disk=fs.readFileSync(idx,"utf8");
    const served=b.replace(/<link rel="stylesheet" href="\/style.css"><\/head>/,"");
    const norm=s=>s.replace(/\r\n/g,"\n").trim();
    console.log("    disk bytes:    "+disk.length);
    console.log("    served bytes:  "+served.length);
    console.log(norm(disk)===norm(served)
      ? "    >>> SERVED PAGE MATCHES THE FILE ON DISK"
      : "    >>> SERVED PAGE DIFFERS FROM THE FILE ON DISK - the judge saw something else");
  });
}).on("error",e=>{console.log("    court not reachable on port "+port+": "+e.message)});
' "$PORT" "$INDEX" 2>/dev/null
echo

echo "=============================================================="
echo " 3. What did the judge report? (round $ROUND)"
echo "=============================================================="
ROUND_FILE=".loop/round-$ROUND.json"
if [[ -f "$ROUND_FILE" ]]; then
  node -e '
const fs=require("fs");
const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
console.log("    overall pass: "+j.pass+"   mode: "+j.mode+"   generated: "+j.generatedAt);
for(const f of (j.flows||[])){
  console.log("    ["+f.id+"] pass="+f.pass+" exit="+f.exitCode+" steps="+f.steps+(f.skipped?" SKIPPED":""));
  for(const x of (f.failures||[])) console.log("        - "+(x.message||x.status));
}
' "$ROUND_FILE"
else
  echo "    no $ROUND_FILE - the round did not complete"
fi
echo

echo "=============================================================="
echo " 4. Raw Kane output for each flow"
echo "=============================================================="
for F in newcomer skeptic mobile saver promised; do
  RAW=".loop/runs/$TARGET/raw/$F.ndjson"
  LOG=".loop/runs/$TARGET/raw/$F.log"
  [[ -f "$RAW" ]] || continue
  echo "  --- $F ---"
  echo "    events: $(wc -l < "$RAW")"
  if [[ -f "$LOG" ]]; then
    tail -n 5 "$LOG" | sed 's/^/      /'
  fi
done
echo
echo "  Full detail: cat .loop/runs/$TARGET/raw/<flow>.ndjson"
