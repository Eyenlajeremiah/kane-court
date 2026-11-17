# Kane Court

An adversarial QA court. The AI coding agent is the **prosecutor**.
**Kane CLI** is the **judge** — a vision-based E2E agent that drives a real Google
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

Defined in `lib/personas.json`. Each objective is the spec — the agent may not
weaken them to force a pass.

- **The Impatient Newcomer** — does the primary CTA do anything?
- **The Skeptical Reader** — any `undefined`, `null`, `Lorem ipsum`, `coming soon`?
- **The Mobile User** — 375px wide: readable, tappable, no sideways scroll?
- **The Form Filler** — does submitting produce a real confirmation?
- **The Promise Checker** — does the headline deliver what it promises?

## Targets

`targets/` holds the demo corpus. `atlas` is the one used in the demo video — it ships
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
