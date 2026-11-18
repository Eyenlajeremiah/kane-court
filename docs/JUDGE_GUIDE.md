# Judge guide

Everything a judge needs, in the order they need it.

## 1. Run it

```bash
git clone https://github.com/Eyenlajeremiah/kane-court.git
cd kane-court
npm install          # zero runtime dependencies
npm start            # http://localhost:3000
```

In a second terminal:

```bash
node server.js
```

## 2. Verify it, without spending credits

The persona flows are committed with their recordings, so they replay:

```bash
bash scripts/replay.sh atlas
```

Replay costs no LLM credits. If you have credits and want to author the flows
fresh instead:

```bash
bash scripts/run-case.sh atlas 1
```

## 3. Watch the loop close

```bash
bash scripts/loop.sh atlas
```

This is the closed loop: Kane runs the flows, the failures are written to
`.loop/pending-prompt.md`, the coding agent is re-prompted with exactly those
failures, and it fixes the app. When the round is green the verdict is
published.

## 4. The verdict page

http://localhost:3000/v/atlas

The green badge is not something the agent writes. It is downstream of Kane's
own run, and `scripts/publish.js` refuses to publish a verdict that was not
green.

## 5. Check the integrity lock yourself

Every harness file - the persona objectives, the parser, the publisher, the
gate - is pinned by SHA-256 in `scripts/lock-manifest.json`. The agent may
only change `targets/*/index.html`.

```bash
node scripts/lock-files.js --status
```

If the agent had weakened a spec to force a pass, this would report drift and
`publish.js` would refuse to publish.

## Requirements

- Node 18+
- Real Google Chrome (not `chrome-headless-shell`)
- Kane CLI: `npm install -g @testmuai/kane-cli` - only needed to author new
  flows. Replaying the committed ones does not require an account.

## If something breaks

| Symptom | Fix |
|---|---|
| `Invalid port: ':1]'` | `chrome-headless-shell` is installed. `scripts/kane-env.sh` unsets `CHROME_BIN` for you. |
| httpx / connection errors behind a proxy | Remove bracketed IPv6 (`[::1]`) from `NO_PROXY`. Also handled by `kane-env.sh`. |
| The server was not running when Kane started | Kane judges the app, not the harness. Start `node server.js` first. |
| The Stop gate prints nothing | Run `bash scripts/kane-gate.sh` directly to see the error. |
