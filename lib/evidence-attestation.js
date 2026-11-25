import crypto from "node:crypto";
import fs from "node:fs";

export function canonicalEvidenceJson(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return JSON.stringify(value);
  const sorted = {};
  for (const key of Object.keys(value).sort()) sorted[key] = canonicalEvidenceJson(value[key]);
  return `{${Object.keys(sorted).map((key) => `${JSON.stringify(key)}:${sorted[key]}`).join(",")}}`;
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function createAttestation({ roundFile, targetId, privateKey }) {
  if (!privateKey) throw new Error("KANE_ATTESTATION_PRIVATE_KEY is required");
  const round = JSON.parse(fs.readFileSync(roundFile, "utf8"));
  const payload = {
    type: "kane-court-evidence",
    targetId,
    round: Number(round.round),
    targetUrl: round.targetUrl,
    generatedAt: round.generatedAt,
    flows: round.flows.map((flow) => ({
      id: flow.id,
      pass: flow.pass,
      skipped: flow.skipped === true,
      exitCode: flow.exitCode,
      steps: flow.steps,
      rawSha256: sha256File(`.loop/runs/${targetId}/raw/${flow.id}.ndjson`)
    }))
  };
  const signature = crypto.sign(null, Buffer.from(canonicalEvidenceJson(payload)), privateKey).toString("base64");
  const manifest = { payload, signature };
  fs.mkdirSync(".loop", { recursive: true });
  fs.writeFileSync(`.loop/round-${round.round}.attestation.json`, JSON.stringify(manifest, null, 2));
  return manifest;
}

export function verifyAttestation({ targetId, round, targetUrl, publicKey }) {
  if (!publicKey) throw new Error("KANE_ATTESTATION_PUBLIC_KEY is required");
  if (typeof publicKey === "string" && fs.existsSync(publicKey)) {
    publicKey = fs.readFileSync(publicKey, "utf8");
  }
  const manifestFile = `.loop/round-${round}.attestation.json`;
  if (!fs.existsSync(manifestFile)) throw new Error("missing Kane evidence attestation");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const payload = manifest.payload;
  if (!payload || payload.type !== "kane-court-evidence") throw new Error("invalid attestation payload");
  if (payload.targetId !== targetId || Number(payload.round) !== Number(round) || payload.targetUrl !== targetUrl) {
    throw new Error("attestation does not match round");
  }
  const generatedAt = Date.parse(payload.generatedAt);
  if (!Number.isFinite(generatedAt) || generatedAt > Date.now() + 60000 || Date.now() - generatedAt > 30 * 60 * 1000) {
    throw new Error("attestation is stale");
  }
  if (!crypto.verify(null, Buffer.from(canonicalEvidenceJson(payload)), publicKey, Buffer.from(manifest.signature, "base64"))) {
    throw new Error("invalid attestation signature");
  }
  for (const flow of payload.flows) {
    const raw = `.loop/runs/${targetId}/raw/${flow.id}.ndjson`;
    if (!fs.existsSync(raw) || sha256File(raw) !== flow.rawSha256) throw new Error(`Kane evidence changed for ${flow.id}`);
  }
  return payload;
}
