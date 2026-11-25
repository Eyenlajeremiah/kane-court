import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { resolveCourtTargetUrl, resolvePublicUrl, validateRedirectChain } from "./lib/network-policy.js";
import { withQueueLock, readQueue, writeQueueAtomic } from "./lib/queue-store.js";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
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
    + '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="/style.css"></head><body>'
    + '<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Kane Court home">'
    + '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 6h14M7 6l-3 5h6L7 6Zm10 0-3 5h6l-3-5ZM7 11v5m10-5v5M4 19h16"/></svg></span>'
    + '<span>Kane Court</span></a><nav class="topnav" aria-label="Primary"><a class="active" href="/">Courtroom</a><a href="/#docket">Docket</a><a href="/#queue">Queue</a></nav>'
    + '<span class="live-chip"><span></span>Judging live</span></div></header>'
    + '<main class="shell">' + body + '</main>' + autoRefreshScript() + '</body></html>';
}
function verdictPage(v) {
  const badge = v.blocked ? '<span class="pill pend">blocked</span>'
    : (v.pass ? '<span class="pill pass"><span class="pill-dot"></span>Verified green</span>' : '<span class="pill fail"><span class="pill-dot"></span>Red verdict</span>');
  let rows = '';
  for (const fl of v.flows || []) {
    const cls = fl.pass ? 'pass' : 'fail';
    const msgs = (fl.failures || []).map((x) => '<div class="output-line">' + esc(x.message) + '</div>').join('');
    rows += '<tr><td><span class="flow-name">' + esc(fl.id) + '</span></td><td><span class="flow-status ' + cls + '">' + (fl.pass ? 'Passed' : 'Failed') + '</span></td>'
      + '<td class="mono">' + esc(fl.exitCode) + '</td><td class="mono">' + esc(fl.steps) + '</td><td>' + (msgs || '<span class="muted">No failures</span>') + '</td></tr>';
  }
  const passed = (v.flows || []).filter((x) => x.pass).length;
  const total = (v.flows || []).length;
  return '<section class="verdict-hero">'
    + '<a class="back-link" href="/">&larr; Back to the docket</a>'
    + '<div class="verdict-heading"><div><span class="eyebrow">Published verdict</span><h1>' + esc(v.name) + '</h1><p class="verdict-blurb">' + esc(v.blurb) + '</p></div>' + badge + '</div>'
    + '<div class="verdict-summary">'
    + '<div><span class="summary-label">Flows</span><strong>' + passed + '<span> / ' + total + '</span></strong></div>'
    + '<div><span class="summary-label">Rounds</span><strong>' + esc(v.rounds) + '</strong></div>'
    + '<div><span class="summary-label">Judge</span><strong class="summary-text">' + esc(v.kane) + '</strong></div>'
    + '</div></section>'
    + '<section class="section-block"><div class="section-heading"><div><span class="eyebrow">Evidence</span><h2>Flow results</h2></div><span class="record-count">' + total + ' personas tested</span></div>'
    + '<div class="table-card"><table><thead><tr><th>Flow</th><th>Result</th><th>Exit</th><th>Steps</th><th>Kane output</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>'
    + '<section class="section-block"><div class="section-heading"><div><span class="eyebrow">Audit trail</span><h2>Publication details</h2></div></div>'
    + '<div class="detail-grid"><div class="detail-card"><span>Verified by</span><strong>' + esc(v.kane) + '</strong></div><div class="detail-card"><span>Agent</span><strong>' + esc(v.agent) + '</strong></div><div class="detail-card"><span>Published</span><strong>' + esc(v.publishedAt) + '</strong></div></div></section>';
}
function homePage() {
  const vs = readJson(VERDICTS, []);
  const q = readJson(QUEUE, []);
  const ts = targets();
  let cards = '';
  const ext = vs.filter((v) => v.external);
  for (const v of ext) {
    const badge = v.pass ? '<span class="pill pass">green</span>' : '<span class="pill fail">red</span>';
    cards += '<article class="target-card"><div class="card-top"><span class="card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>' + badge + '</div>'
      + '<h3>' + esc(v.name) + '</h3><p class="target-url">' + esc(v.targetUrl) + '</p>'
      + '<a class="card-link" href="/v/' + esc(v.targetId) + '">Read verdict <span>&rarr;</span></a></article>';
  }
  for (const t of ts) {
    const v = vs.find((x) => x.targetId === t.id);
    const badge = v ? (v.blocked ? '<span class="pill pend">blocked</span>' : (v.pass ? '<span class="pill pass">green</span>' : '<span class="pill fail">red</span>')) : '<span class="pill pend">not yet judged</span>';
    const link = v ? '<a class="card-link" href="/v/' + esc(t.id) + '">Read verdict <span>&rarr;</span></a>' : '<span class="awaiting">Awaiting Kane</span>';
    cards += '<article class="target-card"><div class="card-top"><span class="card-icon"><svg viewBox="0 0 24 24"><path d="M4 20V9l8-5 8 5v11M8 20v-7h8v7M3 20h18"/></svg></span>' + badge + '</div>'
      + '<h3>' + esc(t.name) + '</h3><p class="target-description">' + esc(t.blurb || '') + '</p>' + link + '</article>';
  }
  let qrows = '';
  for (const item of q) {
    const pill = item.status === 'green' ? 'pass' : (item.status === 'red' ? 'fail' : 'pend');
    const vlink = item.verdictId ? ' <a href="/v/' + esc(item.verdictId) + '">verdict</a>' : '';
    qrows += '<tr><td><span class="queue-target">' + esc(item.targetId) + '</span>' + vlink + '</td><td><span class="flow-status ' + pill + '">' + esc(item.status) + '</span></td><td>' + esc(item.note || '') + '</td></tr>';
  }
  let body = '<section class="hero-grid">'
    + '<div class="hero-copy"><span class="eyebrow">Adversarial QA court</span><h1>Put every claim<br><em>on trial.</em></h1>'
    + '<p>The agent is the prosecutor. Kane CLI is the judge. A verdict only ships after the real browser earns a green re-run.</p></div>'
    + '<form class="trial-card" method="post" action="/submit"><div class="form-heading"><span class="form-icon"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 6h14M7 6l-3 5h6L7 6Zm10 0-3 5h6l-3-5ZM7 11v5m10-5v5M4 19h16"/></svg></span><div><span>New trial</span><small>Submit a target for review</small></div></div>'
    + '<label for="url">Target URL</label><div class="input-shell"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><input id="url" name="url" type="url" placeholder="https://example.com" required></div>'
    + '<label for="note">Court notes <span>Optional</span></label><textarea id="note" name="note" rows="3" placeholder="What should the court look for?"></textarea>'
    + '<button type="submit"><span>Start trial</span><span class="button-arrow">&rarr;</span></button></form></section>';
  body += '<section id="docket" class="section-block"><div class="section-heading"><div><span class="eyebrow">Case directory</span><h2>The docket</h2></div><span class="record-count">' + ts.length + ' targets</span></div>'
    + '<div class="target-grid">' + (cards || '<p class="muted">No targets yet.</p>') + '</div></section>';
  body += '<section id="queue" class="section-block"><div class="section-heading"><div><span class="eyebrow">Live activity</span><h2>Trial queue</h2></div></div><div class="table-card">';
  body += qrows ? '<table><thead><tr><th>Target</th><th>Status</th><th>Details</th></tr></thead><tbody>' + qrows + '</tbody></table>' : '<div class="empty-state"><span>No cases queued</span><p>Submit a target above to begin a new trial.</p></div>';
  body += '</div></section>';
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
async function validateTargetUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      resolveCourtTargetUrl(value, PORT);
    } else {
      await validateRedirectChain(value);
    }
  } catch (e) {
    return e && e.message ? e.message : "The target URL could not be validated.";
  }
  return null;
}
const SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_IP = 5;
const MAX_ACTIVE_QUEUE_ITEMS = 10;
const submissionsByIp = new Map();

function isSubmissionRateLimited(ip, now = Date.now()) {
  for (const [key, timestamps] of submissionsByIp) {
    const active = timestamps.filter((timestamp) => now - timestamp < SUBMISSION_WINDOW_MS);
    if (active.length) submissionsByIp.set(key, active);
    else submissionsByIp.delete(key);
  }
  const timestamps = submissionsByIp.get(ip) || [];
  if (timestamps.length >= MAX_SUBMISSIONS_PER_IP) return true;
  if (submissionsByIp.size >= 10000 && !submissionsByIp.has(ip)) return true;
  timestamps.push(now);
  submissionsByIp.set(ip, timestamps);
  return false;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'POST' && p === '/submit') {
    if (isSubmissionRateLimited(req.socket.remoteAddress || "unknown")) {
      res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '3600' });
      res.end("Submission limit reached. Try again later.");
      return;
    }
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
    let queueFull = false;
    try {
      withQueueLock(QUEUE, () => {
        const q = readQueue(QUEUE);
        if (!Array.isArray(q)) throw new Error("queue is invalid");
        const existing = q.findIndex((x) => x.targetId === targetUrl && (x.status === 'queued' || x.status === 'running'));
        const activeItems = q.filter((x) => x.status === 'queued' || x.status === 'running').length;
        if (existing < 0 && activeItems >= MAX_ACTIVE_QUEUE_ITEMS) {
          queueFull = true;
          return;
        }
        if (existing >= 0) {
          q[existing].note = note || q[existing].note;
          q[existing].at = new Date().toISOString();
        } else {
          q.push({ targetId: targetUrl, note, status: 'queued', at: new Date().toISOString() });
        }
        writeQueueAtomic(QUEUE, q);
      });
    } catch (e) {
      res.writeHead(503, { 'Content-Type': 'text/plain', 'Retry-After': '30' });
      res.end("The queue is temporarily unavailable.");
      return;
    }
    if (queueFull) {
      res.writeHead(503, { 'Content-Type': 'text/plain', 'Retry-After': '300' });
      res.end("The trial queue is full. Try again later.");
      return;
    }
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
  w.once('exit', () => {
    globalThis.__kaneWorkerStarted = false;
    setTimeout(kickWorker, 1000);
  });
  w.once('error', () => {
    globalThis.__kaneWorkerStarted = false;
  });
  w.unref();
}
ensureData();
if (process.env.QUEUE_WORKER !== '0') {
  // Start the worker slightly after the server so the port is free.
  setTimeout(kickWorker, 500);
}
server.listen(PORT, HOST, () => {
  console.log('Kane Court listening on http://' + HOST + ':' + PORT);
  console.log(process.env.QUEUE_WORKER === '0'
    ? 'queue worker: OFF (read-only court)'
    : 'queue worker: ON (submitted URLs are put on trial automatically)');
});
