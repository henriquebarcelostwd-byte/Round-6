/* ROUND 6 — revolt.js : The Revolt (end of Season 2) — stealth infiltration through the pastel stair maze to the control room.
   Guards with vision cones, cameras, takedowns from behind, thrown distractions, keycard, allies following you */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU, T = R6.T;

  class Revolt extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'revolt'; this.name = 'revolt';
      const M = R6.genMaze({ cols: 10, rows: 7, cell: 6, corr: 3, roomy: true, roomChance: 0.22, loops: 0.25, seed: opts.seed || 777 + (R6.State.s ? R6.State.s.seed : 0), zone: (cx, cy) => 1 + ((cx + cy) % 4), wallStyle: (cx, cy) => 1 + ((cx + 2 * cy) % 4) });
      this.M = M; this.map = M.map;
      this.map.buildFloor((c, x, y, ts, s, tx, ty, v) => {
        const zc = ['#f0e6d2', '#f6b8c8', '#a9d4e6', '#f3dc8a', '#b8e0b0'][s % 5];
        c.fillStyle = U.mix('#f4efe6', zc, 0.22); c.fillRect(x, y, ts, ts);
        c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(x, y + ts - 1, ts, 1); c.fillRect(x + ts - 1, y, 1, ts);
        if ((tx * 7 + ty * 3) % 11 < 3) { for (let i = 0; i < 4; i++) { c.fillStyle = U.mix(zc, '#ffffff', 0.25); c.fillRect(x, y + i * 8, ts, 5); c.fillStyle = U.shade(zc, -0.18); c.fillRect(x, y + i * 8 + 5, ts, 3); } }
      });
      this.world = new R6.World({ map: this.map });
      this.cam = new R6.Camera({ bounds: { x: 0, y: -40, w: this.map.pw, h: this.map.ph + 40 } }); this.cam.set(M.start.center.x, M.start.center.y, 1.25);
      this.noise = new R6.Noises(); this.stones = 3; this.hasCard = false; this.timeLeft = R6.Save.D(420, 360, 300); this.alarm = 0;
      this.build();
    }
    rules() {
      return {
        title: 'A REVOLTA', icon: 'triangle', sub: 'INFILTRAÇÃO ATÉ A SALA DE CONTROLE',
        lines: ['Atravesse o labirinto de escadas até a SALA DE CONTROLE (canto superior direito).', 'A porta da sala exige um CARTÃO: derrube o guarda-chefe (ícone de chave) ou procure nos armários.', 'Fique fora dos cones de visão. C = andar agachado (silencioso). SHIFT = correr (barulhento).', 'E pelas costas = nocautear um guarda. Q = jogar uma pedrinha para distrair (mira no mouse).', 'Câmeras disparam o alarme e atraem guardas.'],
        keys: [['WASD', 'mover'], ['C', 'agachar'], ['E', 'nocautear/usar'], ['Q', 'distrair'], ['SHIFT', 'correr']],
      };
    }
    build() {
      const S = R6.State, M = this.M, map = this.map;
      const look = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 });
      const st = M.start.center;
      this.pl = this.world.add(new R6.Actor({ p: S.s ? S.player : null, look, x: st.x, y: st.y, isPlayer: true, speed: 92, runSpeed: 160, id: 'player' }));
      this.pl.canOpenDoors = true;
      // allies
      this.allies = [];
      if (S.s && this.campaign) {
        const pick = ['soldier', 'buddy', 'marine'].map(k => S.byKey(k)).filter(p => p && p.alive && (p.key !== 'buddy' || S.flag('revolt_buddy')));
        pick.forEach((p, i) => { const a = this.world.add(new R6.Actor({ p, look: p.look, x: st.x - 20 - i * 18, y: st.y + 20, speed: 95, runSpeed: 160 })); a.follow = true; a.canOpenDoors = true; this.allies.push(a); });
      }
      // lock the goal: doors on every corridor entering the goal cell
      const g = M.goal; this.goalCell = g;
      for (const L of M.links) {
        const touches = (L[0] === g.cx && L[1] === g.cy) || (L[2] === g.cx && L[3] === g.cy);
        if (!touches) continue;
        const d = R6.corridorDoor(M, L);
        for (let k = 0; k < d.len; k++) { const tx = d.horiz ? d.tx + k : d.tx, ty = d.horiz ? d.ty : d.ty + k; if (map.get(tx, ty) === T.FLOOR) map.addDoor(tx, ty, { locked: true, color: '#8a1f33', horiz: d.horiz }); }
      }
      // guards with patrol routes
      const cells = M.cells.filter(c => !(c.cx === 0 && c.cy === M.rows - 1) && !(c.cx < 2 && c.cy > M.rows - 3));
      const nG = R6.Save.D(9, 11, 13);
      this.guards = [];
      for (let i = 0; i < nG; i++) {
        const route = U.shuffle(cells.slice()).slice(0, 3).map(c => c.center);
        const gd = new R6.Guard(this.world, { x: route[0].x, y: route[0].y, route, look: R6.Char.makeLook({ outfit: 'guard', mask: i === 0 ? 'square' : U.pick(['circle', 'triangle']), seed: 900 + i }), onCatch: g2 => this.caught(g2), range: R6.Save.D(230, 260, 290) });
        if (i === 0) { gd.key = 'card'; gd.a.label = '⚿'; gd.a.labelColor = '#f2c14e'; }
        this.guards.push(gd);
      }
      // cameras at big rooms / junctions
      this.cams = U.shuffle(M.cells.filter(c => c.big)).slice(0, R6.Save.D(4, 6, 7)).map(c => new R6.SecCam(map, { x: c.x * 32 + 8, y: c.y * 32 + 8, a: Math.PI / 4, sweep: 0.7, range: 260 }));
      // locker with a spare keycard in a random big room far from start
      const far = M.cells.filter(c => c.big && c.cx > 4).sort(() => Math.random() - 0.5)[0] || M.cellAt(M.cols - 1, M.rows - 1);
      this.locker = { x: far.center.x, y: far.center.y, used: false };
      this.world.objects.push({ x: this.locker.x, y: this.locker.y, sy: this.locker.y, draw: (c) => { c.fillStyle = '#6b7c8a'; c.fillRect(this.locker.x - 14, this.locker.y - 44, 28, 44); c.fillStyle = '#4a5864'; c.fillRect(this.locker.x - 14, this.locker.y - 44, 28, 4); c.fillStyle = this.locker.used ? '#555' : '#f2c14e'; c.fillRect(this.locker.x + 6, this.locker.y - 26, 3, 6); } });
      // wall lamps
      this.lamps = M.cells.filter((c, i) => i % 3 === 0).map(c => ({ x: c.center.x, y: c.center.y }));
    }
    begin() {
      R6.Music.play('tension'); R6.Music.setIntensity(0.35); R6.Audio.loop('alarm', 0.0); R6.Audio.loop('hum', 0.3);
      R6.Dialog.toast(this.allies[0] ? this.allies[0].p : { name: 'VOCÊ', look: this.pl.look }, this.allies[0] ? 'Eu vou atrás de você. Sem barulho.' : 'Sozinho, então. Sem barulho.', 3);
    }
    focus() { const s = this.cam.toScreen(this.pl.x, this.pl.y); return { x: s.x, y: s.y, look: this.pl.look, scale: 0.46 * this.cam.zoom, facing: 1 }; }
    caught(g) {
      if (this.result) return;
      g.a.setAnim('grab', 0.6); this.pl.setAnim('handsup', 0); R6.Audio.sfx('siren'); R6.Engine.flash('#ff1133', 0.3);
      if (this.campaign) R6.State.flag('revolt_caught', true);
      this.lose({ reason: 'Você foi capturado' });
    }
    triggerAlarm(src) {
      this.alarm = 8; R6.Audio.sfx('siren'); R6.Audio.loopVol('alarm', 0.6); R6.Toast.show('ALARME! Guardas a caminho.', { color: '#ff3b5c', icon: 'x' });
      for (const g of this.guards) if (!g.down && U.dist(g.x, g.y, src.x, src.y) < 900) { g.state = 'investigate'; g.last = { x: this.pl.x, y: this.pl.y }; g.a.goTo(this.world, this.pl.x, this.pl.y, true); g.sus = 0.6; }
    }
    update(dt) {
      this.t += dt; this.world.update(dt); this.noise.update(dt);
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      this.timeLeft -= dt; if (this.timeLeft <= 0) { this.lose({ reason: 'As luzes voltaram — a revolta foi descoberta' }); return; }
      const I = R6.Input, pl = this.pl;
      const sneak = I.act('sneak'), run = I.act('run') && !sneak;
      const ax = I.axis(); pl.steer(ax.x, ax.y, run); pl.slow = sneak ? 0.55 : 1; pl.idleAnim = sneak ? 'crouch' : 'idle';
      if (sneak && pl.spd > 5) pl.setAnim('sneak', 0.1);
      const moving = pl.spd > 12;
      const vis = sneak ? (moving ? 0.45 : 0.3) : moving ? (run ? 1 : 0.8) : 0.6;
      if (moving && !sneak) { this.stepT = (this.stepT || 0) + dt; if (this.stepT > (run ? 0.3 : 0.5)) { this.stepT = 0; const r = run ? 190 : 80; this.noise.add(pl.x, pl.y, r, { color: run ? '255,200,120' : '255,255,255' }); for (const g of this.guards) g.hear(pl.x, pl.y, r); } }
      // allies follow in a line
      this.allies.forEach((a, i) => { const lead = i === 0 ? pl : this.allies[i - 1]; const d = U.dist(a.x, a.y, lead.x, lead.y); a.idleAnim = sneak ? 'crouch' : 'idle'; if (d > 34) { a.repathT = (a.repathT || 0) - dt; if (a.repathT <= 0 || !a.path) { a.repathT = 0.5; a.goTo(this.world, lead.x, lead.y, d > 120); } } else a.stop(); });
      // guards
      for (const g of this.guards) { g.update(dt, pl, vis); for (const a of this.allies) if (!g.down && g.state !== 'chase' && g.canSee(a.x, a.y, 0.7)) { g.sus = Math.min(1, g.sus + dt * 0.4); g.last = { x: a.x, y: a.y }; } }
      for (const c of this.cams) c.update(dt, pl, vis, cc => this.triggerAlarm(cc));
      if (this.alarm > 0) { this.alarm -= dt; if (this.alarm <= 0) R6.Audio.loopVol('alarm', 0); }
      const chasing = this.guards.some(g => g.state === 'chase');
      R6.Music.setIntensity(chasing ? 1 : this.guards.some(g => g.sus > 0.3) ? 0.7 : 0.35);
      // takedown / interact
      if (I.actP('interact')) {
        let done = false;
        for (const g of this.guards) {
          if (g.down) continue; const d = U.dist(g.x, g.y, pl.x, pl.y);
          const behind = Math.abs(U.angDiff(g.facing, Math.atan2(pl.y - g.y, pl.x - g.x))) > 1.6;
          if (d < 38 && (behind || g.state !== 'chase' && g.sus < 0.5)) { pl.setAnim('punch', 0.35); pl.faceTo(g.x, g.y); g.knockOut(); done = true; if (g.key === 'card') { this.hasCard = true; R6.State.s && R6.State.give('keycard'); R6.Toast.show('Você pegou o CARTÃO DE ACESSO!', { color: '#f2c14e', icon: 'square' }); } this.noise.add(g.x, g.y, 120); for (const o of this.guards) o.hear(g.x, g.y, 120); break; }
        }
        if (!done && !this.locker.used && U.dist(pl.x, pl.y, this.locker.x, this.locker.y) < 40) { this.locker.used = true; this.hasCard = true; R6.Audio.sfx('door'); R6.Toast.show('Cartão reserva encontrado no armário!', { color: '#f2c14e', icon: 'square' }); }
        if (!done) { // doors
          const t0 = this.map.tileOf(pl.x, pl.y);
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const d = this.map.doorAt(t0.tx + ox, t0.ty + oy); if (d && d.locked) { if (this.hasCard) { d.locked = false; this.map.setDoor(d, true); R6.Audio.sfx('beep'); R6.Audio.sfx('door'); } else if (!this._cardMsg) { this._cardMsg = 1.5; R6.Toast.show('Porta trancada — precisa de um cartão.', { color: '#ff5a6a' }); } } }
        }
      }
      if (this._cardMsg) { this._cardMsg -= dt; if (this._cardMsg <= 0) this._cardMsg = 0; }
      // throw a stone
      if (I.actP('alt') && this.stones > 0) {
        const m = this.cam.toWorld(I.mouse.x, I.mouse.y); const dx = m.x - pl.x, dy = m.y - pl.y; const d = Math.min(300, Math.hypot(dx, dy)) || 1;
        const tx = pl.x + dx / Math.hypot(dx, dy || 1) * d, ty = pl.y + dy / Math.hypot(dx, dy || 1) * d;
        this.stones--; this.thrown = { x0: pl.x, y0: pl.y - 20, x1: tx, y1: ty, t: 0 }; R6.Audio.sfx('whoosh', { vol: 0.4 });
      }
      if (this.thrown) { const th = this.thrown; th.t += dt * 2.5; if (th.t >= 1) { this.noise.add(th.x1, th.y1, 260, { color: '255,220,120' }); R6.Audio.sfx('stepHard'); for (const g of this.guards) g.hear(th.x1, th.y1, 300); this.thrown = null; } }
      // reach the control room
      const gc = this.goalCell; if (pl.x > gc.x * 32 && pl.x < (gc.x + gc.w) * 32 && pl.y > gc.y * 32 && pl.y < (gc.y + gc.h) * 32) this.reachGoal();
      this.cam.follow(pl.x, pl.y - 10, sneak ? 1.35 : 1.25); this.cam.update(dt);
    }
    reachGoal() { if (this.result) return; R6.Audio.stopLoop('alarm'); this.chips = 120; if (this.campaign) R6.State.flag('revolt_reached', true); this.win({ title: 'SALA DE CONTROLE', sub: 'VOCÊ CHEGOU À PORTA DO CONTROLE…' }); }
    debugWin() { this.phase = 'play'; this.reachGoal(); }
    render(ctx) {
      const cam = this.cam, t = this.t;
      ctx.fillStyle = '#0c0a10'; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      this.world.drawFloorExtra = (c) => { for (const g of this.guards) g.drawCone(c); for (const cc of this.cams) cc.draw(c, t); this.noise.draw(c); const gc = this.goalCell; c.fillStyle = 'rgba(232,51,109,.18)'; c.fillRect(gc.x * 32, gc.y * 32, gc.w * 32, gc.h * 32); R6.UI.text(c, 'CONTROLE', gc.center.x, gc.center.y, { size: 22, fam: 'title', align: 'center', color: 'rgba(232,51,109,.7)' }); };
      this.world.draw(ctx, cam);
      if (this.thrown) { const th = this.thrown; const x = U.lerp(th.x0, th.x1, th.t), y = U.lerp(th.y0, th.y1, th.t) - Math.sin(th.t * Math.PI) * 60; ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
      // takedown prompt
      for (const g of this.guards) if (!g.down && U.dist(g.x, g.y, this.pl.x, this.pl.y) < 50) { ctx.save(); ctx.translate(g.x - 30, g.y - 80); R6.UI.keyHint(ctx, 'E', 'NOCAUTEAR', 0, 0); ctx.restore(); break; }
      cam.end(ctx);
      // darkness with lamps
      const lights = [{ ...cam.toScreen(this.pl.x, this.pl.y - 20), r: 260, a: 0.85 }];
      for (const l of this.lamps) { const s = cam.toScreen(l.x, l.y); lights.push({ x: s.x, y: s.y, r: 200 * cam.zoom, a: 0.7, color: '#ffe6b0' }); }
      R6.Light.draw(ctx, this.alarm > 0 ? 0.35 : 0.5, lights, this.alarm > 0 ? '#2a0008' : '#07060c');
      if (this.alarm > 0) { ctx.fillStyle = `rgba(255,0,40,${0.08 + Math.sin(t * 10) * 0.06})`; ctx.fillRect(0, 0, R6.W, R6.H); }
      R6.UI.vignette(ctx, 0.5);
      if (this.phase === 'play') {
        R6.HUD.draw(ctx, { game: 'A REVOLTA', timer: Math.max(0, this.timeLeft), objective: this.hasCard ? 'Você tem o cartão. Vá até a SALA DE CONTROLE.' : 'Pegue o cartão (guarda-chefe ⚿ ou armário) e chegue à sala de controle', hide: { feed: true } });
        R6.UI.panel(ctx, 16, 96, 220, 40, { fill: 'rgba(6,8,12,.7)', shadow: false });
        R6.UI.text(ctx, 'PEDRAS: ' + this.stones + '   CARTÃO: ' + (this.hasCard ? 'SIM' : 'NÃO'), 30, 122, { size: 15, weight: 800, color: this.hasCard ? '#f2c14e' : '#ddd' });
        // mini map
        this.drawMini(ctx);
      }
      this.drawRules(ctx);
    }
    drawMini(ctx) {
      const M = this.M, s = 4, x0 = R6.W - M.map.w * s - 20, y0 = R6.H - M.map.h * s - 20;
      if (!this._mini) { const cv = document.createElement('canvas'); cv.width = M.map.w; cv.height = M.map.h; const c = cv.getContext('2d'); for (let y = 0; y < M.map.h; y++) for (let x = 0; x < M.map.w; x++) { if (M.map.get(x, y) !== T.WALL) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, 1, 1); } } this._mini = cv; }
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x0 - 4, y0 - 4, M.map.w * s + 8, M.map.h * s + 8); ctx.imageSmoothingEnabled = false; ctx.drawImage(this._mini, x0, y0, M.map.w * s, M.map.h * s);
      const gc = this.goalCell; ctx.fillStyle = '#e8336d'; ctx.fillRect(x0 + gc.x * s, y0 + gc.y * s, gc.w * s, gc.h * s);
      ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.arc(x0 + this.pl.x / 32 * s, y0 + this.pl.y / 32 * s, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  R6.Revolt = Revolt;
  R6.registerGame('revolt', { name: 'A Revolta', season: 2, icon: 'triangle', desc: 'Infiltração até a sala de controle.', create: o => new Revolt(o) });
})();
