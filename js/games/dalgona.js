/* ROUND 6 — dalgona.js : Dalgona / honeycomb — shape choice, needle carving along the stamped outline,
   stress + procedural cracks, licking trick, heated needle (lighter), timer, background players. Variant: timeattack */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const SHAPES = {
    circle: { name: 'CÍRCULO', diff: 1, bot: 0.86 },
    triangle: { name: 'TRIÂNGULO', diff: 2, bot: 0.72 },
    star: { name: 'ESTRELA', diff: 3, bot: 0.5 },
    umbrella: { name: 'GUARDA-CHUVA', diff: 4, bot: 0.3 },
  };

  function outline(shape, R) {
    const pts = []; const add = (x, y) => pts.push({ x, y, c: 0, soft: 0 });
    const resample = (poly, step, closed = true) => {
      const P = closed ? poly.concat([poly[0]]) : poly;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.round(d / step));
        for (let k = 0; k < n; k++) add(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n);
      }
    };
    const s = R * 0.58;
    if (shape === 'circle') { const n = 170; for (let i = 0; i < n; i++) { const a = i / n * TAU; add(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95); } }
    else if (shape === 'triangle') { const p = [0, 1, 2].map(i => { const a = -Math.PI / 2 + i * TAU / 3; return [Math.cos(a) * s * 1.08, Math.sin(a) * s * 1.08 + s * 0.12]; }); resample(p, 5); }
    else if (shape === 'star') { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s * 1.02; const a = -Math.PI / 2 + i * Math.PI / 5; p.push([Math.cos(a) * r, Math.sin(a) * r + s * 0.05]); } resample(p, 5); }
    else if (shape === 'umbrella') {
      const p = []; const cy = -s * 0.05;
      for (let i = 0; i <= 30; i++) { const a = Math.PI + i / 30 * Math.PI; p.push([Math.cos(a) * s, cy + Math.sin(a) * s * 0.78]); }
      // scalloped bottom edge
      for (let k = 0; k < 4; k++) { const x0 = s - k * s * 0.5, x1 = x0 - s * 0.5; for (let i = 1; i <= 8; i++) { const t = i / 8; p.push([U.lerp(x0, x1, t), cy - Math.sin(t * Math.PI) * s * 0.16]); } }
      resample(p, 5);
      // handle (open path) : down from center then hook
      const h = [[0, cy], [0, cy + s * 0.78]]; const hr = s * 0.17, hcx = -hr, hcy = cy + s * 0.78;
      for (let i = 1; i <= 10; i++) { const a = i / 10 * Math.PI; h.push([hcx + Math.cos(a) * hr, hcy + Math.sin(a) * hr]); }
      resample(h, 5, false);
    }
    return pts;
  }

  class Dalgona extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'dalgona'; this.name = 'dalgona';
      this.variant = opts.variant || 'normal';
      this.R = 230; this.cx = 640; this.cy = 392;
      this.timeLimit = this.variant === 'timeattack' ? R6.Save.D(300, 240, 200) : R6.Save.D(200, 160, 130);
      this.timeLeft = this.timeLimit;
      this.shape = opts.shape || null; this.queue = this.variant === 'timeattack' ? ['circle', 'triangle', 'star', 'umbrella'] : null; this.done = 0;
      this.stress = 0; this.cracks = []; this.crackTotal = 0; this.broken = false; this.pieces = [];
      this.nx = this.cx; this.ny = this.cy + 100; this.lastNX = this.nx; this.lastNY = this.ny; this.pressing = false; this.licking = false; this.lickT = 0;
      this.vSafe = R6.Save.D(75, 58, 46); this.tol = R6.Save.D(11, 8.5, 6.5); this.crackLimit = R6.Save.D(230, 190, 150);
      this.heated = 0; this.shake = 0; this.progress = 0; this.scrapeT = 0; this.sweat = [];
      this.hasLighter = R6.State.s && R6.State.has('lighter'); this.hasHint = R6.State.s && (R6.State.has('hint_dalgona') || R6.State.flag('hint_dalgona'));
      this.bots = []; this.choosing = !this.shape && !this.queue;
      if (this.queue) this.setShape(this.queue[0]); else if (this.shape) this.setShape(this.shape);
      this.shapeMenu = new R6.UI.Menu(Object.keys(SHAPES).map(k => ({ label: SHAPES[k].name, icon: k === 'umbrella' ? 'umbrella' : k, sub: this.hasHint || !this.campaign ? '★'.repeat(SHAPES[k].diff) : '?', action: () => this.pickShape(k) })), { horizontal: false });
      this.crowd = [];
      for (let i = 0; i < 10; i++) this.crowd.push({ look: R6.Char.makeLook({ num: 100 + i * 17 }), x: i < 5 ? 110 : 1170, y: 150 + (i % 5) * 120, t: Math.random() * 5 });
      this.guard = { look: R6.Char.makeLook({ outfit: 'guard', mask: 'square', seed: 5 }), x: -60, dir: 1 };
    }
    rules() {
      if (this.choosing) return null;
      return {
        title: this.variant === 'timeattack' ? 'DALGONA TIME ATTACK' : 'DALGONA', icon: this.shape === 'umbrella' ? 'umbrella' : this.shape, sub: 'FORMA: ' + SHAPES[this.shape].name + ' · ' + '★'.repeat(SHAPES[this.shape].diff),
        lines: [
          'Retire a forma inteira do doce sem quebrá-la antes do tempo acabar.',
          'Segure o botão do mouse para raspar com a agulha seguindo a linha marcada.',
          'Vá devagar: pressa e desvios da linha criam rachaduras.',
          'Botão direito (ou L): lamber o doce — amolece a área e evita rachaduras, mas custa tempo.',
        ].concat(this.hasLighter ? ['Você tem um ISQUEIRO: tecla Q aquece a agulha (corta mais fácil por um tempo).'] : []),
        keys: [['MOUSE', 'agulha'], ['CLIQUE', 'raspar'], ['BOTÃO DIR./L', 'lamber'], ['SETAS+ESPAÇO', 'alternativa']],
      };
    }
    pickShape(k) {
      this.choosing = false; this.setShape(k); this.phase = 'rules'; this.rulesT = 0;
      if (this.campaign) R6.State.decide('dalgona_shape', k, SHAPES[k].name);
    }
    setShape(k) {
      this.shape = k; this.pts = outline(k, this.R); this.stress = 0; this.cracks = []; this.crackTotal = 0; this.broken = false; this.pieces = []; this.progress = 0;
      this.needCount = this.pts.length;
    }
    begin() {
      R6.Music.play('tension'); R6.Music.setIntensity(0.2); R6.Audio.loop('crowd', 0.12);
      if (this.campaign && R6.State.s) this.planBots();
      R6.Dialog.announce('Vocês têm ' + U.time(this.timeLimit) + ' para retirar a forma. Se quebrar, será eliminado.', null, 3);
    }
    planBots() {
      const bots = R6.State.aliveBots();
      for (const p of bots) {
        const sh = p.key === 'schemer' ? 'circle' : U.pick(Object.keys(SHAPES));
        let pr = SHAPES[sh].bot * (0.55 + p.sk.precision * 0.8);
        if (p.key) pr = 1;
        const ok = Math.random() < U.clamp(pr, 0.05, 0.98);
        this.bots.push({ p, ok, at: ok ? U.rand(20, this.timeLimit - 5) : U.rand(8, this.timeLimit - 2) });
      }
      this.bots.sort((a, b) => a.at - b.at);
    }
    focus() { return { x: this.nx, y: this.ny, scale: 1.4, look: R6.State.s ? R6.State.s.player.look : null, facing: 1 }; }
    // ---------------- update ----------------
    update(dt) {
      this.t += dt; this.fx.update(dt);
      for (const c of this.crowd) c.t += dt;
      this.guard.x += this.guard.dir * 40 * dt; if (this.guard.x > 1340) this.guard.dir = -1; if (this.guard.x < -60) this.guard.dir = 1;
      for (const p of this.pieces) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
      if (this.updateResult(dt)) return;
      if (this.choosing) { this.shapeMenu.update(dt); return; }
      if (this.updateRules(dt)) return;
      this.timeLeft -= dt;
      this.runBots();
      if (this.timeLeft <= 0) { this.fail('O tempo acabou'); return; }
      const I = R6.Input; const m = I.mouse;
      // needle position: mouse or keyboard
      if (m.moved) { this.nx = m.x; this.ny = m.y; }
      const ax = I.axis(); if (ax.x || ax.y) { this.nx += ax.x * 55 * dt; this.ny += ax.y * 55 * dt; }
      this.nx = U.clamp(this.nx, this.cx - this.R, this.cx + this.R); this.ny = U.clamp(this.ny, this.cy - this.R, this.cy + this.R);
      const vInst = Math.min(1500, Math.hypot(this.nx - this.lastNX, this.ny - this.lastNY) / Math.max(dt, 0.001));
      this.lastNX = this.nx; this.lastNY = this.ny;
      this.vs = this.wasPressing ? U.damp(this.vs || 0, vInst, 5, dt) : 0; const v = this.vs;
      this.licking = I.mouse.rdown || I.down('KeyL');
      this.pressing = !this.licking && (m.down || I.act('action'));
      this.wasPressing = this.pressing;
      if (this.hasLighter && I.actP('alt') && this.heated <= 0 && !this.usedLighter) { this.usedLighter = true; this.heated = 45; R6.Audio.sfx('whoosh'); R6.Toast.show('Agulha aquecida!', { color: '#ffb347' }); }
      if (this.heated > 0) this.heated -= dt;
      const lx = this.nx - this.cx, ly = this.ny - this.cy;
      // licking softens
      if (this.licking) {
        this.lickT += dt;
        for (const p of this.pts) if (U.dist2(p.x, p.y, lx, ly) < 45 * 45) p.soft = Math.min(1, p.soft + dt * 0.8);
        this.stress = Math.max(0, this.stress - dt * 0.6);
        if (Math.random() < dt * 3) R6.Audio.sfx('scrape', { vol: 0.2 });
      }
      // nearest outline point
      let nd = 1e9, ni = -1;
      for (let i = 0; i < this.pts.length; i++) { const p = this.pts[i]; const d = (p.x - lx) * (p.x - lx) + (p.y - ly) * (p.y - ly); if (d < nd) { nd = d; ni = i; } }
      nd = Math.sqrt(nd);
      const heatK = this.heated > 0 ? 1.5 : 1;
      if (this.pressing) {
        // carve
        let carved = false;
        for (const p of this.pts) {
          const d = Math.hypot(p.x - lx, p.y - ly);
          if (d < 9 && p.c < 1) { p.c = Math.min(1, p.c + dt * 3.4 * heatK * (1 + p.soft * 0.6) * (1 - d / 14)); carved = true; }
        }
        if (carved) { this.scrapeT -= dt; if (this.scrapeT <= 0) { this.scrapeT = 0.09; R6.Audio.sfx('scrape', { vol: 0.35 }); } this.fx.emit('candy', this.nx, this.ny, 1, { size: 0.3, speed: 0.3, life: 0.5 }); }
        const soft = ni >= 0 ? this.pts[ni].soft : 0;
        const sK = (1 - soft * 0.55) * (this.heated > 0 ? 0.7 : 1);
        if (v > this.vSafe) this.stress += (v - this.vSafe) * 0.0045 * dt * 60 * sK * 0.18;
        if (nd > this.tol) this.stress += (nd - this.tol) * 0.012 * dt * 60 * sK * (nd > this.tol * 3 ? 0.4 : 1);
        this.stress += dt * 0.02 * sK; // constant tension while pressing
      } else this.stress = Math.max(0, this.stress - dt * 0.35);
      this.stress = Math.max(0, this.stress - dt * 0.12);
      if (this.stress > 0.55) this.crack(dt, lx, ly);
      this.shake = Math.max(0, this.stress - 0.3) * 6;
      R6.Music.setIntensity(0.2 + Math.min(0.8, this.stress));
      if (this.stress > 0.5 && Math.random() < dt * 2) this.sweat.push({ x: U.rand(0, R6.W), y: -10, v: U.rand(80, 160) });
      for (const s of this.sweat) s.y += s.v * dt; this.sweat = this.sweat.filter(s => s.y < R6.H + 20);
      if (Math.random() < dt * this.stress * 1.2) R6.Audio.sfx('heartbeat', { vol: 0.7, gap: 0.5 });
      // progress
      let sum = 0; for (const p of this.pts) sum += p.c; this.progress = sum / this.pts.length;
      if (this.pts.every(p => p.c >= 0.9)) this.success();
    }
    crack(dt, lx, ly) {
      const last = this.cracks[this.cracks.length - 1];
      if (!last || last.done || Math.random() < dt * 0.6) {
        if (Math.random() < dt * 3.5) {
          const ang = Math.atan2(ly, lx) + U.rand(-1.2, 1.2) + (Math.random() < 0.5 ? Math.PI : 0);
          this.cracks.push({ pts: [[lx, ly]], ang, len: 0, done: false }); R6.Audio.sfx('crack'); this.fx.emit('candy', this.nx, this.ny, 3, { size: 0.4 });
        }
        return;
      }
      if (Math.random() < dt * 9) {
        const L = U.rand(4, 11) * (0.6 + this.stress);
        last.ang += U.rand(-0.6, 0.6);
        const p0 = last.pts[last.pts.length - 1];
        const np = [p0[0] + Math.cos(last.ang) * L, p0[1] + Math.sin(last.ang) * L];
        last.pts.push(np); last.len += L; this.crackTotal += L;
        R6.Audio.sfx('crack', { vol: 0.5, gap: 0.08 });
        this.cam && 0;
        if (Math.hypot(np[0], np[1]) > this.R * 0.98) last.done = true;
        if (last.len > 70) last.done = true;
        if (this.crackTotal > this.crackLimit) this.fail('A forma quebrou');
      }
    }
    runBots() {
      const el = this.timeLimit - this.timeLeft;
      while (this.bots.length && this.bots[0].at <= el) {
        const b = this.bots.shift();
        if (!b.ok && b.p.alive) R6.Elim.kill(b.p, { cause: 'dalgona', far: true, vol: 0.35, host: this });
      }
    }
    success() {
      if (this.result) return;
      R6.Audio.sfx('pop'); R6.Audio.sfx('win'); this.fx.emit('confetti', this.cx, this.cy, 40); this.fx.emit('star', this.cx, this.cy, 20);
      this.popped = { t: 0 };
      if (this.queue) {
        this.done++;
        if (this.done >= this.queue.length) { this.score = Math.round(this.timeLeft); this.scoreId = 'dalgona_ta'; this.scoreLabel = 'SEGUNDOS RESTANTES'; this.chips = 60 + this.score; this.win({ title: 'TIME ATTACK', sub: 'TODAS AS FORMAS · ' + U.time(this.timeLeft) + ' RESTANTES' }); return; }
        R6.Banner.show(SHAPES[this.shape].name + ' ✓', 'Próxima forma…', { dur: 1.6, color: '#2ec4b6' });
        this.nextT = 1.4; const nxt = this.queue[this.done];
        R6.Engine.after(1.4, () => { if (!this.result) { this.setShape(nxt); this.popped = null; } });
        return;
      }
      // campaign: resolve every remaining bot now (time fast-forwards)
      if (this.campaign) { for (const b of this.bots) if (!b.ok && b.p.alive) R6.Elim.kill(b.p, { cause: 'dalgona', far: true, silent: true }); this.bots = []; }
      this.chips = 60;
      this.win({ sub: SHAPES[this.shape].name + ' · ' + U.time(this.timeLeft) + ' RESTANTES' });
    }
    fail(reason) {
      if (this.result) return;
      this.broken = true;
      // shatter into pieces
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; this.pieces.push({ x: this.cx + Math.cos(a) * 60, y: this.cy + Math.sin(a) * 60, vx: Math.cos(a) * U.rand(60, 200), vy: Math.sin(a) * U.rand(60, 200) - 150, r: 0, vr: U.rand(-4, 4), a0: a, a1: a + TAU / 9 }); }
      R6.Audio.sfx('crack'); R6.Audio.sfx('glass', { vol: 0.3 }); R6.Engine.shake(10, 0.4);
      this.fx.emit('candy', this.cx, this.cy, 40, { spread: 120 });
      if (this.queue) { this.score = this.done; this.scoreId = 'dalgona_ta_shapes'; this.scoreLabel = 'FORMAS'; }
      if (this.campaign && R6.State.s) R6.State.eliminate(R6.State.player, 'dalgona');
      R6.Engine.after(0.6, () => { R6.Audio.sfx('gun'); R6.Engine.flash('#ff1133', 0.3); });
      this.lose({ reason, wait: 3.2 });
    }
    debugWin() { this.choosing = false; if (!this.shape) this.setShape('circle'); this.phase = 'play'; this.pts.forEach(p => p.c = 1); this.success(); }
    // ---------------- render ----------------
    render(ctx) {
      // playground floor + tin tables
      ctx.fillStyle = '#c9a66b'; ctx.fillRect(0, 0, R6.W, R6.H);
      const fg = ctx.createRadialGradient(640, 380, 100, 640, 380, 800); fg.addColorStop(0, '#d9ba80'); fg.addColorStop(1, '#a88450'); ctx.fillStyle = fg; ctx.fillRect(0, 0, R6.W, R6.H);
      // background players carving at their tins
      for (const c of this.crowd) {
        const p = R6.Char.getPose('kneel', c.t, { seed: 1 });
        R6.Char.draw(ctx, c.look, c.x, c.y + 40, { view: 'front', anim: 'kneel', t: c.t, scale: 0.8, alpha: 0.85 });
        ctx.fillStyle = '#c8cdd2'; ctx.fillRect(c.x - 16, c.y + 44, 32, 22); ctx.fillStyle = '#d99a3d'; ctx.beginPath(); ctx.arc(c.x, c.y + 55, 9, 0, TAU); ctx.fill();
      }
      R6.Char.draw(ctx, this.guard.look, this.guard.x, 110, { view: 'side', dir: this.guard.dir, anim: 'walk', t: this.t, scale: 0.9, item: 'rifle' });
      // table + tin
      const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
      ctx.save(); ctx.translate(sx, sy);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; UI_rr(ctx, this.cx - 300 + 10, this.cy - 290 + 14, 600, 590, 22); ctx.fill();
      const tg = ctx.createLinearGradient(this.cx - 300, this.cy - 290, this.cx + 300, this.cy + 300); tg.addColorStop(0, '#e8ecef'); tg.addColorStop(0.5, '#b9c0c6'); tg.addColorStop(1, '#8f979e');
      ctx.fillStyle = tg; UI_rr(ctx, this.cx - 300, this.cy - 290, 600, 590, 22); ctx.fill();
      ctx.fillStyle = '#a4acb3'; UI_rr(ctx, this.cx - 280, this.cy - 270, 560, 550, 16); ctx.fill();
      if (!this.choosing && this.shape) this.drawCandy(ctx);
      ctx.restore();
      this.fx.draw(ctx);
      // pieces
      for (const p of this.pieces) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = '#d18f33'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 90, p.a0, p.a1); ctx.closePath(); ctx.fill(); ctx.restore(); }
      // needle + hand
      if (!this.choosing && this.phase === 'play' && !this.result) this.drawNeedle(ctx);
      for (const s of this.sweat) { ctx.fillStyle = 'rgba(190,230,255,.5)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 3, 6, 0, 0, TAU); ctx.fill(); }
      R6.UI.vignette(ctx, 0.35 + Math.min(0.4, this.stress * 0.5), this.stress > 0.7 ? '#300008' : '#000');
      if (this.choosing) this.drawChooser(ctx);
      else if (this.phase === 'play') {
        R6.HUD.draw(ctx, { game: this.variant === 'timeattack' ? 'DALGONA TIME ATTACK · ' + (this.done + 1) + '/4' : 'DALGONA', timer: Math.max(0, this.timeLeft), objective: 'Raspe a forma inteira sem quebrar. Devagar.', danger: this.stress > 0.6, hide: this.variant === 'timeattack' ? { prize: true } : {} });
        // tension + progress meters
        const x = 1040, y = 560;
        R6.UI.panel(ctx, x - 10, y - 20, 230, 110, { fill: 'rgba(6,8,12,.75)', shadow: false });
        R6.UI.text(ctx, 'PROGRESSO ' + Math.floor(this.progress * 100) + '%', x, y, { size: 14, weight: 800, color: '#ddd' });
        R6.UI.bar(ctx, x, y + 8, 200, 10, this.progress, { color: '#2ec4b6' });
        R6.UI.text(ctx, 'TENSÃO', x, y + 40, { size: 14, weight: 800, color: this.stress > 0.55 ? '#ff3b5c' : '#ddd' });
        R6.UI.bar(ctx, x, y + 48, 200, 10, Math.min(1, this.stress), { color: this.stress > 0.55 ? '#ff3b5c' : '#f2c14e', mark: 0.55 });
        R6.UI.text(ctx, 'RACHADURAS', x, y + 78, { size: 12, weight: 800, color: '#aaa' });
        R6.UI.bar(ctx, x + 90, y + 70, 110, 8, this.crackTotal / this.crackLimit, { color: '#ff5a3a' });
        if (this.heated > 0) R6.UI.text(ctx, 'AGULHA QUENTE ' + Math.ceil(this.heated) + 's', 640, R6.H - 16, { size: 15, align: 'center', color: '#ffb347', weight: 800 });
        else if (this.hasLighter && !this.usedLighter) R6.UI.text(ctx, 'Q — aquecer a agulha com o isqueiro', 640, R6.H - 16, { size: 14, align: 'center', color: '#ffb347', weight: 700 });
      }
      this.drawRules(ctx);
    }
    drawCandy(ctx) {
      const { cx, cy, R } = this;
      ctx.save(); ctx.translate(cx, cy);
      if (!this.broken) {
        const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
        g.addColorStop(0, '#f0c070'); g.addColorStop(0.6, '#d99a3d'); g.addColorStop(0.95, '#b8742a'); g.addColorStop(1, '#8a521c');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
        // bubbles texture (cached)
        if (!this._tex) { const cv = document.createElement('canvas'); cv.width = cv.height = R * 2; const c = cv.getContext('2d'); for (let i = 0; i < 260; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R * 0.95; c.fillStyle = Math.random() < 0.5 ? 'rgba(120,60,10,.18)' : 'rgba(255,230,160,.22)'; c.beginPath(); c.arc(R + Math.cos(a) * r, R + Math.sin(a) * r, U.rand(1, 5), 0, TAU); c.fill(); } this._tex = cv; }
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.drawImage(this._tex, -R, -R); ctx.restore();
        // stamped outline (emboss)
        const P = this.pts;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const path = (off) => { ctx.beginPath(); for (let i = 0; i < P.length; i++) { const p = P[i]; if (i && Math.hypot(p.x - P[i - 1].x, p.y - P[i - 1].y) > 12) ctx.moveTo(p.x + off, p.y + off); else ctx.lineTo(p.x + off, p.y + off); } if (this.shape !== 'umbrella') ctx.closePath(); };
        ctx.strokeStyle = 'rgba(255,225,160,.55)'; ctx.lineWidth = 3; path(1.2); ctx.stroke();
        ctx.strokeStyle = 'rgba(110,55,12,.6)'; ctx.lineWidth = 3; path(-0.6); ctx.stroke();
        // softened (licked) areas shine
        for (const p of P) if (p.soft > 0.05) { ctx.fillStyle = `rgba(255,240,200,${p.soft * 0.25})`; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.fill(); }
        // carved groove
        for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.c <= 0.02) continue; ctx.fillStyle = `rgba(60,25,5,${0.35 + p.c * 0.6})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 + p.c * 2.6, 0, TAU); ctx.fill(); }
        // cracks
        for (const c of this.cracks) {
          ctx.strokeStyle = 'rgba(70,30,5,.9)'; ctx.lineWidth = 2.2; ctx.beginPath(); c.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,220,160,.5)'; ctx.lineWidth = 1; ctx.beginPath(); c.pts.forEach((q, i) => (i ? ctx.lineTo(q[0] + 1.5, q[1] + 1) : ctx.moveTo(q[0] + 1.5, q[1] + 1))); ctx.stroke();
        }
        if (this.popped) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; path(0); ctx.stroke(); ctx.globalAlpha = 1; }
      }
      ctx.restore();
    }
    drawNeedle(ctx) {
      const x = this.nx, y = this.ny;
      ctx.save();
      if (this.licking) {
        ctx.fillStyle = 'rgba(255,120,140,.35)'; ctx.beginPath(); ctx.arc(x, y, 45, 0, TAU); ctx.fill();
        R6.UI.text(ctx, 'LAMBENDO…', x, y - 56, { size: 16, align: 'center', color: '#ffb3c1', weight: 800, shadow: true });
        ctx.restore(); return;
      }
      // hand (fingers pinching the needle)
      const hot = this.heated > 0;
      ctx.translate(x, y);
      ctx.strokeStyle = hot ? '#ff9a3a' : '#e9edf2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, -90); ctx.stroke();
      if (hot) { ctx.strokeStyle = 'rgba(255,120,40,.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, -15); ctx.stroke(); }
      ctx.fillStyle = this.pressing ? '#fff' : '#ccc'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
      const skin = R6.State.s ? R6.State.s.player.look.skin : '#dcae87';
      const sd = U.shade(skin, -0.18);
      ctx.rotate(-0.9);
      // sleeve + cuff
      ctx.fillStyle = '#2b7d71'; R6.UI.rrect(ctx, 120, -26, 90, 52, 10); ctx.fill();
      ctx.fillStyle = '#f0efe8'; ctx.fillRect(120, -26, 6, 52); ctx.fillStyle = '#1d5a51'; ctx.fillRect(126, -26, 8, 52);
      // back of hand
      ctx.fillStyle = sd; ctx.beginPath(); ctx.ellipse(104, 4, 28, 22, 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(100, 0, 26, 19, 0.1, 0, TAU); ctx.fill();
      // index finger + thumb pinching the needle
      ctx.strokeStyle = skin; ctx.lineCap = 'round'; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(84, -8); ctx.quadraticCurveTo(66, -12, 56, -3); ctx.stroke();
      ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(86, 12); ctx.quadraticCurveTo(68, 12, 58, 4); ctx.stroke();
      ctx.strokeStyle = sd; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(96, 16); ctx.quadraticCurveTo(84, 26, 74, 22); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(55, -4, 3, 2, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    drawChooser(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.text(ctx, 'ESCOLHA UMA FORMA', 640, 150, { size: 60, fam: 'title', align: 'center', color: '#fff', spacing: 5 });
      R6.UI.text(ctx, this.hasHint || !this.campaign ? 'Formas simples são mais fáceis de recortar.' : 'Você não sabe qual será o jogo. Escolha pelo instinto.', 640, 190, { size: 18, align: 'center', color: '#bbb' });
      this.shapeMenu.draw(ctx, 440, 240, 400, 62, 14, { size: 24 });
    }
  }
  function UI_rr(ctx, x, y, w, h, r) { R6.UI.rrect(ctx, x, y, w, h, r); }

  R6.Dalgona = Dalgona;
  R6.registerGame('dalgona', { name: 'Dalgona', season: 1, icon: 'triangle', desc: 'Recorte a forma sem quebrar o doce.', create: o => new Dalgona(o) });
})();
