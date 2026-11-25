#!/usr/bin/env node
// Reduce Kane CLI NDJSON output to a small verdict object.
// Usage: node scripts/parse-kane.js <ndjson-file> <exit-code> [stderr-log]
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const code = Number(process.argv[3] ?? 1);
const logFile = process.argv[4];

let events = [];
try {
  events = fs.readFileSync(file, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
} catch (e) {
  console.log(JSON.stringify({ pass: false, error: "no-kane-output", raw: String(e) }));
  process.exit(0);
}

// Kane writes the real reason to stderr. Without this the loop used to say
// only "Kane reported the flow as failed without a detailed message", which
// sent the coding agent off to fix an app that was never even reached.
let stderrTail = "";
try {
  if (logFile && fs.existsSync(logFile)) {
    const raw = fs.readFileSync(logFile, "utf8").trim();
    if (raw) stderrTail = raw.split("\n").slice(-12).join("\n");
  }
} catch {}

const runEnd = [...events].reverse().find((e) =>
  /^(run_end|run_finished|run_complete)$/i.test(String(e.type || e.event || ""))
);
const streamStart = events.find((e) => e.type === "stream_start");
const runStart = events.find((e) => e.type === "run_start");
const bifurcation = events.find((e) => e.type === "bifurcation");
const runId = runEnd && runEnd.run_id;
const finalUrl = runEnd && (runEnd.final_url || (runEnd.final_state && runEnd.final_state.url) || "");
const targetUrl = process.env.KANE_TARGET_URL || "";
const hasObjectiveEvidence =
  Boolean(runStart && typeof runStart.objective === "string" && runStart.objective.trim()) ||
  Boolean(bifurcation && Array.isArray(bifurcation.flows) &&
    bifurcation.flows.some((flow) => typeof flow === "string" && flow.trim()));
const structuralEvidence =
  Boolean(streamStart && streamStart.cli_version && hasObjectiveEvidence) &&
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

// A failed connection to the target is the single most common failure and it
// has nothing to do with the app under test. Name it so nobody goes hunting
// for a UI bug that does not exist.
const combined = `${stderrTail}\n${events.map((e) => JSON.stringify(e)).join("\n")}`.toLowerCase();
const unreachable =
  /econnrefused|connection refused|failed to fetch|net::err_connection_refused|err_connection_refused|could not connect|target (?:url )?unreachable/.test(combined);

const steps = events.length;

const explicit = runEnd
  ? String(runEnd.status || runEnd.result || runEnd.state || "").toLowerCase()
  : null;
const pass = structuralEvidence && hasEvidenceFile && code === 0 && runEnd !== undefined && failures.length === 0 &&
  ["pass","passed","success","succeeded","ok"].includes(explicit);

// If the flow failed but we have no structured failure, surface the stderr
// tail instead of a useless placeholder.
if (!pass && failures.length === 0 && stderrTail) {
  failures.push({ type: "kane", status: "error", message: stderrTail, at: "" });
}
if (unreachable) {
  failures.unshift({
    type: "harness",
    status: "error",
    message: "Could not reach the target URL - the court server was not serving the target. This is a harness problem, not an application bug. Start the court (npm start) and re-run.",
    at: ""
  });
}

console.log(JSON.stringify({
  pass, exitCode: code, steps,
  failures: failures.slice(0, 5),
  summary: runEnd ? (runEnd.summary || runEnd.message || runEnd.status || null) : null,
  unreachableTarget: unreachable
}));
