// Shared core for the kane-court CLI and the MCP server.
// Zero runtime dependencies on purpose: the judge must be able to run this
// with nothing but Node and the Kane CLI they already have.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const p = (...parts) => path.join(ROOT, ...parts);

export function listTargets() {
  const dir = p("targets");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(p("targets", d, "meta.json")))
    .map((id) => {
      const meta = JSON.parse(fs.readFileSync(p("targets", id, "meta.json"), "utf8"));
      return { id, name: meta.name, blurb: meta.blurb || "" };
    });
}

export function flowIdsFor(target) {
  const base = JSON.parse(fs.readFileSync(p("lib", "personas.json"), "utf8"));
  let ids = base.map((x) => x.id);
  try {
    const j = JSON.parse(fs.readFileSync(p("targets", target, "flows.json"), "utf8"));
    const arr = j.flows || j;
    if (Array.isArray(arr) && arr.length) ids = arr.map((x) => x.id);
  } catch {}
  return ids;
}

export function objectiveFor(target, id) {
  const base = JSON.parse(fs.readFileSync(p("lib", "personas.json"), "utf8"));
  let o = (base.find((x) => x.id === id) || {}).objective || "";
  try {
    const j = JSON.parse(fs.readFileSync(p("targets", target, "flows.json"), "utf8"));
    const arr = j.flows || j;
    const c = arr.find((x) => x.id === id);
    if (c && c.objective) o = c.objective;
  } catch {}
  return o;
}

export function integrityStatus() {
  if (!fs.existsSync(p("scripts", "lock-manifest.json"))) {
    return { ok: true, note: "no manifest (integrity lock not initialised)" };
  }
  const r = spawnSync("node", [p("scripts", "lock-files.js"), "--verify"], {
    cwd: ROOT, encoding: "utf8"
  });
  if (r.status === 0) return { ok: true, note: (r.stdout || "").trim() };
  return { ok: false, note: ((r.stderr || r.stdout || "") + "").trim() };
}

// Runs every persona flow for a target through Kane CLI and returns a
// structured verdict. This is the function the MCP tool and the CLI share,
// so "the agent asked the court" and "a human ran the court" are literally
// the same code path.
export function verifyWithKane({ target, url, timeout = 240 }) {
  const ids = flowIdsFor(target);
  const outDir = p(".loop", "runs", target);
  fs.mkdirSync(path.join(outDir, "raw"), { recursive: true });

  const flows = [];
  for (const id of ids) {
    const objective = objectiveFor(target, id);
    const rawPath = path.join(outDir, "raw", `${id}.ndjson`);
    const r = spawnSync(
      "kane-cli",
      ["run", objective, "--url", url, "--agent", "--headless", "--timeout", String(timeout)],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: false }
    );
    let parsed = { pass: false, exitCode: r.status ?? 2, steps: 0, failures: [] };
    try {
      fs.writeFileSync(rawPath, r.stdout || "");
      const pr = spawnSync("node", [p("scripts", "parse-kane.js"), rawPath, String(r.status ?? 2)], {
        cwd: ROOT, encoding: "utf8"
      });
      parsed = JSON.parse(pr.stdout || "{}");
    } catch {}
    flows.push({
      id,
      pass: parsed.pass === true,
      exitCode: parsed.exitCode ?? r.status ?? 2,
      steps: parsed.steps ?? 0,
      failures: parsed.failures || []
    });
  }

  const integrity = integrityStatus();
  const verdict = {
    target,
    url,
    pass: flows.length > 0 && flows.every((f) => f.pass),
    flows,
    integrity,
    verifiedAt: new Date().toISOString()
  };

  fs.mkdirSync(p(".loop"), { recursive: true });
  fs.writeFileSync(p(".loop", "last-round.json"), JSON.stringify(verdict, null, 2));
  return verdict;
}

// The Stop-hook decision, as the agent harness sees it.
export function gateDecision() {
  const r = spawnSync("bash", [p("scripts", "kane-gate.sh")], { cwd: ROOT, encoding: "utf8" });
  const strip = (s) => (s || "").replace(/\x1b\[[0-9;]*m/g, "").trim();
  const out = strip(r.stdout);
  try {
    return JSON.parse(out.split("\n").filter(Boolean).pop());
  } catch {
    // The gate failed to speak. Do not silently allow - surface it.
    return { decision: "continue", reason: "The Stop gate did not return a decision. Run: bash scripts/kane-gate.sh", raw: out, stderr: strip(r.stderr) };
  }
}

export function publishedVerdict(target) {
  const file = p("data", "verdicts.json");
  if (!fs.existsSync(file)) return null;
  const all = JSON.parse(fs.readFileSync(file, "utf8"));
  return all.find((v) => v.targetId === target) || null;
}
