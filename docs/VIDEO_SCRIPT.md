# Demo video script (3-5 minutes, unlisted YouTube)

Judges watch this first. Show the working app AND Kane running. Lead with the
strangest moment, not with your face or your slides.

## 0:00 - Cold open (no intro, no logo)

Screen recording of the terminal. Run:

```bash
bash scripts/loop.sh atlas
```

Kane runs against `atlas`. Show the terminal with Kane's step trace. It goes RED.
Read one failure out loud: the dead CTA, or `undefined` in the table.

## 0:40 - The re-prompt

Show `.loop/pending-prompt.md`. This is the file the agent receives. Camera holds on
the concrete failure. Say: *"The agent never sees the app. It sees only what the
judge found."*

## 1:10 - The fix

Show Antigravity. The agent opens `targets/atlas/index.html` and fixes the code.
No narration over the keystrokes — let the edit be visible.

## 2:00 - The re-run

Back to the terminal. Kane re-runs. It goes GREEN. Show the pass lines:

```
[atlas][newcomer] pass=true exit=0
[atlas][skeptic]  pass=true exit=0
[atlas][mobile]   pass=true exit=0
```

## 2:45 - The verdict

Open the browser: `http://localhost:3000/v/atlas`. The published verdict shows the
green badge, the per-flow table and the round count. Say: *"That badge is not
something I typed. It only appears when Kane says green."*

## 3:15 - The point

Show `scripts/kane-gate.sh` and the Stop hook in `.agents/hooks.json`. Say: *"The
agent cannot finish a task while the judge is red. It gets re-entered with the
failure until the app genuinely works."*

## 3:45 - The court itself

Show the docket page, a couple of targets, the submit form. One line to close:
*"Any app can be put on trial. Public verdict, real browser, real failures."*

## Shot list

- Terminal, full screen, large font
- `.loop/pending-prompt.md` open in the editor
- Antigravity with the diff visible
- Terminal again for the green re-run
- Browser for the verdict page
- `AGENTS.md` / `hooks.json` in the editor

## Rules

- Upload as **Unlisted**, not Private. Test the link in an incognito window.
- Do NOT show your face, your name, or any account balances.
- Do NOT blur the terminal output — the terminal IS the evidence.
