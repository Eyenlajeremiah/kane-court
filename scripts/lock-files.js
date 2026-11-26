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
import { fileURLToPath } from "node:url";

// Resolve the project root from this script's own location, not from the
// current working directory. The verifier must work when it is invoked as
// `node node_modules/kane-court/scripts/lock-files.js --verify` from an
// arbitrary directory, which is how a judge checks an installed package.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "scripts", "lock-manifest.json");
const MANIFEST_SIGNATURE = process.env.KANE_LOCK_MANIFEST_SIGNATURE;
const MANIFEST_PUBLIC_KEY = process.env.KANE_LOCK_MANIFEST_PUBLIC_KEY;
// Text files whose bytes may legitimately differ by line ending between
// platforms (Windows checkout = CRLF, Linux = LF). Hashing raw bytes would
// report drift on every text file a Windows operator touched, so the hash
// must be computed on CRLF-normalized content for ALL text files - not just
// the original sh|js|json|md|html|css subset.
const LINE_ENDING_EXTENSIONS = new Set([
  "sh", "js", "json", "md", "html", "css",
  "txt", "py", "example", "yml", "yaml", "toml", "env", "cfg", "ini",
]);
// Extensionless files that are still plain text.
const LINE_ENDING_BASENAMES = new Set([".gitignore", ".npmignore"]);
const isLineEndingNormalized = (rel) => {
  const base = path.basename(rel).toLowerCase();
  if (LINE_ENDING_BASENAMES.has(base)) return true;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return false; // no extension
  return LINE_ENDING_EXTENSIONS.has(base.slice(dot + 1));
};

const isLocked = (rel) => {
  const p = rel.split(path.sep).join("/");
  if (p.startsWith(".git/") || p.startsWith("node_modules/")) return false;
  if (p.startsWith(".loop/") || p.startsWith("data/")) return false;
  if (p.startsWith(".testmuai/evidence/") || p.includes("/.internal/")) return false;
  if (p === "scripts/lock-manifest.json") return false;
  // Signing material is deployment-specific and deliberately untracked.
  // Locking it would make every clone without the operator's private key
  // report REMOVED drift, so the court would never verify for anyone else.
  if (/^scripts\/lock-manifest\.(key|sig|pub)$/.test(p)) return false;
  if (p.startsWith("keys/")) return false;
  // npm strips package-lock.json from published tarballs by design (it
  // publishes npm-shrinkwrap.json instead). Locking it would make every
  // judge who installs from npm fail the integrity check with REMOVED
  // drift, and block publication forever. It is a repo-development
  // artifact, not a spec the agent is judged against.
  if (p === "package-lock.json") return false;
  // npm rewrites .gitignore to .npmignore when publishing, so .gitignore is
  // absent from the tarball and from every installed copy. Locking it would
  // make an npm-installed court fail its own integrity check with REMOVED
  // drift. Same reasoning as package-lock.json above.
  if (p === ".gitignore") return false;
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
  const content = fs.readFileSync(path.join(ROOT, rel));
  const canonical = isLineEndingNormalized(rel)
    ? Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8")
    : content;
  return crypto.createHash("sha256").update(canonical).digest("hex");
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
const manifestText = fs.readFileSync(MANIFEST, "utf8");
// Signing the manifest is OPTIONAL. The hash lock is the integrity
// guarantee and it works with zero setup, so a judge who clones this repo
// gets a working court. If the operator has configured a signing key we
// enforce it as well, so a signed deployment is strictly stronger - but an
// unsigned one is still a valid, fully verified lock.
const signatureConfigured = Boolean(MANIFEST_SIGNATURE && MANIFEST_PUBLIC_KEY);
if (MANIFEST_SIGNATURE && !MANIFEST_PUBLIC_KEY) {
  console.error("KANE_LOCK_MANIFEST_SIGNATURE is set but KANE_LOCK_MANIFEST_PUBLIC_KEY is not");
  process.exit(1);
}
if (signatureConfigured) {
  let publicKey = MANIFEST_PUBLIC_KEY;
  if (fs.existsSync(publicKey)) publicKey = fs.readFileSync(publicKey, "utf8");
  let signature = MANIFEST_SIGNATURE;
  if (fs.existsSync(signature)) signature = fs.readFileSync(signature, "utf8");
  if (!crypto.verify(null, Buffer.from(manifestText), publicKey, Buffer.from(signature.trim(), "base64"))) {
    console.error("INTEGRITY MANIFEST SIGNATURE IS INVALID");
    process.exit(1);
  }
}
const saved = JSON.parse(manifestText).files || {};
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
    console.log("integrity OK: " + Object.keys(saved).length + " locked file(s) unchanged"
      + (signatureConfigured ? " (manifest signature verified)" : " (manifest not signed)"));
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
console.log("manifest signature: " + (signatureConfigured ? "configured" : "not configured (hash lock only)"));
console.log("drift: " + drift);
for (const k of changed) console.log("  CHANGED: " + k);
for (const k of removed) console.log("  REMOVED: " + k);
for (const k of added) console.log("  note: added " + k);
process.exit(drift === 0 ? 0 : 1);
