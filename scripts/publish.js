#!/usr/bin/env node
import fs from "node:fs";
const [, , targetId, round, ...rest] = process.argv;
const blocked = rest.includes("--blocked");
const r = JSON.parse(fs.readFileSync(`.loop/round-${round}.json`, "utf8"));
if (!r.pass && !blocked) { console.error("refusing to publish: round was not green"); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(`targets/${targetId}/meta.json`, "utf8"));
const verdict = {
  targetId, name: meta.name, blurb: meta.blurb || "", targetUrl: r.targetUrl,
  pass: r.pass, blocked, rounds: Number(round), flows: r.flows,
  publishedAt: new Date().toISOString(), kane: "Kane CLI (TestMu AI)",
  agent: process.env.KANE_CLI_USER_AGENT || "gemini"
};
fs.mkdirSync("data", { recursive: true });
const file = "data/verdicts.json";
const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
const idx = all.findIndex((v) => v.targetId === targetId);
if (idx >= 0) all[idx] = verdict; else all.push(verdict);
fs.writeFileSync(file, JSON.stringify(all, null, 2));
console.log(`published verdict for ${targetId} (pass=${verdict.pass}, rounds=${verdict.rounds})`);
