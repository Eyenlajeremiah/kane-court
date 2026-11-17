#!/usr/bin/env bash
#!/usr/bin/env bash
# THE CLOSED LOOP: Kane CLI judges the target -> failures re-prompt the agent -> Kane re-runs.
# Usage: bash scripts/loop.sh <targetId> [maxRounds]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh
TARGET_ID="${1:-}"
MAX_ROUNDS="${2:-${MAX_ROUNDS:-3}}"
[[ -z "$TARGET_ID" ]] && { echo "usage: loop.sh <targetId> [maxRounds]" >&2; exit 2; }
mkdir -p .loop
for ((ROUND=1; ROUND<=MAX_ROUNDS; ROUND++)); do
  echo "=== Kane Court: round $ROUND/$MAX_ROUNDS for $TARGET_ID ==="
  bash scripts/run-case.sh "$TARGET_ID" "$ROUND"
  RC=$?
  if [[ $RC -eq 0 ]]; then
    echo "GREEN at round $ROUND - verdict publishable"
    node scripts/publish.js "$TARGET_ID" "$ROUND"
    exit 0
  fi
  echo "RED at round $ROUND - re-prompting the agent with Kane's findings"
  node scripts/build-prompt.js "$TARGET_ID" "$ROUND"
  if command -v "${AGY_BIN:-agy}" >/dev/null 2>&1; then
    "${AGY_BIN:-agy}" -p "$(cat .loop/pending-prompt.md)" --output-format json --mode auto --dangerously-skip-permissions >> .loop/agent-responses.ndjson 2>> .loop/agent-errors.log
    echo "agent re-prompted via ${AGY_BIN:-agy}"
  else
    echo "NOTE: agy CLI not found. Open .loop/pending-prompt.md, paste it into Antigravity, then re-run this script."
    exit 3
  fi
done
echo "Still red after $MAX_ROUNDS rounds. Publishing as BLOCKED, not green."
node scripts/publish.js "$TARGET_ID" "$MAX_ROUNDS" --blocked
exit 1
