export function roundPublishError(roundData, {
  targetId,
  round,
  expectedFlowIds,
  expectedTargetUrl,
  blocked = false,
  now = Date.now()
}) {
  if (!roundData || typeof roundData !== "object" || Array.isArray(roundData)) {
    return "round data is invalid";
  }
  if (roundData.targetId !== targetId || Number(roundData.round) !== Number(round)) {
    return "round target or number does not match";
  }
  if (typeof roundData.targetUrl !== "string" || !roundData.targetUrl) {
    return "round target URL is missing";
  }
  if (expectedTargetUrl && roundData.targetUrl !== expectedTargetUrl) {
    return "round target URL does not match the canonical target URL";
  }

  const generatedAt = Date.parse(roundData.generatedAt);
  if (!Number.isFinite(generatedAt) || generatedAt > now + 60_000 || now - generatedAt > 30 * 60 * 1000) {
    return "round is stale or has an invalid timestamp";
  }

  const flows = roundData.flows;
  if (!Array.isArray(flows) || flows.some((flow) =>
    !flow || typeof flow !== "object" || typeof flow.id !== "string" ||
    typeof flow.pass !== "boolean" || flow.skipped === true ||
    !Number.isInteger(flow.exitCode) || !Number.isInteger(flow.steps) || flow.steps < 0
  )) {
    return "round flows are invalid or skipped";
  }
  const actualFlowIds = flows.map((flow) => flow.id).sort();
  const expected = [...expectedFlowIds].sort();
  if (actualFlowIds.length !== expected.length ||
      actualFlowIds.some((id, index) => id !== expected[index])) {
    return "round does not contain exactly the expected flows";
  }

  if (blocked) {
    if (roundData.pass !== false || !flows.some((flow) => flow.pass === false)) {
      return "blocked publication requires a complete red round";
    }
  } else if (roundData.pass !== true || flows.some((flow) =>
    flow.pass !== true || flow.exitCode !== 0 || flow.steps === 0
  )) {
    return "only a complete green round may be published";
  }
  return null;
}
