#!/usr/bin/env node
import fs from "node:fs";
import { createAttestation } from "../lib/evidence-attestation.js";

const [, , targetId, round] = process.argv;
if (!targetId || !round) {
  console.error("usage: attest-evidence.js <targetId> <round>");
  process.exit(1);
}
let key = process.env.KANE_ATTESTATION_PRIVATE_KEY;
if (key && fs.existsSync(key)) key = fs.readFileSync(key, "utf8");
if (!key) {
  console.error("refusing to attest: KANE_ATTESTATION_PRIVATE_KEY is not configured");
  process.exit(2);
}
try {
  createAttestation({
    roundFile: `.loop/round-${round}.json`,
    targetId,
    privateKey: key
  });
  console.log(`attested Kane evidence for ${targetId} round ${round}`);
} catch (e) {
  console.error("attestation failed: " + e.message);
  process.exit(1);
}
