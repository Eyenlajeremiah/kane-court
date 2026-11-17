#!/usr/bin/env bash
# Restore the atlas target to its BUGGY state so the red -> green loop can be
# demonstrated (and re-recorded) at any time.
# Usage: bash scripts/reset-demo.sh
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

TARGET="targets/atlas/index.html"
if [ -f ".loop/atlas-buggy-backup.html" ]; then
  cp ".loop/atlas-buggy-backup.html" "$TARGET"
  echo "restored buggy atlas from backup"
  exit 0
fi

cat > "$TARGET" <<'HTMLEOF'
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atlas Capital</title>
<link rel="stylesheet" href="/style.css">
<style>
.hero{padding:64px 20px;max-width:820px;margin:0 auto;text-align:center}
h1{font-size:36px;margin:0 0 12px}
.cta{background:#c8a96a;color:#14161b;border:0;padding:14px 26px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer}
.lede{color:#8b8f9a;font-size:18px}
.wide{min-width:960px}
.panel{display:none;margin-top:22px;border:1px solid #262a33;border-radius:10px;padding:20px;background:#15171d;text-align:left}
.panel.on{display:block}
</style></head><body><div class="wrap">
<div class="hero">
  <h1>Back the founders who build for decades.</h1>
  <p class="lede">Atlas Capital partners with early teams in infrastructure, logistics and industrial software. Coming soon.</p>
  <a class="cta" href="#" id="cta">View portfolio</a>
  <div class="panel" id="panel"><h2 style="margin-top:0">Portfolio</h2><p class="sub">The full portfolio listing is being prepared.</p></div>
  <div class="wide"><table style="width:100%;margin-top:24px"><tr><th>Company</th><th>Sector</th><th>Stage</th></tr><tr><td>undefined</td><td>Logistics</td><td>Seed</td></tr></table></div>
</div>
</div>
<script>
document.getElementById('cta').addEventListener('click',function(e){ e.preventDefault(); });
document.getElementById('f') && document.getElementById('f').addEventListener('submit',function(e){ e.preventDefault(); });
</script>
</body></html>

HTMLEOF

mkdir -p .loop
cp "$TARGET" ".loop/atlas-buggy-backup.html"
echo "atlas reset to buggy state (dead CTA, 'Coming soon.', 'undefined', 960px overflow)"
echo "Now run: bash scripts/loop.sh atlas"
