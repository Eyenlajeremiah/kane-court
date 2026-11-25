#!/usr/bin/env node
// Publish a verdict - ONLY if the round was genuinely green AND the integrity
// lock still holds (the agent did not weaken the specs it was judged against).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { flowIdsFor } from "../lib/kane-court-core.js";
import { roundPublishError } from "../lib/round-validation.js";

const [, , targetId, round, ...rest] = process.argv;
const blocked = rest.includes("--blocked");
if (!targetId || !/^[A-Za-z0-9_-]+$/.test(targetId) || !/^[1-9]\d*$/.test(round || "")) {
  console.error("usage: publish.js <targetId> <round> [--blocked]");
  process.exit(1);
}

const roundFile = path.resolve(`.loop/round-${round}.json`);
const r = JSON.parse(fs.readFileSync(roundFile, "utf8"));
const validationError = roundPublishError(r, {
  targetId,
  round,
  expectedFlowIds: flowIdsFor(targetId),
  expectedTargetUrl: process.env.BASE_URL
    ? `${process.env.BASE_URL.replace(/\/$/, "")}/t/${targetId}`
    : `http://localhost:${process.env.PORT || "3000"}/t/${targetId}`,
  blocked
});
if (validationError) {
  console.error("refusing to publish: " + validationError);
  process.exit(1);
}

// Integrity gate - the agent may only change the application under test.
let integrity = { ok: true, note: "no manifest (integrity lock not initialised)" };
if (fs.existsSync("scripts/lock-manifest.json")) {
  try {
    const out = execFileSync("node", ["scripts/lock-files.js", "--verify"], { encoding: "utf8" });
    integrity = { ok: true, note: out.trim() };
  } catch (e) {
    console.error((e.stderr || e.stdout || "").toString().trim());
    console.error("refusing to publish: integrity lock violated");
    process.exit(1);
  }
}

const meta = JSON.parse(fs.readFileSync(path.join("targets", targetId, "meta.json"), "utf8"));
const verdict = {
  targetId, name: meta.name, blurb: meta.blurb || "", targetUrl: r.targetUrl,
  pass: r.pass, blocked, rounds: Number(round), flows: r.flows,
  publishedAt: new Date().toISOString(), kane: "Kane CLI (TestMu AI)",
  agent: process.env.KANE_CLI_USER_AGENT || "gemini",
  integrity
};
fs.mkdirSync("data", { recursive: true });
const file = "data/verdicts.json";
const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
const idx = all.findIndex((v) => v.targetId === targetId);
if (idx >= 0) all[idx] = verdict; else all.push(verdict);
fs.writeFileSync(file, JSON.stringify(all, null, 2));
console.log(`published verdict for ${targetId} (pass=${verdict.pass}, rounds=${verdict.rounds})`);
console.log(`integrity: ${integrity.note}`);
