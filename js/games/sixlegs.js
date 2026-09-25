/* ROUND 6 — sixlegs.js : Six-Legged Pentathlon — 5 tied players, synchronized march, station assignment strategy,
   and five full mini-games: Ddakji, Bisseokchigi (flying stone), Gonggi (5 stones), Paengi (spinning top), Jegi (kick) */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const plLook = () => R6.State.s ? R6.State.s.player.look : R6.Char.makeLook({ num: 456 });

  // =================================================================== STATIONS
  // ---------- 1. Ddakji station ----------
  class DdakjiStation {
    constructor(o = {}) { this.title = 'DDAKJI'; this.hint = 'Mire no canto levantado, força e ângulo na faixa.'; this.fx = new R6.Particles(300); this.done = null; this.attempts = 0; this.core = new R6.DdakjiCore({ x: 640, y: 470, size: 72, fx: this.fx, onResult: (f) => this.res(f) }); this.core.throwFrom = { x: 420, y: 300 }; this.msg = null; this.t = 0; }
    res(f) { this.attempts++; if (f) { R6.Audio.sfx('win'); this.msg = 'VIROU!'; this.wait = 1.2; this.ok = true; } else { this.msg = 'Não virou…'; this.wait = 1; } }
    update(dt) { this.t += dt; this.fx.update(dt); if (this.wait > 0) { this.wait -= dt; this.core.update(dt, false); if (this.wait <= 0) { if (this.ok) this.done = 'success'; else { this.core.newTarget(); this.msg = null; } } return; } this.core.update(dt, true); }
    render(ctx) {
      ctx.fillStyle = '#b9955f'; ctx.fillRect(0, 0, R6.W, R6.H); const g = ctx.createRadialGradient(640, 470, 50, 640, 470, 700); g.addColorStop(0, 'rgba(255,240,200,.25)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      this.core.draw(ctx); this.fx.draw(ctx); this.core.drawMeters(ctx, 640, 600);
      if (this.msg) R6.UI.text(ctx, this.msg, 640, 200, { size: 48, fam: 'title', align: 'center', color: '#fff', shadow: true });
      R6.UI.text(ctx, 'TENTATIVAS: ' + this.attempts, 640, 690, { size: 15, align: 'center', color: '#fff', weight: 700 });
    }
  }

  // ---------- 2. Bisseokchigi (flying stone) ----------
  class StoneStation {
    constructor(o = {}) {
      this.title = 'BISSEOKCHIGI'; this.hint = 'Mova o mouse para mirar, segure e solte para arremessar a pedra.'; this.done = null; this.t = 0; this.fx = new R6.Particles(400);
      this.ground = 560; this.sx = 220; this.target = { x: U.rand(880, 1060) + (o.far ? 60 : 0), w: 26, h: 64, fallen: false, ang: 0, av: 0 };
      this.wind = U.rand(-1, 1) * R6.Save.D(18, 34, 50);
      this.aim = -0.6; this.pow = 0; this.charging = false; this.stone = null; this.attempts = 0; this.msg = null; this.preview = R6.Save.D(0.35, 0.18, 0);
    }
    update(dt) {
      this.t += dt; this.fx.update(dt); const I = R6.Input; const m = I.mouse;
      const T = this.target;
      if (T.fallen && T.ang < Math.PI / 2) { T.av += dt * 9; T.ang = Math.min(Math.PI / 2, T.ang + T.av * dt); }
      if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { if (T.fallen) this.done = 'success'; else { this.stone = null; this.msg = null; } } }
      if (!this.stone) {
        if (m.moved) this.aim = U.clamp(Math.atan2(m.y - (this.ground - 60), m.x - this.sx), -1.35, -0.05);
        if (I.act('up')) this.aim = Math.max(-1.35, this.aim - dt); if (I.act('down')) this.aim = Math.min(-0.05, this.aim + dt);
        if (m.pressed || I.actP('action')) { this.charging = true; this.pow = 0; this.pdir = 1; }
        if (this.charging) { this.pow += this.pdir * dt * 0.9; if (this.pow > 1) { this.pow = 1; this.pdir = -1; } if (this.pow < 0.05) { this.pdir = 1; } }
        if (this.charging && (m.released || I.actR('action'))) { this.charging = false; this.throwIt(); }
      } else this.sim(dt);
    }
    throwIt() { const v = 380 + this.pow * 620; this.stone = { x: this.sx, y: this.ground - 60, vx: Math.cos(this.aim) * v, vy: Math.sin(this.aim) * v, rot: 0, rolling: false }; this.attempts++; R6.Audio.sfx('whoosh'); }
    sim(dt) {
      const s = this.stone; if (s.stopped) return; const T = this.target;
      if (!s.rolling) { s.vy += 900 * dt; s.vx += this.wind * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 10; if (s.y >= this.ground - 6) { s.y = this.ground - 6; if (Math.abs(s.vy) > 180) { s.vy = -s.vy * 0.3; s.vx *= 0.7; R6.Audio.sfx('thud', { vol: 0.3 }); this.fx.emit('dust', s.x, this.ground, 6); } else { s.rolling = true; s.vy = 0; } } }
      else { const f = 600 * dt; if (Math.abs(s.vx) <= f) { s.vx = 0; s.stopped = true; if (!T.fallen) { this.msg = s.x < T.x ? 'CURTO DEMAIS' : 'PASSOU'; this.wait = 1.1; R6.Audio.sfx('error'); } } else s.vx -= Math.sign(s.vx) * f; s.x += s.vx * dt; if (Math.random() < dt * 8) this.fx.emit('dust', s.x, this.ground, 1); }
      // collision with target
      if (!T.fallen && Math.abs(s.x - T.x) < T.w / 2 + 6 && s.y > this.ground - T.h - 6) {
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > 140) { T.fallen = true; T.av = 2; R6.Audio.sfx('hitHeavy'); this.fx.emit('dust', T.x, this.ground - 20, 20); this.msg = !s.rolling ? 'ACERTO PERFEITO!' : 'DERRUBOU!'; R6.Audio.sfx('win', { delay: 0.2 }); this.wait = 1.4; s.vx *= -0.3; }
        else { s.vx = 0; s.stopped = true; this.msg = 'FRACO DEMAIS'; this.wait = 1.1; }
      }
      if (s.x > 1400 || s.x < -50) { s.stopped = true; this.msg = 'FORA'; this.wait = 1; }
    }
    render(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#8fc3e6'); g.addColorStop(1, '#d8e8f0'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      ctx.fillStyle = '#7fb069'; ctx.beginPath(); ctx.moveTo(0, 470); for (let x = 0; x <= 1280; x += 80) ctx.lineTo(x, 440 + Math.sin(x * 0.01) * 20); ctx.lineTo(1280, 560); ctx.lineTo(0, 560); ctx.fill();
      ctx.fillStyle = '#c9a66b'; ctx.fillRect(0, this.ground, R6.W, 200); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < R6.W; x += 30) ctx.fillRect(x, this.ground + (x % 60), 12, 2);
      // wind flag
      R6.UI.text(ctx, 'VENTO ' + (this.wind > 0 ? '→' : '←') + ' ' + Math.abs(this.wind).toFixed(0), 1180, 60, { size: 16, align: 'right', color: '#234', weight: 800 });
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1200, 40); ctx.lineTo(1200, 100); ctx.stroke(); ctx.fillStyle = '#e8336d'; ctx.beginPath(); ctx.moveTo(1200, 40); ctx.lineTo(1200 + this.wind * 1.2 + Math.sin(this.t * 8) * 3, 50); ctx.lineTo(1200, 60); ctx.fill();
      // target stone
      const T = this.target; ctx.save(); ctx.translate(T.x + T.w / 2, this.ground); ctx.rotate(T.ang); ctx.fillStyle = '#8c8a86'; R6.UI.rrect(ctx, -T.w, -T.h, T.w, T.h, 8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(-T.w + 4, -T.h + 6, 6, T.h - 14); ctx.restore();
      // thrower
      R6.Char.draw(ctx, plLook(), this.sx - 50, this.ground, { view: 'side', dir: 1, anim: this.stone ? 'throw' : this.charging ? 'windup' : 'idle', t: this.stone ? Math.min(0.5, this.t % 10) : this.t, scale: 1.6 });
      // aim + preview
      if (!this.stone) {
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.sx, this.ground - 60); ctx.lineTo(this.sx + Math.cos(this.aim) * 90, this.ground - 60 + Math.sin(this.aim) * 90); ctx.stroke();
        if (this.preview > 0) { const v = 380 + Math.max(0.3, this.pow) * 620; let x = this.sx, y = this.ground - 60, vx = Math.cos(this.aim) * v, vy = Math.sin(this.aim) * v; ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40 * this.preview; i++) { vy += 900 * 0.03; vx += this.wind * 0.03; x += vx * 0.03; y += vy * 0.03; if (i % 2 === 0) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill(); } } }
        R6.UI.bar(ctx, 140, this.ground + 40, 200, 12, this.pow, { color: '#e8336d', zone: [0.55, 0.85] });
      }
      if (this.stone) { const s = this.stone; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = '#6f6c68'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      this.fx.draw(ctx);
      if (this.msg) R6.UI.text(ctx, this.msg, 640, 200, { size: 46, fam: 'title', align: 'center', color: '#fff', shadow: true });
      R6.UI.text(ctx, 'TENTATIVAS: ' + this.attempts, 640, 700, { size: 15, align: 'center', color: '#333', weight: 700 });
    }
  }

  // ---------- 3. Gonggi (five stones) ----------
  class GonggiStation {
    constructor(o = {}) {
      this.title = 'GONGGI'; this.hint = 'ESPAÇO joga a pedra · clique nas pedras do chão · ESPAÇO para pegar a que cai.';
      this.done = null; this.t = 0; this.fx = new R6.Particles(200); this.maxLevel = o.levels || 3; this.level = 1; this.score = 0;
      this.win = R6.Save.D(0.16, 0.12, 0.09);
      this.reset();
    }
    reset() {
      const cols = ['#e8336d', '#f2c14e', '#2ec4b6', '#3a86ff', '#ff9f5a'];
      this.stones = cols.map((c, i) => ({ c, x: 520 + (i % 3) * 110 + U.rand(-20, 20), y: 380 + Math.floor(i / 3) * 110 + U.rand(-20, 20), on: 'ground' }));
      this.stones[0].on = 'hand'; this.air = null; this.need = this.level <= 4 ? this.level : 4; this.picked = 0; this.state = 'ready'; this.msg = null; this.handPos = { x: 640, y: 560 };
      if (this.level === 5) this.state = 'kk';
    }
    groundStones() { return this.stones.filter(s => s.on === 'ground'); }
    update(dt) {
      this.t += dt; this.fx.update(dt); const I = R6.Input; const m = I.mouse;
      if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { if (this.next === 'level') { this.level++; if (this.level > this.maxLevel) { this.done = 'success'; return; } this.reset(); this.msg = 'NÍVEL ' + this.level; this.wait = 0.9; this.next = null; } else if (this.next === 'retry') { this.reset(); this.next = null; } else this.msg = null; } return; }
      if (m.moved) { this.handPos.x = U.lerp(this.handPos.x, m.x, 0.5); this.handPos.y = U.lerp(this.handPos.y, m.y, 0.5); }
      if (this.state === 'kk') return this.updKK(dt, I);
      if (this.state === 'ready') {
        if (I.actP('action')) { this.air = { h: 0, v: 520, t: 0 }; this.state = 'air'; R6.Audio.sfx('whoosh', { vol: 0.4 }); this.grabbedThisToss = 0; }
      } else if (this.state === 'air') {
        const A = this.air; A.t += dt; A.v -= 900 * dt; A.h += A.v * dt;
        // pick stones while the tossed one is in the air
        if (m.pressed) {
          const gs = this.groundStones(); let best = null, bd = 60;
          for (const s of gs) { const d = Math.hypot(s.x - m.x, s.y - m.y); if (d < bd) { bd = d; best = s; } }
          if (best && this.grabbedThisToss < this.need) {
            // group picks: grab the nearest ones up to "need"
            const grp = gs.slice().sort((a, b) => Math.hypot(a.x - best.x, a.y - best.y) - Math.hypot(b.x - best.x, b.y - best.y)).slice(0, this.need - this.grabbedThisToss);
            grp.forEach(s => { s.on = 'hand'; }); this.grabbedThisToss += grp.length; R6.Audio.sfx('marble'); this.fx.emit('dust', best.x, best.y, 4);
          }
        }
        // catch window: when it comes back down near the hand
        const catchWin = A.v < 0 && A.h < 60 && A.h > -20;
        if (I.actP('action') && A.v < 0) {
          if (catchWin && Math.abs(A.h - 20) < this.win * 260) this.caught();
          else this.drop('Errou o tempo!');
        }
        if (A.h < -30) this.drop('A pedra caiu!');
      }
    }
    caught() {
      R6.Audio.sfx('marble'); this.state = 'ready'; this.air = null;
      if (this.grabbedThisToss < this.need && this.groundStones().length) { this.drop('Não pegou as pedras a tempo!'); return; }
      this.picked += this.grabbedThisToss; this.score += 10 * this.level;
      if (!this.groundStones().length) { this.msg = 'NÍVEL ' + this.level + ' ✓'; this.wait = 0.9; this.next = 'level'; R6.Audio.sfx('pass', { vol: 0.5 }); }
      else { // put picked stones aside (they're safe) — keep one in hand for the next toss
        for (const s of this.stones) if (s.on === 'hand') s.on = 'safe';
        this.stones.find(s => s.on === 'safe').on = 'hand';
      }
    }
    drop(msg) { R6.Audio.sfx('error'); this.msg = msg; this.wait = 1.1; this.next = 'retry'; this.state = 'fail'; this.air = null; }
    updKK(dt, I) {
      // level 5 (kkeokki): toss all → catch on back of hand → toss → catch in palm
      if (!this.kk) this.kk = { ph: 'toss1', h: 0, v: 0, caught: 0 };
      const K = this.kk;
      if (K.ph === 'toss1' && I.actP('action')) { K.ph = 'air1'; K.v = 460; K.h = 0; R6.Audio.sfx('whoosh'); }
      else if (K.ph === 'air1' || K.ph === 'air2') {
        K.v -= 900 * dt; K.h += K.v * dt;
        if (I.actP('action') && K.v < 0) { const q = 1 - Math.abs(K.h - 20) / 90; if (q > 0.2) { const n = Math.max(1, Math.round(q * 5)); if (K.ph === 'air1') { K.caught = n; K.ph = 'back'; R6.Audio.sfx('marble'); this.msg = n + ' NAS COSTAS DA MÃO'; } else { this.score += K.caught * 20; this.msg = 'KKEOKKI! +' + K.caught * 20; R6.Audio.sfx('win'); this.wait = 1.2; this.next = 'level'; } } else { this.drop('Deixou cair!'); this.kk = null; } }
        if (K.h < -40) { this.drop('Deixou cair!'); this.kk = null; }
      } else if (K.ph === 'back' && I.actP('action')) { K.ph = 'air2'; K.v = 380; K.h = 0; R6.Audio.sfx('whoosh'); }
    }
    render(ctx) {
      ctx.fillStyle = '#6b4b33'; ctx.fillRect(0, 0, R6.W, R6.H);
      const g = ctx.createRadialGradient(640, 420, 60, 640, 420, 600); g.addColorStop(0, '#a47a52'); g.addColorStop(1, '#5a3d28'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < R6.H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(R6.W, y); ctx.stroke(); }
      const stone = (x, y, c, s = 1) => { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 5, 13 * s, 7 * s, 0, 0, TAU); ctx.fill(); const gg = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 14 * s); gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, c); gg.addColorStop(1, U.shade(c, -0.4)); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x + 12 * s, y - 2 * s); ctx.lineTo(x + 8 * s, y + 10 * s); ctx.lineTo(x - 9 * s, y + 9 * s); ctx.lineTo(x - 12 * s, y - 3 * s); ctx.closePath(); ctx.fill(); };
      for (const s of this.stones) if (s.on === 'ground') stone(s.x, s.y, s.c);
      let safeN = this.stones.filter(s => s.on === 'safe').length; for (let i = 0; i < safeN; i++) stone(1080 + i * 30, 640, '#aaa', 0.7);
      // hand (palm facing down, fingers)
      const hx = this.handPos.x, hy = this.handPos.y; const skin = plLook().skin; const sd = U.shade(skin, -0.15);
      const back = this.kk && this.kk.ph === 'back';
      ctx.save(); ctx.translate(hx, hy);
      ctx.fillStyle = '#2b7d71'; R6.UI.rrect(ctx, -26, 60, 52, 90, 12); ctx.fill(); ctx.fillStyle = '#f0efe8'; ctx.fillRect(-26, 60, 52, 6);
      ctx.fillStyle = sd; ctx.beginPath(); ctx.ellipse(0, 30, 38, 34, 0, 0, TAU); ctx.fill(); ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 28, 36, 32, 0, 0, TAU); ctx.fill();
      const curl = this.state === 'air' ? 0.3 : 0;
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(-24 + i * 16, 0); ctx.rotate(-0.1 + i * 0.07); ctx.fillStyle = skin; R6.UI.rrect(ctx, -6, -38 + curl * 20, 12, 40 - curl * 18, 6); ctx.fill(); ctx.strokeStyle = sd; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.translate(-36, 30); ctx.rotate(-0.9); ctx.fillStyle = skin; R6.UI.rrect(ctx, -6, -30, 12, 32, 6); ctx.fill(); ctx.restore();
      if (back && this.kk) for (let i = 0; i < this.kk.caught; i++) stone(-20 + i * 11, 18 - (i % 2) * 8, this.stones[i].c, 0.7);
      const inHand = this.stones.filter(s => s.on === 'hand').length - (this.air ? 1 : 0);
      for (let i = 0; i < inHand && !this.air; i++) stone(-10 + i * 10, 34, this.stones[i].c, 0.6);
      ctx.restore();
      // tossed stone (height shown by scale + shadow + ring)
      const A = this.air || (this.kk && (this.kk.ph === 'air1' || this.kk.ph === 'air2') ? this.kk : null);
      if (A) {
        const h = Math.max(-30, A.h); const s = 1 + h / 300;
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy - 10, 30, 0, TAU); ctx.stroke();
        const good = A.v < 0 && Math.abs(h - 20) < this.win * 260;
        ctx.strokeStyle = good ? '#2ec4b6' : 'rgba(255,255,255,.2)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy - 10, 30 + Math.max(0, h) * 0.5, 0, TAU); ctx.stroke();
        stone(hx, hy - 10 - h * 0.6, '#e8336d', s);
      }
      R6.UI.text(ctx, 'NÍVEL ' + Math.min(this.level, this.maxLevel) + '/' + this.maxLevel + (this.level < 5 ? ' — pegue ' + this.need + ' por vez' : ' — KKEOKKI'), 640, 150, { size: 26, fam: 'title', align: 'center', color: '#fff', shadow: true });
      R6.UI.text(ctx, this.state === 'ready' ? 'ESPAÇO: jogar a pedra para cima' : this.state === 'air' ? 'CLIQUE nas pedras · ESPAÇO quando o anel ficar VERDE' : '', 640, 690, { size: 16, align: 'center', color: '#fff', weight: 700, shadow: true });
      if (this.msg) R6.UI.text(ctx, this.msg, 640, 220, { size: 40, fam: 'title', align: 'center', color: '#fff', shadow: true });
      this.fx.draw(ctx);
    }
  }

  // ---------- 4. Paengi (spinning top) ----------
  class TopStation {
    constructor(o = {}) {
      this.title = 'PIÃO'; this.hint = 'Gire o mouse em círculos para enrolar a corda, mire e lance. Depois chicoteie no ritmo.';
      this.done = null; this.t = 0; this.fx = new R6.Particles(300); this.phase = 'wind'; this.wound = 0; this.lastAng = null; this.goal = o.goal || R6.Save.D(8, 10, 12);
      this.top = null; this.circle = { x: 700, y: 470, r: 150 }; this.aim = 0; this.pow = 0; this.attempts = 0;
    }
    update(dt) {
      this.t += dt; this.fx.update(dt); const I = R6.Input; const m = I.mouse;
      if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { if (this.ok) this.done = 'success'; else { this.phase = 'wind'; this.wound = 0; this.top = null; this.msg = null; } } }
      if (this.phase === 'wind') {
        const a = Math.atan2(m.y - 420, m.x - 360);
        if (this.lastAng != null && R6.Input.mouse.moved) { const d = Math.abs(U.angDiff(this.lastAng, a)); if (d < 1.2) this.wound = Math.min(1, this.wound + d / (TAU * 6)); if (d > 0.05 && Math.random() < 0.3) R6.Audio.sfx('rope', { vol: 0.15, gap: 0.12 }); }
        this.lastAng = a;
        if (I.actP('left') || I.actP('right')) { this.wound = Math.min(1, this.wound + 0.04); R6.Audio.sfx('rope', { vol: 0.2, gap: 0.08 }); }
        if (this.wound >= 1) { this.phase = 'aim'; R6.Audio.sfx('confirm'); }
      } else if (this.phase === 'aim') {
        if (m.moved) this.aim = U.clamp((m.x - 700) / 300, -1, 1);
        if (I.act('left')) this.aim = Math.max(-1, this.aim - dt); if (I.act('right')) this.aim = Math.min(1, this.aim + dt);
        if (m.pressed || I.actP('action')) { this.phase = 'power'; this.pow = 0; this.pd = 1; }
      } else if (this.phase === 'power') {
        this.pow += this.pd * dt * 1.2; if (this.pow > 1) { this.pow = 1; this.pd = -1; } if (this.pow < 0) { this.pow = 0; this.pd = 1; }
        if (m.released || I.actR('action')) this.launch();
      } else if (this.phase === 'spin') this.spin(dt, I, m);
    }
    launch() {
      this.attempts++; R6.Audio.sfx('whoosh');
      const q = Math.exp(-Math.pow((this.pow - 0.78) / 0.16, 2));
      const lx = this.circle.x + this.aim * 170 + U.rand(-20, 20) * (1 - q);
      this.top = { x: lx, y: this.circle.y, spin: 0.55 + q * 0.45, wob: 0, vx: U.rand(-20, 20), vy: U.rand(-10, 10), ang: 0, time: 0 };
      this.phase = 'spin'; this.whipT = 0; this.whipZone = 0;
      R6.Audio.sfx('thud', { vol: 0.3 });
      if (Math.hypot(lx - this.circle.x, 0) > this.circle.r) this.fail('Caiu fora do círculo!');
    }
    spin(dt, I, m) {
      const T = this.top; if (!T || this.wait > 0) return;
      T.time += dt; T.spin -= dt * (0.085 + T.time * 0.004) * R6.Save.D(1, 1.15, 1.3); T.ang += dt * T.spin * 40;
      T.wob = Math.max(0, 0.45 - T.spin) * 2;
      T.x += T.vx * dt; T.y += T.vy * dt; T.vx *= Math.exp(-dt); T.vy *= Math.exp(-dt);
      T.x += Math.sin(this.t * 7) * T.wob * 30 * dt; T.y += Math.cos(this.t * 6) * T.wob * 20 * dt;
      // whip: rhythm ring
      this.whipT += dt; const per = 1.1; const ph = (this.whipT % per) / per;
      if (I.actP('action') || m.pressed) {
        const inZone = ph > 0.75 || ph < 0.1;
        if (inZone) { T.spin = Math.min(1, T.spin + 0.22); const dx = m.x - T.x, dy = m.y - T.y, d = Math.hypot(dx, dy) || 1; T.vx += dx / d * 60; T.vy += dy / d * 40; R6.Audio.sfx('slap', { vol: 0.5 }); this.fx.emit('dust', T.x, T.y, 5); this.lastWhip = 'BOA!'; }
        else { T.spin = Math.max(0, T.spin - 0.05); R6.Audio.sfx('error', { vol: 0.3 }); this.lastWhip = 'FORA DO RITMO'; }
        this.lwT = 0.6;
      }
      if (this.lwT > 0) this.lwT -= dt;
      if (Math.hypot(T.x - this.circle.x, (T.y - this.circle.y) * 2.2) > this.circle.r) this.fail('O pião saiu do círculo!');
      else if (T.spin <= 0.05) this.fail('O pião parou!');
      else if (T.time >= this.goal) { this.ok = true; this.msg = 'GIROU ' + this.goal + ' SEGUNDOS!'; this.wait = 1.4; R6.Audio.sfx('win'); }
      if (Math.random() < dt * 20) R6.Audio.sfx('squeak', { vol: 0.05, gap: 0.3 });
    }
    fail(t) { this.msg = t; this.wait = 1.3; this.ok = false; R6.Audio.sfx('error'); if (this.top) this.top.fallen = true; }
    render(ctx) {
      ctx.fillStyle = '#c9a66b'; ctx.fillRect(0, 0, R6.W, R6.H);
      const g = ctx.createRadialGradient(700, 470, 50, 700, 470, 700); g.addColorStop(0, '#dcc08a'); g.addColorStop(1, '#9c7a4c'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      const C = this.circle; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(C.x, C.y, C.r, C.r / 2.2, 0, 0, TAU); ctx.stroke();
      const drawTop = (x, y, ang, wob, fallen, s = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 26 * s, 8 * s, 0, 0, TAU); ctx.fill();
        ctx.rotate(fallen ? 1.3 : Math.sin(this.t * 9) * wob * 0.4);
        const bands = ['#e8336d', '#f2c14e', '#2a9d8f', '#3a86ff'];
        ctx.fillStyle = '#6b4b33'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-24 * s, -30 * s); ctx.lineTo(24 * s, -30 * s); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -30 * s, 24 * s, 8 * s, 0, 0, TAU); ctx.fillStyle = '#8a6a48'; ctx.fill();
        for (let i = 0; i < 4; i++) { const a = ang + i * Math.PI / 2; ctx.strokeStyle = bands[i]; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(0, -30 * s); ctx.lineTo(Math.cos(a) * 22 * s, -30 * s + Math.sin(a) * 7 * s); ctx.stroke(); }
        ctx.restore();
      };
      if (this.phase === 'wind' || this.phase === 'aim' || this.phase === 'power') {
        drawTop(360, 470, this.t * 0.3, 0, false, 1.8);
        for (let i = 0; i < this.wound * 12; i++) { ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(360, 470 - 30 - i * 3.2, 20 - i * 0.6, 5, 0, 0, TAU); ctx.stroke(); }
        if (this.phase === 'wind') { R6.UI.text(ctx, 'ENROLE A CORDA: gire o mouse em círculos ao redor do pião', 640, 110, { size: 20, align: 'center', color: '#fff', weight: 800, shadow: true }); R6.UI.bar(ctx, 260, 560, 200, 12, this.wound, { color: '#2ec4b6' }); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(360, 420, 110, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        else { R6.UI.text(ctx, this.phase === 'aim' ? 'MIRE (mova o mouse) e segure para lançar' : 'SOLTE na faixa clara!', 640, 110, { size: 20, align: 'center', color: '#fff', weight: 800, shadow: true }); const ax = C.x + this.aim * 170; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, C.y, 14, 0, TAU); ctx.stroke(); if (this.phase === 'power') R6.UI.bar(ctx, 540, 640, 300, 12, this.pow, { color: '#e8336d', zone: [0.66, 0.9] }); }
      }
      if (this.top) {
        const T = this.top; drawTop(T.x, T.y, T.ang, T.wob, T.fallen, 1.5);
        R6.UI.text(ctx, 'GIRANDO: ' + T.time.toFixed(1) + ' / ' + this.goal + 's', 640, 80, { size: 26, fam: 'mono', align: 'center', color: '#fff', shadow: true });
        R6.UI.bar(ctx, 490, 100, 300, 10, T.spin, { color: T.spin < 0.3 ? '#ff3b5c' : '#2ec4b6' });
        const ph = (this.whipT % 1.1) / 1.1; const cx = 1120, cy = 580;
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.stroke();
        ctx.strokeStyle = ph > 0.75 || ph < 0.1 ? '#2ec4b6' : '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 30 + (1 - ph) * 50, 0, TAU); ctx.stroke();
        R6.UI.text(ctx, 'CHICOTE', cx, cy + 5, { size: 13, align: 'center', weight: 800, color: '#fff' });
        if (this.lwT > 0) R6.UI.text(ctx, this.lastWhip, cx, cy - 90, { size: 18, align: 'center', weight: 800, color: this.lastWhip === 'BOA!' ? '#2ec4b6' : '#ff5a6a' });
        R6.UI.text(ctx, 'ESPAÇO/CLIQUE no ritmo · mouse = direção do chicote', 640, 700, { size: 15, align: 'center', color: '#fff', weight: 700, shadow: true });
      }
      this.fx.draw(ctx);
      if (this.msg) R6.UI.text(ctx, this.msg, 640, 220, { size: 44, fam: 'title', align: 'center', color: '#fff', shadow: true });
    }
  }

  // ---------- 5. Jegi ----------
  class JegiStation {
    constructor(o = {}) {
      this.title = 'JEGI'; this.hint = 'A/D para ficar embaixo do jegi · ESPAÇO para chutar no tempo certo.';
      this.done = null; this.t = 0; this.goal = o.goal || R6.Save.D(10, 12, 15); this.endless = !!o.endless;
      this.px = 640; this.j = { x: 640, y: 200, vx: 0, vy: 0 }; this.combo = 0; this.best = 0; this.kickT = 0; this.msg = null; this.fx = new R6.Particles(200); this.started = false; this.ground = 600;
    }
    update(dt) {
      this.t += dt; this.fx.update(dt); const I = R6.Input;
      const ax = (I.act('right') ? 1 : 0) - (I.act('left') ? 1 : 0); this.px = U.clamp(this.px + ax * 330 * dt, 200, 1080);
      if (this.kickT > 0) this.kickT -= dt;
      const J = this.j;
      if (!this.started) { J.x = this.px + 20; J.y = 360; if (I.actP('action')) { this.started = true; J.vy = -520; J.vx = U.rand(-60, 60); R6.Audio.sfx('whoosh', { vol: 0.4 }); } return; }
      // shuttlecock physics: heavy base, drag
      J.vy += 900 * dt; J.vy = Math.min(J.vy, 360); J.vx *= Math.exp(-0.6 * dt); J.x += J.vx * dt; J.y += J.vy * dt;
      if (J.x < 150 || J.x > 1130) J.vx = -J.vx;
      const footY = this.ground - 40;
      if (I.actP('action') && this.kickT <= 0) {
        this.kickT = 0.28;
        const dy = J.y - footY, dx = J.x - (this.px + 22);
        if (Math.abs(dx) < 50 && dy > -70 && dy < 30) {
          const q = 1 - Math.abs(dy + 20) / 50; const perfect = q > 0.7 && Math.abs(dx) < 22;
          J.vy = -(480 + q * 160); J.vx = dx * -2 + U.rand(-1, 1) * (perfect ? 20 : 120);
          this.combo++; this.best = Math.max(this.best, this.combo); R6.Audio.sfx('pop', { vol: 0.5 }); this.fx.emit('feather', J.x, J.y, 3);
          this.msg = perfect ? 'PERFEITO!' : q > 0.35 ? 'BOM' : 'RASPOU'; this.msgT = 0.6;
          if (!this.endless && this.combo >= this.goal) { this.done = 'success'; R6.Audio.sfx('win'); }
        } else { this.msg = 'ERROU O TEMPO'; this.msgT = 0.6; }
      }
      if (this.msgT > 0) this.msgT -= dt;
      if (J.y > this.ground - 8) { J.y = this.ground - 8; R6.Audio.sfx('thud', { vol: 0.3 }); this.fx.emit('dust', J.x, this.ground, 8); if (this.endless) { this.done = 'fail'; return; } this.combo = 0; this.msg = 'CAIU! SEQUÊNCIA ZERADA'; this.msgT = 1; this.started = false; }
    }
    render(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#9fd0ee'); g.addColorStop(1, '#e6f2f6'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      ctx.fillStyle = '#c9a66b'; ctx.fillRect(0, this.ground, R6.W, 200);
      R6.Char.draw(ctx, plLook(), this.px, this.ground, { view: 'side', dir: 1, anim: this.kickT > 0 ? 'kick_jegi' : 'idle', t: this.kickT > 0 ? 0.28 - this.kickT : this.t, scale: 1.7 });
      const J = this.j; ctx.save(); ctx.translate(J.x, J.y); ctx.rotate(J.vx * 0.002);
      const cols = ['#ff5e8a', '#ffd166', '#6ecbff', '#8bd17c']; for (let i = 0; i < 8; i++) { ctx.strokeStyle = cols[i % 4]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo((i - 3.5) * 5, -20, (i - 3.5) * 7, -38 + Math.sin(this.t * 10 + i) * 2); ctx.stroke(); }
      ctx.fillStyle = '#c9ccd2'; ctx.beginPath(); ctx.ellipse(0, 2, 9, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(this.px + 22, this.ground - 90); ctx.lineTo(this.px + 22, this.ground - 10); ctx.stroke(); ctx.setLineDash([]);
      this.fx.draw(ctx);
      R6.UI.text(ctx, this.combo + (this.endless ? '' : ' / ' + this.goal), 640, 110, { size: 72, fam: 'mono', align: 'center', color: '#fff', shadow: true });
      R6.UI.text(ctx, 'SEQUÊNCIA', 640, 140, { size: 16, align: 'center', color: '#fff', weight: 800 });
      if (!this.started) R6.UI.text(ctx, 'ESPAÇO para lançar o jegi', 640, 680, { size: 18, align: 'center', color: '#333', weight: 800 });
      if (this.msgT > 0) R6.UI.text(ctx, this.msg, 640, 220, { size: 34, fam: 'title', align: 'center', color: '#fff', shadow: true });
    }
  }

  const STATIONS = { ddakji: DdakjiStation, stone: StoneStation, gonggi: GonggiStation, top: TopStation, jegi: JegiStation };
  const ST_ORDER = ['ddakji', 'stone', 'gonggi', 'top', 'jegi'];
  const ST_NAME = { ddakji: 'DDAKJI', stone: 'BISSEOKCHIGI', gonggi: 'GONGGI', top: 'PIÃO', jegi: 'JEGI' };
  const ST_SKILL = { ddakji: p => p.sk.physical * 0.5 + p.sk.precision * 0.5, stone: p => p.sk.precision * 0.7 + p.sk.physical * 0.3, gonggi: p => p.sk.precision * 0.6 + p.sk.nerve * 0.4, top: p => p.sk.precision * 0.5 + p.sk.strategy * 0.5, jegi: p => p.tr.spd * 0.6 + p.sk.nerve * 0.4 };
  R6.STATIONS = STATIONS;

  // standalone station scene (practice / extras)
  class StationScene extends R6.GameBase {
    constructor(opts = {}) {
      super(opts); this.kind = opts.station; this.gameId = opts.station; this.name = 'station:' + opts.station;
      this.st = new STATIONS[opts.station](Object.assign({ levels: 5 }, opts.stationOpts || {}));
      this.title = this.st.title; this.timeLeft = opts.timeLimit || 180;
    }
    rules() { return { title: this.st.title, icon: 'circle', sub: 'MINIJOGO DO PENTATLO', lines: [this.st.hint, 'Complete o desafio antes do tempo acabar.'], keys: [['MOUSE', 'mirar/pegar'], ['ESPAÇO', 'ação'], ['A/D', 'mover']] }; }
    begin() { R6.Music.play('game'); R6.Music.setIntensity(0.3); }
    update(dt) {
      this.t += dt; if (this.updateResult(dt)) return; if (this.updateRules(dt)) return;
      this.timeLeft -= dt; this.st.update(dt);
      if (this.st.done === 'success') { this.chips = 50; this.score = this.st.score || this.st.best || Math.round(this.timeLeft); this.scoreId = 'station_' + this.kind; this.win({ sub: this.st.title }); }
      else if (this.st.done === 'fail' || this.timeLeft <= 0) { this.score = this.st.best || this.st.combo || 0; this.scoreId = 'station_' + this.kind; this.lose({ reason: this.timeLeft <= 0 ? 'O tempo acabou' : 'Falhou' }); }
    }
    render(ctx) { this.st.render(ctx); if (this.phase === 'play') R6.HUD.draw(ctx, { game: this.st.title, timer: Math.max(0, this.timeLeft), hide: { prize: true, player: false } }); this.drawRules(ctx); }
    debugWin() { this.phase = 'play'; this.st.done = 'success'; }
  }
  R6.StationScene = StationScene;
  for (const k of ['stone', 'gonggi', 'top', 'jegi']) R6.registerGame(k, { name: ST_NAME[k], season: 2, icon: 'circle', desc: 'Minijogo do pentatlo.', create: o => new StationScene(Object.assign({ station: k }, o)) });

  // =================================================================== SIX LEGS
  class SixLegs extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'sixlegs'; this.name = 'sixlegs';
      this.timeLimit = R6.Save.D(300, 250, 210); this.timeLeft = this.timeLimit;
      this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: 3600, h: 760 } }); this.cam.set(400, 400, 1);
      this.stX = [700, 1250, 1800, 2350, 2900]; this.finishX = 3350;
      this.x = 260; this.si = 0; this.phaseS = 'assign'; this.march = { last: null, beat: 0, sync: 1, stumble: 0 };
      this.buildTeam();
    }
    rules() {
      if (this.phaseS === 'assign') return null;
      return {
        title: 'SEIS PERNAS', icon: 'square', sub: 'PENTATLO EM EQUIPE · 5 JOGADORES AMARRADOS',
        lines: ['Vocês estão amarrados pelos tornozelos. Andem juntos: A e D alternados, no ritmo.', 'Em cada estação, o jogador escalado precisa vencer o minijogo.', 'Quando for a vez de um companheiro, E dá apoio (aumenta a chance dele).', 'Se o tempo acabar antes da linha final, a equipe inteira é eliminada.'],
        keys: [['A / D', 'passos alternados'], ['E', 'incentivar'], ['ESPAÇO', 'ação no minijogo']],
      };
    }
    buildTeam() {
      const S = R6.State;
      let mates;
      if (this.campaign && S.s) {
        const allies = S.allies(20).slice(0, 4);
        const rest = U.shuffle(S.aliveBots().filter(p => !allies.includes(p) && !p.secret)).slice(0, 4 - allies.length);
        mates = allies.concat(rest);
      } else mates = Array.from({ length: 4 }, (_, i) => { const tr = { spd: Math.random(), str: Math.random(), intel: Math.random(), fear: Math.random(), courage: Math.random(), precision: Math.random(), kindness: 0.5, trust: 0.5, loyalty: 0.5, chaos: 0.3 }; return { num: 40 + i * 31, name: R6.Roster.genName(new U.RNG(i + 3)), look: R6.Char.makeLook({ num: 40 + i * 31 }), tr, sk: R6.Roster.skillsOf(tr), rel: 20, fake: true, alive: true }; });
      this.mates = mates;
      this.team = [{ isPlayer: true, look: plLook(), name: 'VOCÊ' }].concat(mates.map(p => ({ p, look: p.look, name: p.key ? p.name : '#' + U.pad(p.num) })));
      // default assignment by skill (player takes the station left over)
      this.assign = {}; const free = ST_ORDER.slice();
      const bots = mates.slice().sort((a, b) => Math.max(...ST_ORDER.map(s => ST_SKILL[s](b))) - Math.max(...ST_ORDER.map(s => ST_SKILL[s](a))));
      for (const p of bots) { let best = null, bv = -1; for (const s of free) { const v = ST_SKILL[s](p); if (v > bv) { bv = v; best = s; } } this.assign[best] = p; free.splice(free.indexOf(best), 1); }
      this.assign[free[0]] = 'player';
      this.selRow = 0;
    }
    swapAssign(i) {
      const s = ST_ORDER[i]; const cur = this.assign[s];
      // put the player here, move whoever was here to the player's old station
      const old = ST_ORDER.find(k => this.assign[k] === 'player');
      if (old === s) return; this.assign[old] = cur; this.assign[s] = 'player'; R6.Audio.sfx('click');
    }
    begin() {
      this.phaseS = 'march'; R6.Music.play('game'); R6.Music.setIntensity(0.3); R6.Audio.loop('crowd', 0.25);
      if (this.campaign) R6.State.decide('sixlegs_station', ST_ORDER.find(k => this.assign[k] === 'player'), '');
      R6.Dialog.announce('Pentatlo de seis pernas. Cinco minutos. Boa sorte.', null, 2.4);
    }
    focus() { const s = this.cam.toScreen(this.x, 560); return { x: s.x, y: s.y, look: plLook(), scale: 1.2, facing: 1 }; }
    update(dt) {
      this.t += dt; this.fx.update(dt);
      if (this.phaseS === 'assign') return this.updAssign(dt);
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) return;
      if (this.station) {
        this.timeLeft -= dt; this.station.update(dt);
        if (this.station.done === 'success') { this.stationDone(true); }
        if (this.timeLeft <= 0) this.timeUp();
        return;
      }
      this.timeLeft -= dt; if (this.timeLeft <= 0) return this.timeUp();
      const I = R6.Input; const M = this.march;
      if (this.phaseS === 'march') {
        if (M.stumble > 0) { M.stumble -= dt; if (M.stumble <= 0) R6.Toast.show('De pé! Ritmo!', { color: '#2ec4b6' }); }
        else {
          const key = I.actP('left') ? 'L' : I.actP('right') ? 'R' : null;
          M.beat += dt;
          if (key) {
            const teamSync = this.mates.reduce((a, p) => a + (p.sk ? p.sk.nerve : 0.5), 0) / 4;
            if (key === M.last) { M.stumble = R6.Save.D(1.2, 1.6, 2); M.last = null; R6.Audio.sfx('thud'); this.cam.shake(6, 0.3); R6.Toast.show('Pé errado! A equipe tropeçou!', { color: '#ff5a6a' }); }
            else if (M.beat < 0.12) { M.sync = Math.max(0.3, M.sync - 0.2); }
            else { const q = U.clamp(1 - Math.abs(M.beat - 0.45) / 0.45, 0.3, 1); this.x += 34 * q * (0.8 + teamSync * 0.4); M.last = key; M.beat = 0; R6.Audio.sfx('step', { vol: 0.5 }); if (Math.random() < 0.02 * (1 - teamSync)) { M.stumble = 1; R6.Toast.show('Um companheiro tropeçou!', { color: '#ff5a6a' }); } }
          }
        }
        const target = this.si < 5 ? this.stX[this.si] : this.finishX;
        if (this.x >= target) { this.x = target; if (this.si < 5) this.arrive(); else this.finish(); }
      } else if (this.phaseS === 'bot') this.updBot(dt, I);
      this.cam.follow(this.x + 200, 400, 1); this.cam.update(dt);
    }
    updAssign(dt) {
      const I = R6.Input;
      if (I.actP('up')) { this.selRow = Math.max(0, this.selRow - 1); R6.Audio.sfx('hover'); }
      if (I.actP('down')) { this.selRow = Math.min(5, this.selRow + 1); R6.Audio.sfx('hover'); }
      const m = I.mouse; if (this.rows) this.rows.forEach((r, i) => { if (U.rectHit(m.x, m.y, r)) { if (m.moved) this.selRow = i; if (m.pressed) this.pickRow(i); } });
      if (I.actP('confirm')) this.pickRow(this.selRow);
    }
    pickRow(i) { if (i === 5) { R6.Audio.sfx('confirm'); this.phaseS = 'rules'; this.phase = 'rules'; this.rulesT = 0; return; } this.swapAssign(i); }
    arrive() {
      const s = ST_ORDER[this.si]; const who = this.assign[s];
      R6.Audio.sfx('whistle', { vol: 0.4 });
      if (who === 'player') { this.phaseS = 'station'; this.station = new STATIONS[s]({ levels: 3 }); R6.Banner.show(ST_NAME[s], 'SUA VEZ', { dur: 1.6 }); }
      else { this.phaseS = 'bot'; this.bot = { p: who, t: 0, tries: 0, cheer: 0, next: U.rand(2.2, 3.5) }; R6.Banner.show(ST_NAME[s], (who.key ? who.name : '#' + U.pad(who.num)) + ' joga', { dur: 1.6 }); }
    }
    updBot(dt, I) {
      const B = this.bot; B.t += dt; if (B.cheerCd > 0) B.cheerCd -= dt;
      if (I.actP('interact') && !(B.cheerCd > 0)) { B.cheer = Math.min(3, B.cheer + 1); B.cheerCd = 1.2; R6.Audio.sfx('confirm', { vol: 0.4 }); this.cheerMsg = U.pick(['Você consegue!', 'Respira! Devagar!', 'Estamos com você!']); this.cheerT = 1.2; if (!B.p.fake) R6.State.addRel(B.p, 2, 'helped', { silent: true }); }
      if (this.cheerT > 0) this.cheerT -= dt;
      if (B.t >= B.next) {
        B.tries++; B.t = 0; B.next = U.rand(2.4, 3.8);
        const skill = ST_SKILL[ST_ORDER[this.si]](B.p);
        const pressure = this.timeLeft < 60 ? 0.08 : 0;
        const p = U.clamp(0.12 + skill * 0.45 + B.cheer * 0.06 - pressure + B.tries * 0.03, 0.05, 0.9);
        if (Math.random() < p) { B.ok = true; R6.Audio.sfx('win'); this.botMsg = 'CONSEGUIU!'; R6.Engine.after(1, () => this.stationDone(true)); B.next = 999; }
        else { R6.Audio.sfx('error', { vol: 0.5 }); this.botMsg = U.pick(['Errou…', 'Quase!', 'De novo…']); }
        this.botMsgT = 1.2;
      }
      if (this.botMsgT > 0) this.botMsgT -= dt;
    }
    stationDone(ok) {
      if (this.phaseS === 'march') return;
      this.station = null; this.bot = null; this.si++; this.phaseS = 'march';
      R6.Audio.sfx('pass', { vol: 0.6 }); R6.Toast.show('Estação ' + this.si + '/5 concluída!', { color: '#2ec4b6' });
    }
    finish() {
      if (this.result) return;
      if (this.campaign) this.resolveOthers();
      this.chips = 100; this.win({ sub: 'A EQUIPE CRUZOU A LINHA · ' + U.time(this.timeLeft) + ' RESTANTES' });
    }
    timeUp() {
      if (this.result) return;
      if (this.campaign) { for (const p of this.mates) if (p.alive && !p.fake) R6.Elim.kill(p, { cause: 'sixlegs', silent: true }); R6.State.eliminate(R6.State.player, 'sixlegs'); }
      this.lose({ reason: 'O tempo acabou' });
    }
    resolveOthers() {
      const S = R6.State; const inTeam = new Set(this.mates.map(p => p.id));
      const rest = U.shuffle(S.aliveBots().filter(p => !inTeam.has(p.id)));
      for (let i = 0; i + 5 <= rest.length; i += 5) {
        const t = rest.slice(i, i + 5); if (t.some(p => p.key)) continue;
        const avg = t.reduce((a, p) => a + (p.sk.precision + p.sk.nerve) / 2, 0) / 5;
        if (Math.random() > avg * 0.9 + 0.25) t.forEach(p => R6.Elim.kill(p, { cause: 'sixlegs', silent: true }));
      }
    }
    debugWin() { this.phaseS = 'march'; this.phase = 'play'; this.station = null; this.si = 5; this.finish(); }
    render(ctx) {
      if (this.station) { this.station.render(ctx); this.drawTopHUD(ctx, true); return; }
      const cam = this.cam, t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#6aa9d8'); g.addColorStop(1, '#bfe0f2'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      ctx.fillStyle = '#86b86f'; ctx.beginPath(); ctx.moveTo(0, 470); for (let x = 0; x <= 3600; x += 120) ctx.lineTo(x, 430 + Math.sin(x * 0.004) * 30); ctx.lineTo(3600, 560); ctx.lineTo(0, 560); ctx.fill();
      ctx.fillStyle = '#d6b27a'; ctx.fillRect(0, 560, 3600, 200);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 0; x < 3600; x += 60) ctx.fillRect(x, 640, 30, 4);
      // stations
      this.stX.forEach((sx, i) => {
        const done = i < this.si; const s = ST_ORDER[i];
        ctx.fillStyle = done ? '#2a9d8f' : '#e8336d'; ctx.fillRect(sx + 40, 380, 8, 180); ctx.fillRect(sx + 40, 380, 150, 46);
        R6.UI.text(ctx, (i + 1) + ' ' + ST_NAME[s], sx + 115, 410, { size: 18, align: 'center', color: '#fff', weight: 800 });
        ctx.fillStyle = '#f4efe2'; ctx.fillRect(sx + 70, 540, 90, 20);
        const who = this.assign[s]; if (who && who !== 'player' && !done) R6.UI.text(ctx, who.key ? who.name : '#' + U.pad(who.num), sx + 115, 442, { size: 13, align: 'center', color: '#222', weight: 700 });
        if (who === 'player' && !done) R6.UI.text(ctx, 'VOCÊ', sx + 115, 442, { size: 13, align: 'center', color: '#e8336d', weight: 800 });
      });
      ctx.fillStyle = '#fff'; ctx.fillRect(this.finishX, 360, 12, 200); for (let y = 360; y < 560; y += 20) { ctx.fillStyle = (y / 20) % 2 ? '#111' : '#fff'; ctx.fillRect(this.finishX + 12, y, 20, 20); }
      // team: 5 people side by side (depth stagger), ankles tied
      const M = this.march; const walking = this.phaseS === 'march' && M.beat < 0.35 && M.last;
      this.team.forEach((m, i) => {
        const z = (4 - i) * 0.1; const x = this.x - i * 6, y = 560 - (4 - i) * 10;
        let anim = M.stumble > 0 ? 'trip' : walking ? 'walk' : this.phaseS === 'bot' && m.p === (this.bot && this.bot.p) ? (this.bot.ok ? 'celebrate' : 'hold') : 'idle';
        R6.Char.draw(ctx, m.look, x, y, { view: 'side', dir: 1, anim, t: anim === 'trip' ? 1.6 - M.stumble : t + (walking ? 0 : i), scale: 1.15 * (1 - z * 0.3), highlight: m.isPlayer ? 'rgba(255,255,255,.4)' : null });
      });
      ctx.strokeStyle = '#e8336d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(this.x - 30, 548); ctx.lineTo(this.x + 12, 520); ctx.stroke();
      this.fx.draw(ctx);
      cam.end(ctx);
      if (this.phaseS === 'assign') return this.drawAssign(ctx);
      this.drawTopHUD(ctx, false);
      if (this.phaseS === 'bot' && this.bot) {
        const B = this.bot; R6.UI.panel(ctx, 390, 520, 500, 110, { fill: 'rgba(8,10,14,.85)' });
        R6.UI.text(ctx, (B.p.key ? B.p.name : '#' + U.pad(B.p.num)) + ' está jogando ' + ST_NAME[ST_ORDER[this.si]], 640, 550, { size: 18, align: 'center', weight: 800 });
        R6.UI.bar(ctx, 450, 566, 380, 10, Math.min(1, B.t / B.next), { color: '#f2c14e' });
        R6.UI.text(ctx, 'TENTATIVAS: ' + B.tries + '   ·   E = INCENTIVAR (' + B.cheer + '/3)', 640, 602, { size: 15, align: 'center', color: '#bbb', weight: 700 });
        if (this.botMsgT > 0) R6.UI.text(ctx, this.botMsg, 640, 300, { size: 44, fam: 'title', align: 'center', color: '#fff', shadow: true });
        if (this.cheerT > 0) R6.UI.text(ctx, '"' + this.cheerMsg + '"', 640, 490, { size: 20, align: 'center', color: '#9fd4ff', weight: 800, shadow: true });
      }
      if (this.phaseS === 'march') R6.UI.hints(ctx, [['A', 'pé esquerdo'], ['D', 'pé direito']], 640, R6.H - 60, { align: 'center' });
      this.drawRules(ctx);
    }
    drawTopHUD(ctx, inStation) {
      R6.HUD.draw(ctx, { game: 'SEIS PERNAS' + (inStation ? ' · ' + ST_NAME[ST_ORDER[this.si]] : ''), timer: Math.max(0, this.timeLeft), objective: inStation ? this.station.hint : this.phaseS === 'march' ? 'Andem juntos até a próxima estação (A/D alternados)' : '', hide: this.campaign ? {} : { prize: true } });
      const x = 400; for (let i = 0; i < 5; i++) { ctx.fillStyle = i < this.si ? '#2ec4b6' : i === this.si ? '#f2c14e' : 'rgba(255,255,255,.2)'; ctx.fillRect(x + i * 100, 110, 90, 6); R6.UI.text(ctx, ST_NAME[ST_ORDER[i]], x + i * 100 + 45, 132, { size: 11, align: 'center', weight: 800, color: '#fff' }); }
    }
    drawAssign(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.text(ctx, 'ESCALAÇÃO DO PENTATLO', 640, 80, { size: 52, fam: 'title', align: 'center', color: '#fff', spacing: 4 });
      R6.UI.text(ctx, 'Clique numa estação para jogá-la você mesmo. Os outros ocupam as restantes.', 640, 114, { size: 17, align: 'center', color: '#bbb' });
      this.rows = [];
      ST_ORDER.forEach((s, i) => {
        const y = 150 + i * 80, r = { x: 240, y, w: 800, h: 70 }; this.rows.push(r); const who = this.assign[s]; const hov = this.selRow === i;
        R6.UI.panel(ctx, r.x, r.y, r.w, r.h, { fill: who === 'player' ? 'rgba(232,51,109,.25)' : 'rgba(12,14,20,.92)', stroke: hov ? '#fff' : 'rgba(255,255,255,.12)', shadow: false, lw: hov ? 2 : 1 });
        R6.UI.text(ctx, (i + 1) + '  ' + ST_NAME[s], r.x + 20, y + 42, { size: 24, fam: 'title', color: '#fff', spacing: 2 });
        const name = who === 'player' ? 'VOCÊ' : who.key ? who.name : '#' + U.pad(who.num);
        R6.UI.text(ctx, name, r.x + 330, y + 42, { size: 18, weight: 800, color: who === 'player' ? '#e8336d' : '#fff' });
        if (who !== 'player') { R6.UI.text(ctx, 'HABILIDADE', r.x + 560, y + 30, { size: 11, weight: 800, color: '#999' }); R6.UI.bar(ctx, r.x + 560, y + 38, 200, 10, ST_SKILL[s](who), { color: '#2ec4b6' }); }
        else R6.UI.text(ctx, 'você joga este minijogo', r.x + 560, y + 42, { size: 14, color: '#e8a0b8' });
      });
      const r = { x: 540, y: 560, w: 200, h: 50 }; this.rows.push(r);
      R6.UI.button(ctx, r.x, r.y, r.w, r.h, 'PRONTOS', { hover: this.selRow === 5, size: 20 });
    }
  }
  R6.SixLegs = SixLegs;
  R6.registerGame('sixlegs', { name: 'Seis Pernas', season: 2, icon: 'square', desc: 'Pentatlo em equipe amarrada.', create: o => new SixLegs(o) });
})();
