#!/usr/bin/env node
import fs from "node:fs";
const [, , targetId, round] = process.argv;
const r = JSON.parse(fs.readFileSync(".loop/last-round.json", "utf8"));
const failed = r.flows.filter((f) => !f.pass);
const L = [];
L.push(`Kane CLI FAILED ${failed.length} flow(s) on target "${targetId}" (round ${round}).`);
L.push("");
L.push(`Target files: targets/${targetId}/`);
L.push("Each flow below is an objective from lib/personas.json (or the target's flows.json).");
L.push("These objectives ARE the spec. Do not weaken them. Fix the application code.");
L.push("");
for (const f of failed) {
  L.push(`--- FAILING FLOW: ${f.id} (exit ${f.exitCode}, ${f.steps} steps) ---`);
  const fs2 = f.failures || [];
  if (fs2.length) for (const x of fs2) L.push(`  * ${x.status || x.type}: ${x.message}`);
  else L.push("  * Kane reported the flow as failed without a detailed message.");
  L.push("");
}
L.push("Your job: make the app genuinely satisfy the objective. Then re-run:");
L.push(`  bash scripts/run-case.sh ${targetId} ${Number(round) + 1}`);
L.push("");
L.push("Do not modify lib/personas.json, any target flows.json, or anything under scripts/ to make a test pass. Only change the application.");
fs.mkdirSync(".loop", { recursive: true });
fs.writeFileSync(".loop/pending-prompt.md", L.join("\n"));
console.log(L.join("\n"));
