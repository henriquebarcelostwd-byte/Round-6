// Builds single-file versions of the game:
//   dist/round6.html           standalone page (download and open in any browser, works offline except web fonts)
//   dist/round6-artifact.html  same content without <html>/<head>/<body> wrappers (for hosts that add their own skeleton)
// usage: node tools/bundle.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const fonts = (html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/) || [''])[0];
const title = (html.match(/<title>[^<]*<\/title>/) || ['<title>Round 6</title>'])[0];
const body = html.slice(html.indexOf('<div id="wrap">'), html.indexOf('<noscript>'));
const js = scripts.map(src => {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  if (/<\/script/i.test(code)) throw new Error('script-closing tag inside ' + src);
  return `<script>/* ${src} */\n${code}\n</script>`;
}).join('\n');
const style = `<style>\n:root { color-scheme: dark; }\n${css}\n</style>`;
const inner = `${title}\n<meta name="description" content="Jogo 2D em Canvas inspirado no universo de Round 6 / Squid Game.">\n${fonts}\n${style}\n${body}<noscript>Este jogo precisa de JavaScript habilitado.</noscript>\n${js}\n`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/round6-artifact.html'), inner);
fs.writeFileSync(path.join(root, 'dist/round6.html'), `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n${inner.replace(/(<div id="wrap">)/, '</head>\n<body>\n$1')}</body>\n</html>\n`);
console.log('bundled', scripts.length, 'scripts →', (fs.statSync(path.join(root, 'dist/round6.html')).size / 1024).toFixed(0) + ' KB');
