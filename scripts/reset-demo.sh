#!/usr/bin/env bash
# Restore the atlas target to its BUGGY state so the red -> green loop can be
# demonstrated (and re-recorded) at any time.
#
#   bash scripts/reset-demo.sh
#
# The buggy page is a committed file (targets/atlas/buggy.html) so that the demo
# always shows the exact four planted defects:
#   1. dead CTA          - clicking "View portfolio" does nothing
#   2. placeholder copy  - "Coming soon." and an "undefined" table cell
#   3. silent form       - the newsletter form submits with no confirmation
#   4. horizontal overflow - a 960px min-width table on a narrow viewport
#
# All four are detectable by the five persona flows, so the reset target can
# demo every persona - not just the two that happen to work on a stub page.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

TARGET="targets/atlas/index.html"
BUGGY="targets/atlas/buggy.html"

if [[ ! -f "$BUGGY" ]]; then
  echo "missing $BUGGY - cannot reset the demo target" >&2
  exit 2
fi

cp "$BUGGY" "$TARGET"
echo "atlas reset to its buggy state (dead CTA, placeholder copy, silent form, 960px overflow)"
echo "All five personas can now be demonstrated."
echo "Now run: bash scripts/loop.sh atlas"
