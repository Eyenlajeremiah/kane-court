---
trigger: always_on
---

# Closed loop is mandatory

For any change under `targets/`, the following sequence is required before you consider
the work finished:

1. `bash scripts/loop.sh <targetId>` — runs Kane over every persona flow.
2. Read `.loop/last-round.json`. If any flow failed, fix the app and run it again.
3. Only a fully green round may be reported as success.

Never fabricate a passing result. The verdict page renders Kane's own output — if Kane
says red, the page says red.
