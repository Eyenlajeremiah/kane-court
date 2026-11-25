#!/usr/bin/env node
// Integrity lock: pin every harness/spec file by SHA-256 so the agent cannot
// weaken the specs it is judged against.
//
//   node scripts/lock-files.js --init    (re)create the manifest  -- run this FIRST
//   node scripts/lock-files.js --verify   check for drift         -- run by publish.js
//   node scripts/lock-files.js --status   human-readable report
//
// Locked: everything except the application under test (targets/*/index.html),
// generated output (data/, .loop/) and the manifest itself.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "scripts", "lock-manifest.json");

const isLocked = (rel) => {
  const p = rel.split(path.sep).join("/");
  if (p.startsWith(".git/") || p.startsWith("node_modules/")) return false;
  if (p.startsWith(".loop/") || p.startsWith("data/")) return false;
  if (p.startsWith(".testmuai/evidence/") || p.includes("/.internal/")) return false;
  if (p === "scripts/lock-manifest.json") return false;
  if (/^targets\/[^/]+\/index\.html$/.test(p)) return false; // the app is mutable
  return true;
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    const posixRel = rel.split(path.sep).join("/");
    if (e.isDirectory()) {
      if (
        posixRel === ".git" ||
        posixRel === "node_modules" ||
        posixRel === ".loop" ||
        posixRel === "data" ||
        posixRel === ".testmuai/evidence" ||
        posixRel.endsWith("/.internal")
      ) continue;
      if (e.name === ".internal") continue;
      walk(full, out);
    } else if (e.isFile() && isLocked(rel)) {
      out.push(rel);
    }
  }
  return out;
}

function hash(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");
}

function current() {
  const m = {};
  for (const rel of walk(ROOT).sort()) m[rel.split(path.sep).join("/")] = hash(rel);
  return m;
}

const mode = process.argv[2] || "--status";

if (mode === "--init") {
  const m = current();
  fs.writeFileSync(MANIFEST, JSON.stringify({ lockedAt: new Date().toISOString(), files: m }, null, 2));
  console.log("locked " + Object.keys(m).length + " file(s) -> scripts/lock-manifest.json");
  for (const k of Object.keys(m)) console.log("  " + k);
  process.exit(0);
}

if (!fs.existsSync(MANIFEST)) {
  console.error("NO MANIFEST. Run: node scripts/lock-files.js --init");
  process.exit(2);
}
const saved = JSON.parse(fs.readFileSync(MANIFEST, "utf8")).files || {};
const now = current();

const changed = [], removed = [], added = [];
for (const k of Object.keys(saved)) {
  if (!(k in now)) removed.push(k);
  else if (now[k] !== saved[k]) changed.push(k);
}
for (const k of Object.keys(now)) if (!(k in saved)) added.push(k);

// Only CHANGED or REMOVED locked files are a violation. A newly created file
// is informational: the agent may legitimately add assets to the application.
const drift = changed.length + removed.length;

if (mode === "--verify") {
  if (drift === 0) {
    console.log("integrity OK: " + Object.keys(saved).length + " locked file(s) unchanged");
    process.exit(0);
  }
  console.error("INTEGRITY VIOLATION - " + drift + " file(s) drifted since the lock was taken:");
  for (const k of changed) console.error("  CHANGED: " + k);
  for (const k of removed) console.error("  REMOVED: " + k);
  for (const k of added) console.error("  note (not a violation): added " + k);
  console.error("The agent may only modify the application under targets/*/index.html.");
  console.error("If this drift is legitimate (you changed a spec on purpose), re-run with --init.");
  process.exit(1);
}

// --status
console.log("locked files: " + Object.keys(saved).length);
console.log("drift: " + drift);
for (const k of changed) console.log("  CHANGED: " + k);
for (const k of removed) console.log("  REMOVED: " + k);
for (const k of added) console.log("  note: added " + k);
process.exit(drift === 0 ? 0 : 1);
