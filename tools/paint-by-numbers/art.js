/* Picture library — paint by numbers.

   Every picture ships a numbered palette, and every fillable shape carries the
   number of the colour it is meant to be (`data-c`, 1-based into that palette).
   class="r" = a fillable shape;  class="k" = ink only, never filled.
   Shapes are painted in order, so later ones sit on top. */

const TAU = Math.PI * 2;
const n = v => Math.round(v * 10) / 10;
const P = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
let uid = 0;   // every picture instance gets its own element ids

/* a colour number, or a list of them to cycle through a ring */
const pick = (c, i) => Array.isArray(c) ? c[i % c.length] : c;

/* an annular sector: the workhorse of every radial pattern */
function sector(cx, cy, r1, r2, a0, a1) {
  const [x1, y1] = P(cx, cy, r1, a0), [x2, y2] = P(cx, cy, r1, a1);
  const [x3, y3] = P(cx, cy, r2, a1), [x4, y4] = P(cx, cy, r2, a0);
  const big = (a1 - a0) > Math.PI ? 1 : 0;
  return `M${n(x1)} ${n(y1)}A${n(r1)} ${n(r1)} 0 ${big} 1 ${n(x2)} ${n(y2)}` +
         `L${n(x3)} ${n(y3)}A${n(r2)} ${n(r2)} 0 ${big} 0 ${n(x4)} ${n(y4)}Z`;
}

/* a teardrop pointing along `a`, hinged at (cx,cy). r0 lifts it off the hub. */
function petal(cx, cy, a, r0, r1, w) {
  const ux = Math.cos(a), uy = Math.sin(a);      // along
  const vx = -uy, vy = ux;                       // across
  const at = (d, s) => [n(cx + ux * d + vx * s), n(cy + uy * d + vy * s)];
  const [bx, by] = at(r0, 0), [tx, ty] = at(r1, 0);
  const L = r1 - r0;
  const [c1x, c1y] = at(r0 + L * 0.18, w), [c2x, c2y] = at(r0 + L * 0.72, w * 0.82);
  const [c3x, c3y] = at(r0 + L * 0.72, -w * 0.82), [c4x, c4y] = at(r0 + L * 0.18, -w);
  return `M${bx} ${by}C${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}` +
         `C${c3x} ${c3y} ${c4x} ${c4y} ${bx} ${by}Z`;
}

const reg  = (d, c) => `<path class="r" data-c="${c}" d="${d}"/>`;
const hole = (d, c) => `<path class="r" fill-rule="evenodd" data-c="${c}" d="${d}"/>`;
const ink  = d => `<path class="k" d="${d}"/>`;
const circ  = (cx, cy, r, c) => `<circle class="r" data-c="${c}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`;
const kcirc = (cx, cy, r) => `<circle class="k" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`;
const ell = (cx, cy, rx, ry, c, rot) =>
  `<ellipse class="r" data-c="${c}" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"${
    rot ? ` transform="rotate(${n(rot)} ${n(cx)} ${n(cy)})"` : ''}/>`;

function petalRing(out, cx, cy, count, r0, r1, w, c, phase = 0) {
  for (let i = 0; i < count; i++)
    out.push(reg(petal(cx, cy, phase + i / count * TAU, r0, r1, w), pick(c, i)));
}
function sectorRing(out, cx, cy, count, r1, r2, c, phase = 0, gap = 0) {
  const step = TAU / count;
  for (let i = 0; i < count; i++)
    out.push(reg(sector(cx, cy, r1, r2, phase + i * step + gap, phase + (i + 1) * step - gap), pick(c, i)));
}

/* a smooth closed curve through a handful of points (Catmull-Rom -> bezier).
   Organic shapes — wings, tails, shells — are far easier to steer this way
   than by hand-writing control points. */
function blob(pts) {
  const m = pts.length, d = ['M' + n(pts[0][0]) + ' ' + n(pts[0][1])];
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
    d.push('C' + n(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + n(p1[1] + (p2[1] - p0[1]) / 6) +
           ' ' + n(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + n(p2[1] - (p3[1] - p1[1]) / 6) +
           ' ' + n(p2[0]) + ' ' + n(p2[1]));
  }
  return d.join('') + 'Z';
}
/* the same outline pulled in towards a point — gives nested bands */
const shrink = (pts, cx, cy, k) => pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);

/* a partial ring of sectors — a scallop shell, a fan */
function fan(out, cx, cy, count, r1, r2, a0, a1, c) {
  const step = (a1 - a0) / count;
  for (let i = 0; i < count; i++)
    out.push(reg(sector(cx, cy, r1, r2, a0 + i * step, a0 + (i + 1) * step), pick(c, i)));
}

/* a cloud: three lobes on a flat base */
const cloudPath = (x, y, s) =>
  `M${n(x - 96 * s)} ${n(y)}a${n(40 * s)} ${n(40 * s)} 0 0 1 ${n(56 * s)} ${n(-34 * s)}` +
  `a${n(46 * s)} ${n(46 * s)} 0 0 1 ${n(78 * s)} ${n(6 * s)}` +
  `a${n(34 * s)} ${n(34 * s)} 0 0 1 ${n(52 * s)} ${n(28 * s)}Z`;

/* an eight-pointed star */
function starPath(x, y, s) {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU - Math.PI / 2, r = i % 2 ? s * 0.46 : s;
    const [px, py] = P(x, y, r, a);
    d += (i ? 'L' : 'M') + n(px) + ' ' + n(py);
  }
  return d + 'Z';
}

/* ─────────────────────────────  1. MANDALA  ───────────────────────────── */
const MANDALA_PAL = [
  { hex: '#f7d4d4', name: 'Blush' },
  { hex: '#f8c99b', name: 'Apricot' },
  { hex: '#fbe8b8', name: 'Butter' },
  { hex: '#a8d5ba', name: 'Mint' },
  { hex: '#a9d6e5', name: 'Sky' },
  { hex: '#d6c7ec', name: 'Lilac' },
  { hex: '#f6b6a0', name: 'Peach' },
  { hex: '#bfe3df', name: 'Seafoam' },
  { hex: '#bcd0ee', name: 'Powder' },
  { hex: '#f3c9dd', name: 'Rose' },
  { hex: '#c9dfae', name: 'Sage' },
  { hex: '#c3c1e8', name: 'Periwinkle' },
];
function mandala() {
  const o = [], C = 400;
  sectorRing(o, C, C, 18, 322, 370, [1, 2, 3]);
  petalRing(o, C, C, 12, 232, 330, 44, [4, 5]);
  sectorRing(o, C, C, 24, 206, 232, [6, 7]);
  petalRing(o, C, C, 16, 132, 208, 30, [8, 9], TAU / 32);
  sectorRing(o, C, C, 16, 112, 132, 10);
  petalRing(o, C, C, 8, 44, 112, 30, [11, 12]);
  o.push(circ(C, C, 46, 3));
  petalRing(o, C, C, 6, 8, 42, 13, 5, TAU / 12);
  o.push(circ(C, C, 12, 1));
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + TAU / 24;
    const [x1, y1] = P(C, C, 374, a), [x2, y2] = P(C, C, 390, a);
    o.push(ink(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`));
    o.push(kcirc(...P(C, C, 398, a), 7));
  }
  return o;
}

/* ─────────────────────────────  2. MOONRISE  ──────────────────────────── */
const MOONRISE_PAL = [
  { hex: '#9fb1d4', name: 'Night sky' },
  { hex: '#fbe8b8', name: 'Moonlight' },
  { hex: '#ecd9bd', name: 'Crater' },
  { hex: '#f8efc4', name: 'Starlight' },
  { hex: '#d9d2ee', name: 'Cloud' },
  { hex: '#c3c1e8', name: 'Far hills' },
  { hex: '#aecfc4', name: 'Near hills' },
  { hex: '#86b09e', name: 'Pine tree' },
  { hex: '#cfe0e8', name: 'Bank' },
  { hex: '#a9d6e5', name: 'Water' },
  { hex: '#c7c2e6', name: 'Low cloud' },
  { hex: '#fdf5cf', name: 'Bright star' },
  { hex: '#f6dfa6', name: 'Reflection' },
];
function moonrise() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  o.push(circ(556, 206, 110, 2));
  o.push(circ(516, 170, 23, 3), circ(590, 228, 16, 3), circ(538, 254, 11, 3));
  [[122, 128, 30], [258, 226, 23], [86, 296, 21], [700, 96, 25], [322, 92, 21],
   [190, 52, 19], [694, 330, 20]].forEach((a, i) => o.push(reg(starPath(...a), i % 2 ? 12 : 4)));
  const cloud = (x, y, s) =>
    `M${n(x - 96 * s)} ${n(y)}a${n(40 * s)} ${n(40 * s)} 0 0 1 ${n(56 * s)} ${n(-34 * s)}` +
    `a${n(46 * s)} ${n(46 * s)} 0 0 1 ${n(78 * s)} ${n(6 * s)}` +
    `a${n(34 * s)} ${n(34 * s)} 0 0 1 ${n(52 * s)} ${n(28 * s)}Z`;
  o.push(reg(cloud(268, 296, 1), 5), reg(cloud(656, 400, .68), 11));
  o.push(ink('M108 396q18-16 36 0q18-16 36 0'), ink('M186 356q14-13 28 0q14-13 28 0'));

  o.push(reg('M0 452L118 366L214 434L318 330L436 452L524 388L646 480L724 424L800 486V800H0Z', 6));
  const pine = (x, y, h, w) =>
    `M${n(x)} ${n(y - h)}L${n(x + w)} ${n(y - h * .42)}L${n(x + w * .58)} ${n(y - h * .42)}` +
    `L${n(x + w * 1.16)} ${n(y)}L${n(x - w * 1.16)} ${n(y)}L${n(x - w * .58)} ${n(y - h * .42)}` +
    `L${n(x - w)} ${n(y - h * .42)}Z`;
  o.push(reg('M0 546L104 470L222 540L318 478L426 558L528 498L640 566L736 520L800 560V800H0Z', 7));
  [[128, 540, 96, 31], [196, 556, 72, 24], [566, 566, 88, 29], [636, 578, 64, 23],
   [372, 540, 80, 27], [300, 520, 62, 21]].forEach(a => o.push(reg(pine(...a), 8)));
  o.push(reg('M0 640L150 612L320 646L486 608L652 642L800 610V800H0Z', 9));
  o.push(reg('M0 682Q200 666 400 684T800 672V800H0Z', 10));
  [[556, 716, 104], [556, 748, 80], [556, 776, 56]].forEach(([x, y, w]) =>
    o.push(reg(`M${n(x - w)} ${n(y)}a${n(w)} 10 0 0 1 ${n(w * 2)} 0a${n(w)} 10 0 0 1 ${n(-w * 2)} 0Z`, 13)));
  o.push(ink('M96 726q46-12 92 0'), ink('M148 768q54-12 108 0'), ink('M700 744q34-10 68 0'));
  return o;
}

/* ─────────────────────────────  3. BOUQUET  ───────────────────────────── */
const BOUQUET_PAL = [
  { hex: '#f7e6ea', name: 'Wall' },
  { hex: '#a8d5ba', name: 'Leaf' },
  { hex: '#f9c0c0', name: 'Big daisy' },
  { hex: '#fbe8b8', name: 'Flower heart' },
  { hex: '#d6c7ec', name: 'Lilac daisy' },
  { hex: '#f8c99b', name: 'Small daisy' },
  { hex: '#e8899b', name: 'Tulip' },
  { hex: '#f3c9dd', name: 'Tulip front' },
  { hex: '#d9a882', name: 'Flowerpot' },
  { hex: '#c48f6a', name: 'Pot rim' },
  { hex: '#7fae94', name: 'Dark leaf' },
  { hex: '#f6b6a0', name: 'Deep heart' },
  { hex: '#bfe3df', name: 'Seafoam daisy' },
  { hex: '#c3c1e8', name: 'Second tulip' },
];
function bouquet() {
  const o = [];
  o.push(reg('M400 62a250 250 0 0 1 250 250V704H150V312A250 250 0 0 1 400 62Z', 1));

  [[400, 242], [286, 306], [512, 302], [214, 392], [586, 384], [332, 226], [470, 222]]
    .forEach(([x, y]) => o.push(ink(`M400 604Q${n((x + 400) / 2)} ${n((y + 604) / 2 + 40)} ${n(x)} ${n(y)}`)));

  [[318, 476, -0.55], [486, 468, -2.6], [266, 400, -0.35], [542, 406, -2.8],
   [352, 378, -0.78], [452, 372, -2.37]].forEach(([x, y, a], i) => {
    o.push(reg(petal(x, y, a, 0, 108, 30), i % 2 ? 11 : 2));
    const [tx, ty] = P(x, y, 98, a);
    o.push(ink(`M${n(x)} ${n(y)}L${n(tx)} ${n(ty)}`));
  });

  const daisy = (x, y, count, r0, r1, w, hub, c, heart) => {
    petalRing(o, x, y, count, r0, r1, w, c, 0.2);
    o.push(circ(x, y, hub, heart));
    o.push(kcirc(x, y, hub * 0.5));
  };
  daisy(400, 242, 10, 22, 94, 27, 27, 3, 4);
  daisy(286, 306, 8, 18, 76, 23, 22, 5, 12);
  daisy(512, 302, 8, 18, 76, 23, 22, 13, 4);
  daisy(214, 392, 6, 14, 58, 19, 17, 6, 12);
  daisy(586, 384, 6, 14, 58, 19, 17, 6, 4);

  /* a tulip is three lobes: two side petals, one front petal on top */
  const tulip = (x, y, s, side) => {
    o.push(reg(`M${n(x)} ${n(y)}C${n(x - 44 * s)} ${n(y - 10 * s)} ${n(x - 46 * s)} ${n(y - 62 * s)} ` +
      `${n(x - 30 * s)} ${n(y - 96 * s)}C${n(x - 22 * s)} ${n(y - 64 * s)} ${n(x - 8 * s)} ${n(y - 40 * s)} ${n(x)} ${n(y)}Z`, side));
    o.push(reg(`M${n(x)} ${n(y)}C${n(x + 44 * s)} ${n(y - 10 * s)} ${n(x + 46 * s)} ${n(y - 62 * s)} ` +
      `${n(x + 30 * s)} ${n(y - 96 * s)}C${n(x + 22 * s)} ${n(y - 64 * s)} ${n(x + 8 * s)} ${n(y - 40 * s)} ${n(x)} ${n(y)}Z`, side));
    o.push(reg(`M${n(x)} ${n(y - 2 * s)}C${n(x - 30 * s)} ${n(y - 24 * s)} ${n(x - 28 * s)} ${n(y - 80 * s)} ` +
      `${n(x)} ${n(y - 104 * s)}C${n(x + 28 * s)} ${n(y - 80 * s)} ${n(x + 30 * s)} ${n(y - 24 * s)} ${n(x)} ${n(y - 2 * s)}Z`, 8));
  };
  tulip(330, 224, 1, 7); tulip(470, 220, 1, 14);

  o.push(reg('M312 596H488L470 742a26 26 0 0 1-26 22H356a26 26 0 0 1-26-22Z', 9));
  o.push(reg('M298 566H502V602H298Z', 10));
  o.push(ink('M352 654Q400 672 448 654'));
  return o;
}

/* ─────────────────────────────  4. WINDOW CAT  ────────────────────────── */
const WINDOW_PAL = [
  { hex: '#bcd0ee', name: 'Night glass' },
  { hex: '#fbe8b8', name: 'Moonlight' },
  { hex: '#ecd9bd', name: 'Crater' },
  { hex: '#f8efc4', name: 'Starlight' },
  { hex: '#aecfc4', name: 'Far hills' },
  { hex: '#86b09e', name: 'Near hills' },
  { hex: '#e0c9ae', name: 'Woodwork' },
  { hex: '#f3c9dd', name: 'Curtain' },
  { hex: '#e79ab0', name: 'Curtain rail' },
  { hex: '#c9a98c', name: 'Cat' },
  { hex: '#f7d4d4', name: 'Inner ear' },
  { hex: '#a8d5ba', name: 'Plant' },
  { hex: '#d18f6a', name: 'Flowerpot' },
  { hex: '#b08f74', name: 'Tail' },
  { hex: '#cdb394', name: 'Windowsill' },
];
function windowCat() {
  const o = [];
  const cid = 'win' + (++uid);
  o.push(`<defs><clipPath id="${cid}"><path d="M152 432a248 248 0 0 1 496 0V668H152Z"/></clipPath></defs>`);
  o.push(`<g clip-path="url(#${cid})">`);
  o.push(reg('M152 432a248 248 0 0 1 496 0V668H152Z', 1));          // glass
  o.push(circ(520, 306, 64, 2));
  o.push(circ(500, 284, 13, 3), circ(542, 322, 9, 3));
  [[248, 264, 21], [334, 352, 17], [212, 384, 16], [606, 230, 18]]
    .forEach(a => o.push(reg(starPath(...a), 4)));
  o.push(reg('M140 546L228 480L320 548L410 484L500 554L590 496L664 552V680H140Z', 5));
  o.push(reg('M140 610L236 564L344 618L452 570L560 622L664 586V680H140Z', 6));
  o.push(reg('M388 184H412V672H388Z', 7));                           // mullion
  o.push(reg('M148 458H652V482H148Z', 7));                           // transom
  o.push(`</g>`);
  o.push(hole('M120 430a280 280 0 0 1 560 0V702H120Z' + 'M152 432a248 248 0 0 1 496 0V658H152Z', 7));

  o.push(reg('M88 52H712V104H88Z', 9));                              // pelmet board
  for (let i = 0; i < 13; i++) o.push(reg(`M${100 + i * 47} 104a23.5 23.5 0 0 0 47 0Z`, 8));

  o.push(reg('M88 698H712V744H88Z', 15));                            // sill
  o.push(reg('M126 744H674V774H126Z', 15));                          // apron

  // the cat, from behind, sitting on the sill
  o.push(reg('M300 696C288 620 314 568 336 542C314 518 314 478 344 460L358 424L384 456' +
             'L388 456L414 424L428 460C458 478 458 518 436 542C458 568 484 620 472 696Z', 10));
  o.push(reg('M362 440L380 460L370 464Z', 11), reg('M410 440L392 460L402 464Z', 11));
  o.push(reg('M470 692C556 700 606 664 600 610C595 570 556 560 538 588' +
             'C560 578 576 592 574 614C570 656 524 668 466 658Z', 14));
  o.push(ink('M372 478V532'), ink('M334 566q38 22 76 0'));

  o.push(reg(petal(650, 648, -1.75, 0, 78, 23), 12), reg(petal(626, 652, -2.5, 0, 62, 19), 12),
         reg(petal(672, 654, -1.0, 0, 58, 18), 12));
  o.push(reg('M614 646H700L690 712a18 18 0 0 1-18 14H632a18 18 0 0 1-18-14Z', 13));
  o.push(reg('M606 626H708V650H606Z', 13));
  return o;
}

/* ─────────────────────────────  5. KOI POND  ──────────────────────────── */
const KOI_PAL = [
  { hex: '#bfe3df', name: 'Pond' },
  { hex: '#86b09e', name: 'Lily pad' },
  { hex: '#f7d4d4', name: 'Lotus' },
  { hex: '#f9c0c0', name: 'Lotus inner' },
  { hex: '#fbe8b8', name: 'Lotus heart' },
  { hex: '#f8ecdf', name: 'Koi body' },
  { hex: '#f0916a', name: 'Koi markings' },
  { hex: '#f6d3c4', name: 'Fins and tail' },
  { hex: '#d9bfa6', name: 'Pebble' },
  { hex: '#a8d5ba', name: 'Pale pad' },
  { hex: '#e79ab0', name: 'Deep lotus' },
  { hex: '#e2b04e', name: 'Gold koi' },
];
/* The fish is drawn once facing +x around its own origin, then placed with a
   transform. Composing it out of petals made it read as a peapod. */
function koiAt(x, y, deg, s, mark) {
  const part = [
    reg('M-76 -16C-108 -30-136 -50-152 -64C-140 -34-112 -12-104 0' +
        'C-112 12-140 34-152 64C-136 50-108 30-76 16Z', 8),                                // tail
    reg('M-20 -50C0 -82 44 -90 64 -74C36 -64 4 -56-20 -50Z', 8),                           // dorsal
    reg('M-28 44C-40 68-58 78-72 76C-64 58-54 48-40 42Z', 8),                              // anal
    reg('M110 0C106 -26 70 -52 20 -52C-30 -52-66 -32-80 -12L-80 12C-66 32-30 52 20 52' +
        'C70 52 106 26 110 0Z', 6),                                                        // body
    reg('M42 24C40 54 22 78 0 80C8 56 14 38 26 24Z', 8),                                   // pectoral
    reg('M12 -40C42 -44 58 -24 48 -4C38 14 6 16-4 0C-12 -16-6 -36 12 -40Z', mark),         // markings
    reg('M-64 -18C-46 -26-30 -14-34 4C-38 20-60 24-68 12C-74 2-74 -12-64 -18Z', mark),
    reg('M70 8C86 4 96 14 90 26C82 36 66 32 64 20Z', mark),
    kcirc(76, -16, 7.5),
    ink('M110 2q-9 11-21 13'),
  ].join('');
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)}) scale(${s})">${part}</g>`;
}
function koiPond() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  [[232, 528, 36], [232, 528, 60], [576, 172, 32], [576, 172, 54]]
    .forEach(([x, y, r]) => o.push(kcirc(x, y, r)));

  const pad = (x, y, r, rot, c) => {
    const a0 = rot + 0.34, a1 = rot - 0.34 + TAU;
    const [x0, y0] = P(x, y, r, a0), [x1, y1] = P(x, y, r, a1);
    o.push(reg(`M${n(x)} ${n(y)}L${n(x0)} ${n(y0)}A${n(r)} ${n(r)} 0 1 1 ${n(x1)} ${n(y1)}Z`, c));
    for (let i = 1; i < 7; i++) {
      const a = rot + 0.34 + i * (TAU - 0.68) / 7;
      const [ex, ey] = P(x, y, r * 0.84, a);
      o.push(ink(`M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}`));
    }
  };
  const pads = [[108, 676, 84, -0.9], [694, 152, 72, 2.3], [286, 92, 58, 1.4],
                [742, 498, 56, 3.3], [470, 754, 52, -1.9]];
  pads.forEach((p, i) => pad(p[0], p[1], p[2], p[3], i % 2 ? 10 : 2));

  const lotus = (x, y, s, outer) => {
    petalRing(o, x, y, 8, 16 * s, 74 * s, 22 * s, outer, 0.3);
    petalRing(o, x, y, 6, 8 * s, 44 * s, 15 * s, 4, 0);
    o.push(circ(x, y, 14 * s, 5));
  };
  lotus(112, 286, 0.94, 3); lotus(692, 638, 0.78, 11);

  o.push(koiAt(360, 330, 22, 1.18, 7));
  o.push(koiAt(452, 590, 196, 1.0, 12));
  o.push(koiAt(604, 356, 118, 0.7, 7));

  [[80, 120, 26, 18], [130, 88, 20, 14], [726, 756, 24, 17], [676, 782, 18, 13]]
    .forEach(([x, y, rx, ry]) => o.push(ell(x, y, rx, ry, 9, 20)));
  return o;
}

/* ─────────────────────────────  6. TEATIME  ───────────────────────────── */
const TEA_PAL = [
  { hex: '#f6e7ea', name: 'Wall' },
  { hex: '#bcd0ee', name: 'Wall plate' },
  { hex: '#a9d6e5', name: 'Plate edge' },
  { hex: '#d9bfa6', name: 'Table' },
  { hex: '#c48f6a', name: 'Table edge' },
  { hex: '#a8d5ba', name: 'Teapot' },
  { hex: '#86b09e', name: 'Teapot trim' },
  { hex: '#f9c0c0', name: 'Painted flower' },
  { hex: '#f3c9dd', name: 'Teacup' },
  { hex: '#e79ab0', name: 'Cup trim' },
  { hex: '#efe3d4', name: 'China' },
  { hex: '#f8c99b', name: 'Biscuit' },
  { hex: '#e0a86f', name: 'Baked edge' },
  { hex: '#c9dfae', name: 'Plate ring' },
];
function teatime() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  petalRing(o, 400, 150, 20, 116, 144, 18, [3, 14]);
  o.push(circ(400, 150, 118, 2));
  o.push(kcirc(400, 150, 94));
  [[122, 306, 9], [682, 292, 9], [88, 168, 7], [716, 152, 7]].forEach(([x, y, r]) =>
    o.push(kcirc(x, y, r)));

  o.push(reg('M0 560H800V800H0Z', 4));
  o.push(reg('M0 560H800V596H0Z', 5));

  // teapot
  o.push(hole('M388 358a64 64 0 0 1 0 128a64 64 0 0 1 0-128Z' +
              'M390 384a38 38 0 0 1 0 76a38 38 0 0 1 0-76Z', 7));            // handle
  o.push(reg('M166 474C104 476 56 442 42 384L84 366C100 412 132 436 176 440Z', 7));  // spout
  o.push(ell(270, 432, 130, 106, 6));                                        // body
  o.push(reg('M186 350q84-62 168 0q-84-32-168 0Z', 7));                      // lid
  o.push(reg('M260 316h20v26h-20Z', 7));
  o.push(circ(270, 310, 19, 7));
  petalRing(o, 270, 432, 8, 22, 78, 22, 8, 0.3);
  o.push(circ(270, 432, 24, 8));
  o.push(ell(270, 542, 96, 19, 11));

  // cup and saucer
  o.push(hole('M702 452a46 46 0 0 1 0 86a46 46 0 0 1 0-86Z' +
              'M706 473a25 25 0 0 1 0 44a25 25 0 0 1 0-44Z', 10));           // handle
  o.push(ell(598, 556, 126, 25, 11));                                        // saucer
  o.push(reg('M512 456H684C676 522 650 558 598 558C546 558 520 522 512 456Z', 9));
  o.push(ell(598, 452, 94, 21, 10));                                         // rim
  o.push(ink('M578 396q-18-24 0-48q18-24 0-48'), ink('M622 406q-16-22 0-44'));

  // a plate of biscuits in front
  o.push(ell(400, 692, 154, 33, 11));
  o.push(circ(332, 676, 42, 12), circ(404, 664, 42, 13), circ(474, 678, 42, 12));
  [[332, 676], [404, 664], [474, 678]].forEach(([x, y]) =>
    [[-15, -11], [13, -13], [-4, 13], [17, 11]].forEach(([dx, dy]) => o.push(kcirc(x + dx, y + dy, 4.5))));
  return o;
}


/* ─────────────────────────────  7. BUTTERFLY  ─────────────────────────── */
const BUTTERFLY_PAL = [
  { hex: '#f6eef6', name: 'Background' },
  { hex: '#c3c1e8', name: 'Wing edge' },
  { hex: '#a9d6e5', name: 'Wing middle' },
  { hex: '#bfe3df', name: 'Wing inner' },
  { hex: '#fbe8b8', name: 'Wing spot' },
  { hex: '#e79ab0', name: 'Lower edge' },
  { hex: '#f3c9dd', name: 'Lower middle' },
  { hex: '#f7d4d4', name: 'Lower inner' },
  { hex: '#f8c99b', name: 'Lower spot' },
  { hex: '#9a8aa6', name: 'Body' },
  { hex: '#7a6b86', name: 'Head' },
  { hex: '#a8d5ba', name: 'Corner flower' },
  { hex: '#f6efc0', name: 'Flower heart' },
];
function butterfly() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  const up = [[412, 342], [468, 258], [556, 200], [652, 192], [712, 238], [702, 308], [642, 378], [520, 408], [430, 398]];
  const lo = [[412, 412], [482, 428], [568, 472], [614, 542], [588, 620], [508, 652], [440, 612], [408, 522]];
  const wing = [
    reg(blob(up), 2), reg(blob(shrink(up, 566, 300, 0.74)), 3), reg(blob(shrink(up, 566, 300, 0.46)), 4),
    circ(648, 262, 25, 5),
    reg(blob(lo), 6), reg(blob(shrink(lo, 505, 533, 0.72)), 7), reg(blob(shrink(lo, 505, 533, 0.44)), 8),
    circ(548, 556, 21, 9),
  ].join('');
  o.push(`<g>${wing}</g>`);
  o.push(`<g transform="translate(800 0) scale(-1 1)">${wing}</g>`);
  o.push(ell(400, 470, 24, 112, 10));
  o.push(ell(400, 344, 28, 62, 10));
  o.push(circ(400, 276, 31, 11));
  o.push(ink('M386 252C370 216 344 196 322 192'), ink('M414 252C430 216 456 196 478 192'));
  o.push(kcirc(322, 188, 9), kcirc(478, 188, 9));
  o.push(ink('M380 452h40'), ink('M380 496h40'), ink('M380 538h40'));
  [[112, 148, 1], [688, 684, .92], [128, 690, .8], [686, 132, .74]].forEach(([x, y, s]) => {
    petalRing(o, x, y, 6, 10 * s, 48 * s, 16 * s, 12, 0.3);
    o.push(circ(x, y, 14 * s, 13));
  });
  return o;
}

/* ─────────────────────────────  8. BALLOONS  ──────────────────────────── */
const BALLOON_PAL = [
  { hex: '#bcd0ee', name: 'Sky' },
  { hex: '#eef3fa', name: 'Cloud' },
  { hex: '#fbe8b8', name: 'Sun' },
  { hex: '#f2a3a3', name: 'Big balloon 1' },
  { hex: '#f8e0a8', name: 'Big balloon 2' },
  { hex: '#a9d6e5', name: 'Big balloon 3' },
  { hex: '#d6c7ec', name: 'Big balloon 4' },
  { hex: '#c48f6a', name: 'Basket' },
  { hex: '#9c6d4e', name: 'Basket rim' },
  { hex: '#a8d5ba', name: 'Green balloon 1' },
  { hex: '#f8c99b', name: 'Green balloon 2' },
  { hex: '#e79ab0', name: 'Pink balloon 1' },
  { hex: '#c3c1e8', name: 'Pink balloon 2' },
  { hex: '#c9dfae', name: 'Meadow' },
];
/* an envelope split into four gores, meeting at the top and bottom poles */
function balloonAt(out, cx, cy, R, cols) {
  const mer = s => ({
    down: `C${n(cx + s * R * .75)} ${n(cy - R * .72)} ${n(cx + s * R)} ${n(cy - R * .32)} ${n(cx + s * R)} ${n(cy)}` +
          `C${n(cx + s * R)} ${n(cy + R * .55)} ${n(cx + s * .38 * R)} ${n(cy + R * .95)} ${n(cx + s * .16 * R)} ${n(cy + R * 1.3)}`,
    up:   `C${n(cx + s * .38 * R)} ${n(cy + R * .95)} ${n(cx + s * R)} ${n(cy + R * .55)} ${n(cx + s * R)} ${n(cy)}` +
          `C${n(cx + s * R)} ${n(cy - R * .32)} ${n(cx + s * R * .75)} ${n(cy - R * .72)} ${n(cx)} ${n(cy - R)}`,
  });
  const cut = [-1, -.5, 0, .5, 1];
  for (let i = 0; i < 4; i++)
    out.push(reg(`M${n(cx)} ${n(cy - R)}${mer(cut[i]).down}L${n(cx + cut[i + 1] * .16 * R)} ${n(cy + R * 1.3)}` +
                 `${mer(cut[i + 1]).up}Z`, cols[i % cols.length]));
  const by = cy + R * 1.3, ty = by + R * .34, w = R * .3;
  out.push(ink(`M${n(cx - R * .16)} ${n(by)}L${n(cx - w * 1.05)} ${n(ty)}`));
  out.push(ink(`M${n(cx + R * .16)} ${n(by)}L${n(cx + w * 1.05)} ${n(ty)}`));
  out.push(reg(`M${n(cx - w)} ${n(ty)}H${n(cx + w)}L${n(cx + w * .8)} ${n(ty + w * 1.2)}H${n(cx - w * .8)}Z`, 8));
  out.push(reg(`M${n(cx - w * 1.16)} ${n(ty - w * .3)}H${n(cx + w * 1.16)}V${n(ty + w * .06)}H${n(cx - w * 1.16)}Z`, 9));
}
function balloons() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  o.push(circ(664, 116, 74, 3));
  o.push(reg(cloudPath(206, 168, .78), 2), reg(cloudPath(560, 300, .54), 2), reg(cloudPath(150, 470, .46), 2));
  o.push(reg('M0 690L120 660L268 694L410 656L560 692L700 658L800 686V800H0Z', 14));
  balloonAt(o, 392, 286, 148, [4, 5, 6, 7]);
  balloonAt(o, 152, 428, 76, [10, 11]);
  balloonAt(o, 664, 372, 60, [12, 13]);
  o.push(ink('M96 236q18-16 36 0q18-16 36 0'), ink('M520 148q14-13 28 0q14-13 28 0'));
  return o;
}

/* ─────────────────────────────  9. COTTAGE  ───────────────────────────── */
const COTTAGE_PAL = [
  { hex: '#bcd0ee', name: 'Sky' },
  { hex: '#fbe8b8', name: 'Sun' },
  { hex: '#eef3fa', name: 'Cloud' },
  { hex: '#a8d5ba', name: 'Far hills' },
  { hex: '#c9dfae', name: 'Grass' },
  { hex: '#e8d5c4', name: 'Path' },
  { hex: '#f6e7d8', name: 'Wall' },
  { hex: '#e79ab0', name: 'Roof' },
  { hex: '#fdf3e3', name: 'Roof spot' },
  { hex: '#c48f6a', name: 'Door' },
  { hex: '#9c6d4e', name: 'Door frame' },
  { hex: '#a9d6e5', name: 'Window' },
  { hex: '#d18f6a', name: 'Window box' },
  { hex: '#f2a3a3', name: 'Box flower' },
  { hex: '#c9a98c', name: 'Chimney' },
  { hex: '#7fae94', name: 'Tree' },
  { hex: '#a97d5a', name: 'Tree trunk' },
];
function cottage() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  o.push(circ(672, 118, 68, 2));
  o.push(reg(cloudPath(214, 148, .74), 3), reg(cloudPath(540, 92, .5), 3));
  o.push(reg('M0 470L120 400L250 466L380 392L520 470L650 410L800 468V560H0Z', 4));
  o.push(reg('M0 540H800V800H0Z', 5));
  o.push(reg('M336 800H464L436 648H364Z', 6));
  o.push(reg('M494 232H540V330H494Z', 15));
  o.push(ink('M504 214q-16-20 0-40q16-20 0-40'));
  o.push(reg('M248 430H552V648H248Z', 7));
  o.push(reg('M196 438C214 300 316 236 400 236C484 236 586 300 604 438Z', 8));
  o.push(circ(298, 354, 28, 9), circ(400, 312, 32, 9), circ(492, 358, 26, 9));
  o.push(reg('M356 648V524A44 44 0 0 1 444 524V648Z', 11));
  o.push(reg('M368 648V526A32 32 0 0 1 432 526V648Z', 10));
  o.push(kcirc(418, 592, 7));
  o.push(reg('M278 486H344V552H278Z', 12), reg('M456 486H522V552H456Z', 12));
  o.push(ink('M311 486V552'), ink('M278 519H344'), ink('M489 486V552'), ink('M456 519H522'));
  o.push(reg('M268 552H354V580H268Z', 13), reg('M446 552H532V580H446Z', 13));
  [[294, 544], [330, 542], [472, 544], [508, 542]]
    .forEach(([x, y]) => o.push(circ(x, y, 16, 14)));
  o.push(reg('M118 646H148V724H118Z', 17), reg('M654 646H684V716H654Z', 17));
  o.push(circ(133, 578, 82, 16), circ(669, 590, 68, 16));
  o.push(ink('M60 744q10-22 20 0'), ink('M718 736q10-22 20 0'), ink('M226 760q10-22 20 0'));
  return o;
}

/* ─────────────────────────────  10. CUPCAKES  ─────────────────────────── */
const CUPCAKE_PAL = [
  { hex: '#f6e7ea', name: 'Wall' },
  { hex: '#d9bfa6', name: 'Table' },
  { hex: '#c48f6a', name: 'Table edge' },
  { hex: '#eef3fa', name: 'Plate' },
  { hex: '#f3c9dd', name: 'Pink case' },
  { hex: '#a8d5ba', name: 'Mint icing' },
  { hex: '#c9dfae', name: 'Mint swirl' },
  { hex: '#bcd0ee', name: 'Blue case' },
  { hex: '#f2a3a3', name: 'Strawberry icing' },
  { hex: '#f7d4d4', name: 'Strawberry swirl' },
  { hex: '#d6c7ec', name: 'Lilac case' },
  { hex: '#f8c99b', name: 'Caramel icing' },
  { hex: '#fbe8b8', name: 'Caramel swirl' },
  { hex: '#e8899b', name: 'Cherry' },
];
function cupcakes() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  o.push(reg('M0 700H800V800H0Z', 2));
  o.push(reg('M0 700H800V736H0Z', 3));
  const cake = (cx, base, s, cs, f1, f2) => {
    const S = v => n(base + v * s), X = v => n(cx + v * s);
    o.push(ell(cx, base + 10, 82 * s, 17, 4));
    o.push(reg(`M${X(-66)} ${S(-100)}L${X(66)} ${S(-100)}L${X(48)} ${S(0)}L${X(-48)} ${S(0)}Z`, cs));
    o.push(reg(`M${X(-72)} ${S(-116)}H${X(72)}V${S(-94)}H${X(-72)}Z`, cs));
    o.push(reg(`M${X(-70)} ${S(-110)}C${X(-72)} ${S(-176)} ${X(72)} ${S(-176)} ${X(70)} ${S(-110)}Z`, f1));
    o.push(reg(`M${X(-52)} ${S(-162)}C${X(-54)} ${S(-216)} ${X(54)} ${S(-216)} ${X(52)} ${S(-162)}Z`, f2));
    o.push(reg(`M${X(-32)} ${S(-204)}C${X(-34)} ${S(-248)} ${X(34)} ${S(-248)} ${X(32)} ${S(-204)}Z`, f1));
    o.push(circ(cx, base - 262 * s, 18 * s, 14));
    o.push(ink(`M${X(6)} ${S(-278)}q${n(14 * s)} ${n(-16 * s)} ${n(30 * s)} ${n(-8 * s)}`));
    [[-40, -140], [18, -132], [-12, -186], [34, -180], [-30, -196]].forEach(([dx, dy]) =>
      o.push(ink(`M${X(dx)} ${S(dy)}l${n(11 * s)} ${n(-6 * s)}`)));
    [[-24, -124], [40, -152], [4, -166]].forEach(([dx, dy]) => o.push(kcirc(cx + dx * s, base + dy * s, 4 * s)));
  };
  cake(180, 692, 1.26, 5, 6, 7);
  cake(400, 706, 1.60, 8, 9, 10);
  cake(624, 690, 1.20, 11, 12, 13);
  [[92, 168], [716, 140], [566, 104], [122, 330]].forEach(([x, y]) =>
    o.push(ink(`M${x} ${y}c-10-14-28-6-28 8c0 14 28 26 28 26s28-12 28-26c0-14-18-22-28-8Z`)));
  return o;
}

/* ─────────────────────────────  11. SLEEPY FOX  ───────────────────────── */
const FOX_PAL = [
  { hex: '#f7eee6', name: 'Background' },
  { hex: '#fbe8d4', name: 'Warm circle' },
  { hex: '#e08a55', name: 'Fox body' },
  { hex: '#d1763f', name: 'Tail' },
  { hex: '#fdf3e3', name: 'Tail tip' },
  { hex: '#e89a66', name: 'Head' },
  { hex: '#b45f2e', name: 'Ear' },
  { hex: '#f3c9dd', name: 'Inner ear' },
  { hex: '#fdf3e3', name: 'Muzzle' },
  { hex: '#6f6580', name: 'Nose' },
  { hex: '#f2a3a3', name: 'Cheek' },
  { hex: '#a8d5ba', name: 'Leaf' },
  { hex: '#f9c0c0', name: 'Flower' },
  { hex: '#fbe8b8', name: 'Flower heart' },
];
function sleepyFox() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  o.push(circ(400, 420, 288, 2));
  o.push(reg(blob([[262, 372], [318, 300], [420, 272], [528, 304], [578, 392],
                   [560, 486], [470, 540], [352, 534], [268, 466]]), 3));
  o.push(reg(blob([[566, 404], [624, 464], [624, 562], [540, 634], [400, 656], [286, 624],
                   [232, 552], [274, 512], [340, 570], [432, 592], [520, 558], [560, 494]]), 4));
  o.push(reg(blob([[232, 552], [248, 506], [300, 512], [306, 566], [274, 592]]), 5));
  o.push(reg(blob([[300, 500], [364, 478], [418, 506], [404, 556], [330, 562]]), 9));  // chest
  o.push(reg('M258 356L240 282L314 320Z', 7), reg('M348 318L410 280L396 352Z', 7));
  o.push(reg('M270 346L264 304L302 326Z', 8), reg('M354 326L388 302L382 342Z', 8));
  o.push(circ(322, 414, 96, 6));
  o.push(ell(262, 452, 64, 46, 9));
  o.push(reg('M198 438C214 434 226 444 224 456C222 468 204 470 196 460Z', 10));
  o.push(circ(348, 456, 21, 11));
  o.push(ink('M292 404q18-16 36 0'), ink('M236 470q18 10 36 0'));
  [[152, 208, .9], [660, 226, .82], [620, 656, .78], [176, 636, .72]].forEach(([x, y, s]) => {
    o.push(reg(petal(x, y, 2.3, 0, 78 * s, 22 * s), 12));
    petalRing(o, x, y, 6, 10 * s, 46 * s, 15 * s, 13, 0.3);
    o.push(circ(x, y, 13 * s, 14));
  });
  return o;
}

/* ─────────────────────────────  12. SEASHORE  ─────────────────────────── */
const SHORE_PAL = [
  { hex: '#cfe4f2', name: 'Sky' },
  { hex: '#fbe8b8', name: 'Sun' },
  { hex: '#eef3fa', name: 'Cloud' },
  { hex: '#8dc0b4', name: 'Deep sea' },
  { hex: '#bfe3df', name: 'Shallows' },
  { hex: '#f2f7f5', name: 'Foam' },
  { hex: '#e0cdb4', name: 'Wet sand' },
  { hex: '#f0e0c8', name: 'Dry sand' },
  { hex: '#f3c9dd', name: 'Scallop 1' },
  { hex: '#e79ab0', name: 'Scallop 2' },
  { hex: '#d9a882', name: 'Shell hinge' },
  { hex: '#f8c99b', name: 'Snail 1' },
  { hex: '#e0a86f', name: 'Snail 2' },
  { hex: '#f2a3a3', name: 'Starfish' },
  { hex: '#fbe8b8', name: 'Starfish heart' },
  { hex: '#c4a48a', name: 'Pebble' },
];
function seashore() {
  const o = [];
  o.push(`<rect class="r" data-c="1" x="0" y="0" width="800" height="800"/>`);
  o.push(circ(648, 110, 82, 2));
  o.push(reg(cloudPath(214, 140, .76), 3), reg(cloudPath(524, 72, .5), 3));
  o.push(ink('M104 196q16-14 32 0q16-14 32 0'), ink('M420 160q13-12 26 0q13-12 26 0'));
  o.push(reg('M0 230H800V420H0Z', 4));
  o.push(reg('M0 360Q200 338 400 362T800 348V440H0Z', 5));
  o.push(reg('M0 424Q180 400 380 428T800 408V486H0Z', 6));
  o.push(reg('M0 470Q200 496 420 468T800 482V576H0Z', 7));
  o.push(reg('M0 556Q220 582 440 552T800 568V800H0Z', 8));
  fan(o, 392, 712, 9, 18, 150, -Math.PI * .94, -Math.PI * .06, [9, 10]);
  o.push(reg('M364 716A32 32 0 0 1 420 716Z', 11));
  fan(o, 566, 784, 7, 12, 84, -Math.PI * .92, -Math.PI * .08, [10, 9]);
  o.push(circ(146, 660, 68, 12), circ(166, 674, 50, 13), circ(180, 684, 34, 12), circ(190, 692, 21, 13));
  petalRing(o, 648, 634, 5, 0, 86, 30, 14, -Math.PI / 2);
  o.push(circ(648, 634, 23, 15));
  [[84, 754, 30, 20], [140, 782, 22, 15], [736, 740, 26, 18], [694, 780, 19, 14], [286, 784, 24, 16]]
    .forEach(([x, y, rx, ry]) => o.push(ell(x, y, rx, ry, 16, 18)));
  return o;
}

const PICTURES = [
  { slug: 'mandala',  title: 'Mandala',    build: mandala,   palette: MANDALA_PAL },
  { slug: 'moonrise', title: 'Moonrise',   build: moonrise,  palette: MOONRISE_PAL },
  { slug: 'bouquet',  title: 'Bouquet',    build: bouquet,   palette: BOUQUET_PAL },
  { slug: 'window',   title: 'Window Cat', build: windowCat, palette: WINDOW_PAL },
  { slug: 'koi',      title: 'Koi Pond',   build: koiPond,   palette: KOI_PAL },
  { slug: 'teatime',  title: 'Teatime',    build: teatime,   palette: TEA_PAL },
  { slug: 'butterfly', title: 'Butterfly', build: butterfly, palette: BUTTERFLY_PAL },
  { slug: 'balloons', title: 'Balloons',   build: balloons,  palette: BALLOON_PAL },
  { slug: 'cottage',  title: 'Cottage',    build: cottage,   palette: COTTAGE_PAL },
  { slug: 'cupcakes', title: 'Cupcakes',   build: cupcakes,  palette: CUPCAKE_PAL },
  { slug: 'fox',      title: 'Sleepy Fox', build: sleepyFox, palette: FOX_PAL },
  { slug: 'seashore', title: 'Seashore',   build: seashore,  palette: SHORE_PAL },
];

if (typeof module !== 'undefined') module.exports = { PICTURES };
