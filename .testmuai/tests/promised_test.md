---
mode: testing
max_steps: 50
timeout: 240
target: chrome
headless: true
---

# Session: promised

## Step 1
Read the headline at the top of the page and the text on the primary call-to-action button, then click that button. The test PASSES when the click reveals content that actually matches what the headline and the button label promised, such as a portfolio of real named companies and not a placeholder, AND the button label does not contradict the headline. The test FAILS if the revealed panel is empty, if it says it is 'coming soon', or if it contains placeholder text. Quote the headline, the button label and exactly what the revealed panel said.
