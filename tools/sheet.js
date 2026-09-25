// node tools/sheet.js out.png img1 img2 ... (contact sheet, 2 columns)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [out, ...imgs] = process.argv.slice(2);
  const rows = Math.ceil(imgs.length / 2);
  const html = '<body style="margin:0;background:#000;display:grid;grid-template-columns:640px 640px">' + imgs.map(i => `<div style="position:relative"><img src="file://${i}" width=640 height=360><span style="position:absolute;left:4px;top:2px;color:#0f0;font:12px monospace">${i.split('/').pop()}</span></div>`).join('') + '</body>';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: rows * 360 } });
  const f = out.replace(/\.png$/, '.html'); require('fs').writeFileSync(f, html); await p.goto('file://' + f); await p.waitForTimeout(300); await p.screenshot({ path: out }); await b.close();
})();
