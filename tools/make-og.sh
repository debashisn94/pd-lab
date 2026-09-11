#!/usr/bin/env bash
# Render a 1200x630 social card into og/<slug>.png using headless Chrome.
# Usage: tools/make-og.sh <slug> "Title" "Subtitle" "#a1" "#a2"
set -euo pipefail

SLUG="${1:?slug required}"
TITLE="${2:?title required}"
SUB="${3:-}"
A1="${4:-#f7be3a}"
A2="${5:-#f7be3a}"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$ROOT/og"

# esc for HTML
esc(){ printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

cat > "$TMP/card.html" <<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{
  background:
    radial-gradient(760px 560px at 16% 6%, ${A1}22, transparent 62%),
    radial-gradient(680px 520px at 92% 104%, ${A2}1c, transparent 62%),
    #0a0a0a;
  color:#f5f5f5; position:relative;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif;
  display:flex; flex-direction:column; justify-content:space-between;
  padding:68px 74px;
}
body::before{
  content:''; position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(247,190,58,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(247,190,58,.06) 1px, transparent 1px);
  background-size:60px 60px;
  -webkit-mask-image:radial-gradient(ellipse at 50% 40%, #000 8%, transparent 74%);
}
.row{position:relative; display:flex; align-items:center; gap:16px}
.row b{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;font-weight:600;letter-spacing:.2em;text-transform:uppercase}
.row s{text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:19px;letter-spacing:.2em;color:#8f8f8f}
h1{position:relative; font-size:82px; line-height:1.02; letter-spacing:-.035em; font-weight:600; max-width:17ch}
p{position:relative; font-size:29px; line-height:1.42; color:#d7d7d7; max-width:30ch; margin-top:22px}
.foot{position:relative; display:flex; align-items:center; justify-content:space-between}
.foot span{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;letter-spacing:.17em;text-transform:uppercase;color:#8f8f8f}
.dots{display:flex;gap:12px;align-items:center}
.dots i{width:15px;height:15px;border-radius:50%}
</style></head><body>
  <div class="row">
    <svg width="46" height="34" viewBox="0 0 30 22" fill="none">
      <circle cx="11" cy="11" r="8.5" stroke="${A1}" stroke-width="2"/>
      <circle cx="19" cy="11" r="8.5" stroke="${A2}" stroke-width="2" opacity=".65"/>
    </svg>
    <b>Products Decoded</b><s>/ Lab</s>
  </div>
  <div>
    <h1>$(esc "$TITLE")</h1>
    $( [ -n "$SUB" ] && echo "<p>$(esc "$SUB")</p>" )
  </div>
  <div class="foot">
    <span>lab.productsdecoded.com</span>
    <div class="dots"><i style="background:${A1}"></i><i style="background:${A2}"></i><i style="background:#8f8f8f;opacity:.4"></i></div>
  </div>
</body></html>
HTML

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="$ROOT/og/$SLUG.png" "file://$TMP/card.html" >/dev/null 2>&1

echo "og/$SLUG.png  ($(du -h "$ROOT/og/$SLUG.png" | cut -f1))"
