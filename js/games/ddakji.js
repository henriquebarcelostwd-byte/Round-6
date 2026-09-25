/* ROUND 6 — ddakji.js : Ddakji — aim / power / angle throw with flip physics, AI opponents, recruiter prologue, championship */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;

  // ---------------- core throw mechanic (reused by Six Legs station) ----------------
  class DdakjiCore {
    constructor(o = {}) {
      this.cx = o.x || 640; this.cy = o.y || 540; this.size = o.size || 70;
      this.colA = o.colA || '#c83434'; this.colB = o.colB || '#2458c9';
      this.phase = 'aim'; this.t = 0; this.aimX = this.cx; this.aimY = this.cy;
      this.power = 0; this.powDir = 1; this.powerLock = 0; this.angle = 0; this.angDir = 1; this.angleLock = 0;
      this.diff = R6.Save.D(1, 0.85, 0.7); this.widthP = R6.Save.D(0.13, 0.1, 0.075); this.widthA = R6.Save.D(0.2, 0.15, 0.11);
      this.newTarget();
      this.proj = null; this.flipAng = 0; this.flipV = 0; this.hz = 0; this.vz = 0; this.rot = 0; this.flipping = false; this.jiggle = 0;
      this.onResult = o.onResult || (() => { }); this.fx = o.fx; this.bonus = o.bonus || 0;
      this.thrower = o.thrower || null; // callback for arm anim
    }
    newTarget() {
      const corners = [[-1, 0], [0, -1], [1, 0], [0, 1]];
      this.sweet = U.pick(corners); this.lift = U.rand(0.5, 1); this.optA = U.rand(0.5, 0.72);
      this.flipAng = 0; this.hz = 0; this.rot = 0; this.flipping = false; this.phase = 'aim'; this.power = 0; this.angle = 0; this.proj = null; this.t = 0;
    }
    sweetPos() { const s = this.size; return { x: this.cx + this.sweet[0] * s * 0.92, y: this.cy + this.sweet[1] * s * 0.42 * 0.92 }; }
    update(dt, input = true) {
      this.t += dt; const I = R6.Input;
      if (this.jiggle > 0) this.jiggle -= dt;
      if (this.phase === 'aim' && input) {
        const m = I.mouse;
        if (m.moved) { this.aimX = m.x; this.aimY = m.y; }
        const ax = I.axis(); this.aimX += ax.x * 220 * dt; this.aimY += ax.y * 120 * dt;
        this.aimX = U.clamp(this.aimX, this.cx - this.size * 1.6, this.cx + this.size * 1.6); this.aimY = U.clamp(this.aimY, this.cy - this.size * 0.9, this.cy + this.size * 0.9);
        if (I.actP('action') || m.pressed) { this.phase = 'power'; this.power = 0; this.powDir = 1; R6.Audio.sfx('click'); }
      } else if (this.phase === 'power') {
        this.power += this.powDir * dt * 1.35 * (1 + (1 - this.diff) * 0.9);
        if (this.power >= 1) { this.power = 1; this.powDir = -1; } if (this.power <= 0) { this.power = 0; this.powDir = 1; }
        if (input && (I.actR('action') || I.mouse.released || (I.actP('action') && this.t > 0.2))) { this.powerLock = this.power; this.phase = 'angle'; this.angle = 0; this.t = 0; R6.Audio.sfx('click'); }
      } else if (this.phase === 'angle') {
        this.angle += this.angDir * dt * 1.6 * (1 + (1 - this.diff));
        if (this.angle >= 1) { this.angle = 1; this.angDir = -1; } if (this.angle <= 0) { this.angle = 0; this.angDir = 1; }
        if (input && this.t > 0.12 && (I.actP('action') || I.mouse.pressed)) { this.angleLock = this.angle; this.throwIt(); }
      } else if (this.phase === 'throw') {
        const P = this.proj; P.t += dt;
        const k = Math.min(1, P.t / P.dur);
        P.x = U.lerp(P.x0, P.x1, k); P.y = U.lerp(P.y0, P.y1, k) - Math.sin(k * Math.PI) * 120 * (1 - this.angleLock * 0.6); P.rot += dt * 18;
        if (k >= 1) this.impact();
      } else if (this.phase === 'flip' || this.phase === 'miss') {
        this.vz -= 1600 * dt; this.hz += this.vz * dt; this.flipAng += this.flipV * dt; this.rot += this.rotV * dt;
        if (this.hz <= 0 && this.vz < 0) {
          this.hz = 0; this.vz = -this.vz * 0.25; if (Math.abs(this.vz) < 60) this.vz = 0;
          if (this.phase === 'flip' && this.vz === 0) { let n = Math.round(this.flipAng / Math.PI); if (n % 2 === 0) n += (this.flipV >= 0 ? 1 : -1); this.flipAng = n * Math.PI; this.flipV = 0; }
          else { this.flipAng = 0; this.flipV = 0; }
        }
        this.t += 0;
        if (!this.resolved && this.vz === 0 && this.hz === 0 && this.phase !== 'throw') { this.resolved = true; this.onResult(this.phase === 'flip', this.lastQ); }
      }
    }
    quality() {
      const sp = this.sweetPos();
      const aimF = 1 - U.clamp(U.dist(this.aimX, this.aimY, sp.x, sp.y) / (this.size * 1.15), 0, 1) * 0.85;
      const powF = Math.exp(-Math.pow((this.powerLock - 0.8) / this.widthP, 2));
      const angF = Math.exp(-Math.pow((this.angleLock - this.optA) / this.widthA, 2));
      return { aimF, powF, angF, p: U.clamp(aimF * powF * angF * 1.15 * this.diff * this.lift + this.bonus, 0.03, 0.96), perfect: aimF > 0.82 && powF > 0.8 && angF > 0.8 };
    }
    throwIt() {
      this.phase = 'throw'; this.lastQ = this.quality(); R6.Audio.sfx('whoosh');
      const hx = this.throwFrom ? this.throwFrom.x : this.cx - 320, hy = this.throwFrom ? this.throwFrom.y : this.cy - 200;
      this.proj = { x0: hx, y0: hy, x1: this.aimX, y1: this.aimY, t: 0, dur: 0.28, x: hx, y: hy, rot: 0 };
      if (this.thrower) this.thrower();
    }
    // AI throw with given success probability
    aiThrow(p, from) {
      const sp = this.sweetPos(); const err = (1 - p) * this.size * 0.9;
      this.aimX = sp.x + U.rand(-err, err); this.aimY = sp.y + U.rand(-err * 0.5, err * 0.5);
      this.powerLock = 0.8; this.angleLock = this.optA;
      this.phase = 'throw'; this.lastQ = { p, perfect: false, ai: true };
      this.proj = { x0: from.x, y0: from.y, x1: this.aimX, y1: this.aimY, t: 0, dur: 0.28, x: from.x, y: from.y, rot: 0 };
      R6.Audio.sfx('whoosh');
    }
    impact() {
      const q = this.lastQ; const P = this.proj;
      R6.Audio.sfx('paper'); R6.Engine.shake(6 + this.powerLock * 6, 0.25);
      if (this.fx) { this.fx.emit('dust', P.x1, P.y1 + 8, 18, { spread: 30 }); this.fx.emit('ring', P.x1, P.y1, 1, { size: 2 }); }
      const ok = q.perfect || Math.random() < q.p;
      this.resolved = false; this.landX = P.x1; this.landY = P.y1; this.proj = null;
      if (ok) { this.phase = 'flip'; this.vz = 520 + Math.random() * 180; this.flipV = Math.PI * (2.2 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1) * 1.1; this.rotV = U.rand(-2, 2); R6.Audio.sfx('flip', { delay: 0.05 }); }
      else { this.phase = 'miss'; this.vz = 90 + this.powerLock * 80; this.flipV = U.rand(-2, 2); this.rotV = U.rand(-1, 1); this.jiggle = 0.3; }
    }
    draw(ctx, o = {}) {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(this.cx, this.cy + 6, this.size * (1 - this.hz / 800), this.size * 0.3, 0, 0, TAU); ctx.fill();
      // lifted edge hint (the gap under a corner)
      const sp = this.sweetPos();
      if (this.hz === 0 && this.phase !== 'flip') {
        ctx.fillStyle = `rgba(0,0,0,${0.35 * this.lift})`; ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 7, this.size * 0.2, this.size * 0.07, 0, 0, TAU); ctx.fill();
      }
      const jig = this.jiggle > 0 ? Math.sin(this.jiggle * 60) * 3 : 0;
      const liftY = this.hz === 0 ? -this.lift * 3 * (this.sweet[1] !== 0 ? 1 : 0.6) : 0;
      R6.Props.ddakji(ctx, this.cx + jig, this.cy - this.hz + liftY, this.size, this.colA, this.colB, this.flipAng, 0.42, this.rot * 0.2);
      if (this.proj) { const P = this.proj; R6.Props.ddakji(ctx, P.x, P.y, this.size * 0.85, o.projA || '#2458c9', o.projB || '#c83434', P.rot, 0.42, P.rot * 0.3); }
      if (this.phase === 'aim' || this.phase === 'power' || this.phase === 'angle') {
        // reticle
        const k = (Math.sin(this.t * 6) + 1) / 2;
        ctx.save(); ctx.strokeStyle = this.phase === 'aim' ? '#fff' : '#ffd166'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.aimX, this.aimY, 22 + k * 4, 9 + k * 2, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(this.aimX - 30, this.aimY); ctx.lineTo(this.aimX - 12, this.aimY); ctx.moveTo(this.aimX + 12, this.aimY); ctx.lineTo(this.aimX + 30, this.aimY); ctx.stroke();
        ctx.restore();
      }
    }
    drawMeters(ctx, x, y) {
      if (this.phase === 'power' || this.phase === 'angle') {
        R6.UI.panel(ctx, x - 170, y - 16, 340, 90, { fill: 'rgba(6,8,12,.8)', shadow: false });
        R6.UI.text(ctx, 'FORÇA', x - 155, y + 8, { size: 14, weight: 800, color: '#ddd' });
        R6.UI.bar(ctx, x - 90, y, 240, 12, this.phase === 'power' ? this.power : this.powerLock, { color: '#e8336d', zone: [0.8 - this.widthP * 0.8, 0.8 + this.widthP * 0.8] });
        R6.UI.text(ctx, 'ÂNGULO', x - 155, y + 44, { size: 14, weight: 800, color: this.phase === 'angle' ? '#fff' : '#666' });
        R6.UI.bar(ctx, x - 90, y + 36, 240, 12, this.phase === 'angle' ? this.angle : 0, { color: '#2ec4b6', zone: [this.optA - this.widthA * 0.7, this.optA + this.widthA * 0.7] });
      }
    }
  }
  R6.DdakjiCore = DdakjiCore;

  // ---------------- full scene ----------------
  const OPP = [
    { name: 'Cobrador Kim', skill: 0.35 }, { name: 'Sra. Lee', skill: 0.42 }, { name: 'Estudante Park', skill: 0.5 }, { name: 'Taxista Choi', skill: 0.56 },
    { name: 'Monge Han', skill: 0.62 }, { name: 'Campeão de rua', skill: 0.7 }, { name: 'Mestre Oh', skill: 0.78 }, { name: 'O Recrutador', skill: 0.85 },
  ];

  class DdakjiScene extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'ddakji'; this.name = 'ddakji';
      this.variant = opts.variant || (this.mode === 'campaign' ? 'recruiter' : 'practice');
      this.title = this.variant === 'championship' ? 'DDAKJI CHAMPIONSHIP' : 'DDAKJI';
      this.pl = opts.playerLook || (R6.State.s ? R6.State.s.player.look : R6.Char.makeLook({ num: 456 }));
      this.plCiv = Object.assign({}, this.pl, { outfit: this.variant === 'recruiter' ? 'civil' : this.pl.outfit, civ: { top: '#6b5a44', bottom: '#3a3f4a' } });
      this.round = 0; this.wins = 0; this.losses = 0; this.slaps = 0; this.moneyWon = 0;
      this.bracket = 0; this.setupOpponent();
      this.turn = 'player'; this.msg = null; this.msgT = 0; this.placement = 1;
      this.core = new DdakjiCore({ x: 640, y: 540, size: 70, fx: this.fx, colA: '#c83434', colB: '#2458c9', onResult: (flip, q) => this.onPlayerResult(flip, q), thrower: () => this.plAnim('throw') });
      this.core.throwFrom = { x: 360, y: 400 };
      this.plA = 'kneel'; this.plT = 0; this.opA = 'kneel'; this.opT = 0;
      this.walkers = []; for (let i = 0; i < 7; i++) this.walkers.push({ look: R6.Char.makeLook({ outfit: 'civil' }), x: U.rand(0, 1280), v: U.rand(40, 80) * (Math.random() < 0.5 ? 1 : -1) });
      this.state2 = 'player';
      this.after = null; this.chips = 0;
    }
    setupOpponent() {
      if (this.variant === 'recruiter') { this.opp = { name: 'Recrutador', skill: R6.Save.D(0.3, 0.45, 0.6), look: R6.Char.makeLook({ outfit: 'suit', hs: 'slick', hair: '#1a1411', skin: '#e9c3a0', build: 1.0, h: 1.04, seed: 77, glasses: false, beard: null }) }; }
      else if (this.variant === 'championship') { const o = OPP[this.bracket]; this.opp = { name: o.name, skill: o.skill * R6.Save.D(1, 1.1, 1.2), look: R6.Char.makeLook({ outfit: this.bracket === 7 ? 'suit' : 'civil', seed: 500 + this.bracket }) }; this.needWins = 2; this.rw = 0; this.rl = 0; }
      else this.opp = { name: 'Adversário', skill: 0.45 * R6.Save.D(1, 1.2, 1.4), look: R6.Char.makeLook({ outfit: 'civil', seed: 999 }) };
    }
    rules() {
      const base = {
        title: this.title, icon: 'square', sub: this.variant === 'recruiter' ? 'O HOMEM DE TERNO NA ESTAÇÃO' : this.variant === 'championship' ? '8 ADVERSÁRIOS · MELHOR DE 3' : 'TREINO',
        lines: ['Vire o ddakji do adversário com o seu para vencer a rodada.', 'Mire no canto levantado (sombra sob a borda) — é onde o ar entra.', 'Solte a força na faixa clara e acerte o ângulo no momento certo.', 'Na vez dele, escolha onde apoiar o seu ddakji.'],
        keys: [['MOUSE', 'mirar'], ['CLIQUE/ESPAÇO', 'força e ângulo']],
      };
      if (this.variant === 'recruiter') base.lines.push('Se perder: um tapa… ou ₩100.000. Se vencer: ₩100.000 para você.');
      return base;
    }
    begin() { R6.Music.play('tension'); R6.Music.setIntensity(0.1); this.say(this.variant === 'recruiter' ? 'Sua vez. Vire o meu.' : 'Sua vez!'); }
    say(t) { this.msg = t; this.msgT = 0; }
    plAnim(a) { this.plA = a; this.plT = 0; }
    opAnim(a) { this.opA = a; this.opT = 0; }
    enter() { R6.Audio.loop('hum', 0.5); R6.Audio.loop('crowd', 0.25); }
    focus() { return { x: 300, y: 640, look: this.pl, scale: 2.2, facing: 1 }; }
    onPlayerResult(flip, q) {
      if (this.turn === 'player') {
        if (flip) { this.say(q && q.perfect ? 'PERFEITO! VIROU!' : 'VIROU!'); R6.Audio.sfx('win'); this.fx.emit('star', 640, 520, 16); this.roundWon(); }
        else { this.say(U.pick(['Quase…', 'Não virou.', 'Nem se mexeu.', 'Faltou força… ou sobrou.'])); this.after = { t: 1.2, fn: () => this.startOppTurn() }; }
      } else {
        if (flip) { this.say(this.variant === 'recruiter' ? 'Virou. Você perdeu.' : 'Ele virou o seu!'); R6.Audio.sfx('error'); this.roundLost(); }
        else { this.say(U.pick(['Ele errou!', 'O seu resistiu!', 'Não virou!'])); this.after = { t: 1.2, fn: () => this.startPlayerTurn() }; }
      }
    }
    startPlayerTurn() {
      this.turn = 'player'; this.core.colA = '#c83434'; this.core.colB = '#2458c9'; this.core.newTarget(); this.core.throwFrom = { x: 360, y: 400 };
      this.core.onResult = (f, q) => this.onPlayerResult(f, q); this.say('Sua vez.');
    }
    startOppTurn() {
      this.turn = 'place'; this.core.colA = '#2458c9'; this.core.colB = '#c83434'; this.core.newTarget(); this.core.phase = 'wait';
      this.placeMenu = new R6.UI.Menu([
        { label: 'No centro do piso liso', sub: 'seguro', action: () => this.place(0) },
        { label: 'Perto da parede', sub: 'médio', action: () => this.place(1) },
        { label: 'Sobre a junta do piso', sub: 'arriscado · distrai', action: () => this.place(2) },
      ]);
      this.say('Onde você apoia o seu ddakji?');
    }
    place(i) {
      this.turn = 'opp'; this.placement = i; this.placeMenu = null;
      const mult = [0.62, 1.0, 1.35][i];
      this.core.lift = [0.45, 0.75, 1][i];
      let p = U.clamp(0.1 + this.opp.skill * 0.38, 0.05, 0.9) * mult;
      if (i === 2 && Math.random() < 0.25) { p *= 0.4; } // the seam can also make him misjudge
      this.oppP = p; this.oppTimer = 1.3; this.opAnim('windup');
      this.say(this.opp.name + ' se prepara…');
    }
    roundWon() {
      this.wins++; this.round++;
      if (this.variant === 'recruiter') {
        this.moneyWon += 100000; if (R6.State.s) R6.State.s.player.money += 100000;
        this.after = { t: 1.6, fn: () => this.recruiterAfterWin() };
      } else if (this.variant === 'championship') {
        this.rw++;
        if (this.rw >= this.needWins) { this.after = { t: 1.4, fn: () => this.nextBracket() }; }
        else this.after = { t: 1.4, fn: () => this.startPlayerTurn() };
      } else { this.after = { t: 1.4, fn: () => { this.chips = 40; this.win({ sub: 'VOCÊ VIROU O DDAKJI' }); } }; }
    }
    roundLost() {
      this.losses++; this.round++;
      if (this.variant === 'recruiter') { this.after = { t: 1.0, fn: () => this.recruiterPunish() }; }
      else if (this.variant === 'championship') { this.rl++; if (this.rl >= this.needWins) this.after = { t: 1.2, fn: () => { this.score = this.bracket; this.scoreId = 'ddakji_champ'; this.scoreLabel = 'ADVERSÁRIOS VENCIDOS'; this.lose({ reason: 'Eliminado por ' + this.opp.name }); } }; else this.after = { t: 1.2, fn: () => this.startPlayerTurn() }; }
      else this.after = { t: 1.2, fn: () => this.lose({ reason: 'O seu ddakji foi virado' }) };
    }
    nextBracket() {
      this.bracket++;
      if (this.bracket >= OPP.length) { this.score = 8; this.scoreId = 'ddakji_champ'; this.scoreLabel = 'ADVERSÁRIOS VENCIDOS'; this.chips = 400; this.win({ title: 'CAMPEÃO', sub: 'DDAKJI CHAMPIONSHIP' }); return; }
      this.setupOpponent(); R6.Banner.show('ADVERSÁRIO ' + (this.bracket + 1) + '/8', this.opp.name, { dur: 2 }); this.startPlayerTurn();
    }
    recruiterPunish() {
      const hasMoney = R6.State.s && R6.State.s.player.money >= 100000;
      R6.Dialog.show({
        who: { name: 'RECRUTADOR', look: this.opp.look }, text: 'Você perdeu. Pagar ₩100.000… ou levar um tapa?',
        choices: [
          { t: 'Levar o tapa', cb: () => this.slap() },
          { t: 'Pagar ₩100.000', disabled: !hasMoney, sub: hasMoney ? '' : 'sem dinheiro', cb: () => { R6.State.s.player.money -= 100000; this.moneyWon -= 100000; R6.Audio.sfx('coin'); this.startPlayerTurn(); } },
        ],
      });
    }
    slap() {
      this.slaps++; R6.Audio.sfx('slap'); R6.Engine.flash('#ff2244', 0.25); R6.Engine.shake(18, 0.35); this.opAnim('punch'); this.plAnim('stagger');
      this.say(['Um.', 'Dois.', 'Três.', 'Quatro.', 'Cinco…'][Math.min(4, this.slaps - 1)]);
      if (R6.State.s) R6.State.s.player.hp = Math.max(40, R6.State.s.player.hp - 4);
      this.after = { t: 1.4, fn: () => this.startPlayerTurn() };
    }
    recruiterAfterWin() {
      R6.Audio.sfx('coin');
      const plays = this.wins;
      R6.Dialog.show({
        who: { name: 'RECRUTADOR', look: this.opp.look }, expr: 'smirk',
        text: plays === 1 ? 'Parabéns. ₩100.000 são seus. Quer jogar de novo… ou prefere um jogo onde se ganha muito mais?' : `Você já tem ${U.money(this.moneyWon)}. Mais uma partida?`,
        choices: [
          { t: 'Jogar outra partida', cb: () => { this.startPlayerTurn(); } },
          { t: 'Aceitar o cartão do jogo maior', cb: () => { R6.State.s && R6.State.flag('ddakji_wins', this.wins); R6.State.s && R6.State.flag('ddakji_slaps', this.slaps); this.win({ title: 'CARTÃO ACEITO', sub: `${this.wins} VITÓRIA(S) · ${this.slaps} TAPA(S)`, wait: 2.6 }); } },
        ],
      });
    }
    update(dt) {
      this.t += dt; this.plT += dt; this.opT += dt; this.msgT += dt;
      for (const w of this.walkers) { w.x += w.v * dt; if (w.x < -80) w.x = 1360; if (w.x > 1360) w.x = -80; }
      this.fx.update(dt);
      if (this.updateResult(dt)) { this.core.update(dt, false); return; }
      if (this.updateRules(dt)) return;
      if (R6.Dialog.active) return;
      if (this.after) { this.after.t -= dt; if (this.after.t <= 0) { const f = this.after.fn; this.after = null; f(); } this.core.update(dt, false); return; }
      if (this.turn === 'place' && this.placeMenu) { this.placeMenu.update(dt); return; }
      if (this.turn === 'opp') {
        if (this.core.phase === 'wait') { this.oppTimer -= dt; if (this.oppTimer <= 0) { this.opAnim('throw'); this.core.onResult = (f, q) => this.onPlayerResult(f, q); this.core.aiThrow(this.oppP, { x: 920, y: 400 }); } }
        this.core.update(dt, false); return;
      }
      if (this.plA === 'throw' && this.plT > 0.5) this.plAnim('kneel');
      if (this.opA !== 'kneel' && this.opA !== 'windup' && this.opT > 0.6) this.opAnim('kneel');
      if (this.plA === 'stagger' && this.plT > 0.6) this.plAnim('kneel');
      this.core.update(dt, true);
    }
    render(ctx) {
      // background wall
      const g = ctx.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, '#cfd1ca'); g.addColorStop(1, '#b7b9b2');
      ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, 330);
      ctx.strokeStyle = 'rgba(0,0,0,.07)'; for (let y = 0; y < 330; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(R6.W, y); ctx.stroke(); }
      ctx.fillStyle = '#2e7d5b'; ctx.fillRect(0, 200, R6.W, 22);
      if (this.variant !== 'championship') { ctx.fillStyle = '#12355b'; ctx.fillRect(900, 60, 280, 50); R6.UI.text(ctx, 'ESTAÇÃO GONGDEOK', 915, 95, { size: 24, weight: 800, color: '#fff' }); }
      else { ctx.fillStyle = '#e8336d'; ctx.fillRect(0, 60, R6.W, 60); R6.UI.text(ctx, 'DDAKJI CHAMPIONSHIP · ADVERSÁRIO ' + (this.bracket + 1) + '/8', 640, 100, { size: 30, fam: 'title', align: 'center', color: '#fff', spacing: 4 }); }
      // walkers in the background
      for (const w of this.walkers) R6.Char.draw(ctx, w.look, w.x, 318, { view: 'side', dir: Math.sign(w.v), anim: 'walk', t: this.t + w.x, scale: 0.95, alpha: 0.55, shadow: false });
      // floor in perspective
      const fg = ctx.createLinearGradient(0, 320, 0, R6.H); fg.addColorStop(0, '#8b8d88'); fg.addColorStop(1, '#6a6c67');
      ctx.fillStyle = fg; ctx.fillRect(0, 320, R6.W, R6.H - 320);
      ctx.strokeStyle = 'rgba(0,0,0,.13)'; ctx.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(640 + i * 40, 320); ctx.lineTo(640 + i * 190, R6.H); ctx.stroke(); }
      for (let k = 0; k < 9; k++) { const y = 320 + Math.pow(k / 8, 1.8) * 400; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(R6.W, y); ctx.stroke(); }
      if (this.turn === 'place' || this.turn === 'opp') { // highlight chosen placement area
        const spots = [[640, 560], [640, 500], [640, 540]];
        if (this.turn === 'opp' && this.placement === 2) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(560, 520); ctx.lineTo(720, 560); ctx.stroke(); }
      }
      // opponent (right) and player (left), kneeling, big
      R6.Char.draw(ctx, this.opp.look, 1010, 660, { view: 'side', dir: -1, anim: this.opA === 'kneel' ? 'kneel' : this.opA === 'windup' ? 'kneel' : this.opA === 'throw' ? 'kneelThrow' : this.opA, t: this.opA === 'kneel' ? this.t : this.opT, scale: 2.3, expr: this.turn === 'opp' ? 'determined' : 'smirk' });
      this.core.draw(ctx, { projA: this.turn === 'player' ? '#2458c9' : '#c83434', projB: this.turn === 'player' ? '#c83434' : '#2458c9' });
      this.fx.draw(ctx);
      R6.Char.draw(ctx, this.plCiv, 270, 660, { view: 'side', dir: 1, anim: this.plA === 'kneel' ? 'kneel' : this.plA === 'throw' ? 'kneelThrow' : this.plA, t: this.plA === 'kneel' ? this.t : this.plT, scale: 2.3, expr: this.slaps > 0 && this.plA === 'stagger' ? 'pain' : 'determined' });
      R6.UI.vignette(ctx, 0.45);
      // HUD
      if (this.phase === 'play') {
        const phaseTxt = { aim: '1 · MIRA — mova o mouse até o canto levantado e clique', power: '2 · FORÇA — solte na faixa clara', angle: '3 · ÂNGULO — clique quando o ponteiro estiver na faixa' }[this.core.phase];
        if (this.turn === 'player' && phaseTxt && !this.after) R6.UI.text(ctx, phaseTxt, 640, 700, { size: 17, align: 'center', color: '#fff', weight: 700, shadow: true });
        if (this.turn === 'player') this.core.drawMeters(ctx, 640, 600);
        const score = this.variant === 'recruiter' ? `VITÓRIAS ${this.wins}   ·   TAPAS ${this.slaps}   ·   GANHO ${U.money(this.moneyWon)}` : this.variant === 'championship' ? `RODADAS ${this.rw || 0} × ${this.rl || 0}` : `VITÓRIAS ${this.wins} · DERROTAS ${this.losses}`;
        R6.UI.panel(ctx, 640 - 260, 14, 520, 40, { fill: 'rgba(6,8,12,.75)', shadow: false });
        R6.UI.text(ctx, score, 640, 40, { size: 17, align: 'center', weight: 800, color: '#f2c14e', spacing: 1 });
        if (this.msg && this.msgT < 2.4) { const a = Math.min(1, this.msgT * 5, (2.4 - this.msgT) * 2); R6.UI.text(ctx, this.msg, 640, 170, { size: 44, fam: 'title', align: 'center', color: '#fff', alpha: a, shadow: true, spacing: 3 }); }
        if (this.turn === 'place' && this.placeMenu) { R6.UI.panel(ctx, 400, 470, 480, 180, { fill: 'rgba(6,8,12,.9)' }); this.placeMenu.draw(ctx, 420, 486, 440, 44, 8, { size: 17, align: 'left' }); }
      }
      this.drawRules(ctx);
    }
  }

  R6.DdakjiScene = DdakjiScene;
  R6.registerGame('ddakji', { name: 'Ddakji', season: 1, icon: 'square', desc: 'Vire o ddakji do adversário.', create: o => new DdakjiScene(o) });
})();
