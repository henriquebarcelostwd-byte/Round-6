/* ROUND 6 — main.js : boot, font loading, debug/test API */
'use strict';
(function () {
  const U = R6.U;

  // Debug / automated-test API
  R6.debug = {
    newState(o = {}) {
      const look = R6.Char.makeLook({ num: o.num || 456, hs: 'short', hair: '#1d1612', skin: '#dcae87', fem: false, age: 1, build: 1.02, h: 1.0, glasses: false, beard: null, seed: 4560 });
      R6.State.newGame({ name: o.name || 'Gi-tae', num: o.num || 456, look, seed: o.seed || 12345 });
      R6.Elim.reset();
      return R6.State.s;
    },
    play(id, opts = {}) {
      const def = R6.Games[id] || (R6.EXTRAS && R6.EXTRAS.find(e => e.id === id));
      if (!def) { console.warn('no game', id); return null; }
      if (!R6.State.s && opts.mode !== 'extra') R6.debug.newState();
      const sc = def.create(Object.assign({ mode: 'practice' }, opts));
      R6.Engine.go(sc, { t: 'cut' });
      return sc;
    },
    win() { const s = R6.Engine.scene; if (s && s.debugWin) s.debugWin(); },
    lose() { const s = R6.Engine.scene; if (s && s.lose) s.lose({ reason: 'debug' }); },
    skipRules() { const s = R6.Engine.scene; if (s && s.phase === 'rules') { s.phase = 'play'; s.begin && s.begin(); } },
    scene() { return R6.Engine.scene && R6.Engine.scene.name; },
    errors() { return R6.Engine.errors; },
  };

  function fallbackMenu() {
    const ids = Object.keys(R6.Games);
    const menu = new R6.UI.Menu(ids.map(id => ({ label: R6.Games[id].name, action: () => R6.debug.play(id) })));
    return { name: 'fallback', update(dt) { menu.update(dt); }, render(ctx) { ctx.fillStyle = '#08090c'; ctx.fillRect(0, 0, R6.W, R6.H); R6.UI.logo(ctx, 640, 90, 80, R6.Engine.rt); menu.draw(ctx, 440, 170, 400, 40, 6); } };
  }

  async function boot() {
    const canvas = document.getElementById('game');
    R6.Engine.init(canvas);
    try { await Promise.race([document.fonts && document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* fonts optional */ }
    R6.Save.saveSettings();
    const bootEl = document.getElementById('boot'); if (bootEl) bootEl.classList.add('hide');
    const q = new URLSearchParams(location.search);
    let start = null;
    if (q.get('game')) { R6.debug.newState(); const def = R6.Games[q.get('game')] || (R6.EXTRAS && R6.EXTRAS.find(e => e.id === q.get('game'))); if (def) start = def.create({ mode: q.get('mode') || 'practice', variant: q.get('variant') || undefined }); }
    if (!start) start = R6.MenuScene ? R6.MenuScene() : fallbackMenu();
    R6.Engine.start(start);
    canvas.focus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
