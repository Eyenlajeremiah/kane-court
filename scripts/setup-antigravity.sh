#!/usr/bin/env bash
# Wire the Antigravity CLI (agy) into the closed loop.
# Usage: bash scripts/setup-antigravity.sh
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

CANDIDATES=(
  "/c/Users/dell/.gemini/bin/agy.exe"
  "$HOME/.gemini/bin/agy.exe"
  "/c/Users/dell/.gemini/bin/agy"
)
FOUND=""
for c in "${CANDIDATES[@]}"; do
  if [ -x "$c" ]; then FOUND="$c"; break; fi
done
if [ -z "$FOUND" ] && command -v agy >/dev/null 2>&1; then
  FOUND="$(command -v agy)"
fi
if [ -z "$FOUND" ]; then
  echo "ERROR: agy binary not found. Checked:" >&2
  printf '  %s\n' "${CANDIDATES[@]}" >&2
  exit 1
fi
echo "Found agy: $FOUND"
"$FOUND" --version 2>&1 | head -2

if ! grep -q 'AGY_BIN' scripts/kane-env.sh; then
  printf '\n# Antigravity CLI (agy) - not on the default PATH on this machine\nexport AGY_BIN="${AGY_BIN:-%s}"\n' "$FOUND" >> scripts/kane-env.sh
  echo "patched scripts/kane-env.sh"
else
  echo "scripts/kane-env.sh already sets AGY_BIN"
fi

if ! grep -q 'dangerously-skip-permissions' scripts/loop.sh; then
  sed -i 's|--output-format json --mode auto|--output-format json --mode auto --dangerously-skip-permissions|' scripts/loop.sh
  echo "patched scripts/loop.sh (headless auto-approve)"
else
  echo "scripts/loop.sh already headless"
fi

echo
echo "Done. The loop is now autonomous."
echo "Verify:  bash scripts/loop.sh atlas"
