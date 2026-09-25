/* ROUND 6 — elim.js : elimination director — counters, prize pool, kill feed, key-character death cards */
'use strict';
(function () {
  const U = R6.U;
  const E = {
    feed: [], shownPrize: 0, shownAlive: 456, bumpT: 0, card: null, _moneyT: 0, pendingMoney: 0,
    reset() { E.feed.length = 0; E.card = null; E.bumpT = 0; if (R6.State.s) { E.shownPrize = R6.State.s.prize; E.shownAlive = R6.State.alive; } },
    kill(p, o = {}) {
      if (!p || !p.alive) return false;
      R6.State.eliminate(p, o.cause);
      if (!o.silent || o.feed) { E.feed.unshift({ p, t: 0 }); if (E.feed.length > 7) E.feed.pop(); }
      if (o.sfx !== false && !o.silent) R6.Audio.sfx(o.far ? 'gunFar' : 'gun', { gap: 0.06, vol: o.vol || 0.9 });
      E.pendingMoney++;
      E.bumpT = 0.6;
      if (p.key && !o.noCard) E.showCard(p, o.cardSub);
      if (p.key && o.host && o.host.onKeyDeath) o.host.onKeyDeath(p);
      return true;
    },
    showCard(p, sub) { E.card = { p, t: 0, dur: 3.2, sub: sub || 'ELIMINADO' }; R6.Engine.slowmo(0.35, 1.2); R6.Audio.sfx('heartbeat'); R6.Save.unlockGallery('char_' + (p.key || p.num)); },
    update(dt) {
      const s = R6.State.s; if (!s) return;
      E.shownPrize = U.lerp(E.shownPrize, s.prize, Math.min(1, dt * 3)); if (Math.abs(E.shownPrize - s.prize) < 50000) E.shownPrize = s.prize;
      E.shownAlive = s ? R6.State.alive : 456;
      for (const f of E.feed) f.t += dt;
      while (E.feed.length && E.feed[E.feed.length - 1].t > 6) E.feed.pop();
      if (E.bumpT > 0) E.bumpT -= dt;
      E._moneyT -= dt;
      if (E.pendingMoney > 0 && E._moneyT <= 0) { R6.Audio.sfx('money', { vol: 0.35, gap: 0.2 }); E.pendingMoney = 0; E._moneyT = 0.35; }
      if (E.card) { E.card.t += dt / Math.max(0.3, R6.Engine.timeScale); if (E.card.t > E.card.dur) E.card = null; }
    },
    drawFeed(ctx, x, y) {
      let yy = y;
      for (const f of E.feed) {
        const a = Math.min(1, f.t * 4, (6 - f.t) * 1.5);
        ctx.save(); ctx.globalAlpha = a;
        const txt = `#${U.pad(f.p.num)} ${f.p.key ? f.p.name : ''}`.trim();
        ctx.font = R6.UI.font(14, 700); const w = ctx.measureText(txt).width + 88;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w, yy, w, 22);
        ctx.fillStyle = '#ff3b5c'; ctx.fillRect(x - w, yy, 3, 22);
        R6.UI.text(ctx, txt, x - w + 10, yy + 12, { size: 14, base: 'middle', color: f.p.key ? '#ffd166' : '#ddd', weight: 700 });
        R6.UI.text(ctx, 'ELIMINADO', x - 8, yy + 12, { size: 12, base: 'middle', align: 'right', color: '#ff3b5c', weight: 800 });
        ctx.restore();
        yy += 25;
      }
    },
    drawCard(ctx) {
      const c = E.card; if (!c) return;
      const k = U.ease.outCubic(Math.min(1, c.t / 0.4)); const out = c.t > c.dur - 0.5 ? (c.dur - c.t) / 0.5 : 1;
      ctx.save(); ctx.globalAlpha = Math.min(k, out);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, R6.W, R6.H);
      const x = R6.W / 2 - 250 + (1 - k) * -80, y = R6.H / 2 - 90;
      R6.UI.panel(ctx, x, y, 500, 180, { fill: 'rgba(10,10,12,.95)', stroke: '#ff3b5c', lw: 2 });
      const look = Object.assign({}, c.p.look, { tint: 'dead' });
      R6.Char.portrait(ctx, look, x + 90, y + 90, 140, 'sad', 0, false);
      ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 30, y + 30); ctx.lineTo(x + 150, y + 150); ctx.moveTo(x + 150, y + 30); ctx.lineTo(x + 30, y + 150); ctx.globalAlpha *= 0.6; ctx.stroke(); ctx.globalAlpha /= 0.6;
      R6.UI.text(ctx, '#' + U.pad(c.p.num), x + 185, y + 52, { size: 30, fam: 'mono', color: '#ff3b5c' });
      R6.UI.text(ctx, c.p.name, x + 185, y + 92, { size: 34, fam: 'title', color: '#fff', spacing: 2 });
      R6.UI.text(ctx, c.sub, x + 185, y + 128, { size: 20, color: '#ff3b5c', weight: 800, spacing: 5 });
      const role = R6.Roster.KEY_ROLE_PT[c.p.key]; if (role) R6.UI.text(ctx, role, x + 185, y + 155, { size: 15, color: '#999' });
      ctx.restore();
    },
  };
  R6.Elim = E;
})();
