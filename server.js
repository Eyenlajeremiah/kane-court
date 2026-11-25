import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dns from "node:dns/promises";
import net from "node:net";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA = path.join(ROOT, "data");
const VERDICTS = path.join(DATA, "verdicts.json");
const QUEUE = path.join(DATA, "queue.json");
function ensureData() { fs.mkdirSync(DATA, { recursive: true }); }
function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function writeJson(p, v) { ensureData(); fs.writeFileSync(p, JSON.stringify(v, null, 2)); }
function targets() {
  const dir = path.join(ROOT, "targets");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "meta.json")))
    .map((d) => readJson(path.join(dir, d, "meta.json"), { id: d }));
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

// The docket changes while the court is working - a submitted URL goes
// queued -> running -> green/red. The page is server-rendered and static, so
// it needs a nudge to show the new state. This polls a tiny version endpoint
// and reloads only when the underlying data actually changed.
function autoRefreshScript() {
  return '<script>' +
    '(function(){' +
    'var v=null;' +
    'setInterval(function(){' +
    'fetch("/data-version",{cache:"no-store"}).then(function(r){return r.text()}).then(function(t){' +
    'if(v===null){v=t;return;}' +
    'if(t&&t!==v){v=t;window.location.reload();}' +
    '}).catch(function(){});' +
    '},3000);' +
    '})();' +
    '</script>';
}

function layout(title, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + ' &mdash; Kane Court</title>'
    + '<link rel="stylesheet" href="/style.css"></head><body><div class="wrap">'
    + body + autoRefreshScript() + '</div></body></html>';
}
function verdictPage(v) {
  const badge = v.blocked ? '<span class="pill pend">blocked</span>'
    : (v.pass ? '<span class="pill pass">verified green</span>' : '<span class="pill fail">red</span>');
  let rows = '';
  for (const fl of v.flows || []) {
    const cls = fl.pass ? 'pass' : 'fail';
    const msgs = (fl.failures || []).map((x) => '<div class="mono">' + esc(x.message) + '</div>').join('');
    rows += '<tr><td>' + esc(fl.id) + '</td><td><span class="pill ' + cls + '">' + (fl.pass ? 'pass' : 'fail') + '</span></td>'
      + '<td class="mono">' + esc(fl.exitCode) + '</td><td class="mono">' + esc(fl.steps) + '</td><td>' + msgs + '</td></tr>';
  }
  return '<h1>' + esc(v.name) + '</h1>'
    + '<p class="sub">' + badge + ' &nbsp; ' + esc(v.blurb) + '</p>'
    + '<div class="card"><table><thead><tr><th>Flow</th><th>Result</th><th>Exit</th><th>Steps</th><th>Kane output</th></tr></thead><tbody>'
    + rows + '</tbody></table></div>'
    + '<div class="card"><div class="mono">Rounds until green: ' + esc(v.rounds) + '</div>'
    + '<div class="mono">Verified by: ' + esc(v.kane) + ' &middot; agent: ' + esc(v.agent) + '</div>'
    + '<div class="mono">Published: ' + esc(v.publishedAt) + '</div></div>'
    + '<p><a href="/">Back to the court</a></p>';
}
function homePage() {
  const vs = readJson(VERDICTS, []);
  const q = readJson(QUEUE, []);
  const ts = targets();
  let cards = '';
  const ext = vs.filter((v) => v.external);
  for (const v of ext) {
    const badge = v.pass ? '<span class="pill pass">green</span>' : '<span class="pill fail">red</span>';
    cards += '<div class="card"><h2 style="margin:0 0 6px;font-size:17px">' + esc(v.name) + '</h2>'
      + '<div>' + badge + '</div><p class="sub mono" style="margin:8px 0;word-break:break-all">' + esc(v.targetUrl) + '</p>'
      + '<a href="/v/' + esc(v.targetId) + '">Read the verdict</a></div>';
  }
  for (const t of ts) {
    const v = vs.find((x) => x.targetId === t.id);
    const badge = v ? (v.blocked ? '<span class="pill pend">blocked</span>' : (v.pass ? '<span class="pill pass">green</span>' : '<span class="pill fail">red</span>')) : '<span class="pill pend">not yet judged</span>';
    const link = v ? '<a href="/v/' + esc(t.id) + '">Read the verdict</a>' : '<span class="mono">awaiting Kane</span>';
    cards += '<div class="card"><h2 style="margin:0 0 6px;font-size:17px">' + esc(t.name) + '</h2>'
      + '<div>' + badge + '</div><p class="sub" style="margin:8px 0">' + esc(t.blurb || '') + '</p>' + link + '</div>';
  }
  let qrows = '';
  for (const item of q) {
    const pill = item.status === 'green' ? 'pass' : (item.status === 'red' ? 'fail' : 'pend');
    const vlink = item.verdictId ? ' <a href="/v/' + esc(item.verdictId) + '">verdict</a>' : '';
    qrows += '<tr><td>' + esc(item.targetId) + vlink + '</td><td><span class="pill ' + pill + '">' + esc(item.status) + '</span></td><td class="mono">' + esc(item.note || '') + '</td></tr>';
  }
  let body = '<h1>Kane Court</h1>';
  body += '<p class="sub">An adversarial QA court. The agent is the prosecutor, Kane CLI is the judge, and a verdict is published only when the agent has earned a green re-run.</p>';
  body += '<div class="card"><form method="post" action="/submit"><label for="url">Submit a target URL for trial</label>'
    + '<input id="url" name="url" placeholder="https://example.com" style="width:100%" required>'
    + '<label for="note">Note (optional)</label><input id="note" name="note" placeholder="what should the court look for?" style="width:100%">'
    + '<p><button type="submit">Call the court</button></p></form></div>';
  body += '<h2>The docket</h2><div class="grid">' + (cards || '<p class="sub">No targets yet.</p>') + '</div>';
  body += '<h2>Queue</h2><div class="card">';
  body += qrows ? '<table><thead><tr><th>Target</th><th>Status</th><th>Note</th></tr></thead><tbody>' + qrows + '</tbody></table>' : '<p class="sub">Nothing queued.</p>';
  body += '</div>';
  return layout('Kane Court', body);
}
function targetPage(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return layout('Not found', '<h1>Not found</h1><p><a href="/">Back</a></p>');
  const dir = path.join(ROOT, 'targets', id);
  const meta = readJson(path.join(dir, 'meta.json'), { id, name: id });
  const htmlPath = path.join(dir, 'index.html');
  if (!fs.existsSync(htmlPath)) return layout('Not found', '<h1>Not found</h1><p><a href="/">Back</a></p>');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const injected = html.replace('</head>', '<link rel="stylesheet" href="/style.css"></head>');
  return injected;
}
function staticFile(res, name) {
  const p = path.join(ROOT, 'public', name);
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(p);
  const mime = ext === '.css' ? 'text/css' : (ext === '.js' ? 'text/javascript' : 'text/plain');
  res.writeHead(200, { 'Content-Type': mime });
  res.end(fs.readFileSync(p));
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    let tooLarge = false;
    req.on('data', (c) => {
      if (tooLarge) return;
      b += c;
      if (Buffer.byteLength(b) > 64 * 1024) {
        tooLarge = true;
        b = '';
      }
    });
    req.on('end', () => resolve({ body: b, tooLarge }));
  });
}
function isPrivateAddress(address) {
  if (!address) return false;
  if (net.isIPv4(address)) {
    const n = address.split('.').map(Number);
    return n[0] === 10 ||
      (n[0] === 127) ||
      (n[0] === 169 && n[1] === 254) ||
      (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
      (n[0] === 192 && n[1] === 168) ||
      (n[0] === 100 && n[1] >= 64 && n[1] <= 127) ||
      (n[0] === 198 && (n[1] === 18 || n[1] === 19)) ||
      n[0] >= 224 ||
      (n[0] === 0);
  }
  const lower = address.toLowerCase();
  return lower === "::1" || lower === "::" ||
    lower.startsWith("fc") || lower.startsWith("fd") ||
    lower.startsWith("fe8") || lower.startsWith("fe9") ||
    lower.startsWith("fea") || lower.startsWith("feb");
}
async function validateTargetUrl(value) {
  let u;
  try { u = new URL(value); } catch { return "Enter a valid absolute URL."; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "Only http and https URLs are allowed.";
  if (u.username || u.password) return "URLs with embedded credentials are not allowed.";
  if (isPrivateAddress(u.hostname.replace(/^\[|\]$/g, ""))) return "Private and loopback addresses are not allowed.";
  try {
    const addresses = await dns.lookup(u.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((x) => isPrivateAddress(x.address))) {
      return "Private and loopback addresses are not allowed.";
    }
  } catch {
    return "The target hostname could not be resolved.";
  }
  return null;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'POST' && p === '/submit') {
    const result = await readBody(req);
    if (result.tooLarge) {
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      res.end("Request body too large");
      return;
    }
    const params = new URLSearchParams(result.body);
    const targetUrl = (params.get('url') || '').trim();
    const note = (params.get('note') || '').trim();
    const urlError = await validateTargetUrl(targetUrl);
    if (urlError) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(urlError);
      return;
    }
    const q = readJson(QUEUE, []);
    const existing = q.findIndex((x) => x.targetId === targetUrl && (x.status === 'queued' || x.status === 'running'));
    if (existing >= 0) {
      q[existing].note = note || q[existing].note;
      q[existing].at = new Date().toISOString();
    } else {
      q.push({ targetId: targetUrl, note, status: 'queued', at: new Date().toISOString() });
    }
    writeJson(QUEUE, q);
    res.writeHead(302, { Location: '/' });
    res.end();
    // Kick the worker so a submitted URL does not sit in the queue. The worker
    // is spawned detached: the browser gets its redirect immediately.
    kickWorker();
    return;
  }
  if (p === '/data-version') {
    const vv = readJson(VERDICTS, []);
    const qq = readJson(QUEUE, []);
    const stamp = vv.map((x) => x.targetId + (x.pass ? '1' : '0')).join('|') + '#' + qq.map((q) => q.targetId + q.status).join('|');
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end(String(stamp));
    return;
  }
  if (p === '/' ) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(homePage()); return; }
  if (p === '/style.css') { staticFile(res, 'style.css'); return; }
  if (p.startsWith('/v/')) {
    const id = p.slice(3);
    const v = readJson(VERDICTS, []).find((x) => x.targetId === id);
    if (!v) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(layout('Not found', '<h1>No verdict yet</h1><p><a href="/">Back</a></p>')); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(layout(v.name, verdictPage(v)));
    return;
  }
  if (p.startsWith('/t/')) {
    const id = p.slice(3).replace(/\/$/, '');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(targetPage(id));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(layout('Not found', '<h1>Not found</h1><p><a href="/">Back</a></p>'));
});
// The queue worker. It is started automatically so that a URL submitted through
// the form is actually put on trial instead of sitting in the queue forever.
// Set QUEUE_WORKER=0 to keep the server read-only (useful while recording the
// demo, so the worker cannot spend credits mid-take).
function kickWorker() {
  if (process.env.QUEUE_WORKER === '0') return;
  if (globalThis.__kaneWorkerStarted) return;
  globalThis.__kaneWorkerStarted = true;
  const w = spawn(process.execPath, [path.join(ROOT, 'scripts', 'queue-worker.js')], {
    cwd: ROOT, detached: true, stdio: 'ignore'
  });
  w.unref();
}
ensureData();
if (process.env.QUEUE_WORKER !== '0') {
  // Start the worker slightly after the server so the port is free.
  setTimeout(kickWorker, 500);
}
server.listen(PORT, () => {
  console.log('Kane Court listening on http://localhost:' + PORT);
  console.log(process.env.QUEUE_WORKER === '0'
    ? 'queue worker: OFF (read-only court)'
    : 'queue worker: ON (submitted URLs are put on trial automatically)');
});
