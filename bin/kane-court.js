#!/usr/bin/env node
// kane-court CLI - an adversarial QA court.
//
//   kane-court serve            start the court (targets + verdict pages)
//   kane-court verify           put a target on trial with Kane CLI
//   kane-court gate             print the Stop-hook decision
//   kane-court targets          list the docket
//   kane-court verdict          show the published verdict
//   kane-court install --agent  register the MCP server with an agent
//
// Zero runtime dependencies: Node + the Kane CLI you already have.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { listTargets, verifyWithKane, gateDecision, publishedVerdict } from "../lib/kane-court-core.js";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

function usage() {
  console.log(`kane-court - an adversarial QA court

Usage:
  kane-court serve [--port 4173]
  kane-court verify [--target atlas] [--url http://localhost:3000/t/atlas] [--timeout 240] [--replay]
  kane-court gate
  kane-court targets
  kane-court verdict [--target atlas]
  kane-court trial --url <url>          put any URL on trial
  kane-court install --agent <claude|cursor|codex|windsurf|kiro>
`);
}

function cmdTargets() {
  const t = listTargets();
  if (!t.length) return console.log("no targets on the docket");
  for (const x of t) console.log(`${x.id.padEnd(10)} ${x.name}${x.blurb ? `\n           ${x.blurb}` : ""}`);
}

function cmdVerdict() {
  const targets = listTargets();
  const target = flag("target", targets[0] && targets[0].id);
  const v = publishedVerdict(target);
  if (!v) return console.log(`no published verdict for "${target}"`);
  console.log(JSON.stringify(v, null, 2));
}

function cmdVerify() {
  const targets = listTargets();
  const target = flag("target", targets[0] && targets[0].id);
  if (!target) return console.error("no targets on the docket"), process.exit(2);
  const url = flag("url", `http://localhost:3000/t/${target}`);
  console.log(`Kane Court: putting "${target}" on trial at ${url}\n`);
  const replay = argv.includes("--replay");
  const v = verifyWithKane({ target, url, timeout: Number(flag("timeout", 240)), replay });
  for (const f of v.flows) {
    console.log(`[${target}][${f.id}] pass=${f.pass} exit=${f.exitCode} steps=${f.steps}`);
    for (const fail of f.failures || []) console.log(`    * ${fail.message || fail.status || JSON.stringify(fail)}`);
  }
  console.log(`\npass=${v.pass}   integrity: ${v.integrity.note}`);
  process.exit(v.pass ? 0 : 1);
}

function cmdGate() {
  const d = gateDecision();
  console.log(JSON.stringify(d, null, 2));
  process.exit(d.decision === "continue" ? 1 : 0);
}

function cmdServe() {
  const port = flag("port", process.env.PORT || "3000");
  const r = spawnSync("node", ["server.js"], {
    stdio: "inherit",
    env: { ...process.env, PORT: port }
  });
  process.exit(r.status ?? 0);
}

function cmdInstall() {
  const agent = flag("agent");
  if (!agent) {
    console.error("--agent is required: claude | cursor | codex | windsurf | kiro");
    process.exit(2);
  }
  const serverPath = path.resolve(new URL("../mcp/server.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const entry = { command: "node", args: [serverPath] };

  const home = os.homedir();
  const targets = {
    claude: path.join(home, ".claude.json"),
    cursor: path.join(home, ".cursor", "mcp.json"),
    codex: path.join(home, ".codex", "config.toml"),
    windsurf: path.join(home, ".codeium", "windsurf", "mcp_config.json"),
    kiro: path.join(home, ".kiro", "settings", "mcp.json")
  };
  const dest = targets[agent];
  if (!dest) {
    console.error(`unknown agent "${agent}". Try: ${Object.keys(targets).join(", ")}`);
    process.exit(2);
  }

  if (dest.endsWith(".toml")) {
    let existing = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : "";
    if (existing.includes("kane-court")) {
      console.log(`kane-court already registered in ${dest}`);
      return;
    }
    const block = `\n[mcp_servers.kane-court]\ncommand = "node"\nargs = ["${serverPath.replace(/\\/g, "/")}"]\n`;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, existing + block);
    console.log(`registered kane-court in ${dest}`);
    console.log("restart your agent to pick it up, then ask it to verify a target.");
    return;
  }

  let cfg = {};
  if (fs.existsSync(dest)) {
    try { cfg = JSON.parse(fs.readFileSync(dest, "utf8")); } catch { cfg = {}; }
  }
  cfg.mcpServers = cfg.mcpServers || {};
  cfg.mcpServers["kane-court"] = entry;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(cfg, null, 2));
  console.log(`registered kane-court in ${dest}`);
  console.log("restart your agent to pick it up, then ask it to verify a target.");
}

switch (cmd) {
  case "serve": cmdServe(); break;
  case "verify": cmdVerify(); break;
  case "gate": cmdGate(); break;
  case "targets": cmdTargets(); break;
  case "verdict": cmdVerdict(); break;
  case "trial": {
  const url = flag("url");
  if (!url) { console.error("usage: kane-court trial --url <url>"); process.exit(2); }
  const { judgeUrl } = await import("../scripts/queue-worker.js");
  const v = await judgeUrl(url, flag("note", "") || "");
  for (const f of v.flows) {
    console.log(`[${f.id}] pass=${f.pass} exit=${f.exitCode}`);
    for (const fail of f.failures || []) console.log(`    * ${fail.message}`);
  }
  console.log(`\n${v.pass ? "GREEN" : "RED"} - ${v.name} (${v.targetUrl})`);
  console.log(`verdict: /v/${v.targetId}`);
  process.exit(v.pass ? 0 : 1);
}
  break;
case "install": cmdInstall(); break;
  case "help": case "--help": case "-h": case undefined: usage(); break;
  default:
    console.error(`unknown command: ${cmd}`);
    usage();
    process.exit(2);
}
