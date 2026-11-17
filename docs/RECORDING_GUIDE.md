# Recording guide — what to do and what to say

Everything here is a NEW file, so it does not touch the integrity lock.

Read the "SAY" lines out loud, roughly. Don't memorise them. The point is that
you sound like you know what you built, not that you hit a word count.

Total runtime: about 4 minutes.

---

## Before you press record

1. Open these in separate windows, all visible:
   - Terminal A - the harness (big font, full screen)
   - Terminal B - the server, running `node server.js`, left alone
   - Editor - `targets/atlas/index.html`, `scripts/kane-gate.sh`, `.agents/hooks.json`
   - Browser - `http://localhost:3000`
2. Terminal A, run `bash scripts/reset-demo.sh`. Confirm it prints
   `atlas reset to buggy state`. Leave the server in Terminal B running.
3. Start recording, then run `bash scripts/loop.sh atlas` in Terminal A.
   It takes 10-12 minutes. Speed it up in the edit, or film it in two pieces:
   the red round now, and the green re-run separately with `bash scripts/run-case.sh atlas 2`.
4. No face, no name, no account balances. Upload as **Unlisted**, not Private.
   Test the link in an incognito window before you submit.

---

## 0:00 - Cold open (terminal, no intro, no logo)

Run `bash scripts/loop.sh atlas`. Kane starts against the broken page.

**SAY:**

> This is a landing page. It looks finished. It is not.

Then, as the failures come in, read one of them out loud, verbatim:

> The judge says the primary button does nothing when you click it. And there is
> the word "undefined" sitting in the table. And the page is nine hundred and
> sixty pixels wide, so on a phone the button is off the screen.

---

## 0:40 - The re-prompt (editor, `.loop/pending-prompt.md`)

Show the file. Let the camera read it.

**SAY:**

> This file is the whole idea. The agent never sees the app. It sees only what
> the judge found, written down like this. It is re-entered with exactly these
> failures and nothing else.

---

## 1:10 - The fix (editor, the agent working)

Show the agent opening `targets/atlas/index.html` and changing the code. Let the
keystrokes be visible. No voiceover over the typing.

**SAY (before or after, not during):**

> It only gets to change the application. The judge and the rules are locked.

---

## 2:00 - The re-run (terminal)

**SAY:**

> Same judge, same rules, no human in between. If the fix was cosmetic, this
> is where it shows up.

Let the three pass lines land on screen. Do not talk over them.

---

## 2:45 - The verdict (browser, `/v/atlas`)

Show the green badge and the per-flow table.

**SAY:**

> That badge is not something I typed. There is no code path that writes "green"
> unless the last run was actually green. The harness refuses to publish
> otherwise - and it did refuse, earlier, when the server was down. It published
> a red verdict instead.

*(That last line is optional, but it is the strongest sentence in the whole video.
Keep it only if you have the take.)*

---

## 3:15 - The point (editor, `scripts/kane-gate.sh` + `.agents/hooks.json`)

**SAY:**

> This is the gate. While the judge is red, the agent is not allowed to finish
> its turn. It gets pulled back in with the failure until the app genuinely
> works. And these files are locked by hash - the agent cannot weaken the rules
> it is being judged against. If it touches them, the verdict is refused.

---

## 3:45 - The court itself (browser, home page)

Show the docket, a couple of targets, the submit form.

**SAY:**

> And any app can be put on trial. Real browser, real failures, public verdict.

---

## Shot list

- Terminal, full screen, large font
- `.loop/pending-prompt.md` in the editor
- The agent's diff in `targets/atlas/index.html`
- Terminal again for the green re-run
- Browser for the verdict page
- `scripts/kane-gate.sh` and `.agents/hooks.json` in the editor

## Rules

- Unlisted, not Private. Test the link in an incognito window.
- No face, no name, no balances.
- Do not blur the terminal. The terminal is the evidence.
