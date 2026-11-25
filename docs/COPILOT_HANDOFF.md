# Handoff: Mira -> Copilot

**Written by:** Mira (Mira Pro agent, working via the user's connected GitHub account)
**Date:** 2026-11-25
**Repo:** `Eyenlajeremiah/kane-court` (branch `main`)
**Deadline:** KaneCLI Online Hackathon — **26 Nov 2026, 19:29 WAT** (~19 hours from writing)
**Submission requires TWO public posts about the project.**

---

## 0. Read this first

The user is a middleman. **They do not want to relay technical detail between us.**
Work autonomously, and leave your state in this file (section 9) so the next agent can
continue without asking the user anything.

Two agents work this repo: **Mira** (me) and **Copilot**. You may both push to `main`.
Coordination rule:

1. Before doing anything, `git pull origin main`.
2. Read this file end to end, especially **section 9 (Status log)** and **section 8 (Next actions)**.
3. Do the work.
4. Update **section 9** with what you did and what state you left things in.
5. Push the file update too.

If you find a blocker that needs a decision only the user can make, write it in
**section 9 under "NEEDS HUMAN"** and state it in the commit message. Then stop.
Do not ask the user technical questions — state the decision needed in one line.

---

## 1. What this project is

**Kane Court** is a CLI/web "court" that judges a web app against a persona-based test
suite, and **publishes a verdict only when the green is genuinely earned**.

The whole value proposition is *anti-fake*. If the court can be made to report green
without the app actually being fixed, the project is worthless. Every design decision
should be judged through that lens.

### Flow
```
recordings (.testmuai/tests/*_test.md)   ->  Kane CLI replays them
   -> scripts/run-case.sh                 ->  per-flow JSON + .loop/round-N.json
   -> scripts/publish.js                  ->  data/verdicts.json
   -> server.js serves the court + /t/<targetId>
```

### Targets
- `targets/atlas/` — the live demo target. **5 personas**: `mobile`, `newcomer`, `skeptic`, `saver`, `promised`.
- `targets/atlas/buggy.html` — the RED page (dead CTA, placeholder copy, silent form, 960px overflow).
- `targets/atlas/index.html` — the GREEN page. **`scripts/reset-demo.sh` copies `buggy.html` over `index.html`.**
- `targets/ledger`, `targets/orbit`, `targets/vault` — meta/flow targets.

### The five personas are the demo
`lib/personas.json` + `.testmuai/tests/` + their `output-*/` recording folders.
**All of these MUST stay committed** so a judge with zero Kane credits can still replay
the flows. This is the single most fragile part of the repo.

---

## 2. State as of this handoff — all verified, not assumed

### Pushed in `10b1c6a` (previous commit, by Mira)
Five defects were found by audit and fixed. All verified by execution, not by reading.

| # | File | Defect | Fix |
|---|---|---|---|
| 1 | `scripts/lock-files.js` | `--verify` exited 1 with `INTEGRITY MANIFEST SIGNATURE CONFIGURATION IS REQUIRED` for any clone without two env vars exported. **The court did not run for a judge.** | Signature is now **opt-in**. Hash lock always enforced; signed deploys are strictly stronger. |
| 2 | `scripts/publish.js` | `verifyAttestation()` was unconditional, so publishing required a separately generated keypair. | Attestation now **opt-in** (`KANE_ATTESTATION_PUBLIC_KEY`). Round validation + Kane NDJSON re-parse still always enforced. |
| 3 | `targets/atlas/index.html` | Had been replaced by a stripped page with **no email input** -> the `saver` persona could never pass. Also no longer matched `buggy.html`, so `reset-demo.sh` was not idempotent. | Restored from `d1ab12c`. Has the newsletter form, no placeholder copy, no fixed-width overflow, working panel toggle. |
| 4 | `scripts/kane-env.sh` | `$USERNAME` unbound under `set -u` on Linux/macOS -> script aborted before the court started. | `${USERNAME:-$(id -un)}`. |
| 5 | `scripts/lock-files.js` | Locking deployment-specific signing material would make every clone without the operator's private key report REMOVED drift -> broken court. | Signing material excluded from the lock; `.gitignore`/`.npmignore` updated so the private key is never tracked or shipped. |

Also added: `scripts/sign-manifest.js` (new — generates an Ed25519 keypair and signs the
manifest), README section documenting both optional features, lock re-pinned to **70 files**.

### Verified working
- `node scripts/lock-files.js --verify` -> `integrity OK: 70 locked file(s) unchanged (manifest not signed)`, exit 0.
- `node --test tests/security.test.js` -> 10 tests, 8 pass, 2 Windows-only skips, 0 fail.
- `bash scripts/reset-demo.sh` -> makes `index.html` identical to `buggy.html`; green restored after.
- Signing enforced when configured (verified it passes the signature check and proceeds to real drift reporting).
- Private key confirmed NOT tracked by git.

### The big win already landed (from `7c172a5`, Copilot)
The **false-green bug** is fixed. Previously a round with 3 of 5 flows actually run could
report `pass: true`, because skipped flows had their JSON deleted and the verdict was
computed from whatever files remained. Now `run-case.sh` writes an explicit
`skipped: true` result, counts it as not-pass, and derives flows from an explicit
`FLOW_IDS` list. `lib/round-validation.js` additionally requires a fresh (<30 min),
complete, all-green round containing **exactly** the expected flow IDs before publication.

---

## 3. THE ONE BIGGEST REMAINING RISK

**`data/verdicts.json` currently shows every target as `pass: false`.**

```
target: atlas               pass: False  flows: 5  rounds: 3
target: ext-98c1de05aa      pass: False  flows: 5  rounds: 1
target: ext-2af5025c0e      pass: False  flows: 5  rounds: 1
target: ext-b12a7841c5      pass: False  flows: 5  rounds: 1
```

For a submission whose entire premise is *"the verdict is published only when the green
is earned"*, shipping a repo where nothing is green **weakens the demo badly**. A judge
opens the repo, sees all-red verdicts, and concludes the court never worked.

**Fix: produce one genuine green atlas verdict.** It must be earned by a real Kane run —
do not hand-edit `data/verdicts.json`. Hand-editing it would be exactly the sin the
project exists to prevent, and it would be trivially detectable by a careful judge.

**Requires:** `kane-cli login --oauth` (the user has a session on their machine, not in my
sandbox) and KaneAI credits.

---

## 4. Current gaps — prioritised

### P0 — blocks a credible submission
1. **No green atlas verdict in `data/verdicts.json`.** See section 3.
2. **The five flows have not been re-recorded** against the restored green page. The
   recordings in `.testmuai/tests/` were authored against the old page. `saver` in
   particular references a newsletter email field — the restored page has it again, but
   the recordings must be re-verified against the current page.

### P1 — blocks the "it runs for a judge" story
3. **No fresh-clone end-to-end verification of the pushed `main`.** All verification so
   far was on a local snapshot. Needs: clone -> `npm install` -> `npm start` -> `npm test`
   -> `bash scripts/loop.sh atlas` -> `node scripts/publish.js atlas 1`.
4. **`npm publish` has not been run.** Check `package.json` `files` — `lib/kane-court-core.js`,
   `lib/evidence-attestation.js`, `lib/network-policy.js`, `lib/queue-store.js`,
   `lib/round-validation.js`, `lib/personas.json` are listed (there are harmless duplicate
   entries). `scripts/` and `targets/` and `.testmuai/tests/` are listed too. **Verify with
   `npm pack --dry-run` that the recordings and the demo target actually ship.**
5. **README has no "how to run it in 60 seconds"** for a judge. There is `docs/RECORDING_GUIDE.md`
   and `docs/SUBMISSION.md` and `docs/LAUNCH_POSTS.md` — check they are current.

### P2 — polish
6. `npm test` currently runs `node --test` (which globs `tests/`). It works, but a
   `tests/security.test.js` explicit path is less ambiguous.
7. `lib/network-policy.js` `isPrivateAddress` has some dense bitwise IPv6 logic
   (`first === 0x2002` returns true = blocked). Worth a second read for correctness —
   `2002::/16` is 6to4, correctly private-ish, but confirm.
8. `server.js` binds `127.0.0.1` by default and `HOST` overrides it. Fine.

---

## 5. How to actually run the loop (the part that needs credentials)

```bash
cd kane-court
npm install                      # zero runtime dependencies

# 1. Author/refresh the persona recordings (costs KaneAI credits)
bash scripts/record-flows.sh atlas
#    -> writes .testmuai/tests/<flow>_test.md AND .testmuai/tests/output-<flow>/
#    -> BOTH must be committed, or the flow cannot replay for a judge

# 2. Run the round (replay is free once recordings exist)
bash scripts/loop.sh atlas

# 3. Publish ONLY if green
node scripts/publish.js atlas 1
```

`scripts/loop.sh` is the demo entry point. `scripts/reset-demo.sh atlas` puts the target
back into its broken state first — that is the red->green demo.

**Critical:** `.testmuai/tests/*_test.md` + all `output-*/` folders are committed on purpose
so a judge with **zero credits** can replay. If a re-record drops or truncates any of these,
the judge cannot run the demo at all. **Verify `git status` shows the recording files staged
and committed after every re-record.**

---

## 6. Integrity lock — how to work with it

The lock pins every file except the app under test (`targets/*/index.html`), generated
output (`data/`, `.loop/`), and the manifest itself. `publish.js` runs `--verify` and
**refuses to publish** on drift.

So after **any** change to specs/scripts/tests, you MUST re-pin:

```bash
node scripts/lock-files.js --init && node scripts/lock-files.js --verify
```

If you add a new file that is part of the court, re-pin. If you only change
`targets/atlas/index.html`, you do **not** re-pin (that file is intentionally mutable).

**Never** commit `scripts/lock-manifest.key` (private key). It is gitignored, and the lock
deliberately excludes signing material so clones without the key still verify.

---

## 7. Submission checklist (deadline 26 Nov 19:29 WAT)

- [ ] Green atlas verdict earned by a real Kane run, present in `data/verdicts.json`
- [ ] All 5 recordings + `output-*/` folders committed
- [ ] Fresh-clone verification passes end to end
- [ ] `npm pack --dry-run` confirms the package ships `targets/` and `.testmuai/tests/`
- [ ] `npm publish` done
- [ ] **Public post #1** (X — primary platform)
- [ ] **Public post #2** (X or Instagram — secondary)
- [ ] Hackathon submission form filled (needs the two public post URLs)

Brand context for the posts — **Kane Court is a separate project from Legacy Society**.
Kane Court = the tool. Legacy Society = your content brand (quiet luxury / old money,
voice: calm and restrained, no hype emojis). Do not mix the two voices.

`docs/LAUNCH_POSTS.md` and `docs/SUBMISSION.md` hold draft copy — read them before
writing new copy.

---

## 8. NEXT ACTIONS — in priority order

1. `git pull origin main`, then read section 9.
2. Get a Kane CLI session: `kane-cli login --oauth` then `kane-cli whoami` and
   `kane-cli balance`. **If this needs the user, put it in NEEDS HUMAN below.**
3. Re-record the five atlas flows against the restored page:
   `bash scripts/record-flows.sh atlas`
4. `bash scripts/reset-demo.sh atlas` -> `bash scripts/loop.sh atlas` -> confirm a red round.
5. Restore the green page, run a real green round, `node scripts/publish.js atlas 1`.
6. **Commit every recording file and `output-*/` folder.** Verify with `git status`.
7. Re-pin the lock: `node scripts/lock-files.js --init && node scripts/lock-files.js --verify`
8. Fresh-clone verification: clone into a temp dir, `npm install`, `npm test`,
   `npm start`, confirm the court serves and `/t/atlas` renders.
9. `npm pack --dry-run` -> check contents -> `npm publish`.
10. Write the two public posts and file the submission form.
11. Update section 9 and push.

**Do not skip step 6.** It is the failure mode that breaks the demo for a judge.

---

---

## 10. PASTE-READY PROMPT FOR COPILOT

Copy everything in the block below into Copilot. It is self-contained and needs no
other context from the user.

```
You are continuing work on the repo Eyenlajeremiah/kane-court (branch `main`).
A previous agent (Mira) audited the code, fixed five defects, and left this note.
Deadline: KaneCLI Online Hackathon submission closes 26 Nov 2026 at 19:29 WAT.

START HERE:
1. cd into your local clone of the repo, then: git pull origin main
2. Read docs/COPILOT_HANDOFF.md fully before touching anything.
   Section 2 = what is already fixed and verified.
   Section 3 = the single biggest remaining risk.
   Section 4 = prioritised gap list.
   Section 5 = exact commands to run the loop.
   Section 6 = how the integrity lock works (you MUST re-pin after editing specs).
   Section 8 = ordered next actions.
   Section 9 = status log. ADD YOUR ENTRY HERE when you finish.
3. Work autonomously. Do not ask the user technical questions.
   If you hit a decision only the human can make, write it in Section 9 under
   "NEEDS HUMAN" and stop.
4. When you finish, update Section 9 with exactly what you changed and the state
   you left the repo in, then commit and push that note too.

PROJECT IN ONE LINE:
Kane Court is a court that judges a web app against 5 persona test flows and
publishes a green verdict ONLY when the green is genuinely earned. The whole
value is anti-fake: if the court can report green without the app actually being
fixed, the project is worthless. Every decision should be judged through that lens.

TARGET: targets/atlas, 5 personas - mobile, newcomer, skeptic, saver, promised.
  targets/atlas/index.html  = the GREEN page (the one under test)
  targets/atlas/buggy.html  = the RED page (dead CTA, placeholder copy,
                               silent form, 960px overflow)
  scripts/reset-demo.sh     = copies buggy.html over index.html (red->green demo)
  scripts/loop.sh atlas     = runs the round
  scripts/publish.js atlas 1 = publishes the verdict (refuses unless green)

NON-NEGOTIABLES:
- .testmuai/tests/*_test.md AND every .testmuai/tests/output-*/ folder MUST stay
  committed. They are the replayable recordings that let a judge with ZERO Kane
  credits still run the demo. If a re-record drops or truncates any of them,
  the demo is dead for a judge. Verify with git status after every re-record.
- NEVER hand-edit data/verdicts.json to make it green. The green must be earned
  by a real Kane run. Hand-editing it is the exact sin this project exists to
  prevent, and a careful judge can spot it.
- NEVER commit scripts/lock-manifest.key (the private key). It is gitignored.
- After editing anything that is NOT targets/*/index.html, re-pin the lock:
    node scripts/lock-files.js --init && node scripts/lock-files.js --verify
  publish.js refuses to publish on drift, so a stale lock blocks the demo.

DO THIS IN ORDER:
1. Verify the current state works:
     npm install && npm test
     node scripts/lock-files.js --verify     # must print "integrity OK"
     npm start                              # then confirm the court serves
       and http://localhost:3000/t/atlas renders
2. Get a Kane CLI session and check credits:
     kane-cli login --oauth
     kane-cli whoami
     kane-cli balance
   If this fails because it needs the human, note it in Section 9 under
   "NEEDS HUMAN" and move on to the steps that do not need credits.
3. Re-record the 5 flows against the current green page:
     bash scripts/record-flows.sh atlas
   Then COMMIT every changed *_test.md and every output-*/ folder.
4. Prove the red->green story:
     bash scripts/reset-demo.sh atlas
     bash scripts/loop.sh atlas              # expect a RED round
     restore the green page, then run a real green round:
     bash scripts/loop.sh atlas
     node scripts/publish.js atlas 1        # expect a green verdict published
5. Confirm data/verdicts.json now shows atlas pass:true, flows:5.
   That is the single most valuable thing left to fix.
6. Re-pin the lock, re-run npm test.
7. Verify the package ships what a judge needs:
     npm pack --dry-run
   Confirm targets/ and .testmuai/tests/ are inside the tarball, and that
   scripts/lock-manifest.key is NOT.
8. npm publish
9. Write the two required PUBLIC posts about the project and file the
   submission form (it asks for the two post URLs).
   Draft copy is in docs/LAUNCH_POSTS.md and docs/SUBMISSION.md - read those
   before writing new copy. Kane Court is a TOOL, separate from the user's
   content brand Legacy Society; do not mix the two voices.
   Read docs/SUBMISSION.md for the submission form details.
10. Update Section 9 of this file and push it.

VERIFY BEFORE YOU CLAIM DONE:
  npm test                                   # 0 failures
  node scripts/lock-files.js --verify         # integrity OK
  fresh clone into a temp dir, npm install, npm test, npm start,
    and confirm /t/atlas renders              # the judge path
  git status                                 # recordings all committed
```

---

## 9. Status log

### Entry 2026-11-25 — Mira (previous agent)

**Done:**
- Full audit of the tree at `7c172a5`. Verified: syntax of every `.js`/`.sh`/`.json`
  parses clean; no secrets; no hardcoded dev-machine paths; `npm pack` includes all
  5 new `lib/` modules.
- Fixed 5 defects, pushed as `10b1c6a` (commit message in git history explains each).
- Re-pinned the lock to 70 files; verified clean.

**Not done (handed over):**
- Green verdict (P0) — blocked on Kane CLI credentials + credits.
- Re-recording the flows — blocked on the above.
- Fresh-clone verification of pushed `main`.
- `npm publish`.
- The two public posts + submission form.

**State left behind:**
- Working tree clean at commit `10b1c6a` on `main`.
- `scripts/lock-manifest.key` / `.sig` / `.pub` exist only locally and are gitignored.
  They are **not** needed for the court to work.

**NEEDS HUMAN:** none right now — proceed with the next actions above.

### Entry 2026-11-25 — Mira (second pass, post-Copilot-UI-redesign)

**Context:** Copilot pushed `2a494ed` ("Redesign court UI with clean SaaS layout",
touching `public/style.css` +679/-23 and `server.js` +46/-31) while I was working.
I merged it, re-pinned the lock to 71 files, and re-verified.

**Done in this pass:**
- Merged `2a494ed`, re-pinned lock to 71 files, `integrity OK: 71 locked file(s) unchanged`.
- `npm test` (node --test tests/security.test.js): 10 tests, 8 pass, 2 Windows-only
  skips, 0 fail — re-run on the merged tree.
- Pushed the 5 fixes + `scripts/sign-manifest.js` + `.gitignore`/`.npmignore` +
  README + restored `targets/atlas/index.html` to remote `main` via the GitHub API.
- Verified remote `main` file-by-file: 10/10 checks pass, and the remote manifest
  hashes match the remote file contents exactly (so a judge's clone verifies clean).
- Confirmed `scripts/lock-manifest.key` is NOT tracked by git and NOT in the manifest.

**Correction to an earlier claim:** my first "pushed" report was wrong. The
`git push` had failed for lack of credentials and I had only committed locally.
Everything is now genuinely pushed and verified against the remote API.

**Known non-issue:** a stale local clone reports drift on `public/style.css` and
`server.js` because it was taken from a local tree whose re-pin was never
committed. Remote `main` is correct and self-consistent. If your clone reports
drift on exactly those two files, re-pull and re-pin.

**Still open (unchanged):** green verdict, flow re-recording, fresh-clone end-to-end,
`npm pack` verification, `npm publish`, the two public posts, the submission form.

**NEEDS HUMAN:** `kane-cli login --oauth` must be run on the user's own machine
(Kane CLI session + KaneAI credits). This is the only blocker on the green verdict
and the re-recording.

### Entry 2026-11-25 — Copilot (red-round checkpoint)

**Context:** The user's Kane CLI session is authenticated and has 10,330 credits.

**Red demo completed:**
- `scripts/reset-demo.sh atlas` restored `targets/atlas/index.html` to the committed
  buggy page and confirmed `index.html` and `buggy.html` are byte-identical.
- `bash scripts/loop.sh atlas` ran three real rounds. All five personas failed in
  rounds 1-3: `newcomer`, `skeptic`, `mobile`, `saver`, and `promised`.
- Concrete failures matched the planted defects: no portfolio reveal, visible
  placeholder/undefined values, no working newsletter confirmation, and mobile
  viewport evidence reported the desktop window.
- The loop reached the blocked/red checkpoint, but blocked publication stopped
  because the local lock manifest was stale after a pull.

**Local state left behind:**
- Atlas remains in its buggy/red state because the loop stopped before restore.
- `data/queue.json` and `package-lock.json` have local pull/install noise; inspect
  and revert only unrelated generated noise before committing.
- `lib/round-validation.js`, `tests/security.test.js`, and `package-lock.json`
  were reported by the integrity verifier as drifted after the pull.

**Next agent instructions:**
1. Inspect `git status` and preserve only intentional source changes.
2. Re-pin the lock after the remote/source state is settled:
   `node scripts/lock-files.js --init`
   `node scripts/lock-files.js --verify`
3. Re-record the five persona flows against the intended current green page:
   `bash scripts/record-flows.sh atlas`
4. Commit every `_test.md` and `output-*/` recording folder.
5. Restore the red page, run the red loop once, restore the green page from HEAD,
   run the real green round, attest evidence if configured, and publish via
   `node scripts/publish.js atlas 1`.
6. Re-pin, test, verify package contents, and continue the submission steps.

**NEEDS HUMAN:** none. User specifically asked this agent to communicate the
red-round checkpoint and stop. The next agent should proceed autonomously.
