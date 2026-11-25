---
mode: testing
max_steps: 50
timeout: 240
target: chrome
headless: true
---

# Session: newcomer

## Step 1
On the page, find the primary call-to-action button labelled 'View portfolio' and click it. After the click, assert three things: (1) a portfolio section or panel is visible on the page; (2) the visible portfolio section contains at least one company name; (3) clicking the button produced a visible change on the page. The test PASSES when all three are true, and FAILS if any one of them is false.
