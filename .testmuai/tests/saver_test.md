---
mode: testing
max_steps: 50
timeout: 240
target: chrome
headless: true
---

# Session: saver

## Step 1
Fill in the email field of the newsletter form with a plausible address (for example founder@example.com) and submit the form. The test PASSES when a visible confirmation message appears after submitting AND the email field still holds the submitted value, so no field was silently dropped. The test FAILS if nothing visibly happens after the click, or if the form clears without any confirmation. Quote exactly what was visible after submitting.
