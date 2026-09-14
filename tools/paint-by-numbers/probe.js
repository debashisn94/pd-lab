addEventListener('load', () => setTimeout(() => {
  const out = []; const ok = (n, c, d) => out.push((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : ''));
  const R = () => [...document.querySelectorAll('#art .r')];
  const L = () => [...document.querySelectorAll('#art .n')];
  const sws = () => [...document.querySelectorAll('.sw')];
  const picks = [...document.querySelectorAll('.pick')];
  const art = document.getElementById('art');
  const meter = () => document.getElementById('meterText').textContent;
  const hit = el => { const b = el.getBoundingClientRect();
    for (const [fx, fy] of [[.5,.5],[.5,.8],[.3,.7],[.7,.7],[.5,.25],[.2,.5],[.8,.5]]) {
      const x = b.x + b.width * fx, y = b.y + b.height * fy;
      if (document.elementFromPoint(x, y) === el) return [x, y]; } return null; };
  const tap = el => { const p = hit(el); if (!p) return false;
    ['pointerdown','pointerup'].forEach(t => el.dispatchEvent(new PointerEvent(t,
      { bubbles: true, clientX: p[0], clientY: p[1], pointerId: 1, isPrimary: true })));
    return true; };

  picks[1].click();                                   // moonrise
  const r = R(), l = L();
  ok('one number per shape', r.length === l.length, r.length + ' vs ' + l.length);

  const pine = r.find(e => e.dataset.c === '8');
  sws()[7].click();
  ok('picking a colour lights up its shapes', pine.classList.contains('hot'));
  ok('and bolds their numbers', l[r.indexOf(pine)].classList.contains('hot'));
  ok('tapped the pine', tap(pine));
  ok('right colour goes on', pine.style.fill === 'rgb(134, 176, 158)', pine.style.fill);
  ok('its number disappears', l[r.indexOf(pine)].classList.contains('gone'));
  ok('and it stops being highlighted', !pine.classList.contains('hot'));
  ok('it counts as done', meter() === '1/' + r.length, meter());

  const water = r.find(e => e.dataset.c === '10');
  sws()[2].click(); tap(water);
  ok('wrong colour still paints', !!water.style.fill, water.style.fill);
  ok('but its number stays put', !l[r.indexOf(water)].classList.contains('gone'));
  ok('and it does not count as done', meter() === '1/' + r.length, meter());
  sws()[9].click(); tap(water);
  ok('fixing it with the right colour counts', meter() === '2/' + r.length, meter());

  const before = r.map(e => e.style.fill).join('|');
  document.getElementById('peekBtn').click();
  ok('show me fills the whole picture', r.every(e => e.style.fill));
  ok('show me hides every number', l.every(t => t.classList.contains('gone')));
  ok('show me cannot be painted over', (tap(r[0]), r[0].style.fill === 'rgb(159, 177, 212)'), r[0].style.fill);
  document.getElementById('peekBtn').click();
  ok('hiding it gives your work back untouched', r.map(e => e.style.fill).join('|') === before);

  const pines = r.filter(e => e.dataset.c === '8');
  sws()[7].click(); pines.forEach(tap);
  ok('a colour ticks off when its shapes are all done', sws()[7].classList.contains('spent'),
     pines.filter(e => e.style.fill === 'rgb(134, 176, 158)').length + '/' + pines.length);

  document.getElementById('undoBtn').click();
  ok('undo unticks it again', !sws()[7].classList.contains('spent'));

  picks[4].click(); picks[1].click();
  ok('work is remembered across pictures', R().filter(e => e.style.fill).length >= 2, R().filter(e => e.style.fill).length + ' filled');

  // finish a whole picture and check the end state
  picks[0].click();
  const m = R();
  m.forEach(e => e.style.fill = '');
  m.forEach(e => { sws()[+e.dataset.c - 1].click(); tap(e); });
  ok('a finished picture reports finished', document.getElementById('pillText').textContent === 'FINISHED ✓',
     document.getElementById('pillText').textContent + ' ' + meter());
  ok('and every number is gone', L().every(t => t.classList.contains('gone')));

  document.documentElement.innerHTML = '<body><pre style="font:13px monospace;padding:12px;line-height:1.65">' +
    out.join('\n') + '</pre></body>';
}, 600));
