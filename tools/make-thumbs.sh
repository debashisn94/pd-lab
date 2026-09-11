#!/usr/bin/env bash
# Capture a real 4:3 thumbnail of each experiment's own canvas into og/thumb-<slug>.png.
#
# Each toy is copied to a temp page with the chrome hidden and its canvas cropped
# to a 4:3 window via a negative offset, so the screenshot IS the crop — no image
# tooling needed. A seed snippet is injected to put the toy in a worthwhile state,
# because a freshly loaded experiment has nothing on screen yet.
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome not found"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8799}"
cd "$ROOT"

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true; rm -f "$ROOT/_thumb_tmp.html"' EXIT
sleep 1.5

shoot () {   # slug  cropW  cropH  offsetY  anchor  seed
  local slug="$1" cw="$2" ch="$3" oy="$4" anchor="$5" seed="$6"  # anchor now unused
  SLUG="$slug" CW="$cw" CH="$ch" OY="$oy" ANCHOR="$anchor" SEED="$seed" python3 - <<'PY'
import os, pathlib
slug, cw, ch, oy = os.environ['SLUG'], os.environ['CW'], os.environ['CH'], os.environ['OY']
anchor, seed = os.environ['ANCHOR'], os.environ['SEED']
s = pathlib.Path('t/%s/index.html' % slug).read_text()
# Seed at the very END of the module. Injecting before an init call meant the
# toy's own setup ran afterwards and wiped the seed -- the maze came out blank.
tail = '})();\n</script>'
assert tail in s, 'module tail missing in ' + slug
s = s.replace(tail, seed + '\n' + tail, 1)
css = """
<style>
  html,body{width:%(cw)spx!important;height:%(ch)spx!important;min-height:0!important;
    margin:0!important;padding:0!important;overflow:hidden!important;display:block!important}
  body::before,body::after{display:none!important}
  .topbar,.ticker,.console,.anno,.err,.halo{display:none!important}
  .stage{display:block!important;padding:0!important;margin:0!important;max-width:none!important;
    width:%(cw)spx!important;height:%(ch)spx!important}
  .chamber-col,.board-col,.rig-col,.grid-col,.arena-col{display:block!important;padding:0!important;margin:0!important}
  .chamber,.board,.rig,.gridbox,.arena{position:absolute!important;inset:auto!important;
    left:0!important;top:%(oy)spx!important;width:auto!important;height:auto!important;
    aspect-ratio:auto!important;margin:0!important}
  #cv{position:static!important;display:block!important;width:auto!important;height:auto!important;
    border:none!important;border-radius:0!important}
</style>
""" % {'cw': cw, 'ch': ch, 'oy': oy}
s = s.replace('</head>', css + '</head>', 1)
pathlib.Path('_thumb_tmp.html').write_text(s)
PY
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$cw","$ch" --virtual-time-budget=1200 \
    --screenshot="$ROOT/og/thumb-$slug.png" "http://localhost:$PORT/_thumb_tmp.html" >/dev/null 2>&1
  rm -f "$ROOT/_thumb_tmp.html"
  echo "  og/thumb-$slug.png  ($(du -h "$ROOT/og/thumb-$slug.png" | cut -f1))"
}

echo "rendering thumbnails:"

# canvas 600x600 -> crop 600x450, centred band through the filled chamber
# Simulating from the real start is hopeless here: two 7px disks in a 580px
# circle collide about once every 2,500 frames, so 87 simulated seconds still
# only reaches four disks. Populate the chamber directly instead, then settle it.
shoot collision-chamber 600 450 -75 "  setMode('idle');" \
"  setMode('running');
  for (let i = 0; i < 820; i++) { const a2 = Math.random() * TAU, r2 = Math.sqrt(Math.random()) * (R - BALL_R - 3);
    spawn(CX + Math.cos(a2) * r2, CY + Math.sin(a2) * r2); }
  for (let i = 0; i < 70; i++) { spawnedThisFrame = 0; for (let s2 = 0; s2 < SUBSTEPS; s2++) step(1 / SUBSTEPS); }
  for (const b of balls) b.born = performance.now() - 9000;
  renderNow();"

# canvas 640x760 -> crop 640x480 over the lower pegs and the full set of bins
shoot galton-board 640 480 -272 "  applyRate();" \
"  for (let n = 0; n < 5200; n++) { let c = 0; for (let r = 0; r < ROWS; r++) c += Math.random() < 0.5 ? 0 : 1;
    bins[c]++; dropped++; sumBin += c; sumBinSq += c * c; }
  for (let n = 0; n < 70; n++) { spawn(); const b = balls[balls.length - 1];
    b.y = 150 + Math.random() * 380; b.row = Math.floor((b.y - 96) / 34);
    b.col = Math.min(b.row, Math.floor(Math.random() * (b.row + 1)));
    b.x = lattice(b.row, b.col) + (Math.random() - 0.5) * 18; b.vy = Math.random() * 3; }"

# canvas 720x620 -> crop 720x540, centred on the wave
shoot pendulum-wave 720 540 -40 "  applySpeed();" \
"  t = 1.62;"

# canvas 660x660 -> crop 660x495, solved with the gold route on show
shoot maze 660 495 -84 "  reset(false);" \
"  init(); setPhase('dig');
  while (phase === 'dig') digStep();
  while (phase === 'flood') floodStep();
  traced = path.length; setPhase('done');"

# canvas 600x600 -> crop 600x450, mid-chain with blasts open
shoot chain-reaction 600 450 -78 "  requestAnimationFrame(frame);" \
"  level = 8; buildLevel(); setState('running');
  detonate(300, 300, 300);
  for (let i = 0; i < 190; i++) step();"

echo "done."

# PNG screenshots of dark gradient scenes run to hundreds of KB each; the cards
# render these at ~370px, so JPEG at q86 is indistinguishable and far lighter.
echo "converting to jpeg:"
for f in "$ROOT"/og/thumb-*.png; do
  sips -s format jpeg -s formatOptions 86 "$f" --out "${f%.png}.jpg" >/dev/null 2>&1
  rm -f "$f"
  echo "  $(basename "${f%.png}.jpg")  ($(du -h "${f%.png}.jpg" | cut -f1))"
done
