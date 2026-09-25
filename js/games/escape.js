/* ROUND 6 — escape.js : The Escape — top-down facility with guards, cameras, alarms, lockdown, items and four routes:
   A tunnel (crowbar), B elevator (keycard), C secret VIP passage (painting), D hidden archive (push wall) */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU, T = R6.T;

  class Escape extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'escape'; this.name = 'escape';
      const M = R6.genMaze({ cols: 12, rows: 8, cell: 6, corr: 3, roomy: true, roomChance: 0.34, loops: 0.3, seed: opts.seed || 9090 + (R6.State.s ? R6.State.s.seed : 0), zone: (cx, cy) => (cx + cy) % 3 === 0 ? 1 : (cx * cy) % 5 === 0 ? 3 : 0, wallStyle: (cx, cy) => (cx < 3 && cy < 3) ? 7 : 5 });
      this.M = M; this.map = M.map;
      this.world = new R6.World({ map: this.map });
      this.cam = new R6.Camera({ bounds: { x: 0, y: -40, w: this.map.pw, h: this.map.ph + 40 } });
      this.noise = new R6.Noises(); this.inv = { crowbar: false, keycard: R6.State.s ? R6.State.has('keycard') && false : false, flashlight: false };
      this.alarms = 0; this.alarm = 0; this.lockdown = false; this.found = { C: !!(R6.State.s && (R6.State.flag('oldman_gift') || R6.State.has('photo'))), D: !!(R6.State.s && (R6.State.has('map') || R6.State.flag('oldman_left'))) };
      this.notes = []; this.timeLeft = R6.Save.D(480, 420, 360);
      this.build();
    }
    rules() {
      return {
        title: 'A FUGA', icon: 'triangle', sub: 'VOCÊ VENCEU. MAS NINGUÉM DEVERIA SAIR ASSIM.',
        lines: ['Fuja da instalação antes de ser capturado. Existem várias rotas:', 'A · TÚNEL — precisa de um pé de cabra para abrir o bueiro.', 'B · ELEVADOR — precisa de um cartão de acesso (bloqueia se houver alarmes demais).', 'C e D · ??? — leia os bilhetes (E) e procure passagens escondidas.', 'Câmeras e guardas disparam alarmes. Agachado (C) você é quase invisível.'],
        keys: [['WASD', 'mover'], ['C', 'agachar'], ['E', 'usar/ler/nocautear'], ['Q', 'distrair'], ['SHIFT', 'correr']],
      };
    }
    build() {
      const S = R6.State, M = this.M, map = this.map;
      map.buildFloor((c, x, y, ts, s, tx, ty, v) => { R6.Floors.industrial(c, x, y, ts, s, tx, ty, v); if (tx < 18 && ty < 18) { c.fillStyle = 'rgba(160,20,40,.35)'; c.fillRect(x, y, ts, ts); } });
      const start = M.cellAt(0, 4);
      const look = S.s ? Object.assign({}, S.s.player.look) : R6.Char.makeLook({ num: 456 });
      this.pl = this.world.add(new R6.Actor({ p: S.s ? S.player : null, look, x: start.center.x, y: start.center.y, isPlayer: true, speed: 95, runSpeed: 165, id: 'player' }));
      this.cam.set(this.pl.x, this.pl.y, 1.25);
      const pickBig = (f) => U.shuffle(M.cells.filter(c => c.big && f(c)))[0] || U.pick(M.cells.filter(f));
      this.spots = {
        crowbar: pickBig(c => c.cy >= 4 && c.cx >= 3 && c.cx <= 8),
        keycard: pickBig(c => c.cy <= 3 && c.cx >= 4 && c.cx <= 9),
        elevator: M.cellAt(M.cols - 1, 0),
        manhole: M.cellAt(M.cols - 1, M.rows - 1),
        painting: M.cellAt(0, 0),
        archive: M.cellAt(5, 3),
      };
      const P = this.spots;
      this.items = [
        { id: 'crowbar', x: P.crowbar.center.x, y: P.crowbar.center.y, label: 'PÉ DE CABRA', taken: false },
        { id: 'keycard', x: P.keycard.center.x + 20, y: P.keycard.center.y, label: 'CARTÃO', taken: false },
        { id: 'flashlight', x: M.cellAt(2, 6).center.x, y: M.cellAt(2, 6).center.y, label: 'LANTERNA', taken: false },
      ];
      this.notes = [
        { x: M.cellAt(1, 2).center.x, y: M.cellAt(1, 2).center.y, text: 'Bilhete amassado: "Os convidados de máscara dourada nunca usam o elevador. Eles saem por trás do QUADRO DOURADO na sala de estar." ', reveals: 'C' },
        { x: M.cellAt(7, 5).center.x, y: M.cellAt(7, 5).center.y, text: 'Diário de manutenção: "Parede rachada no centro do complexo. Ordem do Anfitrião: ninguém entra na sala sem nome."', reveals: 'D' },
        { x: M.cellAt(9, 3).center.x, y: M.cellAt(9, 3).center.y, text: 'Aviso: "Bueiro de manutenção no canto sudeste. Tampa emperrada — use a ferramenta do depósito."', reveals: 'A' },
      ];
      // push wall for the archive: pick a wall tile next to the archive cell
      const ac = P.archive; this.pushWall = { tx: ac.x + ac.w, ty: ac.y + 1 };
      if (map.get(this.pushWall.tx, this.pushWall.ty) !== T.WALL) this.pushWall = { tx: ac.x - 1, ty: ac.y + 1 };
      // guards + cameras
      const cells = M.cells.filter(c => Math.abs(c.cx - 0) + Math.abs(c.cy - 4) > 2);
      this.guards = [];
      for (let i = 0; i < R6.Save.D(10, 12, 14); i++) {
        const route = U.shuffle(cells.slice()).slice(0, 3).map(c => c.center);
        this.guards.push(new R6.Guard(this.world, { x: route[0].x, y: route[0].y, route, look: R6.Char.makeLook({ outfit: 'guard', mask: U.pick(['circle', 'triangle', 'square']), seed: 1200 + i }), onCatch: g => this.caught(g), range: R6.Save.D(240, 270, 300) }));
      }
      this.cams = U.shuffle(M.cells.filter(c => c.big)).slice(0, R6.Save.D(5, 7, 8)).map(c => new R6.SecCam(map, { x: c.x * 32 + 10, y: c.y * 32 + 8, a: Math.PI / 4, sweep: 0.8, range: 280 }));
      this.lamps = M.cells.filter((c, i) => i % 3 === 1).map(c => ({ x: c.center.x, y: c.center.y }));
      // world objects
      const O = this.world.objects;
      for (const it of this.items) O.push({ x: it.x, y: it.y, sy: it.y, draw: (c, t) => { if (it.taken) return; c.fillStyle = 'rgba(242,193,78,.25)'; c.beginPath(); c.arc(it.x, it.y, 16 + Math.sin(t * 4) * 3, 0, TAU); c.fill(); c.fillStyle = it.id === 'crowbar' ? '#b33' : it.id === 'keycard' ? '#c9a36b' : '#444'; c.fillRect(it.x - 8, it.y - 4, 16, 8); } });
      for (const n of this.notes) O.push({ x: n.x, y: n.y, sy: n.y, draw: (c) => { c.fillStyle = '#f2ecd8'; c.save(); c.translate(n.x, n.y); c.rotate(0.2); c.fillRect(-7, -9, 14, 18); c.fillStyle = '#999'; for (let i = 0; i < 4; i++) c.fillRect(-5, -6 + i * 4, 10, 1); c.restore(); } });
      const E = P.elevator.center, MH = P.manhole.center, PA = P.painting.center;
      O.push({ x: E.x, y: E.y, sy: E.y - 20, draw: (c) => { c.fillStyle = '#20242b'; c.fillRect(E.x - 36, E.y - 80, 72, 76); c.fillStyle = this.lockdown ? '#551111' : '#9aa3ad'; c.fillRect(E.x - 32, E.y - 76, 32, 70); c.fillRect(E.x + 1, E.y - 76, 31, 70); c.fillStyle = this.lockdown ? '#ff3b5c' : '#2ec4b6'; c.fillRect(E.x - 6, E.y - 92, 12, 8); R6.UI.text(c, this.lockdown ? 'BLOQUEADO' : 'ELEVADOR', E.x, E.y - 98, { size: 12, align: 'center', color: '#fff', weight: 800 }); } });
      O.push({ x: MH.x, y: MH.y, sy: MH.y - 40, draw: (c) => { c.fillStyle = '#2a2d33'; c.beginPath(); c.ellipse(MH.x, MH.y, 26, 15, 0, 0, TAU); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(MH.x + i * 8, MH.y - 12); c.lineTo(MH.x + i * 8, MH.y + 12); c.stroke(); } } });
      O.push({ x: PA.x, y: PA.y - 60, sy: PA.y - 60, draw: (c) => { const x = PA.x, y = P.painting.y * 32 - 30; c.fillStyle = '#d4a73a'; c.fillRect(x - 40, y - 10, 80, 56); c.fillStyle = '#3a2a1a'; c.fillRect(x - 32, y - 2, 64, 40); c.fillStyle = '#e8c86a'; c.beginPath(); c.arc(x, y + 16, 12, 0, TAU); c.fill(); if (this.found.C) { c.strokeStyle = 'rgba(255,230,120,.8)'; c.lineWidth = 3; c.strokeRect(x - 42, y - 12, 84, 60); } } });
      this.painting = { x: PA.x, y: P.painting.y * 32 + 30 };
    }
    begin() {
      R6.Music.play('action'); R6.Music.setIntensity(0.35); R6.Audio.loop('alarm', 0); R6.Audio.loop('hum', 0.3);
      R6.Dialog.toast(null, 'Uma voz no rádio de um guarda: "O vencedor não chegou ao ponto de saída. Encontrem-no."', 3.4, { mode: 'announce', name: 'RÁDIO' });
    }
    focus() { const s = this.cam.toScreen(this.pl.x, this.pl.y); return { x: s.x, y: s.y, look: this.pl.look, scale: 0.46 * this.cam.zoom, facing: 1 }; }
    caught(g) { if (this.result) return; g.a.setAnim('grab', 0.6); this.pl.setAnim('handsup', 0); R6.Audio.sfx('siren'); this.lose({ reason: 'Você foi capturado' }); }
    raiseAlarm(src) {
      this.alarms++; this.alarm = 10; R6.Audio.sfx('siren'); R6.Audio.loopVol('alarm', 0.6);
      R6.Toast.show('ALARME ' + this.alarms + '/3', { color: '#ff3b5c', icon: 'x' });
      for (const g of this.guards) if (!g.down && U.dist(g.x, g.y, src.x, src.y) < 1000) { g.state = 'investigate'; g.last = { x: this.pl.x, y: this.pl.y }; g.a.goTo(this.world, this.pl.x, this.pl.y, true); }
      if (this.alarms >= 3 && !this.lockdown) { this.lockdown = true; R6.Dialog.announce('LOCKDOWN. Elevadores bloqueados.', null, 2.6); }
    }
    update(dt) {
      this.t += dt; this.world.update(dt); this.noise.update(dt);
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      if (R6.Dialog.active && R6.Dialog.cur && !R6.Dialog.cur.auto) { this.cam.update(dt); return; }
      this.timeLeft -= dt; if (this.timeLeft <= 0) { this.lose({ reason: 'Os reforços chegaram' }); return; }
      const I = R6.Input, pl = this.pl;
      const sneak = I.act('sneak'), run = I.act('run') && !sneak; const ax = I.axis();
      pl.steer(ax.x, ax.y, run); pl.slow = sneak ? 0.55 : 1; pl.idleAnim = sneak ? 'crouch' : 'idle'; if (sneak && pl.spd > 5) pl.setAnim('sneak', 0.1);
      const moving = pl.spd > 12; const vis = sneak ? (moving ? 0.4 : 0.25) : moving ? (run ? 1 : 0.8) : 0.55;
      if (moving && !sneak) { this.stepT = (this.stepT || 0) + dt; if (this.stepT > (run ? 0.3 : 0.5)) { this.stepT = 0; const r = run ? 190 : 80; this.noise.add(pl.x, pl.y, r); for (const g of this.guards) g.hear(pl.x, pl.y, r); } }
      for (const g of this.guards) g.update(dt, pl, vis);
      for (const c of this.cams) c.update(dt, pl, vis, cc => this.raiseAlarm(cc));
      if (this.alarm > 0) { this.alarm -= dt; if (this.alarm <= 0) R6.Audio.loopVol('alarm', 0); }
      R6.Music.setIntensity(this.guards.some(g => g.state === 'chase') ? 1 : this.alarm > 0 ? 0.8 : 0.35);
      if (I.actP('interact')) this.interact();
      if (I.actP('alt') && !this.thrown) { const m = this.cam.toWorld(I.mouse.x, I.mouse.y); this.thrown = { x0: pl.x, y0: pl.y - 20, x1: m.x, y1: m.y, t: 0 }; }
      if (this.thrown) { const th = this.thrown; th.t += dt * 2.5; if (th.t >= 1) { this.noise.add(th.x1, th.y1, 260, { color: '255,220,120' }); R6.Audio.sfx('stepHard'); for (const g of this.guards) g.hear(th.x1, th.y1, 300); this.thrown = null; } }
      this.cam.follow(pl.x, pl.y - 10, sneak ? 1.35 : 1.25); this.cam.update(dt);
    }
    interact() {
      const pl = this.pl, P = this.spots;
      for (const g of this.guards) { if (g.down) continue; if (U.dist(g.x, g.y, pl.x, pl.y) < 38 && Math.abs(U.angDiff(g.facing, Math.atan2(pl.y - g.y, pl.x - g.x))) > 1.6) { pl.setAnim('punch', 0.35); g.knockOut(); if (!this.inv.keycard && Math.random() < 0.35) { this.inv.keycard = true; R6.Toast.show('O guarda tinha um CARTÃO!', { color: '#f2c14e', icon: 'square' }); } return; } }
      for (const it of this.items) if (!it.taken && U.dist(it.x, it.y, pl.x, pl.y) < 40) { it.taken = true; this.inv[it.id] = true; R6.Audio.sfx('coin'); R6.Toast.show('Pegou: ' + it.label, { color: '#f2c14e', icon: 'square' }); return; }
      for (const n of this.notes) if (U.dist(n.x, n.y, pl.x, pl.y) < 40) { R6.Audio.sfx('zip'); R6.Dialog.show({ who: null, text: n.text, name: 'BILHETE' }); if (n.reveals === 'C' || n.reveals === 'D') this.found[n.reveals] = true; return; }
      // routes
      if (U.dist(P.elevator.center.x, P.elevator.center.y, pl.x, pl.y) < 60) { if (this.lockdown) { R6.Audio.sfx('error'); R6.Toast.show('Elevador bloqueado pelo lockdown.', { color: '#ff5a6a' }); } else if (!this.inv.keycard) { R6.Audio.sfx('error'); R6.Toast.show('Precisa de um CARTÃO DE ACESSO.', { color: '#ff5a6a' }); } else this.finish('B'); return; }
      if (U.dist(P.manhole.center.x, P.manhole.center.y, pl.x, pl.y) < 50) { if (!this.inv.crowbar) { R6.Audio.sfx('error'); R6.Toast.show('A tampa está emperrada. Precisa de um PÉ DE CABRA.', { color: '#ff5a6a' }); } else this.finish('A'); return; }
      if (U.dist(this.painting.x, this.painting.y, pl.x, pl.y) < 60) { if (this.found.C) this.finish('C'); else R6.Toast.show('Um quadro dourado estranho. Há uma corrente de ar atrás dele…', { color: '#bbb' }); this.found.C = true; return; }
      const pw = this.map.center(this.pushWall.tx, this.pushWall.ty);
      if (U.dist(pw.x, pw.y, pl.x, pl.y) < 50) { if (this.found.D) { R6.Audio.sfx('doorSlam'); this.finish('D'); } else { R6.Toast.show('A parede está rachada. Parece oca…', { color: '#bbb' }); this.found.D = true; } return; }
    }
    finish(route) {
      if (this.result) return; this.route = route;
      R6.Audio.stopLoop('alarm');
      if (this.campaign) R6.State.decide('escape_route', route, { A: 'Túnel', B: 'Elevador', C: 'Saída secreta', D: 'Área escondida' }[route]);
      this.chips = 150;
      this.win({ title: { A: 'O TÚNEL', B: 'O ELEVADOR', C: 'A PASSAGEM DOS VIPs', D: 'A SALA SEM NOME' }[route], sub: 'ROTA ' + route, wait: 2.6 });
    }
    summary() { return { route: this.route }; }
    debugWin(route) { this.phase = 'play'; this.finish(route || 'B'); }
    render(ctx) {
      const cam = this.cam, t = this.t;
      ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      this.world.drawFloorExtra = (c) => {
        for (const g of this.guards) g.drawCone(c); for (const cc of this.cams) cc.draw(c, t); this.noise.draw(c);
        const pw = this.map.center(this.pushWall.tx, this.pushWall.ty);
        if (this.found.D) { c.strokeStyle = `rgba(255,220,120,${0.5 + Math.sin(t * 4) * 0.3})`; c.lineWidth = 3; c.strokeRect(pw.x - 16, pw.y - 42, 32, 32); }
      };
      this.world.draw(ctx, cam);
      // crack on the push wall (drawn over wall top)
      const pw = this.map.center(this.pushWall.tx, this.pushWall.ty); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pw.x - 8, pw.y - 40); ctx.lineTo(pw.x, pw.y - 30); ctx.lineTo(pw.x - 4, pw.y - 22); ctx.lineTo(pw.x + 6, pw.y - 14); ctx.stroke();
      if (this.thrown) { const th = this.thrown; ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(U.lerp(th.x0, th.x1, th.t), U.lerp(th.y0, th.y1, th.t) - Math.sin(th.t * Math.PI) * 60, 4, 0, TAU); ctx.fill(); }
      cam.end(ctx);
      const ps = cam.toScreen(this.pl.x, this.pl.y - 16);
      const lights = [{ x: ps.x, y: ps.y, r: (this.inv.flashlight ? 330 : 220) * cam.zoom, a: 0.9 }];
      for (const l of this.lamps) { const s = cam.toScreen(l.x, l.y); lights.push({ x: s.x, y: s.y, r: 190 * cam.zoom, a: 0.65, color: '#cfe6ff' }); }
      R6.Light.draw(ctx, this.alarm > 0 ? 0.55 : 0.72, lights, this.alarm > 0 ? '#2a0008' : '#04050a');
      if (this.alarm > 0) { ctx.fillStyle = `rgba(255,0,40,${0.07 + Math.sin(t * 10) * 0.05})`; ctx.fillRect(0, 0, R6.W, R6.H); }
      R6.UI.vignette(ctx, 0.5);
      if (this.phase === 'play') {
        R6.HUD.draw(ctx, { game: 'A FUGA', timer: Math.max(0, this.timeLeft), objective: 'Escolha uma rota e fuja. E: usar · ler bilhetes · nocautear', hide: { feed: true, prize: true } });
        const routes = [['A', 'TÚNEL', this.inv.crowbar ? 'pé de cabra ✓' : 'precisa: pé de cabra'], ['B', 'ELEVADOR', this.lockdown ? 'BLOQUEADO' : this.inv.keycard ? 'cartão ✓' : 'precisa: cartão'], ['C', this.found.C ? 'PASSAGEM DOS VIPs' : '???', this.found.C ? 'atrás do quadro dourado (NO)' : 'leia os bilhetes'], ['D', this.found.D ? 'SALA SEM NOME' : '???', this.found.D ? 'parede rachada no centro' : 'leia os bilhetes']];
        R6.UI.panel(ctx, 16, 96, 330, 30 + routes.length * 24, { fill: 'rgba(6,8,12,.78)', shadow: false });
        routes.forEach(([k, n, s], i) => { R6.UI.text(ctx, k + ' · ' + n, 30, 120 + i * 24, { size: 14, weight: 800, color: '#fff' }); R6.UI.text(ctx, s, 330, 120 + i * 24, { size: 12, weight: 700, color: s.includes('✓') ? '#2ec4b6' : s === 'BLOQUEADO' ? '#ff3b5c' : '#999', align: 'right' }); });
        R6.UI.text(ctx, 'ALARMES ' + this.alarms + '/3', R6.W - 20, 110, { size: 15, weight: 800, align: 'right', color: this.alarms ? '#ff5a6a' : '#999' });
      }
      this.drawRules(ctx);
    }
  }

  R6.Escape = Escape;
  R6.registerGame('escape', { name: 'A Fuga', season: 3, icon: 'triangle', desc: 'Fuja da ilha por uma das quatro rotas.', create: o => new Escape(o) });
})();
