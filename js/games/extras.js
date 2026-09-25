/* ROUND 6 — extras.js : EXTRA GAMES — alternate versions of the official games + five ORIGINAL extra games
   (Clock Run, Color Rooms, Number Hunt, Falling Tiles, Freeze Challenge), clearly labeled as EXTRA, not official */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;

  // ------------------------------------------------ base for top-down original extras
  class ArenaExtra extends R6.GameBase {
    constructor(opts, cfg) {
      super(Object.assign({ mode: 'extra' }, opts));
      this.cfg = cfg; this.extraId = cfg.id; this.name = 'extra:' + cfg.id; this.title = cfg.title;
      this.W = cfg.w || 1600; this.H = cfg.h || 1100;
      this.world = new R6.World({ bounds: { x: 0, y: 0, w: this.W, h: this.H } });
      this.cam = new R6.Camera({ bounds: { x: -100, y: -100, w: this.W + 200, h: this.H + 200 } }); this.cam.set(this.W / 2, this.H / 2, 0.8);
      this.round = 0; this.state = 'idle'; this.stateT = 0; this.score = 0; this.scoreId = 'extra_' + cfg.id; this.scoreLabel = cfg.scoreLabel || 'RODADAS';
      const look = R6.State.s ? R6.State.s.player.look : R6.Char.makeLook({ num: 456 });
      const eq = R6.Save.meta.equipped.outfit; const oc = R6.SHOP_OUTFITS && R6.SHOP_OUTFITS[eq];
      const plook = Object.assign({}, look, oc ? { outfitColors: oc } : {});
      const sn = R6.VictoryFX && R6.VictoryFX.number(); if (sn) plook.num = sn;
      this.pl = this.world.add(new R6.Actor({ look: plook, x: this.W / 2, y: this.H / 2 + 60, isPlayer: true, speed: 100, runSpeed: 170, id: 'player' }));
      this.bots = [];
      for (let i = 0; i < (cfg.bots || 24); i++) {
        const tr = { courage: Math.random(), intel: Math.random(), fear: Math.random(), spd: Math.random() };
        const a = this.world.add(new R6.Actor({ look: R6.Char.makeLook({ num: 100 + i * 7 }), x: U.rand(200, this.W - 200), y: U.rand(200, this.H - 200), speed: 80 + tr.spd * 30, runSpeed: 140 + tr.spd * 40 }));
        a.tr = tr; a.ai = { t: 0, react: 0.2 + (1 - tr.intel) * 0.8 + tr.fear * 0.3, err: 0.05 + (1 - tr.intel) * 0.25 }; a.brain = (b, dt) => this.botBrain(b, dt); this.bots.push(a);
      }
    }
    rules() { return { title: this.cfg.title, icon: this.cfg.icon || 'square', sub: 'EXTRA · JOGO ORIGINAL (NÃO OFICIAL DA SÉRIE)', lines: this.cfg.lines, keys: [['WASD', 'mover'], ['SHIFT', 'correr']] }; }
    begin() { R6.Music.play('game'); R6.Music.setIntensity(0.4); this.startRound(); }
    focus() { const s = this.cam.toScreen(this.pl.x, this.pl.y); return { x: s.x, y: s.y, look: this.pl.look, scale: 0.46 * this.cam.zoom, facing: 1 }; }
    aliveBots() { return this.bots.filter(b => !b.dead); }
    elim(a, why) {
      if (a.dead) return; a.kill(); R6.Audio.sfx(a === this.pl ? 'gun' : 'gunFar', { vol: a === this.pl ? 0.9 : 0.4, gap: 0.04 });
      if (a === this.pl) { this.chips = this.round * 20; this.lose({ reason: why || 'Eliminado' }); }
    }
    update(dt) {
      this.t += dt; this.stateT += dt; this.world.update(dt);
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      if (!this.pl.dead) { const ax = R6.Input.axis(); this.pl.steer(ax.x, ax.y, R6.Input.act('run')); if (R6.VictoryFX) R6.VictoryFX.trail(this.world.fx, this.pl.x, this.pl.y, !!(ax.x || ax.y), dt); }
      this.tick(dt);
      this.cam.follow(this.pl.x, this.pl.y, this.cfg.zoom || 0.85); this.cam.update(dt);
    }
    winRound() { this.score = this.round; this.chips = 30 + this.round * 25; }
    render(ctx) {
      ctx.fillStyle = this.cfg.bg || '#0c0d12'; ctx.fillRect(0, 0, R6.W, R6.H);
      this.cam.begin(ctx); this.drawArena(ctx); this.world.draw(ctx, this.cam); this.drawTop && this.drawTop(ctx); this.cam.end(ctx);
      R6.UI.vignette(ctx, 0.45);
      if (this.phase === 'play') { R6.HUD.draw(ctx, Object.assign({ game: this.cfg.title + ' · RODADA ' + this.round, hide: { prize: true } }, this.hud ? this.hud() : {})); R6.UI.text(ctx, 'EXTRA', R6.W - 20, 30, { size: 14, align: 'right', weight: 800, color: '#e8336d', spacing: 3 }); R6.UI.text(ctx, 'VIVOS: ' + (this.aliveBots().length + (this.pl.dead ? 0 : 1)), R6.W - 20, 52, { size: 14, align: 'right', weight: 700, color: '#ccc' }); }
      if (this.big) { this.big.t += 1 / 60; if (this.big.t < 2) R6.UI.text(ctx, this.big.text, 640, 320, { size: 90, fam: 'title', align: 'center', base: 'middle', color: this.big.color || '#fff', shadow: true, alpha: Math.min(1, (2 - this.big.t) * 2), spacing: 5 }); }
      this.drawRules(ctx);
    }
    debugWin() { this.phase = 'play'; this.round = Math.max(this.round, 3); this.winRound(); this.win({ wait: 0.3 }); }
  }

  // ------------------------------------------------ CLOCK RUN
  class ClockRun extends ArenaExtra {
    constructor(o) { super(o, { id: 'clockrun', title: 'CLOCK RUN', icon: 'circle', w: 1400, h: 1400, bots: 20, zoom: 0.7, scoreLabel: 'VOLTAS', lines: ['A arena é um relógio de 12 setores. Os ponteiros derrubam o chão por onde passam.', 'Corra para os setores seguros antes que o ponteiro chegue. Cada volta fica mais rápida.', 'Sobreviva o máximo de voltas possível.'] }); this.hand = 0; this.hand2 = Math.PI; this.speed = 0.35; this.fallen = new Array(12).fill(0); }
    startRound() { this.round++; this.speed = 0.35 + this.round * 0.08; this.big = { text: 'VOLTA ' + this.round, t: 0 }; }
    sector(x, y) { const dx = x - 700, dy = y - 700; const r = Math.hypot(dx, dy); if (r < 90) return -1; if (r > 640) return -2; let a = Math.atan2(dy, dx) + Math.PI / 2; a = (a % TAU + TAU) % TAU; return Math.floor(a / TAU * 12); }
    tick(dt) {
      const prev = this.hand; this.hand += this.speed * dt; if (this.round >= 3) this.hand2 += this.speed * 0.6 * dt;
      if (Math.floor(this.hand / TAU) !== Math.floor(prev / TAU)) { this.startRound(); this.winRound(); }
      for (let i = 0; i < 12; i++) this.fallen[i] = Math.max(0, this.fallen[i] - dt);
      const hs = Math.floor((((this.hand % TAU) + TAU) % TAU) / TAU * 12); this.fallen[hs] = 2.2 + 0.1 * this.round;
      if (this.round >= 3) { const hs2 = Math.floor((((this.hand2 % TAU) + TAU) % TAU) / TAU * 12); this.fallen[hs2] = 1.6; }
      for (const a of this.world.actors) { if (a.dead) continue; const s = this.sector(a.x, a.y); if (s === -2) { a.x = U.lerp(a.x, 700, 0.05); a.y = U.lerp(a.y, 700, 0.05); } if (s >= 0 && this.fallen[s] > 0.3) { this.world.fx.emit('dust', a.x, a.y, 10); this.elim(a, 'O chão sumiu'); } }
      if (!this.aliveBots().length && !this.pl.dead && this.round > 3) { this.winRound(); this.win({ title: 'ÚLTIMO DE PÉ' }); }
    }
    botBrain(a, dt) {
      if (this.phase !== 'play') return;
      const s = this.sector(a.x, a.y); const hs = Math.floor((((this.hand % TAU) + TAU) % TAU) / TAU * 12);
      const ahead = (s - hs + 12) % 12;
      if (ahead <= 2 || !a.path) { const safe = (hs + 6 + U.randi(-2, 2)) % 12; const ang = (safe + 0.5) / 12 * TAU - Math.PI / 2; const r = U.rand(200, 560); if (Math.random() > a.ai.err || ahead <= 1) a.goTo(this.world, 700 + Math.cos(ang) * r, 700 + Math.sin(ang) * r, ahead <= 2); }
    }
    drawArena(ctx) {
      for (let i = 0; i < 12; i++) {
        const a0 = i / 12 * TAU - Math.PI / 2, a1 = (i + 1) / 12 * TAU - Math.PI / 2; const f = this.fallen[i];
        ctx.fillStyle = f > 0.3 ? '#050507' : f > 0 ? '#5a1a22' : i % 2 ? '#e9dcc4' : '#d9c6a4';
        ctx.beginPath(); ctx.moveTo(700, 700); ctx.arc(700, 700, 640, a0, a1); ctx.closePath(); ctx.fill();
        const m = (a0 + a1) / 2; R6.UI.text(ctx, String(i === 0 ? 12 : i), 700 + Math.cos(m) * 600, 700 + Math.sin(m) * 600 + 8, { size: 26, fam: 'title', align: 'center', color: f > 0.3 ? '#333' : '#5a4a3a' });
      }
      ctx.fillStyle = '#2a2d33'; ctx.beginPath(); ctx.arc(700, 700, 90, 0, TAU); ctx.fill();
      const drawHand = (h, len, col) => { ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(700, 700); ctx.lineTo(700 + Math.cos(h - Math.PI / 2) * len, 700 + Math.sin(h - Math.PI / 2) * len); ctx.stroke(); };
      drawHand(this.hand, 620, '#e8336d'); if (this.round >= 3) drawHand(this.hand2, 480, '#f2c14e');
    }
    hud() { return { objective: 'Fique longe dos ponteiros — o chão cai por onde eles passam.' }; }
  }

  // ------------------------------------------------ COLOR ROOMS
  const COLORS = [['VERMELHO', '#e84a5f'], ['AZUL', '#3a86ff'], ['VERDE', '#2ec46b'], ['AMARELO', '#f2c14e'], ['ROXO', '#9b5de5'], ['LARANJA', '#ff8c42']];
  class ColorRooms extends ArenaExtra {
    constructor(o) {
      super(o, { id: 'colorrooms', title: 'COLOR ROOMS', icon: 'square', w: 1600, h: 1100, bots: 26, scoreLabel: 'RODADAS', lines: ['Uma COR é anunciada. Entre na sala dessa cor antes do tempo acabar.', 'As cores das salas mudam a cada rodada.', 'No modo difícil, a palavra pode estar escrita em outra cor. Leia a PALAVRA.'] });
      this.rooms = [{ x: 150, y: 60, w: 380, h: 220 }, { x: 610, y: 60, w: 380, h: 220 }, { x: 1070, y: 60, w: 380, h: 220 }, { x: 150, y: 820, w: 380, h: 220 }, { x: 610, y: 820, w: 380, h: 220 }, { x: 1070, y: 820, w: 380, h: 220 }];
    }
    startRound() { this.round++; this.state = 'mix'; this.stateT = 0; this.big = null; const perm = U.shuffle(COLORS.slice()); this.rooms.forEach((r, i) => r.c = perm[i]); }
    roomOf(a) { return this.rooms.find(r => a.x > r.x && a.x < r.x + r.w && a.y > r.y && a.y < r.y + r.h); }
    tick(dt) {
      if (this.state === 'mix' && this.stateT > 2.5) { this.state = 'call'; this.stateT = 0; this.target = U.pick(this.rooms).c; this.trick = R6.Save.diff() !== 'normal' && Math.random() < 0.5 ? U.pick(COLORS.filter(c => c !== this.target)) : this.target; this.timer = Math.max(3.2, 7 - this.round * 0.35); R6.Audio.sfx('announce'); this.big = { text: this.target[0], t: 0, color: this.trick[1] }; }
      else if (this.state === 'call' && this.stateT > this.timer) {
        this.state = 'judge'; this.stateT = 0; R6.Audio.sfx('doorSlam');
        for (const a of this.world.actors) { if (a.dead) continue; const r = this.roomOf(a); if (!r || r.c !== this.target) this.elim(a, r ? 'Sala errada' : 'Fora das salas'); }
      } else if (this.state === 'judge' && this.stateT > 2) {
        if (this.pl.dead) return; this.winRound();
        if (!this.aliveBots().length) { this.win({ title: 'ÚLTIMO DE PÉ' }); return; }
        for (const a of this.world.actors) if (!a.dead && a !== this.pl) a.goTo(this.world, U.rand(300, 1300), U.rand(420, 700), false);
        this.startRound();
      }
    }
    botBrain(a, dt) {
      if (this.phase !== 'play') return;
      if (this.state === 'call') { a.ai.t += dt; if (a.ai.t < a.ai.react) return; if (!a.ai.goal || a.ai.round !== this.round) { a.ai.round = this.round; const wrong = Math.random() < a.ai.err + (this.trick !== this.target ? 0.2 : 0); const room = wrong ? U.pick(this.rooms) : this.rooms.find(r => r.c === this.target); a.ai.goal = room; a.goTo(this.world, room.x + U.rand(40, room.w - 40), room.y + U.rand(40, room.h - 40), true); } }
      else { a.ai.t = 0; a.ai.goal = null; }
    }
    drawArena(ctx) {
      ctx.fillStyle = '#e9e4da'; ctx.fillRect(0, 0, this.W, this.H);
      for (const r of this.rooms) { ctx.fillStyle = r.c ? r.c[1] : '#888'; ctx.globalAlpha = this.state === 'mix' ? 0.5 + Math.sin(this.t * 20) * 0.3 : 0.85; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.globalAlpha = 1; ctx.strokeStyle = '#333'; ctx.lineWidth = 6; ctx.strokeRect(r.x, r.y, r.w, r.h); }
    }
    hud() { return { timer: this.state === 'call' ? Math.max(0, this.timer - this.stateT) : null, sub: this.state === 'call' ? 'VÁ PARA: ' + this.target[0] : 'As cores estão mudando…', subColor: this.state === 'call' ? '#fff' : '#bbb', objective: 'Entre na sala da cor ANUNCIADA (leia a palavra)' }; }
  }

  // ------------------------------------------------ NUMBER HUNT
  class NumberHunt extends ArenaExtra {
    constructor(o) {
      super(o, { id: 'numberhunt', title: 'NUMBER HUNT', icon: 'triangle', w: 1600, h: 1100, bots: 30, scoreLabel: 'RODADAS', lines: ['Uma conta é anunciada. Suba no pedestal com o RESULTADO.', 'Cada pedestal só aguenta 3 pessoas. Quem chegar depois fica de fora.', 'Fora de um pedestal correto = eliminado.'] });
      this.pads = []; for (let i = 0; i < 24; i++) this.pads.push({ n: i + 1, x: 170 + (i % 6) * 250, y: 160 + Math.floor(i / 6) * 240, on: [] });
      U.shuffle(this.pads.map(p => p.n)).forEach((n, i) => this.pads[i].n = n);
    }
    startRound() { this.round++; this.state = 'call'; this.stateT = 0; const a = U.randi(1, 12), b = U.randi(1, 12), c = a + b; this.ans = U.clamp(c, 1, 24); this.q = c <= 24 ? a + ' + ' + b : this.ans + ''; this.timer = Math.max(3.5, 8 - this.round * 0.4); this.big = { text: this.q, t: 0 }; R6.Audio.sfx('announce'); for (const p of this.pads) p.on = []; }
    padOf(a) { return this.pads.find(p => Math.hypot(a.x - p.x, a.y - p.y) < 48); }
    tick(dt) {
      if (this.state === 'call') {
        for (const p of this.pads) p.on = p.on.filter(a => !a.dead && Math.hypot(a.x - p.x, a.y - p.y) < 52);
        for (const a of this.world.actors) { if (a.dead) continue; const p = this.padOf(a); if (p && !p.on.includes(a)) { if (p.on.length < 3) p.on.push(a); else { const ang = Math.atan2(a.y - p.y, a.x - p.x); a.x = p.x + Math.cos(ang) * 56; a.y = p.y + Math.sin(ang) * 56; } } }
        if (this.stateT > this.timer) { this.state = 'judge'; this.stateT = 0; R6.Audio.sfx('buzzer'); const good = this.pads.find(p => p.n === this.ans); for (const a of this.world.actors) { if (a.dead) continue; if (!good.on.includes(a)) this.elim(a, 'Pedestal errado'); } }
      } else if (this.state === 'judge' && this.stateT > 2) { if (this.pl.dead) return; this.winRound(); if (!this.aliveBots().length) { this.win({ title: 'ÚLTIMO DE PÉ' }); return; } this.startRound(); }
    }
    botBrain(a, dt) {
      if (this.phase !== 'play' || this.state !== 'call') { a.ai.t = 0; return; } a.ai.t += dt; if (a.ai.t < a.ai.react + 0.4) return;
      if (a.ai.round !== this.round) { a.ai.round = this.round; const wrong = Math.random() < a.ai.err; const p = wrong ? U.pick(this.pads) : this.pads.find(p => p.n === this.ans); a.goTo(this.world, p.x + U.rand(-12, 12), p.y + U.rand(-12, 12), true); }
    }
    drawArena(ctx) {
      ctx.fillStyle = '#20232b'; ctx.fillRect(0, 0, this.W, this.H);
      for (const p of this.pads) { ctx.fillStyle = p.on.length >= 3 ? '#5a3040' : '#e8e2d4'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 50, 34, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#b9b2a2'; ctx.fillRect(p.x - 50, p.y, 100, 10); R6.UI.text(ctx, String(p.n), p.x, p.y + 12, { size: 34, fam: 'title', align: 'center', color: '#222' }); }
    }
    hud() { return { timer: this.state === 'call' ? Math.max(0, this.timer - this.stateT) : null, sub: this.state === 'call' ? 'RESOLVA: ' + this.q : '', subColor: '#fff', objective: 'Suba no pedestal com o resultado (máx. 3 por pedestal)' }; }
  }

  // ------------------------------------------------ FALLING TILES
  class FallingTiles extends ArenaExtra {
    constructor(o) {
      super(o, { id: 'fallingtiles', title: 'FALLING TILES', icon: 'square', w: 1440, h: 1040, bots: 22, zoom: 0.75, scoreLabel: 'SEGUNDOS', lines: ['O chão é feito de ladrilhos. Eles piscam… e caem.', 'Ladrilhos caídos não voltam. O chão vai sumindo aos poucos.', 'Seja o último de pé.'] });
      this.ts = 80; this.cols = 18; this.rows = 13; this.tiles = new Array(this.cols * this.rows).fill(0); this.tileT = new Array(this.cols * this.rows).fill(0); this.rate = 1; this.survive = 0;
    }
    startRound() { this.round = 1; this.big = { text: 'NÃO CAIA', t: 0 }; }
    tile(x, y) { const tx = Math.floor(x / this.ts), ty = Math.floor(y / this.ts); if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return -1; return ty * this.cols + tx; }
    tick(dt) {
      this.survive += dt; this.round = 1 + Math.floor(this.survive / 15); this.score = Math.floor(this.survive);
      this.rate = 1.2 + this.survive * 0.06;
      if (Math.random() < dt * this.rate * 3) { const i = U.randi(0, this.tiles.length - 1); if (this.tiles[i] === 0) { this.tiles[i] = 1; this.tileT[i] = R6.Save.D(1.1, 0.85, 0.65); } }
      // target tiles under the player sometimes (pressure)
      if (Math.random() < dt * 0.35) { const i = this.tile(this.pl.x + U.rand(-120, 120), this.pl.y + U.rand(-120, 120)); if (i >= 0 && this.tiles[i] === 0) { this.tiles[i] = 1; this.tileT[i] = R6.Save.D(1.1, 0.85, 0.65); } }
      for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i] === 1) { this.tileT[i] -= dt; if (this.tileT[i] <= 0) { this.tiles[i] = 2; R6.Audio.sfx('crack', { vol: 0.2, gap: 0.05 }); } }
      for (const a of this.world.actors) { if (a.dead) continue; const i = this.tile(a.x, a.y); if (i >= 0 && this.tiles[i] === 2) { this.world.fx.emit('debris', a.x, a.y, 8); this.elim(a, 'O chão caiu'); } }
      if (!this.aliveBots().length && !this.pl.dead) { this.chips = 40 + this.score * 2; this.win({ title: 'ÚLTIMO DE PÉ', sub: this.score + ' SEGUNDOS' }); }
    }
    botBrain(a, dt) {
      if (this.phase !== 'play') return;
      const i = this.tile(a.x, a.y);
      if (i >= 0 && this.tiles[i] !== 0 || !a.path && Math.random() < dt * 0.5) {
        if (Math.random() < a.ai.err * 0.5) return;
        let best = null, bd = 1e9; for (let k = 0; k < 20; k++) { const j = U.randi(0, this.tiles.length - 1); if (this.tiles[j] !== 0) continue; const x = (j % this.cols + 0.5) * this.ts, y = (Math.floor(j / this.cols) + 0.5) * this.ts; const d = U.dist(x, y, a.x, a.y); if (d < bd) { bd = d; best = { x, y }; } }
        if (best) { a.path = [best]; a.pathI = 0; a.running = true; }
      }
    }
    drawArena(ctx) {
      for (let i = 0; i < this.tiles.length; i++) {
        const x = (i % this.cols) * this.ts, y = Math.floor(i / this.cols) * this.ts; const s = this.tiles[i];
        if (s === 2) { ctx.fillStyle = '#030305'; ctx.fillRect(x, y, this.ts, this.ts); continue; }
        ctx.fillStyle = s === 1 ? (Math.sin(this.t * 30) > 0 ? '#ff3b5c' : '#e9d8c0') : ((i + Math.floor(i / this.cols)) % 2 ? '#e9dcc4' : '#d6c4a2');
        ctx.fillRect(x + 2, y + 2, this.ts - 4, this.ts - 4);
      }
    }
    hud() { return { sub: 'SOBREVIVÊNCIA: ' + Math.floor(this.survive) + 's', subColor: '#fff', objective: 'Pise só em ladrilhos firmes. Os que piscam vão cair.' }; }
  }

  // ------------------------------------------------ FREEZE CHALLENGE
  class FreezeChallenge extends ArenaExtra {
    constructor(o) { super(o, { id: 'freeze', title: 'FREEZE CHALLENGE', icon: 'circle', w: 1600, h: 1100, bots: 26, scoreLabel: 'COMANDOS', lines: ['"ANDA!": você PRECISA estar se movendo em até 1 segundo.', '"CONGELA!": pare imediatamente — sem tolerância.', 'Os comandos ficam mais rápidos e às vezes vêm falsos ("CONGELA… NÃO!").', 'Versão muito mais difícil de movimento e reação.'] }); this.cmd = 'ANDA'; this.cmdT = 0; this.cmds = 0; }
    startRound() { this.round = 1; this.next(); }
    next() {
      this.cmds++; this.round = 1 + Math.floor(this.cmds / 6); this.score = this.cmds;
      const fake = this.cmds > 4 && Math.random() < 0.2;
      this.cmd = this.cmd === 'ANDA' ? 'CONGELA' : 'ANDA'; this.fake = fake && this.cmd === 'CONGELA';
      this.cmdT = 0; this.dur = Math.max(1.1, U.rand(2.2, 3.6) - this.cmds * 0.05);
      this.big = { text: this.fake ? 'CONGELA… NÃO!' : this.cmd + '!', t: 0, color: this.cmd === 'ANDA' ? '#5dff9b' : '#ff3b5c' };
      R6.Audio.sfx(this.cmd === 'ANDA' ? 'whistle' : 'buzzer', { vol: 0.5 });
      if (this.fake) this.cmd = 'ANDA';
    }
    tick(dt) {
      this.cmdT += dt;
      const grace = R6.Save.D(0.28, 0.2, 0.14);
      for (const a of this.world.actors) {
        if (a.dead) continue;
        if (this.cmd === 'CONGELA' && this.cmdT > grace && a.spd > 10) this.elim(a, 'Você se mexeu');
        if (this.cmd === 'ANDA' && this.cmdT > 1.0 && a.spd < 15) this.elim(a, 'Você ficou parado');
      }
      if (this.cmdT > this.dur) this.next();
      if (!this.aliveBots().length && !this.pl.dead) { this.chips = 40 + this.cmds * 5; this.win({ title: 'ÚLTIMO DE PÉ', sub: this.cmds + ' COMANDOS' }); }
    }
    botBrain(a, dt) {
      if (this.phase !== 'play') return;
      const t = this.cmdT - a.ai.react * 0.35;
      if (this.cmd === 'CONGELA') { if (t > 0 || Math.random() > a.ai.err * 0.06) a.steer(0, 0); }
      else if (t > 0 || Math.random() < 0.9) { if (!a.dir2 || Math.random() < dt) a.dir2 = Math.random() * TAU; a.steer(Math.cos(a.dir2), Math.sin(a.dir2), false); if (a.x < 100 || a.x > this.W - 100 || a.y < 100 || a.y > this.H - 100) a.dir2 = Math.atan2(this.H / 2 - a.y, this.W / 2 - a.x); }
    }
    drawArena(ctx) {
      ctx.fillStyle = this.cmd === 'CONGELA' ? '#2a1418' : '#14281c'; ctx.fillRect(0, 0, this.W, this.H);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < this.W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke(); } for (let y = 0; y < this.H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke(); }
      for (const [x, y] of [[80, 80], [this.W - 80, 80], [80, this.H - 80], [this.W - 80, this.H - 80]]) R6.Props.doll(ctx, x, y + 40, 0.3, { t: this.t, face: this.cmd === 'CONGELA' ? 1 : 0, glow: this.cmd === 'CONGELA' ? 0.8 : 0 });
    }
    hud() { return { sub: this.cmd === 'CONGELA' ? 'CONGELA!' : 'ANDA!', subColor: this.cmd === 'CONGELA' ? '#ff3b5c' : '#5dff9b', objective: 'ANDA = mova-se · CONGELA = pare' }; }
  }

  // ------------------------------------------------ registry
  const V = (gid, variant, extra = {}) => o => R6.Games[gid].create(Object.assign({ mode: 'extra', variant }, extra, o));
  R6.EXTRAS = [
    { id: 'ddakji_champ', name: 'Ddakji Championship', desc: '8 adversários, melhor de 3.', icon: 'square', official: true, create: o => { const s = V('ddakji', 'championship')(o); s.extraId = 'ddakji_champ'; return s; } },
    { id: 'marbles_tourney', name: 'Marbles Tournament', desc: '3 adversários cada vez mais espertos.', icon: 'circle', official: true, create: o => { const s = V('marbles', 'tournament')(o); s.extraId = 'marbles_tourney'; return s; } },
    { id: 'dalgona_ta', name: 'Dalgona Time Attack', desc: 'As 4 formas contra o relógio.', icon: 'triangle', official: true, create: o => { const s = V('dalgona', 'timeattack')(o); s.extraId = 'dalgona_ta'; return s; } },
    { id: 'redlight_endless', name: 'Red Light Endless', desc: 'Rodadas infinitas, a boneca acelera.', icon: 'circle', official: true, create: o => { const s = V('redlight', 'endless')(o); s.extraId = 'redlight_endless'; s.scoreId = 'rl_endless'; s.scoreLabel = 'RODADAS'; return s; } },
    { id: 'glass_endless', name: 'Glass Bridge Endless', desc: 'Uma ponte sem fim.', icon: 'triangle', official: true, create: o => { const s = V('glassbridge', 'endless')(o); s.extraId = 'glass_endless'; s.scoreId = 'glass_endless'; s.scoreLabel = 'PASSOS'; return s; } },
    { id: 'tug_challenge', name: 'Tug of War Challenge', desc: 'Equipes cada vez mais fortes.', icon: 'square', official: true, create: o => { const s = V('tugofwar', 'challenge')(o); s.extraId = 'tug_challenge'; return s; } },
    { id: 'mingle_extreme', name: 'Mingle Extreme', desc: 'Números rápidos, sem piedade.', icon: 'circle', official: true, create: o => { const s = V('mingle', 'extreme')(o); s.extraId = 'mingle_extreme'; return s; } },
    { id: 'hideseek_extreme', name: 'Hide and Seek Extreme', desc: 'Mais caçadores, mais escuro.', icon: 'circle', official: true, create: o => { const s = V('hideseek', 'extreme', { role: 'hider' })(o); s.extraId = 'hideseek_extreme'; return s; } },
    { id: 'jumprope_survival', name: 'Jump Rope Survival', desc: 'Pule até não aguentar mais.', icon: 'circle', official: true, create: o => { const s = V('jumprope', 'survival')(o); s.extraId = 'jumprope_survival'; s.scoreId = 'jr_survival'; s.scoreLabel = 'PULOS'; return s; } },
    { id: 'skysquid_endless', name: 'Sky Squid Endless', desc: 'Ondas sem fim no topo da torre.', icon: 'triangle', official: true, create: o => { const s = V('skysquid', 'endless')(o); s.extraId = 'skysquid_endless'; s.scoreId = 'sky_endless'; s.scoreLabel = 'DERRUBADOS'; return s; } },
    { id: 'clockrun', name: 'CLOCK RUN', desc: 'EXTRA ORIGINAL · Fuja dos ponteiros do relógio.', icon: 'circle', original: true, create: o => new ClockRun(o) },
    { id: 'colorrooms', name: 'COLOR ROOMS', desc: 'EXTRA ORIGINAL · Encontre a sala da cor anunciada.', icon: 'square', original: true, create: o => new ColorRooms(o) },
    { id: 'numberhunt', name: 'NUMBER HUNT', desc: 'EXTRA ORIGINAL · Resolva e suba no pedestal certo.', icon: 'triangle', original: true, create: o => new NumberHunt(o) },
    { id: 'fallingtiles', name: 'FALLING TILES', desc: 'EXTRA ORIGINAL · O chão desaparece.', icon: 'square', original: true, create: o => new FallingTiles(o) },
    { id: 'freeze', name: 'FREEZE CHALLENGE', desc: 'EXTRA ORIGINAL · ANDA / CONGELA, sem tolerância.', icon: 'circle', original: true, create: o => new FreezeChallenge(o) },
  ];
})();
