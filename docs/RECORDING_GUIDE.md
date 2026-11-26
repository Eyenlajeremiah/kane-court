# Recording guide — robust narration

Total runtime: **4 to 6 minutes**, including the waiting. The waiting is fine.
Judges are not watching for pace, they are watching for proof.

**The rule that saves you: never sit in silence.** Every wait gets a line of
narration over it. If Kane is taking four minutes to judge five personas, that
is four minutes where you explain what is happening. Silence reads as a broken
recording; narration over a wait reads as competence.

You do not need to memorise any of this. Read it once, then talk like yourself
about the same ideas.

---

## Before you press record

```
git fetch origin && git reset --hard origin/main
```
```
npm install
```
```
npm start
```
```
kane-cli login --oauth
```
```
bash scripts/preflight.sh atlas
```

**Do not start recording until preflight says ALL CHECKS PASSED.** It checks
the server, the lock, the Kane login, the recordings, free disk space, and
that the target is in its broken state. Two of yesterday's failures would have
been caught here.

**Free up disk space first.** Yesterday your recorder crashed and left a
corrupt file. That is almost always a full disk. Make sure you have at least
10 GB free, and record to a local disk, not a network drive.

**Open these windows before you record, all visible:**
- Terminal A — the harness, large font, full screen
- Terminal B — left alone, do not type in it
- Editor — `targets/atlas/index.html`, `.agents/hooks.json`
- Browser — `http://localhost:3000`

**One critical rule for the agent:** you must stay in the SAME terminal for the
whole round. Yesterday you switched terminals, so the agent's edits went to a
different working copy and round 2 judged an unfixed page. Do not switch. Do
not open a second terminal. If the agent asks you something, answer it in that
same terminal.

---

## 0:00 — Cold open (browser, the page looks fine)

Browser: `http://localhost:3000/t/atlas`

> "This is a landing page for a venture capital firm. Scroll it, read it,
> click the button. Everything looks finished. It is not.
>
> What you are watching is an adversarial QA court. It puts an app on trial
> against five AI personas, and it only publishes a verdict the judge actually
> signed off on."

**Then switch to Terminal A** and run:

```
bash scripts/reset-demo.sh atlas
```

> "The page ships deliberately broken. Four planted defects: a button that does
> nothing, placeholder copy with the word 'undefined' in the table, a
> newsletter form that submits silently, and a table nine hundred and sixty
> pixels wide, so on a phone the button is off screen."

---

## 0:40 — The trial begins (terminal, live)

```
bash scripts/run-case.sh atlas 1
```

**This takes 3-6 minutes. Narrate through it. Do not go silent.**

> "Now the judge starts. This is not a script reading a page. Kane CLI drives a
> real Chrome browser with a real vision model. It has to actually look at
> what is on screen and decide.
>
> There are five personas. The newcomer just wants the button to work. The
> skeptic hunts for placeholder text. The mobile persona opens it at eight
> hundred pixels wide. The saver tries to subscribe. The promised persona
> checks that the headline is telling the truth."

**As the red lines appear, read one out loud, verbatim:**

> "There it is. The skeptic caught 'undefined' in the table. The newcomer says
> the button produced no visible change. The mobile persona says the page
> scrolls sideways. Three real failures, three different ways of being wrong."

**If there is a quiet gap while the last persona runs:**

> "And that is the fifth one still running. This is the part people usually
> cut out of the demo, but it is the whole point. It is not a test suite
> asserting on a mock. It is a browser, a model, and real time."

---

## 2:00 — What the agent actually receives (terminal)

```
node scripts/build-prompt.js atlas 1
```

> "Here is the entire input the coding agent gets. It never sees the app. It
> never sees the screenshot. It sees this — the exact failure the judge found,
> written down. Not 'fix the bugs.' The precise thing that is wrong.
>
> And notice what it is told: the objectives are the specification. Do not
> weaken the test, fix the code."

**If there is a pause before the agent starts:**

> "The agent is reading that now. It has a choice. It could edit the test to
> make it pass, which would be cheating, or it could fix the page. The
> harness makes that choice expensive — the rules are locked by hash, and if
> the agent touches them, the verdict is refused outright."

---

## 2:20 — The fix (editor, live)

Show the agent editing `targets/atlas/index.html`. Let the edits be visible.

> "Here it is fixing the actual page. The button gets a real handler. The
> placeholder text gets replaced with real companies. The form gets a
> confirmation. The fixed-width table becomes a responsive grid."

**If the agent is slow or you need to talk while it works:**

> "This is the part that is genuinely hard to fake. I am not going to cut to a
> finished page. What you are watching is the agent reading a failure and
> writing the fix that satisfies it."

**If the agent asks you a question, answer it on camera.** That is not a
mistake, it is a feature. Say something like:

> "It is asking me whether it should change the test or the app. The answer
> is in the prompt: the app."

---

## 3:30 — The re-run, live (terminal)

```
bash scripts/run-case.sh atlas 2
```

> "Same judge, same five personas, same page URL. Only the code changed. If
> the fix was cosmetic, this is where it shows up."

**Let the pass lines land. Do not talk over them.**

```
[atlas][newcomer] pass=true exit=0
[atlas][skeptic]  pass=true exit=0
[atlas][mobile]   pass=true exit=0
[atlas][saver]    pass=true exit=0
[atlas][promised] pass=true exit=0
```

> "Five green. And it is green because the judge said so, not because
> anything was written by hand."

**If you are not sure it went green, say that. It builds trust:**

> "If it comes back red, I re-prompt the agent and go round again. The court
> does not let a red round publish."

---

## 4:00 — The verdict (browser)

```
node scripts/publish.js atlas 2
```

Then browser: `http://localhost:3000/v/atlas`

> "That badge is not something I typed. There is no code path in this harness
> that writes 'green' unless the last run was actually green. The publish
> step refuses otherwise. We saw it refuse — earlier in this build, it
> published a red verdict instead, honestly labelled, because the server was
> down when the judge ran."

---

## 4:20 — The point (editor)

Show `.agents/hooks.json` and `scripts/kane-gate.sh`.

> "This is a Stop hook. While the judge is red, the agent is not allowed to
> finish its turn. It gets pulled back in with the failure until the app
> genuinely works.
>
> And these files — the gate, the personas, the harness — are locked by
> hash. The agent cannot weaken the rules it is being judged against. If it
> tries, the verdict is refused. That is what makes the green mean something."

---

## 4:45 — Close (browser, home page)

> "Any app can be put on trial. Real browser, real model, real failures, and
> a public verdict you can check. That is Kane Court."

---

## Shot list

- Browser — the atlas page, then the verdict page
- Terminal — full screen, large font
- Editor — `targets/atlas/index.html` mid-edit, then `.agents/hooks.json`
- Nothing else. No face, no slides, no logo.

## Rules

- Upload as **Unlisted**, not Private. Test the link in an incognito window.
- No face, no name, no account balances.
- Do not blur the terminal. The terminal is the evidence.
- Keep waiting on camera but narrated. Silence is what made yesterday's
  footage unusable.
- If a take goes wrong, do not restart the whole thing. The pieces are
  independent: red round, fix, green round, verdict. Re-record one piece.

## If something breaks mid-take

Do not panic and do not delete the footage. Say it out loud:

> "That just failed. Let me show you what it says."

Then run:

```
bash scripts/diagnose-round.sh atlas 2
```

Showing a real failure and how you diagnose it is the most convincing thing
in the entire video. A video where nothing ever breaks is a video nobody
believes.
