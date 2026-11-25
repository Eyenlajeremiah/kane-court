---
mode: testing
max_steps: 50
timeout: 240
target: chrome
headless: true
---

# Session: mobile

## Step 1
View the page at a narrow viewport of 800px wide (the narrowest Chrome supports). Assert that the page does not scroll sideways, and that the headline and the primary call-to-action button are fully visible and not overlapping. The test PASSES when there is no horizontal overflow and both the headline and the button are fully visible without overlap. The test FAILS if content overflows horizontally or is cut off.
