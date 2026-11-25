#!/usr/bin/env node
// Sign the integrity manifest so the lock itself cannot be swapped.
//
//   node scripts/sign-manifest.js [--key <private-key-path>]
//
// Generates an Ed25519 keypair if none is given, signs scripts/lock-manifest.json
// and writes scripts/lock-manifest.sig (base64) next to it.
//
// Then export:
//   KANE_LOCK_MANIFEST_SIGNATURE=scripts/lock-manifest.sig
//   KANE_LOCK_MANIFEST_PUBLIC_KEY=scripts/lock-manifest.pub
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MANIFEST = path.join(ROOT, "scripts", "lock-manifest.json");
const SIG = path.join(ROOT, "scripts", "lock-manifest.sig");
const PUB = path.join(ROOT, "scripts", "lock-manifest.pub");
const KEY = path.join(ROOT, "scripts", "lock-manifest.key");

const argv = process.argv.slice(2);
const keyArg = argv.includes("--key") ? argv[argv.indexOf("--key") + 1] : null;

if (!fs.existsSync(MANIFEST)) {
  console.error("no manifest to sign. Run: node scripts/lock-files.js --init");
  process.exit(2);
}

let privateKey;
if (keyArg && fs.existsSync(keyArg)) {
  privateKey = crypto.createPrivateKey(fs.readFileSync(keyArg, "utf8"));
} else if (fs.existsSync(KEY)) {
  privateKey = crypto.createPrivateKey(fs.readFileSync(KEY, "utf8"));
} else {
  const pair = crypto.generateKeyPairSync("ed25519");
  privateKey = pair.privateKey;
  const pem = pair.privateKey.export({ type: "pkcs8", format: "pem" });
  const pubPem = pair.publicKey.export({ type: "spki", format: "pem" });
  fs.writeFileSync(KEY, pem, { mode: 0o600 });
  fs.writeFileSync(PUB, pubPem);
  console.log("generated a new Ed25519 keypair:");
  console.log("  private: " + path.relative(ROOT, KEY) + "  (keep this secret)");
  console.log("  public:  " + path.relative(ROOT, PUB));
}

const signature = crypto.sign(null, fs.readFileSync(MANIFEST), privateKey).toString("base64");
fs.writeFileSync(SIG, signature);
console.log("signed " + path.relative(ROOT, MANIFEST) + " -> " + path.relative(ROOT, SIG));
console.log("");
console.log("export these to enforce the signature:");
console.log("  export KANE_LOCK_MANIFEST_SIGNATURE=" + path.relative(ROOT, SIG));
console.log("  export KANE_LOCK_MANIFEST_PUBLIC_KEY=" + path.relative(ROOT, PUB));
