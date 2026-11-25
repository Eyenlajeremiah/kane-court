# Demo video script (3-5 minutes, YouTube Unlisted)

Judges watch this first. Show the working app AND Kane running. Lead with the
strangest moment, not with your face or your slides.

## Before you record (off camera)

```bash
git fetch origin && git reset --hard origin/main
npm install
npm start              # detached: survives closing the terminal
kane-cli login --oauth
node scripts/lock-files.js --verify
```

Expect `integrity OK: 66 locked file(s) unchanged`.

## 0:00 - Cold open: the app looks finished

Browser: `http://localhost:3000/t/atlas`

> "This is a venture capital landing page. It looks finished. It is not."

## 0:30 - Reset it to the broken version

Terminal:

```bash
bash scripts/reset-demo.sh atlas
```

> "Kane Court ships with the app deliberately broken. Four planted defects: a
> dead call-to-action, placeholder copy with an `undefined` in the table, a
> newsletter form that submits silently, and a 960px table that overflows on
> mobile."

## 1:00 - Kane judges it RED

Terminal:

```bash
bash scripts/replay.sh atlas
```

> "Kane CLI drives a real Chrome. It replays five adversarial personas -
> newcomer, skeptic, mobile, saver, promised. Watch it catch the dead button."

Show the red lines. Let them sit for a second.

**Fallback if replay does not go red** (replay reuses cached recordings, so it
may not re-assert against the broken page). Author the flows for real instead -
this costs Kane credits but is the proven path:

```bash
bash scripts/run-case.sh atlas 1
```

## 1:45 - What the agent actually sees

Terminal:

```bash
node scripts/build-prompt.js atlas 1
cat .loop/pending-prompt.md
```

> "This is the only thing the coding agent receives. It never sees the app. It
> sees the exact failure the judge found - not 'fix the bugs.'"

## 2:10 - The fix

Open `targets/atlas/index.html` in your editor. Let the cursor land on the
broken CTA, the placeholder text, the form. Fix them on camera.

No narration over the keystrokes - let the edit be visible.

To match the committed green page exactly instead of hand-fixing:

```bash
cp targets/atlas/buggy.html /tmp/keep-buggy.html   # before you start
git checkout HEAD -- targets/atlas/index.html      # after the shot
```

## 2:40 - The re-run, GREEN

Terminal:

```bash
bash scripts/replay.sh atlas
```

> "Same judge, same flows. It goes green - and only now can a verdict publish."

On camera:

```
[atlas][newcomer] pass=true exit=0
[atlas][skeptic]  pass=true exit=0
[atlas][mobile]   pass=true exit=0
[atlas][saver]    pass=true exit=0
[atlas][promised] pass=true exit=0
```

## 3:15 - The verdict

Browser: `http://localhost:3000/v/atlas`

> "That badge is not something I typed. It only appears when Kane's own re-run
> comes back green."

## 3:40 - The point

Terminal:

```bash
cat .agents/hooks.json
```

> "The agent cannot finish a task while the judge is red. It gets re-entered
> with the failure until the app genuinely works. Any app can be put on trial."

## Shot list

- Browser: the atlas target page
- Terminal, full screen, large font
- Editor with `targets/atlas/index.html` open
- Terminal again for the green re-run
- Browser for the verdict page
- Editor with `.agents/hooks.json` open

## Rules

- Upload as **Unlisted**, not Private. Test the link in an incognito window.
- Do NOT show your face, your name, or any account balances.
- Do NOT blur the terminal output - the terminal IS the evidence.
- Leave the interesting part in the first 30 seconds. Judges stop watching at
  3:00 if the video runs long.
