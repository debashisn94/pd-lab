const fs = require('fs');
const art = fs.readFileSync('art.js', 'utf8')
  .replace(/\nif \(typeof module[\s\S]*$/, '\n')
  .split('\n').map(l => l ? '  ' + l : l).join('\n');
const out = fs.readFileSync('shell.html', 'utf8').replace('/*__ART__*/', art);
fs.writeFileSync('index.html', out);

// keep the inspection harness in step with the build — a stale copy of it
// silently showed me the previous version for a whole round of fixes
fs.writeFileSync('t-pic.html', out.replace('</body>', `
<style>.topbar,.ticker,.console{display:none!important}.stage{padding:6px}.sheet{max-width:none}</style>
<script>addEventListener('load',()=>setTimeout(()=>{
  const i=+(new URLSearchParams(location.search).get('i')||0);
  document.querySelectorAll('.pick')[i].click();
  if(location.search.includes('answer')) document.getElementById('peekBtn').click();
},150))</script></body>`));
const N = (out.match(/slug:/g) || []).length;
const sheet = q => {
  let g = '<!DOCTYPE html><meta charset=utf-8><style>body{margin:0;background:#efe7dd;display:flex;flex-wrap:wrap;gap:6px}iframe{border:0;width:494px;height:500px}</style>';
  for (let i = 0; i < N; i++) g += `<iframe src="t-pic.html?i=${i}${q}"></iframe>`;
  return g;
};
fs.writeFileSync('t-grid.html', sheet(''));
fs.writeFileSync('t-ans.html', sheet('&answer=1'));
console.log('built index.html', out.length, 'bytes (+ harness)');
