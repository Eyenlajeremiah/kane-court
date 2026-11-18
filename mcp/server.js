#!/usr/bin/env node
// Kane Court MCP server.
//
// Exposes the court as a tool any MCP-capable agent can call:
//   verify_with_kane  run the persona flows against a target, return the verdict
//   kane_gate         the Stop-hook decision (allow / continue + reason)
//   list_targets      what is on the docket
//   get_verdict       the last published verdict for a target
//
// Transport: MCP over stdio, implemented directly against the JSON-RPC 2.0
// wire format so this package stays dependency-free. A judge can clone, run
// `node mcp/server.js`, and point Claude Code / Cursor / Codex at it.
//
//   npx kane-court install --agent claude   # writes the config for you

import { createInterface } from "node:readline";
import { listTargets, verifyWithKane, gateDecision, publishedVerdict } from "../lib/kane-court-core.js";

const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "verify_with_kane",
    description:
      "Put an app on trial. Runs every adversarial persona flow against the target URL with Kane CLI (a real browser agent), and returns a structured verdict: pass/fail per flow, the failures verbatim, and the integrity-lock state. Use this to verify a change before claiming it is done.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target id under targets/, e.g. 'atlas'. Default: the only target." },
        url: { type: "string", description: "URL to judge, e.g. http://localhost:3000/t/atlas" },
        timeout: { type: "number", description: "Per-flow timeout in seconds. Default 240." },
        replay: { type: "boolean", description: "Replay the committed flows from their cached recordings instead of authoring new ones. Free - no LLM credits needed." }
      }
    }
  },
  {
    name: "kane_gate",
    description:
      "Ask the court whether the task may be considered done. Returns the Stop-hook decision: {decision:'allow'} when the last Kane round was green, {decision:'continue', reason} when it was not.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_targets",
    description: "List the targets on the docket with their planted defects.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_verdict",
    description: "Return the last published verdict for a target, if one exists.",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string", description: "Target id, e.g. 'atlas'" } }
    }
  }
];

function textResult(payload, isError = false) {
  return {
    content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }],
    isError
  };
}

function callTool(name, args = {}) {
  const targets = listTargets();
  const target = args.target || (targets[0] && targets[0].id);
  switch (name) {
    case "verify_with_kane": {
      if (!target) return textResult("No targets found.", true);
      const url = args.url || `http://localhost:3000/t/${target}`;
      const verdict = verifyWithKane({ target, url, timeout: args.timeout || 240, replay: args.replay === true });
      return textResult(verdict);
    }
    case "kane_gate":
      return textResult(gateDecision());
    case "list_targets":
      return textResult(targets);
    case "get_verdict": {
      const v = publishedVerdict(target);
      return textResult(v || { note: `No published verdict for "${target}".` }, !v);
    }
    default:
      return textResult(`Unknown tool: ${name}`, true);
  }
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return send({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "kane-court", version: "0.2.0" }
      }
    });
  }
  if (method === "notifications/initialized") return; // notification: no reply
  if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  if (method === "tools/call") {
    try {
      return send({
        jsonrpc: "2.0", id,
        result: callTool(params?.name, params?.arguments || {})
      });
    } catch (e) {
      return send({ jsonrpc: "2.0", id, result: textResult(String(e && e.message ? e.message : e), true) });
    }
  }
  if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const t = line.trim();
  if (!t) return;
  try {
    handle(JSON.parse(t));
  } catch (e) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
});
