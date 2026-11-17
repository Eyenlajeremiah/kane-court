import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
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
function layout(title, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + ' &mdash; Kane Court</title>'
    + '<link rel="stylesheet" href="/style.css"></head><body><div class="wrap">'
    + body + '</div></body></html>';
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
  for (const t of ts) {
    const v = vs.find((x) => x.targetId === t.id);
    const badge = v ? (v.blocked ? '<span class="pill pend">blocked</span>' : (v.pass ? '<span class="pill pass">green</span>' : '<span class="pill fail">red</span>')) : '<span class="pill pend">not yet judged</span>';
    const link = v ? '<a href="/v/' + esc(t.id) + '">Read the verdict</a>' : '<span class="mono">awaiting Kane</span>';
    cards += '<div class="card"><h2 style="margin:0 0 6px;font-size:17px">' + esc(t.name) + '</h2>'
      + '<div>' + badge + '</div><p class="sub" style="margin:8px 0">' + esc(t.blurb || '') + '</p>' + link + '</div>';
  }
  let qrows = '';
  for (const item of q) {
    qrows += '<tr><td>' + esc(item.targetId) + '</td><td><span class="pill ' + (item.status === 'green' ? 'pass' : (item.status === 'red' ? 'fail' : 'pend')) + '">' + esc(item.status) + '</span></td><td class="mono">' + esc(item.note || '') + '</td></tr>';
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
    req.on('data', (c) => { b += c; });
    req.on('end', () => resolve(b));
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'POST' && p === '/submit') {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    const targetUrl = (params.get('url') || '').trim();
    const note = (params.get('note') || '').trim();
    const q = readJson(QUEUE, []);
    q.push({ targetId: targetUrl, note, status: 'queued', at: new Date().toISOString() });
    writeJson(QUEUE, q);
    res.writeHead(302, { Location: '/' });
    res.end();
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
ensureData();
server.listen(PORT, () => {
  console.log('Kane Court listening on http://localhost:' + PORT);
});
