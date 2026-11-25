#!/usr/bin/env node
// Reduce Kane CLI NDJSON output to a small verdict object.
// Usage: node scripts/parse-kane.js <ndjson-file> <exit-code>
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const code = Number(process.argv[3] ?? 1);
let events = [];
try {
  events = fs.readFileSync(file, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
} catch (e) {
  console.log(JSON.stringify({ pass: false, error: "no-kane-output", raw: String(e) }));
  process.exit(0);
}

const runEnd = [...events].reverse().find((e) =>
  /^(run_end|run_finished|run_complete)$/i.test(String(e.type || e.event || ""))
);
const streamStart = events.find((e) => e.type === "stream_start");
const runStart = events.find((e) => e.type === "run_start");
const runId = runEnd && runEnd.run_id;
const finalUrl = runEnd && (runEnd.final_url || "");
const targetUrl = process.env.KANE_TARGET_URL || "";
const structuralEvidence =
  Boolean(streamStart && streamStart.cli_version && runStart && runStart.objective) &&
  Boolean(runEnd && runId) &&
  (!targetUrl || finalUrl === targetUrl);
const evidenceFile = path.resolve(file);
const hasEvidenceFile = fs.existsSync(evidenceFile) && fs.statSync(evidenceFile).size > 0;
const failures = events
  .filter((e) => /fail|error|assert/i.test(String(e.status || e.result || e.state || e.type || "")))
  .map((e) => ({
    type: e.type, status: e.status,
    message: e.message || e.error || e.reason || "(no message)",
    at: e.url || e.timestamp || ""
  }));
const steps = events.length;

const explicit = runEnd
  ? String(runEnd.status || runEnd.result || runEnd.state || "").toLowerCase()
  : null;
const pass = structuralEvidence && hasEvidenceFile && code === 0 && runEnd !== undefined && failures.length === 0 &&
  ["pass","passed","success","succeeded","ok"].includes(explicit);

console.log(JSON.stringify({
  pass, exitCode: code, steps,
  failures: failures.slice(0, 5),
  summary: runEnd ? (runEnd.summary || runEnd.message || runEnd.status || null) : null
}));
