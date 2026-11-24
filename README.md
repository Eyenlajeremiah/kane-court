# Kane Court

An adversarial QA court. The AI coding agent is the **prosecutor**.
**Kane CLI** is the **judge** Ã¢ÂÂ a vision-based E2E agent that drives a real Google
Chrome browser and rules against the app on five adversarial personas.

A verdict is published **only** when the agent has earned a green re-run.
No green light without Kane's own signature.

```
agent builds  ->  Kane tests  ->  Kane fails  ->  agent is re-prompted with the
exact failure  ->  agent fixes the code  ->  Kane re-runs  ->  green  ->  published
```

The loop is the product. A Kane run bolted onto the end of a build is not this.

## Quick start

```bash
npm install                 # zero runtime dependencies
npm start                   # court on http://localhost:3000
```

To run the closed loop against a target you own:

```bash
bash scripts/loop.sh atlas      # Kane -> agent -> Kane -> green
```

## What you need

```bash
npm install -g @testmuai/kane-cli   # or: brew install LambdaTest/kane/kane-cli
kane-cli login                      # opens a browser to authenticate
kane-cli balance                    # check your credits
```

New TestMu accounts get 10,000 free KaneAI credits. Authoring a flow costs
credits; **replaying a saved flow is free**, so author once and replay often.

## How the loop works

| Step | Script | What happens |
|---|---|---|
| 1 | `scripts/run-case.sh` | Kane runs every persona flow against the target URL, emits NDJSON |
| 2 | `scripts/parse-kane.js` | NDJSON is reduced to a per-flow pass/fail verdict |
| 3 | `scripts/build-prompt.js` | Failures become a precise re-prompt (`.loop/pending-prompt.md`) |
| 4 | Antigravity | The agent is re-prompted and fixes the **application code** |
| 5 | `scripts/loop.sh` | Kane re-runs. Loop until green or `MAX_ROUNDS` |
| 6 | `scripts/publish.js` | A verdict is published **only** if the final round was green |

## The Stop gate

`.agents/hooks.json` registers a `Stop` hook (`scripts/kane-gate.sh`). When the agent
tries to finish while Kane is red, the hook returns `{"decision":"continue"}` and the
agent is re-entered with the failure. **The task is not done until Kane is green.**

```bash
bash scripts/kane-gate.sh   # emits the hook's decision JSON
```

## Personas

Defined in `lib/personas.json`. Each objective is the spec Ã¢ÂÂ the agent may not
weaken them to force a pass.

- **The Impatient Newcomer** Ã¢ÂÂ does the primary CTA do anything?
- **The Skeptical Reader** Ã¢ÂÂ any `undefined`, `null`, `Lorem ipsum`, `coming soon`?
- **The Mobile User** Ã¢ÂÂ 375px wide: readable, tappable, no sideways scroll?
- **The Form Filler** Ã¢ÂÂ does submitting produce a real confirmation?
- **The Promise Checker** Ã¢ÂÂ does the headline deliver what it promises?

## Targets

`targets/` holds the demo corpus. `atlas` is the one used in the demo video Ã¢ÂÂ it ships
with four deliberate bugs (dead CTA, placeholder copy, no mobile fit, silent form).

| Target | Planted bugs |
|---|---|
| `vault` | dead CTA (button does nothing) |
| `atlas` | dead CTA, `undefined` table cell, `coming soon` copy, horizontal overflow, silent form |
| `ledger` | form submits silently with no confirmation |
| `orbit` | horizontal overflow at 375px |

## Kane CLI gotchas (learned the hard way)

- Use **full Google Chrome**. `chrome-headless-shell` breaks Kane with `Invalid port: ':1]'`.
- **Strip bracketed IPv6** (`[::1]`) from `NO_PROXY`/`no_proxy` or Kane's httpx runner crashes.
  `scripts/kane-env.sh` handles both automatically.
- `--agent` mode prints **NDJSON on stdout**, progress on stderr. Parse stdout.
- Exit codes: `0` pass, `1` fail, `2` error (auth/Chrome), `3` timeout.
- Export `KANE_CLI_USER_AGENT=gemini` so runs are attributed to the agent.

## Layout

```
server.js              the court app (docket, submit, queue, verdict pages)
lib/personas.json     the five adversarial personas
scripts/run-case.sh   Kane over every flow for one target
scripts/loop.sh       the closed loop
scripts/kane-gate.sh  the Stop hook
scripts/build-prompt.js  failure -> re-prompt
scripts/publish.js    publish only on green
targets/              demo corpus
AGENTS.md             the agent's operating contract
```

## Install it as a tool

```bash
npm install -g kane-court
kane-court serve --port 4173          # the court
kane-court verify --target atlas      # put a target on trial
kane-court targets                    # what's on the docket
```

Or run it without installing anything:

```bash
npx kane-court verify --target atlas
```

## Use it from your agent (MCP)

The court exposes a `verify_with_kane` tool to any MCP-capable agent -
Claude Code, Cursor, Codex, Windsurf, Kiro. The agent can put an app on trial
and read a structured verdict instead of guessing whether its own work works.

```bash
kane-court install --agent claude     # also: cursor, codex, windsurf, kiro
```

Then, in your agent:

> Use kane-court to verify the atlas target.

Tools exposed: `verify_with_kane`, `kane_gate`, `list_targets`, `get_verdict`.

## Why the green is worth something

Every harness file - the persona objectives, the parser, the publisher, this
README - is pinned by SHA-256 in `scripts/lock-manifest.json`. The agent may
only change `targets/*/index.html`. If it weakens a spec to force a pass,
`publish.js` refuses to publish the verdict. The lock is the reason a green
badge means something.

## Submission checklist

For the Kane CLI hackathon (deadline 26 Nov 2026, 19:29 WAT):

- [ ] Author + commit the replayable flows - `bash scripts/record-flows.sh atlas`
- [ ] Publish to npm - `npm login && npm publish`
- [ ] Record the demo video - `docs/RECORDING_GUIDE.md`
- [ ] Post twice - `docs/LAUNCH_POSTS.md`
- [ ] Submit - `docs/SUBMISSION.md`

## Replayable flows (no credits required)

Authoring a Kane flow costs credits. **Replaying a saved flow is free** - the
step replays from its cached recording in seconds. So the flows are committed
to the repo, and a judge with an empty balance can still run the court.

```bash
bash scripts/replay.sh atlas              # replay the committed flows - free
node bin/kane-court.js verify --target atlas --replay
kane-cli testmd run .testmuai/tests/newcomer_test.md --url http://localhost:3000/t/atlas --agent --headless
```

To re-record the flows (costs credits, ~1 min each):

```bash
bash scripts/record-flows.sh atlas
git add .testmuai && git commit -m "chore: re-record Kane flows"
```

Commit the `*_test.md` file **together with** its `output-<flow>/` recordings
folder. A step only replays when its recording is there.

## For judges

```bash
npm install                      # zero runtime dependencies
npm start                        # court on http://localhost:3000 (terminal 1)
bash scripts/replay.sh atlas     # replays committed flows - no credits needed (terminal 2)
```

Open http://localhost:3000/v/atlas for the verdict page.

Needs real Google Chrome (not `chrome-headless-shell`). If you are behind a
proxy, remove bracketed IPv6 entries such as `[::1]` from `NO_PROXY` - they
break Kane's HTTP client. `scripts/kane-env.sh` does this for you.

## Put any URL on trial

The court is not limited to the bundled demo targets. Submit any URL through the
form on the home page, or from the command line:

```bash
node bin/kane-court.js trial --url https://example.com
```

A queue worker (started automatically by `npm start`) picks the URL up, runs the
five adversarial personas against it with Kane CLI, writes a verdict, and marks
the queue item green or red. The verdict appears on the docket with a link.

```bash
node scripts/queue-worker.js --once   # drain the queue once and exit
node scripts/queue-worker.js --url <u> # judge one URL directly
```

Set `QUEUE_WORKER=0` to run the court read-only - useful while recording, so
the worker cannot spend credits mid-take.

**What this measures:** whether a page actually works for real users. Does the
primary button do something. Is the copy real, or is it "Coming soon". Does it
hold up at 375px. Does the form confirm. Does the page deliver what its
headline promises. It is a correctness check, not a load or uptime test.
