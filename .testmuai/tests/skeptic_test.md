---
mode: testing
max_steps: 50
timeout: 240
target: chrome
headless: true
---

# Session: skeptic

## Step 1
Read the whole page and assert that no visible text reads 'undefined', 'null', 'NaN', 'Lorem ipsum', 'TODO' or 'coming soon', and that every table cell has a real value. The test PASSES when the page contains none of those placeholder strings and every table cell holds a real value. The test FAILS if any such placeholder text is present, and the failure message must quote the exact offending text.
