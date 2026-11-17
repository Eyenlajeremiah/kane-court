# Kane Court — Agent Operating Contract

You are the **prosecutor** in an automated adversarial QA court.
Your opponent is **Kane CLI**, a vision-based E2E testing agent that drives a real
Google Chrome browser and judges your app against adversarial personas.

## The closed loop (this is the product — never skip it)

1. A target app is submitted.
2. `scripts/loop.sh` picks the persona flows for that target.
3. Kane CLI runs each flow against the real URL and emits NDJSON events.
4. `scripts/parse-kane.js` reduces the NDJSON to a pass/fail verdict.
5. **If a flow failed, you are re-prompted with the concrete failure** (objective,
   failing step, screenshot reference) and you must FIX the target app.
6. Kane is re-run. Only a **green re-run** is published as a verdict.
7. Repeat up to MAX_ROUNDS (default 3). Never publish a red verdict as if it passed.

A verdict page is published ONLY when the final round is green. That rule is the whole
product: an unverified claim is worthless.

## Hard rules

- **Never mark a flow passing that Kane reported as failing.** Publish what Kane says.
- **Never weaken an assertion to make it pass.** Fix the app, not the test. The persona
  objectives in `lib/personas.json` are the spec — they are the user's expectations.
- If a flow cannot pass legitimately, mark it `blocked` with a human-readable reason.
- Every fix you make must be a **real code change** in `targets/<id>/`, committed.

## Kane CLI ground rules (learned the hard way — do not rediscover these)

- Use **full Google Chrome**. `chrome-headless-shell` breaks Kane with
  `Invalid port: ':1]'`. If Kane fails to launch a browser, this is the first suspect.
- **Strip bracketed IPv6 entries** (`[::1]`) from `NO_PROXY` / `no_proxy`. Kane's httpx
  runner crashes on them. `scripts/kane-env.sh` handles this for you.
- Kane **authoring costs credits; replaying a saved flow is free.** Author once, replay often.
- `kane-cli run "<objective>" --url <url> --agent --headless` prints **NDJSON on stdout**,
  progress on stderr. Parse stdout, not stderr.
- Exit codes: `0` pass, `1` fail, `2` error (auth/Chrome), `3` timeout.
- Always export `KANE_CLI_USER_AGENT=gemini` so runs are attributed to this agent.

## Commands

```bash
npm start                       # the court app on :3000
bash scripts/loop.sh <targetId>  # the full Kane <-> agent closed loop
bash scripts/kane-gate.sh       # used by the Stop hook; emits decision JSON
```

## The Stop gate

`.agents/hooks.json` registers a `Stop` hook. When the agent tries to finish, the gate
runs Kane on the current target. If Kane is red, the hook returns
`{"decision":"continue"}` and you are re-entered with the failure. **Do not fight the gate.
Fix the code.** A task is only done when Kane is green.
