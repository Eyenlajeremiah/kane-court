#!/usr/bin/env node
// Reduce Kane CLI NDJSON output to a small verdict object.
// Usage: node scripts/parse-kane.js <ndjson-file> <exit-code>
import fs from "node:fs";

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
const pass = code === 0 && runEnd !== undefined && failures.length === 0 &&
  ["pass","passed","success","succeeded","ok"].includes(explicit);

console.log(JSON.stringify({
  pass, exitCode: code, steps,
  failures: failures.slice(0, 5),
  summary: runEnd ? (runEnd.summary || runEnd.message || runEnd.status || null) : null
}));
