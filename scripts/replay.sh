#!/usr/bin/env bash
# Replay the committed Kane flows for a target. Free: no LLM credits are used
# because each step replays from its cached recording.
#
#   bash scripts/replay.sh [targetId]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
source scripts/kane-env.sh
TARGET_ID="${1:-atlas}"
exec bash scripts/run-case.sh "$TARGET_ID" 1 --replay
