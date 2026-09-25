/* ROUND 6 — redlight.js : Red Light, Green Light — huge top-down arena, hundreds of AI players, doll with motion detection,
   panic waves, pushes, occlusion (hide behind others), catching falling players, time limit. Variants: s1, s2, endless */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const FW = 1600, FH = 3300, FINISH = 470, START = 3050;

  class RedLight extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = opts.variant === 's2' ? 'redlight2' : 'redlight'; this.name = 'redlight';
      this.variant = opts.variant || 's1';
      this.endless = this.variant === 'endless';
      this.world = new R6.World({ bounds: { x: 30, y: 60, w: FW - 60, h: FH - 60 } });
      this.world.sepStrength = 0.9;
      this.cam = new R6.Camera({ bounds: { x: 0, y: -260, w: FW, h: FH + 260 } });
      this.timeLimit = this.endless ? R6.Save.D(75, 65, 55) : R6.Save.D(210, 175, 140);
      this.timeLeft = this.timeLimit;
      this.light = 'green'; this.lightT = 0; this.face = 0; this.greenDur = 4; this.redDur = 3; this.turnDur = R6.Save.D(0.5, 0.38, 0.3); this.grace = R6.Save.D(0.12, 0.06, 0.0);
      this.detectOn = false; this.cycle = 0; this.firstDeath = false; this.panicWave = false;
      this.playerFinished = false; this.over = false; this.overT = 0; this.catchPrompt = null; this.stagger = null; this.warned = false; this.rounds = 0;
      this.shots = []; this.scanAng = 0; this.intro = 0;
      this.build();
    }
    rules() {
      return {
        title: 'BATATINHA FRITA 1, 2, 3', icon: 'circle', sub: this.endless ? 'RED LIGHT ENDLESS · QUANTAS RODADAS VOCÊ AGUENTA?' : 'JOGO 1 · ' + (this.variant === 's2' ? 'TEMPORADA 2' : 'TEMPORADA 1'),
        lines: [
          'Enquanto a boneca canta (GREEN LIGHT), avance até a linha de chegada.',
          'Quando ela virar (RED LIGHT), PARE. Qualquer movimento detectado = eliminado.',
          'Correr é mais rápido, mas você demora mais para frear.',
          'Esconder-se atrás de outro jogador pode enganar os sensores.',
          'Segure quem estiver caindo perto de você com E. Esbarrões: ESPAÇO para se equilibrar.',
        ].concat(this.variant === 's2' ? ['Q no início: avise os outros jogadores sobre as regras.'] : []),
        keys: [['WASD', 'mover'], ['SHIFT', 'correr'], ['E', 'segurar'], ['ESPAÇO', 'equilíbrio']],
      };
    }
    build() {
      const S = R6.State;
      const parts = this.endless ? null : (S.s ? S.roster.filter(p => p.alive) : null);
      const plLook = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 });
      // player
      this.pl = this.world.add(new R6.Actor({ p: S.s ? S.player : null, look: plLook, x: FW / 2, y: START + 90, isPlayer: true, speed: 78, runSpeed: 138, accel: R6.Save.D(420, 380, 340), id: 'player' }));
      this.pl.dir = 'up';
      // bots
      const list = parts ? parts.filter(p => !p.isPlayer) : Array.from({ length: this.endless ? 70 : 200 }, (_, i) => ({ num: i + 1, name: '', look: R6.Char.makeLook({ num: i + 1 }), tr: { courage: Math.random(), intel: Math.random(), fear: Math.random(), spd: Math.random(), str: Math.random(), kindness: Math.random(), betray: Math.random() * 0.6, chaos: Math.random() * 0.5 }, alive: true, rel: 0, fake: true }));
      const cols = 38; const warnLeft = 0;
      list.forEach((p, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = 110 + col * ((FW - 220) / (cols - 1)) + U.rand(-8, 8), y = START + 40 + row * 26 + U.rand(-6, 6);
        const a = this.world.add(new R6.Actor({ p: p.fake ? null : p, look: p.look, x, y, speed: 55 + p.tr.spd * 35, runSpeed: 110 + p.tr.spd * 50, accel: 620 }));
        a.bot = p; a.dir = 'up';
        const kind = p.key != null;
        a.ai = {
          startDelay: U.rand(0.1, 0.8) + (1 - p.tr.courage) * 1.2, laneX: x, react: 0.02 + (1 - p.tr.intel) * 0.08 + p.tr.fear * 0.05,
          pErr: kind ? 0 : (0.012 + p.tr.fear * 0.03 + (1 - p.tr.intel) * 0.022 + p.tr.chaos * 0.02) * R6.Save.D(1, 1.1, 1.2),
          anticipate: p.tr.intel > 0.7, shielder: p.tr.intel > 0.75 && p.tr.betray > 0.4, pusher: p.tr.betray > 0.8 && p.tr.str > 0.7 && !kind,
          caught: false, willErr: false, errT: 0, panic: false, bold: p.tr.courage > 0.75, key: kind, catcher: (p.tr.kindness > 0.8 || p.key === 'worker') && !this.endless,
          wiggle: U.rand(0, 10), slowpoke: p.tr.courage < 0.2 && !kind,
        };
        a.brain = (b, dt) => this.botBrain(b, dt);
      });
      // guards along both sides
      this.guards = [];
      for (let y = 700; y < START - 100; y += 380) for (const side of [0, 1]) {
        const g = this.world.add(new R6.Actor({ look: R6.Char.makeLook({ outfit: 'guard', mask: U.pick(['circle', 'triangle', 'square']), seed: y + side }), x: side ? FW - 45 : 45, y, solid: false, id: 'g' + y + side }));
        g.dir = side ? 'left' : 'right'; g.item = 'rifle'; g.kind = 'guard'; g.frozen = true; this.guards.push(g);
      }
      // doll + tree objects
      this.world.objects.push({ x: FW / 2, y: 330, sy: 330, draw: (c, t) => { R6.Props.tree(c, FW / 2 - 10, 250, 1.3, t); } });
      this.world.objects.push({ x: FW / 2, y: 345, sy: 345, draw: (c, t) => R6.Props.doll(c, FW / 2, 350, 0.95, { t, face: this.face, glow: this.light === 'red' ? 0.6 + Math.sin(t * 10) * 0.4 : 0, turnDir: 1, lookX: Math.sin(this.scanAng) }) });
      this.buildFloor();
    }
    buildFloor() {
      const cv = document.createElement('canvas'); cv.width = FW / 2; cv.height = FH / 2; const c = cv.getContext('2d');
      c.fillStyle = '#d8bf8e'; c.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < 9000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(120,90,40,.10)' : 'rgba(255,255,255,.08)'; c.fillRect(Math.random() * cv.width, Math.random() * cv.height, 2, 2); }
      for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(150,110,60,.08)'; c.beginPath(); c.ellipse(Math.random() * cv.width, Math.random() * cv.height, U.rand(20, 70), U.rand(8, 20), 0, 0, TAU); c.fill(); }
      this.floorCv = cv;
    }
    begin() {
      this.intro = 4.2;
      this.cam.set(FW / 2, 420, 1.5);
      this.cam.to(this.pl.x, this.pl.y - 60, 1.05, 3.8);
      R6.Music.play('game'); R6.Music.setIntensity(0.1);
      R6.Audio.loop('crowd', 0.45); R6.Audio.loop('wind', 0.15);
      R6.Dialog.announce(this.endless ? 'Rodada ' + (this.rounds + 1) + '. A boneca está mais rápida.' : 'Bem-vindos ao primeiro jogo: Batatinha Frita 1, 2, 3. Quem se mover depois que a boneca virar será eliminado.', null, 3.2);
      this.light = 'green'; this.lightT = 0; this.greenDur = this.intro + 3.0;
      this.songDelay = this.intro; this.songDur = 3.0;
    }
    focus() { const s = this.cam.toScreen(this.pl.x, this.pl.y); return { x: s.x, y: s.y, look: this.pl.look, scale: this.pl.scale * this.cam.zoom, facing: 1 }; }
    nextGreen() {
      this.light = 'green'; this.lightT = 0; this.cycle++;
      const hard = R6.Save.D(0, 0.4, 0.8); const lvl = Math.min(1, this.cycle / 12 + (this.endless ? this.rounds * 0.12 : 0));
      const fast = Math.random() < 0.25 + lvl * 0.25 + hard * 0.2;
      this.greenDur = fast ? U.rand(1.6, 2.6) - lvl * 0.3 : U.rand(3.2, 5.4) - lvl * 0.8;
      this.greenDur = Math.max(1.3, this.greenDur);
      R6.Audio.dollSong(this.greenDur);
      this.face = 0; this.detectOn = false;
      for (const a of this.world.actors) if (a.ai) { a.ai.startDelay = a.ai.panic ? 0 : U.rand(0.05, 0.4) + (1 - a.bot.tr.courage) * 0.5; a.ai.willErr = false; a.ai.stopAt = null; }
    }
    startTurn() {
      this.light = 'turning'; this.lightT = 0; R6.Audio.sfx('dollTurn');
      this.redDur = U.rand(2.2, 4.2) + Math.min(1.5, this.cycle * 0.05);
      // decide which bots will fail to stop this time
      const warnK = this.warned ? 0.4 : 1;
      for (const a of this.world.actors) {
        if (!a.ai || a.dead || a.ai.finished) continue;
        const ai = a.ai; let p = ai.pErr * warnK * (this.panicLevel ? 1 + this.panicLevel : 1);
        if (a.running) p += 0.02;
        if (ai.warnedByPlayer) p *= 0.4;
        ai.willErr = Math.random() < p; ai.errT = U.rand(0.35, 1.0);
        ai.stopAt = ai.react + (ai.willErr ? ai.errT : 0);
      }
    }
    // --------------- bot AI ---------------
    botBrain(a, dt) {
      const ai = a.ai;
      if (this.intro > 0 || this.phase !== 'play') { a.steer(0, 0); return; }
      if (a.tripping && a.stun <= 0) { a.tripping = false; a.setAnim('getup', 0.8); }
      if (ai.finished) { a.steer(0, 0); if (Math.random() < 0.002) a.face(U.pick(['down', 'left', 'right'])); return; }
      if (a.y < FINISH - 20) { ai.finished = true; a.steer(0, 0); a.emo(ai.key ? '!' : U.pick(['♥', '!', '…']), 1.4); return; }
      if (a.stun > 0) return;
      if (ai.panic) { a.steer(ai.panicDir, 1, true); a.running = true; return; }
      const L = this.light;
      if (L === 'green') {
        if (ai.startDelay > 0) { ai.startDelay -= dt; a.steer(0, 0); return; }
        // anticipate end of song (smart bots)
        const left = this.greenDur - this.lightT;
        if (ai.anticipate && left < 0.45) { a.steer(0, 0); return; }
        if (ai.slowpoke && Math.random() < 0.6) { a.steer(0, 0); ai.startDelay = 0.4; return; }
        let tx = ai.laneX + Math.sin(this.t * 0.7 + ai.wiggle) * 30, ty = FINISH - 80;
        // shielders: slide behind the nearest bigger player relative to the doll
        if (ai.shielder && ai.shieldTarget && !ai.shieldTarget.dead) { tx = ai.shieldTarget.x; ty = ai.shieldTarget.y + 22; }
        else if (ai.shielder && Math.random() < 0.01) { const n = this.world.near(a.x, a.y - 40, 60, b => b !== a && b.ai && !b.dead && b.look.build > 1.05); if (n.length) ai.shieldTarget = n[0]; }
        const run = ai.bold && (this.timeLeft < 60 || Math.random() < 0.002) || this.timeLeft < 25;
        a.steer(tx - a.x, ty - a.y, run || ai.running2);
        if (Math.random() < 0.0015) ai.running2 = !ai.running2 && ai.bold;
      } else {
        // turning / red
        const since = this.lightT;
        if (since < (ai.stopAt || 0)) {
          // keeps moving (late reaction / error)
          if (ai.willErr && since > ai.react) { a.steer(a.vx || 0.0001, a.vy || -1, a.running); }
        } else a.steer(0, 0);
        // bullies may shove someone during red (to eliminate competition)
        if (ai.pusher && L === 'red' && !ai.pushedOnce && this.lightT > 0.8 && Math.random() < 0.004) {
          const n = this.world.near(a.x, a.y, 30, b => b !== a && !b.dead && b.alive && !b.ai?.finished);
          if (n.length) { const b = n[0]; ai.pushedOnce = true; a.setAnim('push', 0.4); a.faceTo(b.x, b.y); this.shove(b, a); }
        }
      }
    }
    shove(b, by) {
      const d = Math.hypot(b.x - by.x, b.y - by.y) || 1; const nx = (b.x - by.x) / d, ny = (b.y - by.y) / d;
      b.vx += nx * 160; b.vy += ny * 160; b.stun = 0.35;
      if (b === this.pl) { this.stagger = { t: 0, win: R6.Save.D(0.75, 0.55, 0.4), by }; R6.Audio.sfx('grab'); }
      else if (Math.random() < 0.55) this.botTrip(b);
      if (by === this.pl) R6.State.witness(this.world.near(this.pl.x, this.pl.y, 160, x => x.bot && !x.dead).map(x => x.bot), 'witness_betray', -10);
    }
    botTrip(b) {
      if (b.dead || b.tripping) return;
      b.tripping = true; b.setAnim('trip', 0); b.stun = 1.2;
      // player can catch it
      if (U.dist(b.x, b.y, this.pl.x, this.pl.y) < 70 && !this.pl.dead && !this.playerFinished) this.catchPrompt = { b, t: 0 };
    }
    // --------------- detection ---------------
    occluded(a) {
      // doll at (FW/2, 330): check for a blocking body between doll and actor, close to the actor
      const dx = FW / 2 - a.x, dy = 330 - a.y; const d = Math.hypot(dx, dy) || 1; const nx = dx / d, ny = dy / d;
      for (const s of [18, 32, 46]) {
        const px = a.x + nx * s, py = a.y + ny * s;
        const n = this.world.near(px, py, 11, b => b !== a && !b.dead && b.solid && b.look.build >= a.look.build * 0.95);
        if (n.length) return true;
      }
      return false;
    }
    detect() {
      for (const a of this.world.actors) {
        if (a.dead || !a.solid || a.kind === 'guard') continue;
        if (a === this.pl ? this.playerFinished : a.ai && a.ai.finished) continue;
        if (a.y < FINISH - 20) continue;
        const sp = a.spd;
        if (sp > 9) {
          a._moveT = (a._moveT || 0) + 1;
          if (a === this.pl && this.occluded(a) && sp < 70 && Math.random() < 0.985) continue;
          if (a !== this.pl && this.occluded(a) && Math.random() < 0.9) continue;
          if (a === this.pl && this.catchSaveT > 0) continue;
          this.eliminate(a);
        }
      }
    }
    eliminate(a, o = {}) {
      if (a.dead) return;
      // closest guard fires
      let g = this.guards[0], gd = 1e9; for (const x of this.guards) { const d = U.dist2(x.x, x.y, a.x, a.y); if (d < gd) { gd = d; g = x; } }
      g.faceTo(a.x, a.y); this.shots.push({ x0: g.x + (g.x < FW / 2 ? 12 : -12), y0: g.y - 22, x1: a.x, y1: a.y - 18, t: 0 });
      const far = U.dist(a.x, a.y, this.pl.x, this.pl.y) > 500;
      a.kill();
      if (a === this.pl) { R6.Audio.sfx('gun'); R6.Engine.flash('#ff1133', 0.35); this.cam.shake(10, 0.4); this.lose({ reason: o.timeout ? 'O tempo acabou' : 'Movimento detectado' }); if (R6.State.s) R6.State.eliminate(R6.State.player, 'redlight'); return; }
      if (a.bot && !a.bot.fake) R6.Elim.kill(a.bot, { cause: 'redlight', far, silent: false, vol: far ? 0.4 : 0.9, host: this });
      else { R6.Audio.sfx(far ? 'gunFar' : 'gun', { vol: far ? 0.4 : 0.9, gap: 0.05 }); }
      this.world.fx.emit('gray', a.x, a.y - 16, 5, {});
      this.world.fx.emit('ink', a.x, a.y - 16, 4, {});
      // nearby reactions
      for (const b of this.world.near(a.x, a.y, 90, b => b.ai && !b.dead && b !== a)) { b.bot.fear = Math.min(1, (b.bot.fear || 0) + 0.1); if (Math.random() < 0.3) b.emo('!', 1); }
      if (U.dist(a.x, a.y, this.pl.x, this.pl.y) < 120) { this.pl.expr = 'scared'; this.plScare = 1.2; }
      if (!this.firstDeath) { this.firstDeath = true; this.triggerPanic(a); }
    }
    triggerPanic(src) {
      // the first elimination: a wave of panic — people scream and run for the exit
      R6.Audio.sfx('crowdGasp'); R6.Audio.sfx('scream', { delay: 0.2 }); R6.Audio.sfx('scream', { delay: 0.5 });
      R6.Engine.slowmo(0.35, 1.3); this.cam.shake(4, 0.6);
      this.panicLevel = 0.6;
      const n = this.world.near(src.x, src.y, 260, b => b.ai && !b.dead && !b.ai.key);
      let count = 0;
      for (const b of n) if (b.bot.tr.fear > 0.55 && Math.random() < 0.5 && count < (this.endless ? 3 : 26)) { b.ai.panic = true; b.ai.panicDir = U.rand(-0.4, 0.4); b.emo('!', 3); count++; }
      R6.Toast.show('Pânico! Alguns jogadores tentam fugir…', { color: '#ff3b5c', icon: 'x' });
      if (R6.State.s && !this.endless) R6.Music.setIntensity(0.7);
    }
    // --------------- update ---------------
    update(dt) {
      this.t += dt;
      this.world.update(dt);
      for (const s of this.shots) s.t += dt; this.shots = this.shots.filter(s => s.t < 0.12);
      if (this.updateResult(dt)) { this.cam.follow(this.pl.x, this.pl.y - 40); this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.set(FW / 2, 420, 1.5); this.cam.update(dt); return; }
      if (this.songDelay > 0) { this.songDelay -= dt; if (this.songDelay <= 0) R6.Audio.dollSong(this.songDur); }
      if (this.intro > 0) {
        this.intro -= dt; this.cam.update(dt);
        this.pl.steer(0, 0);
        if (this.variant === 's2' && !this.warned && R6.Input.actP('alt')) this.warnOthers();
        this.lightT += dt;
        return;
      }
      this.timeLeft -= dt;
      this.lightT += dt;
      // doll cycle
      if (this.light === 'green') {
        this.face = U.approach(this.face, 0, dt / this.turnDur);
        if (this.lightT >= this.greenDur) this.startTurn();
        R6.Music.setIntensity(this.firstDeath ? 0.45 : 0.15);
      } else if (this.light === 'turning') {
        this.face = Math.min(1, this.lightT / this.turnDur);
        if (this.lightT >= this.turnDur) { this.light = 'red'; this.lightT = this.turnDur; this.redT = 0; R6.Audio.sfx('scan'); }
      } else if (this.light === 'red') {
        this.redT += dt; this.face = 1;
        this.scanAng += dt * 1.6;
        if (this.redT > this.grace) this.detect();
        if (this.redT > this.redDur) { this.light = 'back'; this.backT = 0; R6.Audio.sfx('dollTurn', { vol: 0.6 }); }
        R6.Music.setIntensity(0.75);
        if (Math.floor(this.redT * 1.2) !== Math.floor((this.redT - dt) * 1.2)) R6.Audio.sfx('heartbeat', { vol: 0.8 });
      } else if (this.light === 'back') {
        this.backT += dt; this.face = Math.max(0, 1 - this.backT / 0.45);
        if (this.backT >= 0.45) this.nextGreen();
      }
      if (this.panicLevel) this.panicLevel = Math.max(0, this.panicLevel - dt * 0.03);
      this.updatePlayer(dt);
      // time out
      if (this.timeLeft <= 0 && !this.over) this.timeUp();
      if (this.over) {
        this.overT += dt;
        if (this.overT > 0.4 && this.pendingTimeout && this.pendingTimeout.length) { this.overTick = (this.overTick || 0) - dt; if (this.overTick <= 0) { this.overTick = 0.05; for (let k = 0; k < 4 && this.pendingTimeout.length; k++) this.eliminate(this.pendingTimeout.shift(), { timeout: true }); } }
        if (this.overT > 1.2 && (!this.pendingTimeout || !this.pendingTimeout.length) && !this.result) this.finishGame();
      }
      // fast forward once finished
      if (this.playerFinished && !this.over) {
        if (R6.Input.act('action')) R6.Engine.timeScale = 4; else if (!R6.Engine.slow) R6.Engine.timeScale = 1;
        const remaining = this.world.actors.filter(a => a.ai && !a.dead && !a.ai.finished).length;
        if (remaining === 0) { this.timeLeft = Math.min(this.timeLeft, 0.01); }
      }
      // camera
      const lead = this.playerFinished ? 0 : -60;
      this.cam.follow(this.pl.x, this.pl.y + lead, this.pl.dead ? 1.4 : this.light === 'red' ? 1.12 : 1.02);
      this.cam.update(dt);
    }
    warnOthers() {
      this.warned = true; this.pl.say('NÃO SE MEXAM QUANDO ELA VIRAR! Parem totalmente!', 3.5); R6.Audio.sfx('whistle', { vol: 0.4 });
      const n = this.world.near(this.pl.x, this.pl.y, 420, b => b.ai && !b.dead);
      n.forEach(b => { b.ai.warnedByPlayer = true; if (b.bot && !b.bot.fake) R6.State.addRel(b.bot, 6, 'helped', { silent: !b.bot.key }); });
      R6.State.s && R6.State.flag('rl2_warned', true);
      R6.Toast.show(`${n.length} jogadores ouviram seu aviso`, { color: '#2ec4b6', icon: 'circle' });
    }
    updatePlayer(dt) {
      const pl = this.pl; if (pl.dead) return;
      if (this.plScare > 0) { this.plScare -= dt; if (this.plScare <= 0) pl.expr = null; }
      if (this.catchSaveT > 0) this.catchSaveT -= dt;
      if (this.playerFinished) { const ax = R6.Input.axis(); pl.steer(ax.x, ax.y, false); if (pl.y > FINISH - 30) pl.y = FINISH - 30; return; }
      // stagger QTE (bumped during red)
      if (this.stagger) {
        const s = this.stagger; s.t += dt;
        // an ally nearby can catch you
        if (!s.helped) {
          const ally = this.world.near(pl.x, pl.y, 70, b => b.ai && !b.dead && b.bot && ((b.bot.rel >= 45) || (b.ai.catcher && !b.ai.caughtOnce)));
          if (ally.length && s.t > 0.12) {
            const b = ally[0]; s.helped = b; b.ai.caughtOnce = true; pl.vx = pl.vy = 0; pl.stun = 0.4; this.catchSaveT = 0.5; b.setAnim('grab', 0.5); b.faceTo(pl.x, pl.y);
            R6.Toast.show(`${b.bot.key ? b.bot.name : '#' + U.pad(b.bot.num)} segurou você!`, { color: '#2ec4b6', icon: 'circle' });
            if (b.bot.key || !b.bot.fake) { R6.State.remember(b.bot, 'helped'); R6.State.flag && R6.State.s && R6.State.flag('saved_by_' + (b.bot.key || b.bot.num), true); R6.State.addRel(b.bot, 10, null, { silent: true }); }
            this.stagger = null; return;
          }
        }
        if (R6.Input.actP('action') && s.t < s.win) { pl.vx *= 0.1; pl.vy *= 0.1; pl.stun = 0.25; this.catchSaveT = 0.25; R6.Audio.sfx('block'); this.stagger = null; R6.Toast.show('Equilíbrio recuperado!', { color: '#8bd17c' }); return; }
        if (s.t > s.win) this.stagger = null;
      }
      // catch a falling player
      if (this.catchPrompt) {
        const c = this.catchPrompt; c.t += dt;
        if (c.t > 0.9 || c.b.dead) this.catchPrompt = null;
        else if (R6.Input.actP('interact')) {
          const b = c.b; b.clearAnim(); b.tripping = false; b.stun = 0; b.vx = b.vy = 0; b.setAnim('grabbed', 0.6);
          pl.setAnim('grab', 0.5); pl.faceTo(b.x, b.y); this.catchPrompt = null; R6.Audio.sfx('grab');
          if (b.bot && !b.bot.fake) { R6.State.addRel(b.bot, 40, 'saved'); R6.State.s.stats.saved++; R6.State.karma(2); R6.State.witness(this.world.near(pl.x, pl.y, 160, x => x.bot && !x.dead && x !== b).map(x => x.bot).slice(0, 12), 'witness_help', 4); }
          b.ai.savedByPlayer = true;
          R6.Toast.show('Você salvou #' + U.pad(b.bot.num) + '!', { color: '#2ec4b6', icon: 'circle' });
        }
      }
      if (pl.stun > 0) return;
      const ax = R6.Input.axis(); const run = R6.Input.act('run');
      pl.steer(ax.x, ax.y, run);
      pl.slow = 1;
      // being bumped by a panicking runner while red → stagger
      if (pl.bumped && pl.bumped.ai && pl.bumped.ai.panic && this.light !== 'green' && !this.stagger && pl.bumped.spd > 60) { this.stagger = { t: 0, win: R6.Save.D(0.75, 0.55, 0.4) }; pl.vx += pl.bumped.vx * 0.5; pl.vy += pl.bumped.vy * 0.5; R6.Audio.sfx('grab'); }
      pl.bumped = null;
      if (pl.y < FINISH - 20) {
        this.playerFinished = true; R6.Audio.sfx('pass'); R6.Banner.show('SEGURO', 'Você cruzou a linha · segure ESPAÇO para acelerar', { color: '#2ec4b6', dur: 2.6 });
        pl.setAnim('celebrate', 1.2);
        if (this.endless) this.nextEndlessRound();
      }
      // player push (E near someone while not red) — betrayal option
      if (R6.Input.actP('interact') && !this.catchPrompt) {
        const n = this.world.near(pl.x, pl.y, 26, b => b.ai && !b.dead);
        if (n.length) { const b = n[0]; pl.setAnim('push', 0.35); pl.faceTo(b.x, b.y); this.shove(b, pl); if (b.bot && !b.bot.fake) { R6.State.addRel(b.bot, -35, 'pushed'); R6.State.s.stats.betrayals++; R6.State.karma(-2); } }
      }
    }
    nextEndlessRound() {
      this.rounds++; this.score = this.rounds; this.chips = this.rounds * 25;
      R6.Engine.after(1.6, () => {
        if (this.result) return;
        // reset field: player + survivors back to start, doll faster
        this.playerFinished = false; this.pl.x = FW / 2; this.pl.y = START + 60; this.pl.vx = this.pl.vy = 0;
        for (const a of this.world.actors) if (a.ai) { if (a.dead) { a.visible = false; continue; } a.ai.finished = false; a.x = U.rand(120, FW - 120); a.y = START + U.rand(20, 200); a.ai.laneX = a.x; }
        this.timeLeft = Math.max(35, this.timeLimit - this.rounds * 5); this.turnDur = Math.max(0.2, this.turnDur - 0.03);
        this.cam.set(this.pl.x, this.pl.y, 1.02); R6.Banner.show('RODADA ' + (this.rounds + 1), 'A boneca está mais rápida', { dur: 1.8 });
        this.nextGreen();
      });
    }
    timeUp() {
      if (this.endless) { this.over = true; this.pendingTimeout = [this.pl]; return; }
      this.over = true; this.overT = 0; this.light = 'red'; this.face = 1;
      R6.Audio.sfx('buzzer'); R6.Dialog.announce('O tempo acabou. Jogadores que não cruzaram a linha: eliminados.', null, 2.5);
      this.pendingTimeout = this.world.actors.filter(a => !a.dead && a.solid && ((a.ai && !a.ai.finished) || (a === this.pl && !this.playerFinished))).sort((a, b) => b.y - a.y);
    }
    finishGame() {
      R6.Engine.timeScale = 1;
      if (this.pl.dead) return;
      if (this.endless) return;
      // campaign: store who was saved by the player for later payoff
      this.win({ sub: 'PLAYERS REMAINING: ' + (R6.State.s ? R6.State.alive : '') });
    }
    summary() { return { saved: R6.State.s ? R6.State.s.stats.saved : 0 }; }
    debugWin() { this.phase = 'play'; this.intro = 0; this.playerFinished = true; this.pl.y = FINISH - 40; for (const a of this.world.actors) if (a.ai && !a.dead && (a.ai.key || Math.random() < 0.55)) { a.ai.finished = true; a.y = FINISH - U.rand(30, 250); } this.timeLeft = 0.01; }
    // --------------- render ---------------
    render(ctx) {
      const cam = this.cam, t = this.t;
      ctx.fillStyle = '#6aa9d8'; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      // floor
      ctx.drawImage(this.floorCv, 0, 0, FW, FH);
      // painted sky mural (north wall)
      const g = ctx.createLinearGradient(0, -260, 0, 170); g.addColorStop(0, '#5ea6db'); g.addColorStop(1, '#a9d6f2');
      ctx.fillStyle = g; ctx.fillRect(0, -260, FW, 430);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { const cx = 90 + i * 190, cy = -150 + (i % 3) * 45; ctx.beginPath(); ctx.ellipse(cx, cy, 70, 22, 0, 0, TAU); ctx.ellipse(cx + 40, cy - 12, 45, 18, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#7fb069'; ctx.beginPath(); ctx.moveTo(0, 170); for (let x = 0; x <= FW; x += 100) ctx.lineTo(x, 110 + Math.sin(x * 0.01) * 30); ctx.lineTo(FW, 170); ctx.fill();
      ctx.fillStyle = '#9a8f82'; ctx.fillRect(0, 160, FW, 18);
      // side walls
      for (const x of [0, FW - 28]) { const sg = ctx.createLinearGradient(x, 0, x + 28, 0); sg.addColorStop(0, '#8fc3e6'); sg.addColorStop(1, '#6aa9d8'); ctx.fillStyle = sg; ctx.fillRect(x, 170, 28, FH); }
      // lines
      ctx.fillStyle = '#c92a3a'; ctx.fillRect(28, FINISH, FW - 56, 8);
      for (let x = 28; x < FW - 28; x += 40) { ctx.fillStyle = '#f4f1ea'; ctx.fillRect(x, START, 20, 8); ctx.fillStyle = '#c92a3a'; ctx.fillRect(x + 20, START, 20, 8); }
      R6.UI.text(ctx, 'CHEGADA', FW / 2, FINISH - 14, { size: 26, fam: 'title', align: 'center', color: 'rgba(160,30,40,.7)', spacing: 8 });
      // scoreboard timer on the wall
      R6.Props.board(ctx, FW / 2 + 320, -40, 220, 90, [{ t: U.time(Math.max(0, this.timeLeft)), s: 40 }]);
      // scan beam
      if (this.light === 'red' || this.light === 'turning') {
        const a = this.light === 'red' ? 0.18 : 0.08 * this.face;
        const sweep = Math.sin(this.scanAng) * 0.5;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createRadialGradient(FW / 2, 70, 0, FW / 2, 70, 2400); bg.addColorStop(0, `rgba(255,30,60,${a})`); bg.addColorStop(1, 'rgba(255,0,40,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(FW / 2, 70); ctx.lineTo(FW / 2 + Math.tan(sweep - 0.5) * 3000, 3200); ctx.lineTo(FW / 2 + Math.tan(sweep + 0.5) * 3000, 3200); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      this.world.draw(ctx, cam);
      // muzzle flashes / tracer
      for (const s of this.shots) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,230,160,${1 - s.t / 0.12})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(s.x0, s.y0, 7, 0, TAU); ctx.fill(); ctx.restore(); }
      // catch prompt
      if (this.catchPrompt) { const b = this.catchPrompt.b; ctx.save(); ctx.translate(b.x, b.y - 60); R6.UI.keyHint(ctx, 'E', 'SEGURAR', -30, 0); ctx.restore(); }
      if (this.stagger) { ctx.save(); ctx.translate(this.pl.x, this.pl.y - 64); R6.UI.keyHint(ctx, 'ESPAÇO', 'EQUILÍBRIO!', -50, 0); ctx.restore(); }
      cam.end(ctx);
      R6.UI.vignette(ctx, this.light === 'red' ? 0.55 : 0.3, this.light === 'red' ? '#300008' : '#000');
      // HUD
      if (this.phase === 'play') {
        const showLight = R6.Save.diff() !== 'extreme' || !this.campaign;
        R6.HUD.draw(ctx, {
          game: this.endless ? 'RED LIGHT ENDLESS · RODADA ' + (this.rounds + 1) : 'BATATINHA FRITA 1, 2, 3', timer: Math.max(0, this.timeLeft), danger: this.light === 'red',
          objective: this.playerFinished ? 'Você está seguro. Segure ESPAÇO para acelerar.' : this.intro > 0 && this.variant === 's2' && !this.warned ? 'Q — avisar os outros jogadores sobre as regras' : 'Cruze a linha vermelha. PARE quando a boneca virar.',
          hide: this.endless ? { prize: true } : {},
        });
        if (showLight && this.intro <= 0) {
          const red = this.light !== 'green'; const txt = red ? 'RED LIGHT' : 'GREEN LIGHT';
          R6.UI.text(ctx, txt, R6.W / 2, 124, { size: 30, fam: 'title', align: 'center', color: red ? '#ff3b5c' : '#5dff9b', spacing: 6, shadow: red ? 'rgba(255,0,40,.8)' : 'rgba(0,255,120,.6)', shadowBlur: 16, shadowY: 0 });
        }
      }
      this.drawRules(ctx);
    }
    exit() { R6.Engine.timeScale = 1; }
  }

  R6.RedLight = RedLight;
  R6.registerGame('redlight', { name: 'Batatinha Frita 1, 2, 3', season: 1, icon: 'circle', desc: 'Pare quando a boneca virar.', create: o => new RedLight(o) });
  R6.registerGame('redlight2', { name: 'Batatinha Frita 1, 2, 3 (T2)', season: 2, icon: 'circle', desc: 'A volta da boneca — agora você conhece as regras.', create: o => new RedLight(Object.assign({ variant: 's2' }, o)) });
})();
