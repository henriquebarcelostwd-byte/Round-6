/* ROUND 6 — jumprope.js : Jump Rope (Season 3) — suspended bridge with a central gap, giant rope turned by the two dolls,
   3D rope sweep & hit test, variable-height jumps, loose planks, wind, bots with different failure modes, helping others,
   slow-motion moments, time limit. Variant: survival (endless jumps) */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const BR = 540, X1 = 1150, X2 = 1850, GAP0 = 1455, GAP1 = 1545, END = 2650, W = 3100, RR = 175;

  class JumpRope extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'jumprope'; this.name = 'jumprope';
      this.survival = opts.variant === 'survival';
      this.cam = new R6.Camera({ bounds: { x: 0, y: -200, w: W, h: 1100 } }); this.cam.set(500, 380, 1);
      this.theta = Math.PI; this.omega = TAU / 1.9; this.timeLimit = R6.Save.D(240, 210, 180); this.timeLeft = this.timeLimit;
      this.planks = []; for (let x = 420; x < END - 30; x += 60) if ((x < GAP0 - 70 || x > GAP1 + 10) && Math.random() < 0.08) this.planks.push({ x, w: 56, state: 'ok', t: 0 });
      this.wind = 0; this.windT = 5; this.jumps = 0; this.people = [];
      this.build();
    }
    rules() {
      return {
        title: this.survival ? 'JUMP ROPE SURVIVAL' : 'PULAR CORDA', icon: 'circle', sub: this.survival ? 'QUANTOS PULOS VOCÊ AGUENTA?' : 'ATRAVESSE A PONTE · A CORDA NÃO PARA',
        lines: this.survival ? ['Fique no centro da corda e pule a cada volta.', 'A velocidade aumenta sem parar.', 'W/ESPAÇO pular (segure para pular mais alto).'] :
          ['Atravesse a ponte suspensa até o outro lado antes do tempo acabar.', 'Na área da corda, pule (W/ESPAÇO) quando ela passar pelos seus pés — segure para ir mais alto.', 'No meio há um BURACO: corra (SHIFT) e pule longe para atravessar.', 'Pranchas soltas cedem. O vento empurra.', 'E perto de alguém travado na beira do buraco: dar a mão e ajudar a pular.'],
        keys: [['A / D', 'andar'], ['SHIFT', 'correr'], ['W / ESPAÇO', 'pular'], ['E', 'ajudar']],
      };
    }
    build() {
      const S = R6.State; const look = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 });
      this.pl = this.mk(look, S.s ? S.player : null, true, this.survival ? 1500 : 220);
      if (this.survival) return;
      const bots = this.campaign && S.s ? S.aliveBots() : Array.from({ length: 14 }, (_, i) => ({ num: 20 + i * 17, look: R6.Char.makeLook({ num: 20 + i * 17 }), tr: { fear: Math.random(), courage: Math.random(), spd: Math.random(), intel: Math.random(), betray: Math.random() * 0.8, kindness: Math.random() }, fake: true, alive: true }));
      bots.forEach((p, i) => {
        const a = this.mk(p.look, p, false, 330 - (i % 8) * 26 - Math.floor(i / 8) * 12);
        const tr = p.tr; const kind = p.key;
        a.ai = { delay: U.rand(2, 40) + i * 2.5 + tr.fear * 20, timing: 0.05 + (1 - (tr.intel + (1 - tr.fear)) / 2) * 0.22, early: Math.random() < 0.5, gapFear: tr.fear, pusher: tr.betray > 0.75 && !kind, freeze: tr.fear > 0.8 && !kind ? U.rand(3, 10) : 0 };
        if (kind === 'soldier' || kind === 'fm001') { a.ai.timing = 0.02; a.ai.gapFear = 0.1; }
        if (kind === 'mother') { a.ai.gapFear = 0.95; a.ai.needsHelp = true; }
        this.people.push(a);
      });
    }
    mk(look, p, isPlayer, x) { return { look, p, isPlayer, x, y: 0, vy: 0, air: false, vx: 0, t: Math.random() * 3, anim: 'idle', state: 'go', done: false, dead: false, dir: 1, fall: null, facing: 1 }; }
    begin() { R6.Music.play('game'); R6.Music.setIntensity(0.3); R6.Audio.loop('wind', 0.35); R6.Dialog.announce(this.survival ? 'Pule. Não pare.' : 'Pular corda. Atravessem a ponte. Quem cair será eliminado.', null, 2.6); }
    focus() { const s = this.cam.toScreen(this.pl.x, BR); return { x: s.x, y: s.y, look: this.pl.look, scale: 1.25 * this.cam.zoom, facing: 1 }; }
    // rope geometry
    d(x) { if (x < X1 || x > X2) return 0; return RR * Math.sin(Math.PI * (x - X1) / (X2 - X1)); }
    ropeY(x) { return BR - RR + this.d(x) * Math.cos(this.theta) + (this.d(x) === 0 ? 0 : 0); }
    ropeZ(x) { return this.d(x) * Math.sin(this.theta); }
    onGround(x) { if (x > GAP0 && x < GAP1) return false; for (const pk of this.planks) if (pk.state === 'gone' && x > pk.x && x < pk.x + pk.w) return false; return x > -50 && x < W; }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.fx.update(dt);
      const prevCos = Math.cos(this.theta), prevSin = Math.sin(this.theta);
      if (this.phase === 'play' && !this.result) {
        const lvl = this.survival ? Math.min(1, this.jumps / 60) : Math.min(1, (this.timeLimit - this.timeLeft) / this.timeLimit);
        this.omega = TAU / U.lerp(this.survival ? 1.8 : 1.9, R6.Save.D(1.15, 1.0, 0.85), lvl) * (1 + Math.sin(this.t * 0.3) * 0.08);
      }
      this.theta += this.omega * dt; if (this.theta > TAU) this.theta -= TAU;
      const sinN = Math.sin(this.theta), cosN = Math.cos(this.theta);
      // the rope passes the bridge plane at the bottom → hit test
      const crossBottom = prevSin < 0 && sinN >= 0 && cosN > 0 || prevSin > 0 && sinN <= 0 && cosN > 0;
      if (crossBottom) { R6.Audio.sfx('ropeWhoosh', { vol: 0.6 }); this.cam.shake(2, 0.1); if (this.phase === 'play') this.ropeHit(); }
      for (const pk of this.planks) if (pk.state === 'shake') { pk.t += dt; if (pk.t > 0.6) { pk.state = 'gone'; R6.Audio.sfx('rope'); this.fx.emit('debris', pk.x + pk.w / 2, BR, 10); } }
      if (this.updateResult(dt)) { this.stepPeople(dt, true); this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      if (!this.survival) { this.timeLeft -= dt; if (this.timeLeft <= 0) this.timeUp(); }
      this.windT -= dt; if (this.windT <= 0) { this.windT = U.rand(4, 9); this.wind = U.rand(-1, 1) * R6.Save.D(40, 65, 90); if (Math.abs(this.wind) > 30) R6.Audio.sfx('wind'); } else this.wind *= Math.exp(-dt * 0.4);
      this.updPlayer(dt);
      this.stepPeople(dt, false);
      R6.Music.setIntensity(this.pl.x > X1 - 100 && this.pl.x < X2 + 50 ? 0.9 : 0.4);
      const inZone = this.pl.x > X1 - 150 && this.pl.x < X2 + 100;
      this.cam.follow(this.pl.x + 120, 380 + (this.pl.fall ? this.pl.fall.y * 0.4 : 0), inZone ? 1.12 : 0.95); this.cam.update(dt);
    }
    ropeHit() {
      for (const a of [this.pl].concat(this.people)) {
        if (a.dead || a.done || a.fall) continue;
        if (a.x < X1 || a.x > X2) continue;
        const h = RR - this.d(a.x); // rope height above the bridge at this x when it sweeps the bottom
        if (a.y > h + 8 || h > a.y + 118 * (a.look.h || 1)) { if (a.isPlayer) { this.jumps++; if (this.survival) { this.score = this.jumps; R6.Audio.sfx('coin', { vol: 0.3 }); } } continue; }
        this.trip(a);
      }
    }
    trip(a, why) {
      if (a.fall || a.dead) return;
      a.fall = { t: 0, vy: -200, y: 0, vx: (Math.random() < 0.5 ? -1 : 1) * 60, spin: U.rand(-4, 4) }; a.state = 'fall';
      R6.Audio.sfx('scream', { delay: 0.1, vol: a.isPlayer ? 1 : 0.6 }); R6.Audio.sfx('hit');
      if (a.isPlayer || U.dist(a.x, 0, this.pl.x, 0) < 400) R6.Engine.slowmo(0.35, 0.9);
      if (a.isPlayer) { if (this.campaign) R6.State.eliminate(R6.State.player, 'jumprope'); this.score = this.survival ? this.jumps : this.score; this.lose({ reason: why || 'A corda te acertou', wait: 3.2 }); }
      else if (a.p && !a.p.fake) R6.Elim.kill(a.p, { cause: 'jumprope', sfx: false, host: this, silent: U.dist(a.x, 0, this.pl.x, 0) > 700 });
    }
    physics(a, dt, wantX, wantRun, jumpPressed, jumpHeld) {
      if (a.fall) { const f = a.fall; f.t += dt; f.vy += 1400 * dt; f.y += f.vy * dt; a.x += f.vx * dt; a.anim = 'flail'; if (f.y > 900) a.dead = true; return; }
      const sp = wantRun ? 230 : 125;
      a.vx = U.approach(a.vx, wantX * sp, (a.air ? 500 : 1400) * dt);
      a.vx += this.wind * dt * (a.air ? 1.5 : 0.4);
      a.x += a.vx * dt;
      if (Math.abs(a.vx) > 5) a.facing = Math.sign(a.vx);
      if (!a.air && jumpPressed) { a.air = true; a.vy = wantRun ? 560 : 520; a.jumpHold = 0.22; if (a.isPlayer) R6.Audio.sfx('jump', { vol: 0.5 }); }
      if (a.air) {
        if (a.jumpHold > 0 && jumpHeld) { a.vy += 900 * dt; a.jumpHold -= dt; } else a.jumpHold = 0;
        a.vy -= 1500 * dt; a.y += a.vy * dt;
        if (a.y <= 0) {
          if (this.onGround(a.x)) { a.y = 0; a.vy = 0; a.air = false; if (a.isPlayer) R6.Audio.sfx('land', { vol: 0.5 }); this.stepPlank(a); }
          else if (a.y < -30) { this.trip(a, 'Você caiu no buraco'); }
        }
        a.anim = 'jump';
      } else {
        if (!this.onGround(a.x)) { a.air = true; a.vy = 0; }
        a.anim = Math.abs(a.vx) > 150 ? 'run' : Math.abs(a.vx) > 12 ? 'walk' : 'idle';
      }
      a.t += dt;
    }
    stepPlank(a) { for (const pk of this.planks) if (pk.state === 'ok' && a.x > pk.x && a.x < pk.x + pk.w) { pk.state = 'shake'; pk.t = 0; R6.Audio.sfx('rope', { vol: 0.6 }); if (a.isPlayer) R6.Toast.show('A prancha está cedendo!', { color: '#ff5a6a' }); } }
    updPlayer(dt) {
      const a = this.pl; if (a.dead || a.done) { if (a.done) a.anim = 'celebrate'; return; }
      const I = R6.Input; const ax = (I.act('right') ? 1 : 0) - (I.act('left') ? 1 : 0);
      const jp = I.actP('jump'), jh = I.act('jump');
      this.physics(a, dt, ax, I.act('run'), jp, jh);
      if (!a.air && a.x > GAP0 - 70 && a.x < GAP1 + 70 && jp && I.act('run')) R6.Engine.slowmo(0.5, 0.5);
      if (a.x >= END && !this.survival) { a.done = true; R6.Audio.sfx('pass'); R6.Banner.show('VOCÊ ATRAVESSOU', 'Segure ESPAÇO para acelerar o resto', { color: '#2ec4b6', dur: 2.4 }); }
      if (this.survival) a.x = U.clamp(a.x, X1 + 150, X2 - 150);
      a.x = Math.max(a.x, -20);
      // help someone frozen at the gap
      if (I.actP('interact')) {
        const h = this.people.find(b => !b.dead && !b.done && !b.fall && b.state === 'freeze' && Math.abs(b.x - a.x) < 70);
        if (h) { h.state = 'helped'; h.helper = a; R6.Audio.sfx('grab'); a.anim = 'grab'; if (h.p && !h.p.fake) { R6.State.addRel(h.p, 30, 'helped'); R6.State.karma(2); if (h.p.key === 'mother') R6.State.flag('helped_mother_rope', true); } R6.Toast.show('Você deu a mão para ' + (h.p && h.p.key ? h.p.name : '#' + U.pad(h.p ? h.p.num : 0)), { color: '#2ec4b6' }); }
      }
    }
    stepPeople(dt, frozen) {
      for (const b of this.people) {
        if (b.dead) continue;
        if (b.done) { b.anim = 'idle'; b.t += dt; continue; }
        const ai = b.ai; let wantX = 0, run = false, jp = false, jh = false;
        if (!frozen && this.phase === 'play' && !b.fall) {
          ai.delay -= dt;
          if (ai.delay <= 0) {
            wantX = 1;
            // rope zone timing: jump when the rope is about to reach the bottom
            if (b.x > X1 - 10 && b.x < X2) {
              const toBottom = ((TAU - this.theta) % TAU) / this.omega; // time until theta wraps to 0 (bottom)
              const lead = ai.early ? 0.22 + ai.timing : 0.16 - ai.timing * 0.5;
              if (!b.air && toBottom < lead && toBottom > lead - 0.08) jp = true; jh = jp;
              if (b.x > X1 + 40 && b.x < GAP0 - 40 && this.theta > 4.6 && this.theta < 5.8) wantX = 0; // wait for the rope window
            }
            // the gap
            if (b.x > GAP0 - 90 && b.x < GAP0 - 5 && !b.air) {
              if (b.state === 'helped') { run = true; jp = true; jh = true; b.state = 'go'; }
              else if (ai.gapFear > 0.75 && b.state !== 'jumpgap') { b.state = 'freeze'; wantX = 0; ai.freezeT = (ai.freezeT || 0) + dt; if (ai.freezeT > 8) { b.state = 'jumpgap'; } }
              else { run = true; if (b.x > GAP0 - 45) { jp = true; jh = Math.random() > ai.gapFear * 0.5; } }
            }
            if (b.state === 'jumpgap' && b.x > GAP0 - 40 && !b.air) { jp = true; jh = Math.random() > 0.5; }
            if (ai.freeze > 0 && b.x > X1 - 60 && b.x < X1) { ai.freeze -= dt; wantX = 0; }
            // push someone in front at the gap (betrayal)
            if (ai.pusher && !ai.pushed && b.x > GAP0 - 120) { const f = this.people.find(o => o !== b && !o.dead && !o.fall && o.x > b.x && o.x - b.x < 40 && !o.air); if (f && Math.random() < dt * 0.8) { ai.pushed = true; b.anim = 'push'; f.vx += 260; if (f.x > GAP0 - 50) this.trip(f); } }
            if (this.pl.x < b.x + 30 && this.pl.x > b.x - 30 && !this.pl.air && ai.pusher && !ai.pushedPl && this.pl.x > GAP0 - 120 && this.pl.x < GAP0 && Math.random() < dt * 0.4) { ai.pushedPl = true; this.pl.vx += 220; R6.Toast.show('Alguém te empurrou!', { color: '#ff5a6a' }); }
          }
        }
        // separation (single-file bridge)
        this.physics(b, dt, wantX, run, jp, jh);
        if (b.state === 'freeze' && !b.air) b.anim = 'scared';
        if (b.x >= END + (this.people.indexOf(b) % 6) * 18) { b.done = true; }
      }
      if (this.pl.done && !this.result) { if (R6.Input.act('action')) R6.Engine.timeScale = 4; else if (!R6.Engine.slow) R6.Engine.timeScale = 1; if (this.people.every(b => b.dead || b.done || b.fall)) { R6.Engine.timeScale = 1; this.finish(); } }
    }
    finish() { if (this.result) return; if (this.campaign) for (const b of this.people) if (b.fall && b.p && !b.p.fake && b.p.alive) R6.Elim.kill(b.p, { silent: true }); this.chips = 110; this.win({ sub: 'VOCÊ ATRAVESSOU A PONTE' }); }
    timeUp() {
      if (this.result) return;
      if (!this.pl.done) { if (this.campaign) R6.State.eliminate(R6.State.player, 'jumprope'); this.lose({ reason: 'O tempo acabou' }); return; }
      for (const b of this.people) if (!b.done && !b.dead && b.p && !b.p.fake) R6.Elim.kill(b.p, { cause: 'jumprope', silent: true });
      this.finish();
    }
    debugWin() { this.phase = 'play'; this.pl.done = true; this.pl.x = END + 10; for (const b of this.people) { if (b.p && b.p.key) b.done = true; else if (Math.random() < 0.4) { b.dead = true; if (b.p && !b.p.fake) R6.Elim.kill(b.p, { silent: true }); } else b.done = true; } this.finish(); }
    // ------------------------------------------------ render
    render(ctx) {
      const cam = this.cam, t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#0d1a2e'); g.addColorStop(1, '#2a3a55'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      const v = cam.view(200);
      // huge hall: painted clouds + far bottom
      ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 12; i++) { const x = i * 300 + 60; ctx.beginPath(); ctx.ellipse(x, 120 + (i % 3) * 60, 120, 30, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#03050a'; ctx.fillRect(v.x0, BR + 30, v.x1 - v.x0, 1200);
      ctx.strokeStyle = 'rgba(100,140,200,.08)'; for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(v.x0, BR + 40 + i * i * 8); ctx.lineTo(v.x1, BR + 40 + i * i * 8); ctx.stroke(); }
      // dolls on pillars (background)
      ctx.fillStyle = '#3a4050'; ctx.fillRect(X1 - 70, BR - 140, 70, 700); ctx.fillRect(X2, BR - 140, 70, 700);
      R6.Props.doll(ctx, X1 - 35, BR - 140, 0.62, { t, face: 1, talking: Math.sin(this.theta) > 0.8 });
      R6.Props.chulsu(ctx, X2 + 35, BR - 140, 0.62, { t, armAng: Math.sin(this.theta) * 0.8 });
      // rope back half (z < 0 → behind the bridge)
      this.drawRope(ctx, false);
      // bridge
      ctx.fillStyle = '#6b5a48'; ctx.fillRect(-50, BR, GAP0 + 50, 14); ctx.fillRect(GAP1, BR, W - GAP1, 14);
      ctx.fillStyle = '#8a7660'; for (let x = 0; x < W; x += 60) if (x + 56 < GAP0 || x > GAP1) ctx.fillRect(x, BR - 2, 56, 5);
      for (const pk of this.planks) { if (pk.state === 'gone') { ctx.fillStyle = '#03050a'; ctx.fillRect(pk.x, BR - 3, pk.w, 20); } else if (pk.state === 'shake') { ctx.fillStyle = '#a0522d'; ctx.fillRect(pk.x + Math.sin(t * 60) * 2, BR - 2, pk.w, 5); } else { ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pk.x + 8, BR); ctx.lineTo(pk.x + 30, BR + 4); ctx.stroke(); } }
      ctx.fillStyle = '#2a2d33'; for (let x = 0; x < W; x += 180) if (x < GAP0 - 20 || x > GAP1 + 10) ctx.fillRect(x, BR + 14, 8, 30);
      ctx.fillStyle = '#e8336d'; ctx.fillRect(GAP0 - 6, BR - 4, 6, 18); ctx.fillRect(GAP1, BR - 4, 6, 18);
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(END, BR - 4, 400, 8); R6.UI.text(ctx, 'CHEGADA', END + 150, BR + 60, { size: 40, fam: 'title', color: 'rgba(255,255,255,.25)' });
      // people
      for (const a of this.people.concat([this.pl])) {
        if (a.dead) continue;
        const y = BR - a.y + (a.fall ? a.fall.y : 0);
        ctx.save(); ctx.translate(a.x, y); if (a.fall) ctx.rotate(a.fall.t * a.fall.spin);
        R6.Char.draw(ctx, a.look, 0, 0, { view: 'side', dir: a.facing || 1, anim: a.anim, t: a.t, scale: 1.2, highlight: a.isPlayer ? 'rgba(255,255,255,.5)' : null, shadow: !a.air && !a.fall, zoom: cam.zoom });
        ctx.restore();
        if (a.state === 'freeze' && !a.isPlayer && Math.abs(a.x - this.pl.x) < 90) { ctx.save(); ctx.translate(a.x - 30, y - 160); R6.UI.keyHint(ctx, 'E', 'AJUDAR', 0, 0); ctx.restore(); }
      }
      // rope front half
      this.drawRope(ctx, true);
      this.fx.draw(ctx);
      cam.end(ctx);
      R6.UI.vignette(ctx, 0.5);
      if (this.phase === 'play') {
        R6.HUD.draw(ctx, { game: this.survival ? 'JUMP ROPE SURVIVAL · ' + this.jumps + ' PULOS' : 'PULAR CORDA', timer: this.survival ? null : Math.max(0, this.timeLeft), objective: this.pl.done ? 'Seguro. Segure ESPAÇO para acelerar.' : this.survival ? 'Pule a cada volta da corda' : 'Atravesse. Pule a corda. Corra e pule sobre o buraco.', hide: this.survival || !this.campaign ? { prize: true } : {} });
        // rope timing indicator
        const toBottom = ((TAU - this.theta) % TAU) / this.omega; const per = TAU / this.omega;
        const k = 1 - toBottom / per; const x = 540, y = 650;
        R6.UI.panel(ctx, x - 20, y - 26, 240, 52, { fill: 'rgba(6,8,12,.7)', shadow: false });
        R6.UI.text(ctx, 'CORDA', x - 6, y + 5, { size: 13, weight: 800, color: '#ccc' });
        R6.UI.bar(ctx, x + 50, y - 4, 150, 10, k, { color: k > 0.85 ? '#ff3b5c' : '#f2c14e', mark: 0.9 });
        if (Math.abs(this.wind) > 25) R6.UI.text(ctx, 'VENTO ' + (this.wind > 0 ? '→' : '←'), 820, y + 5, { size: 16, weight: 800, color: '#9fd4ff' });
      }
      this.drawRules(ctx);
    }
    drawRope(ctx, front) {
      ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      const segs = 40; let started = false;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const x = X1 + (X2 - X1) * i / segs; const z = this.ropeZ(x);
        if ((z >= 0) !== front && Math.abs(z) > 1) { started = false; continue; }
        const y = this.ropeY(x) + z * 0.18;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  R6.JumpRope = JumpRope;
  R6.registerGame('jumprope', { name: 'Pular Corda', season: 3, icon: 'circle', desc: 'Atravesse a ponte pulando a corda.', create: o => new JumpRope(o) });
})();
