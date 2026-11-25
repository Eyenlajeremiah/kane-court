import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { getKaneInvocation, spawnKaneSync } from "../lib/kane-court-core.js";
import { isPrivateAddress, resolvePublicUrl, resolveLoopbackUrl } from "../lib/network-policy.js";
import { roundPublishError } from "../lib/round-validation.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("rejects private, reserved, mapped, and transition IPv6 destinations", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "192.0.2.1",
    "192.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "0:0:0:0:0:ffff:7f00:1",
    "2001:db8::1",
    "2002:0808:0808::1"
  ]) {
    assert.equal(isPrivateAddress(address), true, `${address} should not be allowed`);
  }
});

test("permits representative public addresses", () => {
  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal(isPrivateAddress("2001:4860:4860::8888"), false);
});

test("parser rejects synthetic NDJSON without Kane stream/run evidence", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kane-evidence-test-"));
  const raw = path.join(dir, "fake.ndjson");
  fs.writeFileSync(raw, JSON.stringify({ type: "run_end", run_id: "fake", status: "passed", final_url: "http://localhost:3000/t/atlas" }) + "\n");
  const r = spawnSync(process.execPath, ["scripts/parse-kane.js", raw, "0"], {
    cwd: path.resolve("."),
    encoding: "utf8",
    env: { ...process.env, KANE_TARGET_URL: "http://localhost:3000/t/atlas" }
  });
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).pass, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("rejects non-public literal target URLs before connecting", async () => {
  await assert.rejects(resolvePublicUrl("http://[::ffff:127.0.0.1]/"), /private target/i);
  await assert.rejects(resolvePublicUrl("http://192.0.2.10/"), /private target/i);
});

test("allows public hostnames after DNS resolution and blocks external Kane targets", async () => {
  const publicUrl = await resolvePublicUrl("https://example.com/");
  assert.equal(publicUrl.hostname, "example.com");
  assert.throws(() => resolveLoopbackUrl("https://example.com/"), /only local target/i);
  assert.equal(resolveLoopbackUrl("http://[::1]:3000/t/atlas").hostname, "[::1]");
});

test("Windows npm command shims resolve to a direct JavaScript invocation", {
  skip: process.platform !== "win32"
}, () => {
  const invocation = getKaneInvocation(["run", "safe argument", "--url", "https://example.com"]);
  assert.equal(invocation.command, process.execPath);
  assert.ok(fs.existsSync(invocation.args[0]));
  assert.deepEqual(invocation.args.slice(1), ["run", "safe argument", "--url", "https://example.com"]);
});

test("Windows npm shim resolution preserves shell metacharacters as argv data", {
  skip: process.platform !== "win32"
}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kane-shim-test-"));
  const previous = process.env.KANE_BIN;
  const shim = path.join(dir, "kane-cli.cmd");
  const entry = path.join(dir, "entry.cjs");
  const args = ["& whoami", "%PATH%", '"quoted"'];
  try {
    fs.writeFileSync(shim, '@echo off\r\n"%dp0%\\entry.cjs" %*\r\n');
    fs.writeFileSync(entry, "process.stdout.write(JSON.stringify(process.argv.slice(2)));");
    process.env.KANE_BIN = shim;
    const invocation = getKaneInvocation(args);
    assert.equal(invocation.command, process.execPath);
    assert.equal(invocation.args[0], entry);
    assert.deepEqual(invocation.args.slice(1), args);
    const result = spawnKaneSync(args, { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), args);
  } finally {
    if (previous === undefined) delete process.env.KANE_BIN;
    else process.env.KANE_BIN = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("publishing requires a fresh, complete green round for the requested target", () => {
  const now = Date.now();
  const round = {
    targetId: "atlas",
    round: 2,
    targetUrl: "http://localhost:3000/t/atlas",
    generatedAt: new Date(now).toISOString(),
    pass: true,
    flows: ["newcomer", "skeptic", "mobile", "saver", "promised"]
      .map((id) => ({ id, pass: true, exitCode: 0, steps: 1 }))
  };
  const options = {
    targetId: "atlas",
    round: 2,
    expectedFlowIds: round.flows.map((flow) => flow.id),
    expectedTargetUrl: "http://localhost:3000/t/atlas",
    now
  };
  assert.equal(roundPublishError(round, options), null);
  assert.match(roundPublishError({ ...round, targetId: "ledger" }, options), /target or number/);
  assert.match(roundPublishError({ ...round, flows: round.flows.slice(1) }, options), /exactly the expected flows/);
  assert.match(roundPublishError({ ...round, flows: [{ ...round.flows[0], skipped: true }, ...round.flows.slice(1)] }, options), /invalid or skipped/);
  assert.match(roundPublishError({ ...round, generatedAt: new Date(now - 31 * 60 * 1000).toISOString() }, options), /stale/);
  assert.match(roundPublishError({ ...round, targetUrl: "http://example.com/" }, options), /canonical target URL/);
});

test("blocked publication requires a complete red round", () => {
  const now = Date.now();
  const round = {
    targetId: "atlas",
    round: 3,
    targetUrl: "http://localhost:3000/t/atlas",
    generatedAt: new Date(now).toISOString(),
    pass: false,
    flows: [{ id: "newcomer", pass: false, exitCode: 1, steps: 1 }]
  };
  const options = { targetId: "atlas", round: 3, expectedFlowIds: ["newcomer"], blocked: true, now };
  assert.equal(roundPublishError(round, options), null);
  assert.match(roundPublishError({ ...round, pass: true }, options), /complete red round/);
  assert.match(roundPublishError({ ...round, flows: [] }, options), /exactly the expected flows/);
});

test("the parser does not turn empty or explicitly failed Kane output green", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kane-parse-test-"));
  const file = path.join(dir, "run.ndjson");
  const parser = path.join(ROOT, "scripts", "parse-kane.js");
  try {
    for (const [content, expected] of [
      ["", false],
      ['{"type":"step_end","status":"passed"}\n', false],
      ['{"type":"stream_start","cli_version":"0.10.9"}\n{"type":"run_start","objective":"test"}\n{"type":"run_end","run_id":"run-1","status":"passed","final_url":"http://localhost:3000/t/atlas"}\n', true],
      ['{"type":"step_end","status":"failed"}\n', false],
      ['{"type":"run_end","status":"failed"}\n', false]
    ]) {
      fs.writeFileSync(file, content);
      const result = spawnSync(process.execPath, [parser, file, "0"], {
        encoding: "utf8",
        env: { ...process.env, KANE_TARGET_URL: "http://localhost:3000/t/atlas" }
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).pass, expected);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the parser accepts current Kane run events and requires the requested final URL", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kane-current-events-test-"));
  const file = path.join(dir, "run.ndjson");
  const parser = path.join(ROOT, "scripts", "parse-kane.js");
  const events = [
    { type: "stream_start", cli_version: "0.10.9", surface: "run" },
    { type: "recording_state", enabled: true },
    { type: "bifurcation", flows: ["Navigate to target then review"] },
    { type: "step", status: "done" },
    {
      type: "run_end",
      status: "passed",
      run_id: "run-0",
      final_state: { url: "http://localhost:3000/t/atlas" }
    }
  ];
  try {
    for (const [finalUrl, expected] of [
      ["http://localhost:3000/t/atlas", true],
      ["http://localhost:3000/t/ledger", false]
    ]) {
      const output = events.map((event) => {
        if (event.type === "run_end") {
          return JSON.stringify({ ...event, final_state: { url: finalUrl } });
        }
        return JSON.stringify(event);
      }).join("\n") + "\n";
      fs.writeFileSync(file, output);
      const result = spawnSync(process.execPath, [parser, file, "0"], {
        encoding: "utf8",
        env: { ...process.env, KANE_TARGET_URL: "http://localhost:3000/t/atlas" }
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).pass, expected);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("integrity lock hashes text files independently of CRLF checkout settings", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kane-lock-eol-test-"));
  const lockScript = path.join(ROOT, "scripts", "lock-files.js");
  const file = path.join(dir, "sample.js");
  try {
    fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
    fs.writeFileSync(file, "const value = 1;\r\n");
    const init = spawnSync(process.execPath, [lockScript, "--init"], {
      cwd: dir,
      encoding: "utf8"
    });
    assert.equal(init.status, 0, init.stderr);

    fs.writeFileSync(file, "const value = 1;\n");
    const verify = spawnSync(process.execPath, [lockScript, "--verify"], {
      cwd: dir,
      encoding: "utf8"
    });
    assert.equal(verify.status, 0, verify.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
