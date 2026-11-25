# Demo video script (3-5 minutes, YouTube Unlisted)

Judges watch this first. Lead with the strangest moment, not your face or your
slides.

## THE ONE RULE FOR THIS VIDEO

Everything must be LIVE. No pre-recorded output, no replay of a cached run.

- Use `bash scripts/run-case.sh atlas <round>` - NOT `scripts/replay.sh`.
  Replay reuses a cached recording made against the fixed page, so it does not
  re-judge the broken page. Author mode drives a real Chrome with a real
  vision model, so it genuinely rules on what is on screen right now.
- Show the agent actually editing the file. Do not cut to a finished page.

The broken page itself is a committed file (`targets/atlas/buggy.html`). That is
not a shortcut - a court needs a defendant. What matters on camera is that the
judge rules live and the fix is made live.

## Before you record (off camera)

```bash
git fetch origin && git reset --hard origin/main
npm install
npm start              # detached: survives closing the terminal
kane-cli login --oauth
node scripts/lock-files.js --verify
```

Expect `integrity OK: 66 locked file(s) unchanged`.

Open VS Code with Copilot on the same folder. You will paste the re-prompt into
it during the recording.

## 0:00 - Cold open: the app looks finished

Browser: `http://localhost:3000/t/atlas`

> "This is a venture capital landing page. It looks finished. It is not."

## 0:30 - Put it on trial

Terminal:

```bash
bash scripts/reset-demo.sh atlas
```

> "Four planted defects: a dead call-to-action, placeholder copy with an
> `undefined` in the table, a newsletter form that submits silently, and a
> 960px table that overflows on mobile."

## 1:00 - Kane judges it RED (live)

Terminal:

```bash
bash scripts/run-case.sh atlas 1
```

> "Kane CLI drives a real Chrome with a real vision model. Five adversarial
> personas - newcomer, skeptic, mobile, saver, promised. Watch it catch the dead
> button."

Show the red lines. Let them sit for a second. This takes a few minutes -
that is fine, it proves it is live.

## 2:00 - What the agent actually sees

Terminal:

```bash
node scripts/build-prompt.js atlas 1
```

> "This is the only thing the coding agent receives. It never sees the app. It
> sees the exact failure the judge found - not 'fix the bugs.'"

## 2:20 - The live fix

VS Code, Copilot chat. Paste the whole contents of `.loop/pending-prompt.md`.

> "Now the agent gets re-entered with the failure. It fixes the app. Watch the
> actual edits."

Let the edits happen on camera. Do not cut away. If it takes a minute, let it.

## 3:20 - The re-run, GREEN (live)

Terminal:

```bash
bash scripts/run-case.sh atlas 2
```

> "Same judge, same flows, run again against the code the agent just wrote. It
> goes green."

On camera:

```
[atlas][newcomer] pass=true exit=0
[atlas][skeptic]  pass=true exit=0
[atlas][mobile]   pass=true exit=0
[atlas][saver]    pass=true exit=0
[atlas][promised] pass=true exit=0
```

## 3:50 - The verdict

Terminal:

```bash
node scripts/publish.js atlas 2
```

Browser: `http://localhost:3000/v/atlas`

> "That badge is not something I typed. It only appears when Kane's own live
> re-run came back green."

## 4:05 - The point

Terminal:

```bash
cat .agents/hooks.json
```

> "This is a Stop hook. The agent cannot finish a task while the judge is red.
> It gets re-entered with the failure until the app genuinely works."

## Shot list

- Browser: the atlas target page
- Terminal, full screen, large font
- VS Code + Copilot chat, the edits visible
- Terminal again for the green re-run
- Browser for the verdict page
- Editor with `.agents/hooks.json` open

## Rules

- Upload as **Unlisted**, not Private. Test the link in an incognito window.
- Do NOT show your face, your name, or any account balances.
- Do NOT blur the terminal output - the terminal IS the evidence.
- Judge-proof note: the live run costs Kane credits. You have 10,000 free.
  Two rounds of five personas fits inside that.
- If the live run is too slow, cut the wait - but never cut back to a
  pre-recorded run.
