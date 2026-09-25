/* ROUND 6 — gamebase.js : shared game-scene lifecycle (rules card, win/lose, results), defeat cutscene, game registry */
'use strict';
(function () {
  const U = R6.U;
  R6.Games = {}; // id -> {name, season, icon, desc, create(opts)}
  R6.registerGame = (id, def) => { R6.Games[id] = Object.assign({ id }, def); };

  class GameBase {
    constructor(opts = {}) {
      this.opts = opts; this.mode = opts.mode || 'campaign'; this.t = 0; this.result = null; this.resultT = 0;
      this.fx = new R6.Particles(1500); this.pausable = true; this.phase = 'rules'; this.rulesT = 0;
      this.tw = new U.Tweens();
    }
    get campaign() { return this.mode === 'campaign'; }
    rules() { return null; } // {title, sub, icon, lines:[], keys:[[k,label]]}
    begin() { } // called when rules dismissed
    // default rules card update; returns true while card visible
    updateRules(dt) {
      if (this.phase !== 'rules') return false;
      this.rulesT += dt;
      const r = this.rules();
      if (!r || this.opts.skipRules) { this.phase = 'play'; this.begin(); return false; }
      if (this.rulesT > 0.5 && (R6.Input.confirmP() || R6.Input.actP('interact'))) { R6.Audio.sfx('confirm'); this.phase = 'play'; this.begin(); }
      return true;
    }
    drawRules(ctx) {
      if (this.phase !== 'rules') return;
      const r = this.rules(); if (!r) return;
      const a = Math.min(1, this.rulesT * 3);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, R6.W, R6.H);
      const w = 720, h = 150 + r.lines.length * 30 + (r.keys ? 70 : 0), x = (R6.W - w) / 2, y = (R6.H - h) / 2 - 10;
      R6.UI.panel(ctx, x, y, w, h, { r: 10, fill: 'rgba(10,12,18,.94)', stroke: U.rgba(R6.UI.T.accent, 0.6), lw: 1.5 });
      R6.UI.shapeIcon(ctx, r.icon || 'circle', x + 50, y + 55, 20, R6.UI.T.accent, 4);
      R6.UI.text(ctx, r.title, x + 92, y + 58, { size: 50, fam: 'title', color: '#fff', spacing: 3 });
      if (r.sub) R6.UI.text(ctx, r.sub, x + 94, y + 86, { size: 16, color: R6.UI.T.dim, weight: 700, spacing: 2 });
      let yy = y + 122;
      for (const l of r.lines) { R6.UI.shapeIcon(ctx, 'square', x + 44, yy - 6, 4, R6.UI.T.accent2, 2, true); R6.UI.text(ctx, l, x + 60, yy, { size: 18, color: '#e9e3d8', weight: 500, maxW: w - 90 }); yy += 30; }
      if (r.keys) R6.UI.hints(ctx, r.keys, x + w / 2, yy + 22, { align: 'center' });
      const dif = { normal: 'NORMAL', hard: 'HARD', extreme: 'EXTREME' }[R6.Save.diff()];
      R6.UI.text(ctx, 'DIFICULDADE: ' + dif, x + w - 20, y + 30, { size: 13, align: 'right', color: R6.Save.diff() === 'normal' ? '#8bd17c' : R6.Save.diff() === 'hard' ? '#f2994a' : '#ff3b5c', weight: 800, spacing: 2 });
      const k = (Math.sin(this.rulesT * 4) + 1) / 2;
      R6.UI.text(ctx, 'ESPAÇO / CLIQUE PARA COMEÇAR', R6.W / 2, y + h - 18, { size: 15, align: 'center', color: U.rgba('#ffffff', 0.5 + k * 0.5), weight: 800, spacing: 3 });
      ctx.restore();
    }
    win(o = {}) {
      if (this.result) return;
      this.result = 'win'; this.resultT = 0; this.resultInfo = o;
      R6.Audio.sfx('pass'); R6.Music.setIntensity(0);
      if (o.silent !== true) R6.Banner.show(o.title || (this.mode === 'extra' ? 'ROUND CLEAR' : 'GAME PASSED'), o.sub || (R6.State.s && this.campaign ? 'PLAYERS REMAINING: ' + R6.State.alive : ''), { style: 'pass', color: '#2ec4b6', dur: 3.2, big: true });
      R6.Save.meta.stats.gamesWon++; R6.Save.saveMeta();
      if (this.campaign && R6.State.s) { R6.State.s.player.gamesWon++; }
      const id = this.gameId; if (id) R6.Save.unlockGame(id);
    }
    lose(o = {}) {
      if (this.result) return;
      this.result = 'lose'; this.resultT = 0; this.resultInfo = o;
      R6.Music.stop(0.5); R6.Audio.sfx('buzzer');
      R6.Banner.show('ELIMINATED', o.reason || '', { style: 'fail', color: '#ff3b5c', dur: 2.8, big: true });
      R6.Save.meta.stats.deaths++; R6.Save.saveMeta();
      if (this.campaign && R6.State.s) R6.State.s.stats.deaths++;
    }
    // call each frame; handles transitions after win/lose
    updateResult(dt) {
      if (!this.result) return false;
      this.resultT += dt;
      const wait = this.result === 'win' ? (this.resultInfo.wait || 3.4) : (this.resultInfo.wait || 3.0);
      if (this.resultT >= wait && !this._left) { this._left = true; this.leave(); }
      return true;
    }
    leave() {
      if (this.result === 'win') {
        if (this.opts.onWin) this.opts.onWin(this.summary ? this.summary() : {});
        else R6.Flow.results(this, true);
      } else {
        if (this.opts.onLose) this.opts.onLose(this);
        else if (this.campaign) R6.Flow.defeat(this);
        else R6.Flow.results(this, false);
      }
    }
    debugWin() { this.phase = 'play'; this.win({ wait: 0.3 }); }
    exit() { }
  }
  R6.GameBase = GameBase;

  // ---------------- Flow helpers: defeat cutscene, results ----------------
  const Flow = {
    // stylized defeat cutscene: coffin with pink ribbon, guards, Front Man watching monitors
    defeat(game, info = {}) {
      const S = R6.State; const pl = S.s ? S.s.player : { num: 456, name: 'Jogador', look: R6.Char.makeLook() };
      const g1 = R6.Char.makeLook({ outfit: 'guard', mask: 'circle', seed: 11 }), g2 = R6.Char.makeLook({ outfit: 'guard', mask: 'triangle', seed: 12 });
      const fm = R6.Char.makeLook({ outfit: 'frontman', seed: 13 });
      let coffinX = -200;
      const scene = R6.cutscene({
        id: 'defeat', stage: 'office', music: 'dread', letterbox: 1, cam: [800, 380, 1],
        actors: [{ id: 'fm', look: fm, x: 900, z: 0.3, dir: -1, view: 'back', anim: 'idle' }, { id: 'g1', look: g1, x: -160, z: 0, dir: 1 }, { id: 'g2', look: g2, x: -60, z: 0, dir: 1 }],
        drawWorld: (c, sc) => { R6.Props.coffin(c, coffinX, sc.stage.ground - 40, 150, 46, { rot: 0 }); },
        onUpdate: (sc, dt) => { const a = sc.getActor('g1'), b = sc.getActor('g2'); if (a && b) coffinX = (a.x + b.x) / 2; },
        steps: [
          { par: [[{ move: 'g1', to: [620] }], [{ move: 'g2', to: [720] }], [{ cam: [700, 380, 1.15], dur: 3 }]] },
          { anim: 'g1', name: 'idle' },
          { caption: 'ELIMINADO', sub: `#${U.pad(pl.num)} — ${pl.name}`, dur: 2.8 },
          { face: 'fm', view: 'side', dir: -1 },
          { say: 'fm', name: 'FRONT MAN', text: info.line || U.pick(['Mais um que acreditou que seria diferente.', 'O jogo não perdoa hesitação.', 'Igualdade. Todos têm a mesma chance. Você desperdiçou a sua.', 'Levem-no.']) },
          { par: [[{ move: 'g1', to: [1500] }], [{ move: 'g2', to: [1600] }]], },
        ],
        onEnd: () => Flow.defeatMenu(game),
      });
      R6.Engine.go(scene, { t: 'fade', dur: 1.2 });
    },
    defeatMenu(game) {
      const S = R6.State;
      const scene = {
        name: 'defeatMenu', t: 0, pausable: false,
        menu: new R6.UI.Menu([
          { label: 'TENTAR NOVAMENTE', sub: 'último checkpoint', icon: 'circle', action: () => { if (R6.Campaign && R6.Campaign.retry) R6.Campaign.retry(); } },
          { label: 'MENU PRINCIPAL', icon: 'square', action: () => R6.Engine.go(R6.MenuScene(), { t: 'fade' }) },
        ]),
        enter() { R6.Music.play('sad'); },
        update(dt) { this.t += dt; this.menu.update(dt); },
        render(ctx) {
          ctx.fillStyle = '#060607'; ctx.fillRect(0, 0, R6.W, R6.H);
          const k = Math.min(1, this.t);
          R6.UI.text(ctx, 'GAME OVER', R6.W / 2, 200, { size: 110, fam: 'title', align: 'center', color: '#ff3b5c', alpha: k, spacing: 10, shadow: 'rgba(255,40,70,.6)', shadowBlur: 30 });
          if (S.s) {
            R6.UI.text(ctx, `#${U.pad(S.s.player.num)} ${S.s.player.name}  ·  TEMPORADA ${S.s.season}  ·  ${S.s.player.gamesWon} JOGOS VENCIDOS`, R6.W / 2, 262, { size: 18, align: 'center', color: '#bbb', alpha: k, spacing: 2 });
          }
          this.menu.draw(ctx, R6.W / 2 - 170, 360, 340, 52, 12);
          R6.UI.vignette(ctx, 0.8);
        },
      };
      R6.Engine.go(scene, { t: 'fade' });
    },
    // results screen for practice / extra modes
    results(game, won) {
      const score = game.score != null ? game.score : null;
      const chips = won ? (game.chips != null ? game.chips : 60) : Math.floor((game.chips || 0) * 0.3);
      const gained = chips > 0 ? R6.Save.addChips(chips) : 0;
      let best = false;
      if (score != null && game.scoreId) best = R6.Save.best(game.scoreId, score, game.higherBetter !== false);
      const scene = {
        name: 'results', t: 0, pausable: false,
        menu: new R6.UI.Menu([
          { label: 'JOGAR NOVAMENTE', icon: 'circle', action: () => { const def = R6.Games[game.gameId] || (R6.EXTRAS && R6.EXTRAS.find(e => e.id === game.extraId)); if (def) R6.Engine.go(def.create(Object.assign({}, game.opts)), { t: 'fade' }); } },
          { label: 'VOLTAR', icon: 'square', action: () => R6.Engine.go(game.mode === 'extra' ? R6.ExtrasScene() : R6.GameSelectScene(), { t: 'fade' }) },
        ]),
        enter() { R6.Music.play(won ? 'victory' : 'sad'); },
        update(dt) { this.t += dt; this.menu.update(dt); },
        render(ctx) {
          ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, R6.W, R6.H);
          R6.UI.text(ctx, won ? 'VITÓRIA' : 'ELIMINADO', R6.W / 2, 170, { size: 96, fam: 'title', align: 'center', color: won ? '#2ec4b6' : '#ff3b5c', spacing: 8 });
          R6.UI.text(ctx, game.title || '', R6.W / 2, 220, { size: 20, align: 'center', color: '#bbb', spacing: 3 });
          if (score != null) R6.UI.text(ctx, (game.scoreLabel || 'PONTOS') + ': ' + score + (best ? '   ★ NOVO RECORDE' : ''), R6.W / 2, 290, { size: 30, align: 'center', color: '#f2c14e', fam: 'mono' });
          R6.UI.text(ctx, '+' + gained + ' FICHAS', R6.W / 2, 340, { size: 22, align: 'center', color: '#e8336d', weight: 800 });
          this.menu.draw(ctx, R6.W / 2 - 170, 420, 340, 52, 12);
          R6.UI.vignette(ctx, 0.7);
        },
      };
      R6.Engine.go(scene, { t: 'fade' });
    },
  };
  R6.Flow = Flow;
})();
