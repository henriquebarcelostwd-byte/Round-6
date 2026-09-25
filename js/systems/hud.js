/* ROUND 6 — hud.js : in-game HUD — player card, PRIZE MONEY, PLAYERS ALIVE, current game, timer, objective, kill feed */
'use strict';
(function () {
  const U = R6.U;
  const HUD = {
    draw(ctx, o = {}) {
      const S = R6.State; const T = R6.UI.T; const hide = o.hide || {};
      ctx.save();
      // ---- player card (top-left)
      if (!hide.player && S.s) {
        const x = 16, y = 14, w = 262, h = 66;
        R6.UI.panel(ctx, x, y, w, h, { r: 6, fill: 'rgba(6,8,12,.72)', shadow: false });
        R6.Char.portrait(ctx, S.s.player.look, x + 33, y + 33, 54, o.expr || (o.danger ? 'tense' : 'neutral'), R6.Engine.rt, false);
        R6.UI.text(ctx, '#' + U.pad(S.s.player.num), x + 68, y + 24, { size: 20, fam: 'mono', color: T.accent });
        R6.UI.text(ctx, S.s.player.name, x + 124, y + 24, { size: 17, weight: 800, color: '#fff', maxW: 130 });
        const eq = R6.Save.meta.equipped.title; const TT = R6.SHOP && R6.SHOP.find(i => i.id === eq);
        const status = o.status || (S.s.player.hp > 60 ? 'OK' : S.s.player.hp > 25 ? 'FERIDO' : 'CRÍTICO');
        R6.UI.text(ctx, (TT && TT.id !== 'title_none' ? TT.name + ' · ' : '') + 'STATUS: ' + status, x + 68, y + 44, { size: 12, weight: 700, color: status === 'OK' ? '#8bd17c' : '#ff7a6a' });
        R6.UI.bar(ctx, x + 68, y + 52, w - 82, 5, (o.hp != null ? o.hp : S.s.player.hp) / 100, { color: status === 'OK' ? '#2ec4b6' : '#ff5a6a' });
      }
      // ---- prize (top-right)
      if (!hide.prize && S.s) {
        const bump = R6.Elim.bumpT > 0 ? Math.sin(R6.Elim.bumpT / 0.6 * Math.PI) : 0;
        const w = 300, x = R6.W - w - 16, y = 14, h = hide.alive ? 58 : 84;
        R6.UI.panel(ctx, x, y, w, h, { r: 6, fill: 'rgba(6,8,12,.74)', shadow: false, stroke: bump > 0 ? U.rgba('#f2c14e', 0.3 + bump * 0.6) : undefined });
        R6.Props.piggy(ctx, x + 30, y + 30, 16 + bump * 3, Math.min(1, S.s.prize / 45.6e9), R6.Engine.rt, { cable: 0 });
        R6.UI.text(ctx, 'PRIZE MONEY', x + 58, y + 20, { size: 12, weight: 800, color: T.dim, spacing: 2 });
        ctx.save(); ctx.translate(x + 58, y + 46); const sc = 1 + bump * 0.08; ctx.scale(sc, sc);
        R6.UI.text(ctx, U.money(R6.Elim.shownPrize), 0, 0, { size: 25, fam: 'mono', color: T.gold, shadow: bump > 0 ? U.rgba('#f2c14e', 0.8) : false, shadowBlur: 12, shadowY: 0 });
        ctx.restore();
        if (!hide.alive) {
          R6.UI.text(ctx, 'PLAYERS ALIVE', x + 58, y + 72, { size: 12, weight: 800, color: T.dim, spacing: 2 });
          R6.UI.text(ctx, String(S.alive), x + w - 16, y + 73, { size: 20, fam: 'mono', color: '#fff', align: 'right' });
        }
        if (!hide.feed) R6.Elim.drawFeed(ctx, R6.W - 16, y + h + 10);
      }
      // ---- game title + timer (top-center)
      if (o.game || o.timer != null) {
        const cx = R6.W / 2;
        if (o.game) R6.UI.text(ctx, o.game, cx, 30, { size: 17, align: 'center', weight: 800, color: '#fff', spacing: 3, shadow: true });
        if (o.timer != null) {
          const low = o.timer < 20;
          const pulse = low ? 1 + Math.max(0, Math.sin(R6.Engine.rt * 8)) * 0.08 : 1;
          ctx.save(); ctx.translate(cx, o.game ? 64 : 44); ctx.scale(pulse, pulse);
          R6.UI.text(ctx, U.time(o.timer), 0, 0, { size: 38, align: 'center', base: 'middle', fam: 'mono', color: low ? '#ff3b5c' : '#fff', shadow: low ? 'rgba(255,40,70,.9)' : true, shadowBlur: 14 });
          ctx.restore();
        }
        if (o.sub) R6.UI.text(ctx, o.sub, cx, o.timer != null ? 100 : 54, { size: 15, align: 'center', weight: 700, color: o.subColor || '#d9d2c5', shadow: true });
      }
      // ---- objective (bottom-left)
      if (o.objective && !hide.objective) {
        ctx.font = R6.UI.font(16, 700); const w = Math.min(560, ctx.measureText(o.objective).width + 52);
        const y = R6.H - 44;
        R6.UI.panel(ctx, 16, y - 18, w, 36, { r: 5, fill: 'rgba(6,8,12,.72)', shadow: false, accent: true });
        R6.UI.shapeIcon(ctx, 'triangle', 36, y, 7, T.accent, 2);
        R6.UI.text(ctx, o.objective, 50, y + 1, { size: 16, weight: 700, base: 'middle', color: '#f1ece3', maxW: w - 60 });
      }
      if (o.hints) R6.UI.hints(ctx, o.hints, R6.W / 2, R6.H - 22, { align: 'center', alpha: 0.85 });
      ctx.restore();
      R6.Elim.drawCard(ctx);
    },
  };
  R6.HUD = HUD;
})();
