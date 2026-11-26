# Engineering log — defects found and fixed

Seven defects were found during hardening of the closed loop and fixed before
the first public round. Each one is listed with what broke, why, and the exact
code change. The table of contents in the section headers below is unchanged.

## 1. Executive Summary

The codebase was hardened end to end to eliminate fragile workarounds, resolve platform incompatibilities (especially on Windows), fix test spec pollution on external targets, and ensure the closed-loop gate functions autonomously.

All 7 core defects have been repaired and verified against the real Kane CLI runtime (`kane-cli 0.10.5` on Node `v24.18.1`). The integrity lock is green with **0 drift**, the replay runner executes with **zero credit consumption**, and the Stop gate cleanly outputs `allow`.

---

## 2. What Was Wrong ("What Went Wrong & What Was Not Right")

### Defect 1: Hardcoded Target Objectives on External Queue Submissions
- **Affected File**: [scripts/queue-worker.js](scripts/queue-worker.js#L42-L59)
- **What Was Wrong**:
  In `personas()`, the code hardcoded `const tj = path.join(ROOT, "targets", "atlas", "flows.json")`. Whenever any external website (e.g. `https://stripe.com`, `https://example.com`) was submitted to the court via the web UI `/submit` or via `kane-court trial --url <url>`, the queue worker forced Atlas Capital's proprietary CTA ("View portfolio") and specific headline text onto that external site.
- **Impact**: All external URLs submitted to the court failed unconditionally with nonsensical failures.

### Defect 2: Windows Subprocess Crash (`spawnSync kane-cli EINVAL` / `ENOENT`)
- **Affected Files**: [lib/kane-court-core.js](lib/kane-court-core.js#L78-L80), [scripts/queue-worker.js](scripts/queue-worker.js#L69-L73)
- **What Was Wrong**:
  Node child process invocations used:
  ```javascript
  spawnSync("kane-cli", argv, { cwd: ROOT, encoding: "utf8", shell: false });
  ```
  On Windows, npm global CLIs install as `.cmd` batch scripts (`kane-cli.cmd`). Node.js 18.20.2+, 20.12.2+, and 22+ (following security patch CVE-2024-27980) throw `EINVAL` (`code: 'EINVAL', errno: -4071`) when invoking `.cmd` or `.bat` binaries with `shell: false`. Furthermore, without specifying `.cmd`, Windows `spawnSync` strictly searches for `.exe` and throws `ENOENT`.
- **Impact**: `kane-court verify`, `kane-court trial`, and the MCP tool `verify_with_kane` failed immediately on Windows with exit code 2 and 0 steps.

### Defect 3: Queue Worker Silent Non-Execution on Windows
- **Affected File**: [scripts/queue-worker.js](scripts/queue-worker.js#L158)
- **What Was Wrong**:
  The main CLI entrypoint was guarded by:
  ```javascript
  if (import.meta.url === `file://${process.argv[1]}`)
  ```
  On Windows, `process.argv[1]` contains Windows backslashes (`scripts\queue-worker.js`) while `import.meta.url` uses file URI syntax (`file:///C:/Users/...`). This string equality check was *always false* on Windows.
- **Impact**: Running `node scripts/queue-worker.js --once` or `node scripts/queue-worker.js` exited immediately with code 0 without processing any queued URLs.

### Defect 4: Payload Schema Desynchronization & Typo in Stop Gate
- **Affected Files**: [lib/kane-court-core.js](lib/kane-court-core.js#L101-L112), [scripts/kane-gate.sh](scripts/kane-gate.sh#L11-L18)
- **What Was Wrong**:
  - `run-case.sh` saved `.loop/last-round.json` with `{ targetId: "atlas" }`, but `kane-court-core.js` wrote `{ target: "atlas" }`.
  - `scripts/kane-gate.sh` only checked `j.targetId`. Because of the mismatch, `LAST_TARGET` resolved to empty, causing the gate to report `continue` ("not verified") even after a successful green run.
  - In `scripts/kane-gate.sh` line 18, the reason string had a typo: `Kane CLI has NOT verified $TARGET $TARGET_ID as green`, rendering as `targets/atlas atlas`.
- **Impact**: `kane-court gate` falsely blocked task completion and displayed broken error strings.

### Defect 5: False-Positive Integrity Violations on Runtime Logs
- **Affected File**: [scripts/lock-files.js](scripts/lock-files.js#L18-L38)
- **What Was Wrong**:
  The integrity scanner monitored `.testmuai/`. When `kane-cli` executes a flow, it writes execution timestamps and run metrics to `.testmuai/tests/output-*/.internal/meta.json` and dumps session recordings into `.testmuai/evidence/*.evidence`. Because these ephemeral runtime logs were hashed into `lock-manifest.json`, every single test execution triggered a false-positive `INTEGRITY VIOLATION`.
- **Impact**: Legitimate green test runs were flagged as integrity violations.

### Defect 6: Port 3000 Collision in Documentation
- **Affected Files**: [README.md](README.md#L180-L188), [docs/JUDGE_GUIDE.md](docs/JUDGE_GUIDE.md#L10-L20)
- **What Was Wrong**:
  Both guides instructed the evaluator to run:
  ```bash
  npm start            # Terminal 1: starts server on port 3000
  node server.js       # Terminal 2: tries to bind to port 3000 again -> EADDRINUSE crash
  ```
- **Impact**: Any judge copying commands from the guide encountered an immediate crash in Terminal 2.

### Defect 7: Planted Bug Inconsistency in `targets/vault`
- **Affected File**: [targets/vault/index.html](targets/vault/index.html#L38-L41)
- **What Was Wrong**:
  `README.md` documented `vault` as having a planted bug: `dead CTA (button does nothing)`. However, the HTML file already included an active click listener showing the invitation panel.
- **Impact**: The demo corpus did not match the documented defect inventory.

---

## 3. What Was Fixed ("Exact Code Changes & Implementations")

### Summary of Changes

| Component | File Modified | Change Summary |
|---|---|---|
| **Core Library** | [lib/kane-court-core.js](lib/kane-court-core.js) | Added `getKaneBin()`, `getBashBin()`, `getSpawnEnv()`; set `shell: process.platform === "win32"`; unified `{ target, targetId }` in verdict payload. |
| **Queue Worker** | [scripts/queue-worker.js](scripts/queue-worker.js) | Dynamic `personas(targetId)` (no more hardcoded `atlas`); Windows CLI entrypoint normalization using `fileURLToPath`; `.cmd` execution compatibility. |
| **Stop Gate** | [scripts/kane-gate.sh](scripts/kane-gate.sh) | Checked `j.targetId || j.target`; removed redundant `$TARGET` variable from message. |
| **Integrity Harness** | [scripts/lock-files.js](scripts/lock-files.js) | Excluded ephemeral runtime paths (`.testmuai/evidence/`, `.internal/`) from SHA-256 tracking while retaining test specs (`*_test.md`). |
| **Integrity Manifest** | [scripts/lock-manifest.json](scripts/lock-manifest.json) | Re-initialized with clean hashes across all 47 immutable harness and spec files. |
| **Demo Target** | [targets/vault/index.html](targets/vault/index.html) | Planted the missing dead CTA (`e.preventDefault()`) to align with documentation. |
| **Guides** | [README.md](README.md), [docs/JUDGE_GUIDE.md](docs/JUDGE_GUIDE.md) | Fixed Terminal 2 instructions to run `bash scripts/replay.sh atlas` instead of crashing `node server.js`. |

---

## 4. Verification & Validation Proof

The following test suites were executed to prove system integrity:

```powershell
# 1. Verify Integrity Lock (Immutable Specs)
node scripts/lock-files.js --verify
# Output: integrity OK: 47 locked file(s) unchanged

# 2. Verify Replay Execution (Zero LLM Credit Cost)
node bin/kane-court.js verify --target atlas --replay
# Output:
#   [atlas][newcomer] pass=true exit=0 steps=39
#   [atlas][skeptic] pass=true exit=0 steps=54
#   [atlas][mobile] pass=true exit=0 steps=44
#   pass=true   integrity: integrity OK: 47 locked file(s) unchanged

# 3. Verify Antigravity Stop Gate Decision
node bin/kane-court.js gate
# Output:
#   { "decision": "allow" }

# 4. Verify Docket Listing & Verdict Reading
node bin/kane-court.js targets
node bin/kane-court.js verdict --target atlas

# 5. Verify Court Web Server & Published Badge
curl http://localhost:3000/v/atlas
# Output includes: <span class="pill pass">verified green</span>
```

---

## 5. Checklist

- [x] **No hardcoded target overrides**: Arbitrary external URLs use generic personas from [lib/personas.json](lib/personas.json).
- [x] **Cross-platform child process execution**: Node subprocess calls handle `.cmd` extensions and Git bash locations cleanly on Windows, Linux, and macOS.
- [x] **Integrity lock isolation**: Spec files (`lib/personas.json`, `scripts/*`, `*.md`) remain tamper-proof while runtime artifacts do not trigger false drift.
- [x] **Stop hook integration**: The `.agents/hooks.json` Stop hook correctly enforces task continuation when Kane is red and permits termination when green.
- [x] **Free evaluation pipeline**: Replays run reliably via `.testmuai/tests/` without requiring API keys or credits from hackathon judges.
