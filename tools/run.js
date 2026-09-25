// Playwright driver. usage: node tools/run.js '<json script>'
// script: {url, steps:[{wait:ms}|{eval:"js"}|{shot:"name"}|{key:"Space", hold:ms}|{down:"KeyW"}|{up:"KeyW"}|{click:[x,y]}]}
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SP = process.env.SP || '/tmp/claude-0/-home-user-Round-6/36a89ddc-d78b-5201-b254-ec17b9a7edd4/scratchpad';
(async () => {
  const sc = JSON.parse(process.argv[2]);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('Failed to load resource') && !t.includes('fonts.g')) errs.push(m.type() + ': ' + t); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto(sc.url.startsWith('http') || sc.url.startsWith('file') ? sc.url : 'file://' + process.cwd() + '/' + sc.url);
  await p.waitForTimeout(sc.boot || 800);
  const out = [];
  for (const s of sc.steps) {
    if (s.wait) await p.waitForTimeout(s.wait);
    if (s.eval) { const r = await p.evaluate(s.eval); if (r !== undefined) out.push(r); }
    if (s.shot) await p.screenshot({ path: SP + '/' + s.shot + '.png' });
    if (s.key) { await p.keyboard.down(s.key); await p.waitForTimeout(s.hold || 60); await p.keyboard.up(s.key); }
    if (s.down) await p.keyboard.down(s.down);
    if (s.up) await p.keyboard.up(s.up);
    if (s.click) { await p.mouse.click(s.click[0], s.click[1]); }
    if (s.move) { await p.mouse.move(s.move[0], s.move[1]); }
  }
  const eng = await p.evaluate(() => window.R6 && R6.Engine && R6.Engine.errors || []);
  console.log(JSON.stringify({ out, errs: errs.slice(0, 15), engineErrors: eng.slice(0, 5) }, null, 1));
  await b.close();
})();
