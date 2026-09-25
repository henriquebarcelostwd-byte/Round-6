// usage: node tools/shot.js <url> <out.png> [waitMs] [evalJs]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [url, out, wait = '1500', ev] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await p.goto(url);
  if (ev) await p.evaluate(ev);
  await p.waitForTimeout(+wait);
  await p.screenshot({ path: out });
  const eng = await p.evaluate(() => window.R6 && R6.Engine && R6.Engine.errors || []);
  console.log(JSON.stringify({ errs, engineErrors: eng }, null, 1));
  await b.close();
})();
