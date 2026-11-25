#!/usr/bin/env node
// The queue worker.
//
// The court's submit form drops a URL into data/queue.json. This is the thing
// that actually picks it up and puts it on trial. It watches the queue, runs
// the five adversarial personas against each pending URL with Kane CLI, writes
// the verdict, and marks the queue item green or red.
//
//   node scripts/queue-worker.js            # run forever
//   node scripts/queue-worker.js --once     # drain what is queued, then exit
//   node scripts/queue-worker.js --url <u>  # judge one URL directly
//
// External targets have no local target directory, so they are judged by
// running the persona objectives straight against the URL. The verdict is
// stored under the URL's own id so it shows up on the docket.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getSpawnEnv, spawnKaneSync } from "../lib/kane-court-core.js";
import { validateRedirectChain } from "../lib/network-policy.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const QUEUE = path.join(DATA, "queue.json");
const VERDICTS = path.join(DATA, "verdicts.json");
const STATE = path.join(DATA, "queue-state.json");

const POLL_MS = Number(process.env.QUEUE_POLL_MS || 5000);
const TIMEOUT = Number(process.env.KANE_TIMEOUT || 240);

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function writeJson(p, v) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2));
}

export function personas(targetId = null) {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "personas.json"), "utf8"));
  if (!targetId) return base;
  const tj = path.join(ROOT, "targets", targetId, "flows.json");
  if (fs.existsSync(tj)) {
    try {
      const j = JSON.parse(fs.readFileSync(tj, "utf8"));
      const arr = j.flows || j;
      if (Array.isArray(arr) && arr.length) {
        return arr.map((item) => {
          const baseP = base.find((x) => x.id === item.id);
          return { id: item.id, name: (baseP && baseP.name) || item.id, objective: item.objective || (baseP && baseP.objective) || "" };
        });
      }
    } catch {}
  }
  return base;
}

// Stable, short id for an external URL so the verdict page can be linked.
export function externalId(url) {
  return "ext-" + crypto.createHash("sha256").update(url).digest("hex").slice(0, 10);
}

async function validateUrl(url) {
  await validateRedirectChain(url);
}

function runKane(objective, url) {
  const raw = path.join(DATA, "queue-raw", `${externalId(url)}.ndjson`);
  fs.mkdirSync(path.dirname(raw), { recursive: true });
  // Build PATH from the machine, never from one developer's home directory.
  const spawnEnv = getSpawnEnv();
  const r = spawnKaneSync(["run", objective, "--url", url, "--agent", "--headless", "--timeout", String(TIMEOUT)],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: spawnEnv });
  try { fs.writeFileSync(raw, r.stdout || ""); } catch {}
  const pr = spawnSync("node", [path.join(ROOT, "scripts", "parse-kane.js"), raw, String(r.status ?? 2)], {
    cwd: ROOT, encoding: "utf8"
  });
  try { return JSON.parse(pr.stdout || "{}"); }
  catch { return { pass: false, exitCode: r.status ?? 2, steps: 0, failures: [{ message: "could not parse Kane output" }] }; }
}

// Judge one URL. Returns the verdict.
export async function judgeUrl(url, note = "", targetId = null) {
  try {
    await validateUrl(url);
  } catch (e) {
    throw new Error("rejected target: " + (e && e.message ? e.message : e));
  }
  const ps = personas(targetId);
  const flows = [];
  for (const p of ps) {
    if (!p.objective) continue;
    const parsed = runKane(p.objective, url);
    flows.push({
      id: p.id,
      pass: parsed.pass === true,
      exitCode: parsed.exitCode ?? 2,
      steps: parsed.steps ?? 0,
      failures: parsed.failures || []
    });
  }
  const pass = flows.length > 0 && flows.every((f) => f.pass);
  let host = url;
  try { host = new URL(url).hostname; } catch {}
  const verdict = {
    targetId: externalId(url),
    name: host,
    blurb: note || "External target, judged by the court.",
    targetUrl: url,
    pass,
    blocked: false,
    rounds: 1,
    flows,
    external: true,
    publishedAt: new Date().toISOString(),
    kane: "Kane CLI (TestMu AI)",
    agent: process.env.KANE_CLI_USER_AGENT || "gemini",
    integrity: { ok: true, note: "external target - not subject to the app lock" }
  };
  const all = readJson(VERDICTS, []);
  const i = all.findIndex((v) => v.targetId === verdict.targetId);
  if (i >= 0) all[i] = verdict; else all.push(verdict);
  writeJson(VERDICTS, all);
  return verdict;
}

async function drain(once = false) {
  const q = readJson(QUEUE, []);
  if (!Array.isArray(q) || !q.length) {
    if (once) { console.log("nothing queued"); return 0; }
    return 0;
  }
  let did = 0;
  for (const item of q) {
    if (item.status !== "queued") continue;
    const url = item.targetId;
    console.log(`\n=== calling the court on ${url} ===`);
    item.status = "running";
    item.startedAt = new Date().toISOString();
    writeJson(QUEUE, q);
    try {
      const v = await judgeUrl(url, item.note || "");
      item.status = v.pass ? "green" : "red";
      item.verdictId = v.targetId;
      item.finishedAt = new Date().toISOString();
      item.note = v.pass
        ? `green - all ${v.flows.length} personas passed`
        : `red - ${v.flows.filter((f) => !f.pass).length} of ${v.flows.length} personas failed`;
      console.log(`=== ${url} -> ${item.status} ===`);
    } catch (e) {
      item.status = "red";
      item.finishedAt = new Date().toISOString();
      item.note = "the trial failed to run: " + String(e && e.message ? e.message : e);
      console.error("trial error:", item.note);
    }
    writeJson(QUEUE, q);
    did++;
    if (!once) break; // one at a time, so the queue is a queue and not a stampede
  }
  return did;
}

const isMain = Boolean(process.argv[1] && (
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
  import.meta.url === `file://${process.argv[1]}`
));

if (isMain) {
  const urlIdx = argv.indexOf("--url");
  if (urlIdx >= 0 && argv[urlIdx + 1]) {
    judgeUrl(argv[urlIdx + 1]).then((v) => {
      console.log(JSON.stringify(v, null, 2));
      process.exit(v.pass ? 0 : 1);
    }).catch((e) => {
      console.error(e && e.message ? e.message : e);
      process.exit(2);
    });
  } else if (has("--once")) {
    drain(true).then(() => process.exit(0)).catch((e) => {
      console.error(e && e.message ? e.message : e);
      process.exit(2);
    });
  } else {
    console.log("queue worker running. poll every " + POLL_MS + "ms. ctrl-c to stop.");
    const tick = async () => {
      try { await drain(false); } catch (e) { console.error("worker tick failed:", String(e && e.message ? e.message : e)); }
    };
    tick();
    setInterval(tick, POLL_MS);
  }
}
