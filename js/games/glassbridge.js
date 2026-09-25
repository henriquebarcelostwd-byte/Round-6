/* ROUND 6 — glassbridge.js : Glass Bridge — vest order choice, 18 steps of tempered vs normal glass, memory (watch others),
   examine reflections / listen to the glass, glass-maker beat & lights off, hesitation, pushing, falls, time limit. Variant: endless */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const X0 = 360, STEP = 112, YN = 540, YF = 486;

  class GlassBridge extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'glassbridge'; this.name = 'glassbridge';
      this.endless = opts.variant === 'endless';
      this.N = this.endless ? 400 : 18;
      this.safe = []; for (let i = 0; i < this.N; i++) this.safe.push(Math.random() < 0.5 ? 'near' : 'far');
      this.revealed = new Array(this.N).fill(null); this.broken = Array.from({ length: this.N }, () => ({ near: false, far: false }));
      this.timeLimit = this.endless ? 9999 : R6.Save.D(260, 215, 180); this.timeLeft = this.timeLimit;
      this.cam = new R6.Camera({ bounds: { x: -200, y: -300, w: X0 + this.N * STEP + 900, h: 1400 } });
      this.cam.set(300, 380, 1.1);
      this.lights = 1; this.lightsOff = false; this.stage = this.campaign ? 'vest' : 'play';
      this.hasHint = R6.State.s && (R6.State.has('hint_glass') || R6.State.flag('hint_glass'));
      this.hasMarble = R6.State.s && R6.State.has('marble');
      this.examine = null; this.pushQTE = null; this.score = 0;
      this.buildQueue();
    }
    rules() {
      if (this.stage === 'vest') return null;
      return {
        title: this.endless ? 'GLASS BRIDGE ENDLESS' : 'PONTE DE VIDRO', icon: 'triangle', sub: this.endless ? 'ATÉ ONDE VOCÊ CHEGA?' : this.N + ' PASSOS · VIDRO TEMPERADO OU VIDRO COMUM',
        lines: [
          'Em cada passo há dois painéis: um aguenta, o outro quebra.',
          'Observe quem vai na frente — os painéis revelados ficam na memória (brilham).',
          'W = pular no painel do FUNDO · S = pular no painel da FRENTE · D = avançar no caminho conhecido.',
          'Segure E para examinar o reflexo (melhor com luz). Q = jogar/ouvir o vidro.',
          this.endless ? 'Cada passo vale pontos. Um erro e acabou.' : 'Quem não atravessar antes do tempo acabar será eliminado.',
        ],
        keys: [['W / S', 'escolher painel'], ['D', 'avançar'], ['E', 'examinar'], ['Q', 'ouvir'], ['ESPAÇO', 'resistir a empurrão']],
      };
    }
    buildQueue() {
      const S = R6.State; const plLook = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 });
      let bots;
      if (this.campaign && S.s) bots = S.aliveBots();
      else bots = Array.from({ length: this.endless ? 0 : 13 }, (_, i) => ({ num: 10 + i * 23, look: R6.Char.makeLook({ num: 10 + i * 23 }), tr: { fear: Math.random(), betray: Math.random(), courage: Math.random(), intel: Math.random() }, fake: true, alive: true }));
      this.people = bots.map(p => this.mk(p, p.look, false));
      this.me = this.mk(S.s ? S.player : null, plLook, true);
      this.vestPick = 1;
      if (!this.campaign) { const n = this.people.length + 1; this.assignOrder(this.endless ? 1 : Math.min(n, U.randi(Math.ceil(n * 0.5), n))); }
      else {
        const n = this.people.length + 1;
        // bots grab numbers first (some already taken when you arrive)
        this.taken = new Set(); const tk = Math.floor(n * 0.45);
        while (this.taken.size < tk) this.taken.add(U.randi(1, n));
        this.vestMenuI = [...Array(n).keys()].map(i => i + 1).find(v => !this.taken.has(v)) || 1;
      }
    }
    mk(p, look, isPlayer) { return { p, look: Object.assign({}, look, { vest: 'black' }), isPlayer, pos: -1, row: 'near', x: 0, y: YN, t: Math.random() * 3, state: 'wait', hes: 0, fall: null, done: false, dead: false, jump: null, anim: 'idle' }; }
    assignOrder(myNum) {
      const n = this.people.length + 1;
      // story order: important characters towards the back (except those whose beat happens on the bridge)
      const pri = p => { const k = p.p && p.p.key; if (k === 'thief' || k === 'schemer') return 3; if (k === 'glass') return 2.2; if (k === 'gangster' || k === 'wild') return 1.6; return Math.random() * 2; };
      const sorted = this.people.slice().sort((a, b) => pri(a) - pri(b));
      const order = []; let k = 0;
      for (let v = 1; v <= n; v++) { if (v === myNum) order.push(this.me); else order.push(sorted[k++]); }
      this.queue = order;
      this.queue.forEach((a, i) => { a.vestNum = i + 1; a.look.vestNum = i + 1; a.x = 280 - i * 34; a.y = YN; a.row = 'near'; a.q = i; });
      this.myNum = myNum;
      if (this.campaign) R6.State.decide('glass_vest', myNum, 'Colete ' + myNum);
    }
    begin() {
      R6.Music.play('tension'); R6.Music.setIntensity(0.3); R6.Audio.loop('wind', 0.25);
      if (!this.endless) R6.Dialog.announce('Vocês têm ' + U.time(this.timeLimit) + ' para atravessar a ponte. Boa sorte.', null, 3);
      this.stage = 'play';
    }
    focus() { const s = this.cam.toScreen(this.me.x, this.me.y); return { x: s.x, y: s.y, look: this.me.look, scale: 1.15 * this.cam.zoom, facing: 1 }; }
    stepX(i) { return X0 + i * STEP + STEP / 2; }
    rowY(r) { return r === 'far' ? YF : YN; }
    leader() { return this.queue.find(a => !a.done && !a.dead); }
    occupied(i, except) { return this.queue.some(a => a !== except && !a.dead && !a.done && a.pos === i); }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.fx.update(dt);
      for (const a of (this.queue || [])) this.updPerson(a, dt);
      if (this.stage === 'vest') return this.updVest(dt);
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      if (!this.endless) this.timeLeft -= dt;
      if (this.timeLeft <= 0 && !this.exploded) this.explode();
      if (this.fastEnd && !this.result && !this.exploded) { R6.Engine.timeScale = 3; if (this.queue.every(a => a.done || a.dead)) { R6.Engine.timeScale = 1; this.finishWin(); } }
      if (this.exploded) { this.explT += dt; if (this.explT > 3 && !this.result) { if (this.me.done) this.finishWin(); } this.cam.update(dt); return; }
      const L = this.leader();
      // lights: the Front Man turns them off when the glass-maker starts reading them
      if (this.lightsOffPending) { this.lightsOffPending -= dt; if (this.lightsOffPending <= 0) { this.lightsOff = true; this.lightsOffPending = 0; R6.Audio.sfx('doorSlam'); R6.Toast.show('As luzes foram apagadas.', { color: '#ff5a6a' }); } }
      this.lights = U.approach(this.lights, this.lightsOff ? 0.25 : 1, dt * 2);
      // bots
      for (const a of this.queue) if (!a.isPlayer && !a.dead && !a.done && !a.jump) this.botThink(a, dt, a === L);
      // player
      this.updPlayer(dt, L);
      // camera: follow leader & player
      const fx = L ? (L.isPlayer ? L.x : (L.x + this.me.x) / 2) : this.me.x;
      const tension = L && L.state === 'decide' ? 1 : 0;
      this.cam.follow(U.clamp(fx, this.me.x - 380, this.me.x + 380) + 60, 400 + (this.me.fall ? this.me.fall.y * 0.5 : 0), U.lerp(1.05, 1.3, tension * 0.6));
      this.cam.update(dt);
      R6.Music.setIntensity(0.3 + tension * 0.5 + (this.timeLeft < 40 ? 0.3 : 0));
      if (this.endless) { this.score = Math.max(this.score, this.me.pos + 1); }
    }
    updVest(dt) {
      const I = R6.Input; const n = this.people.length + 1;
      const mv = d => { let v = this.vestMenuI; for (let k = 0; k < n; k++) { v = ((v - 1 + d + n) % n) + 1; if (!this.taken.has(v)) break; } this.vestMenuI = v; R6.Audio.sfx('hover'); };
      if (I.actP('right')) mv(1); if (I.actP('left')) mv(-1); if (I.actP('down')) mv(4); if (I.actP('up')) mv(-4);
      const m = I.mouse; if (this.vRects) this.vRects.forEach((r, i) => { if (U.rectHit(m.x, m.y, r) && !this.taken.has(i + 1)) { if (m.moved) this.vestMenuI = i + 1; if (m.pressed) { this.vestMenuI = i + 1; this.pickVest(); } } });
      if (I.actP('confirm')) this.pickVest();
    }
    pickVest() { R6.Audio.sfx('confirm'); this.assignOrder(this.vestMenuI); this.stage = 'rules'; this.phase = 'rules'; this.rulesT = 0; }
    updPerson(a, dt) {
      a.t += dt;
      if (a.jump) {
        const J = a.jump; J.t += dt; const k = Math.min(1, J.t / J.dur);
        a.x = U.lerp(J.x0, J.x1, k); a.y = U.lerp(J.y0, J.y1, k) - Math.sin(k * Math.PI) * 55; a.anim = 'jump';
        if (k >= 1) { a.jump = null; this.land(a, J); }
      }
      if (a.fall) { const f = a.fall; f.t += dt; f.vy += 1500 * dt; f.y += f.vy * dt; a.y = f.y0 + f.y; a.anim = 'flail'; if (!f.thud && f.y > 700) { f.thud = true; R6.Audio.sfx('thud', { vol: 0.35, delay: 0.3 }); } }
      if (a.walk) { const w = a.walk; const d = w.x - a.x; if (Math.abs(d) < 2) { a.x = w.x; a.walk = null; a.anim = 'idle'; } else { a.x += Math.sign(d) * Math.min(Math.abs(d), 90 * dt); a.anim = 'walk'; } }
    }
    jumpTo(a, i, row) {
      if (i >= this.N) { a.jump = { t: 0, dur: 0.55, x0: a.x, y0: a.y, x1: this.stepX(this.N - 1) + STEP + 60 + (a.q || 0) * 12, y1: YN, end: true }; R6.Audio.sfx('jump', { vol: 0.4 }); return; }
      a.jump = { t: 0, dur: 0.5, x0: a.x, y0: a.y, x1: this.stepX(i), y1: this.rowY(row), i, row };
      a.state = 'jump'; a.hes = 0; R6.Audio.sfx('jump', { vol: 0.35 });
    }
    land(a, J) {
      if (J.end) { a.done = true; a.pos = this.N; a.state = 'done'; a.anim = 'celebrate'; if (a.isPlayer) this.playerSafe(); return; }
      const ok = this.safe[J.i] === J.row;
      if (ok) {
        a.pos = J.i; a.row = J.row; a.state = 'wait'; a.anim = 'idle';
        if (!this.revealed[J.i]) { this.revealed[J.i] = J.row; R6.Audio.sfx('glassTapHi', { vol: 0.5 }); }
        if (a.isPlayer && this.endless) { this.score = J.i + 1; }
      } else {
        this.broken[J.i][J.row] = true; this.revealed[J.i] = J.row === 'near' ? 'far' : 'near';
        R6.Audio.sfx('glass'); this.cam.shake(8, 0.4); R6.Engine.slowmo(0.35, 0.9);
        this.fx.emit('glass', this.stepX(J.i), this.rowY(J.row) + 4, 50, { spread: 45 });
        a.fall = { t: 0, vy: -80, y: 0, y0: a.y }; a.dead = true; a.state = 'fall';
        R6.Audio.sfx('scream', { delay: 0.1 });
        this.onFall(a);
      }
    }
    onFall(a) {
      if (a.isPlayer) { if (this.campaign) R6.State.eliminate(R6.State.player, 'glass'); this.score = Math.max(this.score, a.pos + 1); this.lose({ reason: 'O vidro quebrou', wait: 3.2 }); return; }
      if (a.p && !a.p.fake) R6.Elim.kill(a.p, { cause: 'glass', sfx: false, host: this });
      // the one behind reacts
      const b = this.queue[this.queue.indexOf(a) + 1]; if (b && !b.dead) b.hes += 1.5;
      // scripted beat: gangster & wild fall together
      if (a.p && a.p.key === 'gangster') { const w = this.queue.find(x => x.p && x.p.key === 'wild' && !x.dead && !x.done); if (w) { R6.Dialog.toast(w.p, 'EU DISSE QUE, SE EU MORRESSE, VOCÊ IA JUNTO!', 2.4); w.fall = { t: 0, vy: -40, y: 0, y0: w.y }; w.dead = true; w.state = 'fall'; if (w.p.alive) R6.Elim.kill(w.p, { cause: 'glass', sfx: false }); R6.Audio.sfx('scream', { delay: 0.3 }); } }
    }
    botThink(a, dt, isLeader) {
      if (a.walk) return;
      if (!isLeader) {
        // followers advance along known panels, keeping one step of distance
        const next = a.pos + 1;
        const ahead = this.queue[this.queue.indexOf(a) - 1];
        const limit = ahead ? (ahead.done ? this.N : ahead.pos - 1) : this.N;
        if (next < this.N && next <= limit && this.revealed[next] && !this.occupied(next, a) && Math.random() < dt * 1.5) this.jumpTo(a, next, this.revealed[next]);
        else if (next >= this.N && ahead && ahead.done && Math.random() < dt * 1.5) this.jumpTo(a, next);
        else if (a.pos === -1 && !a.walk) { const idx = this.queue.indexOf(a); const tx = 280 - (idx - this.queue.indexOf(this.leader())) * 34; if (Math.abs(a.x - tx) > 3 && tx <= 290) a.walk = { x: Math.min(290, tx) }; }
        return;
      }
      const next = a.pos + 1;
      if (next >= this.N) { this.jumpTo(a, next); return; }
      if (this.revealed[next]) { if (Math.random() < dt * 2) this.jumpTo(a, next, this.revealed[next]); return; }
      // must decide
      a.state = 'decide';
      a.hes += dt;
      const tr = a.p ? a.p.tr : { fear: 0.5, courage: 0.5 };
      const need = (a.needHes != null ? a.needHes : (a.needHes = U.rand(1.5, 4.5) + tr.fear * 6 - tr.courage * 2)) * (this.timeLeft < 60 ? 0.5 : 1);
      // glass-maker reads the panels while there is light
      if (a.p && a.p.key === 'glass') {
        if (!this.lightsOff && !this.lightsOffPending && a.hes > 1.2) { this.lightsOffPending = a.readCount >= 2 ? 0.01 : 0; }
        if (!this.lightsOff) { if (a.hes > 2.2) { a.readCount = (a.readCount || 0) + 1; a.needHes = null; this.jumpTo(a, next, Math.random() < 0.95 ? this.safe[next] : (this.safe[next] === 'near' ? 'far' : 'near')); if (a.readCount === 2) { this.lightsOffPending = 1.2; R6.Dialog.toast(a.p, 'Consigo ver a diferença… o temperado não distorce a luz.', 2.4); } } return; }
        // lights off: hesitates until pushed by the schemer
        if (a.hes > 5) { const sch = this.queue.find(x => x.p && x.p.key === 'schemer' && !x.dead && !x.done); if (sch && !a.pushed) { a.pushed = true; R6.Dialog.toast(sch.p, 'Não temos tempo para isso.', 2); this.push(a, sch); return; } }
        if (a.hes < 9) return;
      }
      // pushers behind get impatient
      const behind = this.queue[this.queue.indexOf(a) + 1];
      if (behind && !behind.dead && behind.p && behind.p.tr && behind.p.tr.betray > 0.75 && a.hes > need + 4 && !a.pushed && this.timeLeft < this.timeLimit * 0.6) { a.pushed = true; this.push(a, behind); return; }
      if (a.hes >= need) { a.needHes = null; this.jumpTo(a, next, Math.random() < 0.5 ? 'near' : 'far'); }
    }
    push(victim, by) {
      by.anim = 'push'; R6.Audio.sfx('grab'); R6.Engine.slowmo(0.4, 0.6);
      if (victim.isPlayer) { this.pushQTE = { t: 0, win: R6.Save.D(0.9, 0.7, 0.5), by }; return; }
      const next = victim.pos + 1;
      if (next < this.N) this.jumpTo(victim, next, Math.random() < 0.5 ? 'near' : 'far');
      if (by.isPlayer && victim.p && !victim.p.fake) { R6.State.addRel(victim.p, -60, 'pushed'); R6.State.s.stats.betrayals++; R6.State.karma(-4); R6.State.flag('pushed_on_bridge', true); }
    }
    updPlayer(dt, L) {
      const a = this.me; if (a.dead || a.done || a.jump) return;
      const I = R6.Input;
      if (this.pushQTE) {
        const q = this.pushQTE; q.t += dt;
        if (I.actP('action')) { this.pushQTE = null; R6.Audio.sfx('block'); R6.Toast.show('Você resistiu ao empurrão!', { color: '#2ec4b6' }); if (q.by.p && !q.by.p.fake) R6.State.addRel(q.by.p, -20, 'fought', { silent: true }); return; }
        if (q.t > q.win) { this.pushQTE = null; const next = a.pos + 1; if (next < this.N) this.jumpTo(a, next, Math.random() < 0.5 ? 'near' : 'far'); }
        return;
      }
      const isLeader = L === a;
      const next = a.pos + 1;
      // examine
      if (this.examine) {
        const e = this.examine; e.t += dt;
        if (!I.act('interact') && !e.done) { this.examine = null; return; }
        if (e.t >= e.dur && !e.done) {
          e.done = true;
          const acc = this.lights > 0.7 ? (this.hasHint ? 0.88 : 0.68) : (this.hasHint ? 0.6 : 0.52);
          const said = Math.random() < acc ? this.safe[e.i] : (this.safe[e.i] === 'near' ? 'far' : 'near');
          e.text = said === 'far' ? 'O painel do FUNDO parece mais sólido — reflete a luz sem distorção.' : 'O painel da FRENTE parece mais sólido — reflete a luz sem distorção.';
          if (this.lights < 0.7) e.text = 'Está escuro demais… ' + (said === 'far' ? 'talvez o do FUNDO?' : 'talvez o da FRENTE?');
          e.hold = 2.8;
        }
        if (e.done) { e.hold -= dt; if (e.hold <= 0) this.examine = null; }
      }
      if (I.actP('interact') && next < this.N && !this.revealed[next] && !this.examine) this.examine = { t: 0, dur: this.lights > 0.7 ? 2.5 : 3.5, i: next };
      // listen: throw the marble (if you have it) or tap with the foot
      if (I.actP('alt') && next < this.N && !this.revealed[next] && isLeader && !this.listenT) {
        const withMarble = this.hasMarble && !this.usedMarble;
        if (withMarble) this.usedMarble = true;
        this.listenT = 2.2;
        const acc = withMarble ? 0.97 : 0.72;
        const hiRow = Math.random() < acc ? this.safe[next] : (this.safe[next] === 'near' ? 'far' : 'near');
        R6.Audio.sfx('glassTapHi', { delay: 0.2 }); R6.Audio.sfx('glassTapLo', { delay: 0.9 });
        this.listenInfo = { t: 0, text: (withMarble ? 'Você joga a bolinha do velho. ' : 'Você bate no vidro com o pé. ') + 'O som agudo e firme veio do painel ' + (hiRow === 'far' ? 'do FUNDO.' : 'da FRENTE.') };
      }
      if (this.listenT) { this.listenT -= dt; if (this.listenT <= 0) this.listenT = 0; }
      if (this.listenInfo) { this.listenInfo.t += dt; if (this.listenInfo.t > 4) this.listenInfo = null; }
      // movement
      const ahead = this.queue[this.queue.indexOf(a) - 1];
      const limit = ahead && !ahead.dead ? (ahead.done ? this.N : ahead.pos - 1) : this.N;
      if (a.pos === -1 && !isLeader) { const idx = this.queue.indexOf(a); const tx = Math.min(290, 280 - (idx - this.queue.indexOf(L)) * 34); if (Math.abs(a.x - tx) > 3) a.walk = { x: tx }; }
      if (I.actP('right') && next <= limit) {
        if (next >= this.N) this.jumpTo(a, next);
        else if (this.revealed[next] && !this.occupied(next, a)) this.jumpTo(a, next, this.revealed[next]);
      }
      if (isLeader && next < this.N && !this.revealed[next]) {
        a.state = 'decide'; a.hes += dt;
        if (I.actP('up')) this.jumpTo(a, next, 'far');
        else if (I.actP('down')) this.jumpTo(a, next, 'near');
        // someone behind might push you if you hesitate too long
        const behind = this.queue[this.queue.indexOf(a) + 1];
        if (behind && !behind.dead && behind.p && behind.p.tr && behind.p.tr.betray > 0.7 && a.hes > 14 && !a.pushed && this.timeLeft < this.timeLimit * 0.7) { a.pushed = true; R6.Dialog.toast(behind.p, 'Anda logo!', 1.5); this.push(a, behind); }
      }
      // player may push the one ahead (betrayal)
      if (I.actP('interact') && ahead && !ahead.dead && !ahead.done && ahead.state === 'decide' && Math.abs(ahead.x - a.x) < 140 && ahead.pos === a.pos + 1 && !this.examine) { a.anim = 'push'; this.push(ahead, a); }
    }
    playerSafe() {
      R6.Audio.sfx('pass'); R6.Banner.show('VOCÊ ATRAVESSOU', 'Aguarde o fim do tempo…', { dur: 2.4, color: '#2ec4b6' });
      if (this.endless) { this.chips = this.score * 4; this.win({ title: 'FIM DA PONTE?!' }); return; }
      if (this.campaign) {
        // injured thief (story), schemer survives if alive
        const th = this.queue.find(x => x.p && x.p.key === 'thief' && !x.dead);
        if (th) R6.State.flag('thief_injured', true);
      }
      this.fastEnd = true;
    }
    explode() {
      this.exploded = true; this.explT = 0;
      R6.Audio.sfx('buzzer'); R6.Audio.sfx('glass', { delay: 0.4 }); R6.Audio.sfx('glass', { delay: 0.8 }); this.cam.shake(14, 1.2);
      for (let i = 0; i < this.N; i++) { this.broken[i].near = this.broken[i].far = true; this.fx.emit('glass', this.stepX(i), YN, 12, { spread: 50 }); }
      for (const a of this.queue) if (!a.done && !a.dead) { a.dead = true; a.fall = { t: 0, vy: -100, y: 0, y0: a.y }; if (a.isPlayer) { if (this.campaign) R6.State.eliminate(R6.State.player, 'glass'); this.lose({ reason: 'O tempo acabou' }); } else if (a.p && !a.p.fake) R6.Elim.kill(a.p, { cause: 'glass', sfx: false, silent: true }); }
    }
    finishWin() { this.chips = 90; this.win({ sub: 'PLAYERS REMAINING: ' + (R6.State.s ? R6.State.alive : this.queue.filter(a => a.done).length) }); }
    debugWin() {
      if (this.stage === 'vest') this.pickVest();
      this.phase = 'play'; this.stage = 'play';
      // resolve: everyone before the player falls/crosses quickly, player crosses
      for (let i = 0; i < this.N; i++) this.revealed[i] = this.safe[i];
      for (const a of this.queue) if (!a.isPlayer && !a.dead && a.p && a.p.key !== 'thief' && a.p.key !== 'schemer' && Math.random() < 0.7) { a.dead = true; if (!a.p.fake) R6.Elim.kill(a.p, { silent: true }); }
      else if (!a.isPlayer && !a.dead) { a.done = true; }
      this.me.done = true; this.finishWin();
    }
    // ------------------------------------------------ render
    render(ctx) {
      const cam = this.cam, t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#05060a'); g.addColorStop(1, '#0e1320'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      const endX = X0 + this.N * STEP;
      // far background: VIP gallery balcony + stadium
      const v = cam.view(200);
      ctx.fillStyle = '#0b0d14'; ctx.fillRect(v.x0, -300, v.x1 - v.x0, 700);
      for (let x = Math.floor(v.x0 / 300) * 300; x < v.x1; x += 300) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x, -300, 4, 1400); }
      const vx = 700; ctx.fillStyle = 'rgba(255,210,120,' + (0.12 + this.lights * 0.1) + ')'; ctx.fillRect(vx, 60, 520, 120); ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 4; ctx.strokeRect(vx, 60, 520, 120);
      if (!this.vips) this.vips = [0, 1, 2, 3, 4, 5].map(i => R6.Char.makeLook({ outfit: 'vip', vip: ['tiger', 'deer', 'eagle', 'bear', 'lion', 'deer'][i], seed: 70 + i }));
      for (let i = 0; i < 6; i++) R6.Char.draw(ctx, this.vips[i], vx + 50 + i * 85, 178, { view: 'front', anim: 'idle', t: t + i, scale: 0.8, alpha: 0.8, shadow: false });
      // spotlights
      for (let i = 0; i < 6; i++) { const lx = 300 + i * 420; ctx.save(); ctx.globalAlpha = 0.18 * this.lights; const sg = ctx.createLinearGradient(lx, -300, lx, YN); sg.addColorStop(0, 'rgba(255,250,230,.9)'); sg.addColorStop(1, 'rgba(255,250,230,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(lx - 20, -300); ctx.lineTo(lx + 20, -300); ctx.lineTo(lx + 160, YN + 40); ctx.lineTo(lx - 160, YN + 40); ctx.closePath(); ctx.fill(); ctx.restore(); }
      // abyss depth lines
      ctx.fillStyle = '#020306'; ctx.fillRect(v.x0, YN + 40, v.x1 - v.x0, 1200);
      ctx.strokeStyle = 'rgba(80,100,140,.08)'; for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo(v.x0, YN + 40 + i * i * 7); ctx.lineTo(v.x1, YN + 40 + i * i * 7); ctx.stroke(); }
      // start and end platforms
      ctx.fillStyle = '#4a4f59'; ctx.fillRect(-200, YN, X0 + 200, 900); ctx.fillRect(endX, YN, 900, 900);
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(-200, YN - 4, X0 + 200, 8); ctx.fillRect(endX, YN - 4, 900, 8);
      ctx.fillStyle = '#6a707b'; ctx.fillRect(-200, YF - 4, X0 + 200, 8); ctx.fillRect(endX, YF - 4, 900, 8);
      R6.UI.text(ctx, 'CHEGADA', endX + 160, YN + 60, { size: 40, fam: 'title', color: 'rgba(255,255,255,.2)' });
      // rails
      ctx.strokeStyle = '#2c313a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(X0, YF + 8); ctx.lineTo(endX, YF + 8); ctx.moveTo(X0, YN + 10); ctx.lineTo(endX, YN + 10); ctx.stroke();
      // panels (far row first)
      const i0 = Math.max(0, Math.floor((v.x0 - X0) / STEP)), i1 = Math.min(this.N - 1, Math.ceil((v.x1 - X0) / STEP));
      const drawRow = (row) => {
        for (let i = i0; i <= i1; i++) {
          const x = X0 + i * STEP + 12, y = this.rowY(row);
          const w = row === 'far' ? 84 : 90;
          const known = this.revealed[i] === row;
          const glint = known ? 0.35 + Math.sin(t * 3 + i) * 0.15 : 0;
          R6.Props.glassPanel(ctx, x, y + 4, w, row === 'far' ? 14 : 20, { broken: this.broken[i][row], glint: glint * this.lights });
          if (known && !this.broken[i][row]) { ctx.fillStyle = 'rgba(46,196,182,.5)'; ctx.fillRect(x + w / 2 - 3, y + 14, 6, 3); }
        }
      };
      drawRow('far');
      // people on far row, then near row panels, then people on near row
      const drawP = (a) => {
        if (a.fall && a.fall.y > 900) return;
        const sc = a.row === 'far' && !a.fall ? 1.0 : 1.15;
        let anim = a.anim;
        if (a.state === 'decide' && !a.jump) anim = a.hes > 3 ? 'scared' : 'look';
        if (a.done) anim = a.isPlayer ? 'idle' : 'idle';
        R6.Char.draw(ctx, a.look, a.x, a.y, { view: 'side', dir: 1, anim, t: a.t, scale: sc, highlight: a.isPlayer ? 'rgba(255,255,255,.55)' : null, shadow: !a.fall && !a.jump, zoom: cam.zoom });
        if (a.isPlayer && !a.dead && !a.done) R6.UI.shapeIcon(ctx, 'triangle', a.x, a.y - 130 * sc + Math.sin(t * 5) * 3, 6, '#e8336d', 2, true);
      };
      for (const a of this.queue) if (a.row === 'far' && a.pos >= 0 && !a.fall) drawP(a);
      drawRow('near');
      for (const a of this.queue) if (!(a.row === 'far' && a.pos >= 0 && !a.fall)) drawP(a);
      this.fx.draw(ctx);
      cam.end(ctx);
      // lighting
      if (this.lights < 0.95) { const s = cam.toScreen(this.me.x, this.me.y - 50); R6.Light.draw(ctx, (1 - this.lights) * 0.9, [{ x: s.x, y: s.y, r: 300, a: 0.8 }]); }
      R6.UI.vignette(ctx, 0.55);
      if (this.stage === 'vest') return this.drawVest(ctx);
      if (this.phase === 'play') this.drawHUD(ctx);
      this.drawRules(ctx);
    }
    drawHUD(ctx) {
      const L = this.leader();
      const isLeader = L === this.me && !this.me.dead && !this.me.done;
      R6.HUD.draw(ctx, {
        game: this.endless ? 'GLASS BRIDGE ENDLESS · ' + this.score + ' PASSOS' : 'PONTE DE VIDRO', timer: this.endless ? null : Math.max(0, this.timeLeft),
        objective: this.me.done ? 'Você está seguro.' : isLeader ? 'Você é o primeiro! W = FUNDO · S = FRENTE · E examinar · Q ouvir' : 'Colete ' + this.myNum + ' · D avança no caminho conhecido · E empurra quem hesita',
        hide: this.endless ? { prize: true } : {}, danger: isLeader,
      });
      if (!this.endless) { R6.UI.panel(ctx, 16, 96, 220, 40, { fill: 'rgba(6,8,12,.7)', shadow: false }); R6.UI.text(ctx, 'PASSO ' + Math.max(0, this.me.pos + 1) + ' / ' + this.N, 30, 122, { size: 18, weight: 800, color: '#fff' }); }
      if (this.examine) { const e = this.examine; R6.UI.panel(ctx, 390, 520, 500, 70, { fill: 'rgba(6,8,12,.85)' }); if (!e.done) { R6.UI.text(ctx, 'EXAMINANDO O REFLEXO…', 640, 548, { size: 16, align: 'center', weight: 800 }); R6.UI.bar(ctx, 460, 564, 360, 8, e.t / e.dur, { color: '#9fd4ff' }); } else R6.UI.para(ctx, e.text, 640, 534, 470, { size: 16, align: 'center', color: '#9fd4ff' }); }
      if (this.listenInfo) { R6.UI.panel(ctx, 390, 440, 500, 70, { fill: 'rgba(6,8,12,.85)' }); R6.UI.para(ctx, this.listenInfo.text, 640, 452, 470, { size: 16, align: 'center', color: '#ffd166' }); }
      if (this.pushQTE) { R6.UI.text(ctx, 'EMPURRÃO! ESPAÇO PARA RESISTIR', 640, 300, { size: 36, fam: 'title', align: 'center', color: '#ff3b5c', shadow: true }); R6.UI.bar(ctx, 490, 320, 300, 10, 1 - this.pushQTE.t / this.pushQTE.win, { color: '#ff3b5c' }); }
      if (L && L !== this.me && L.state === 'decide' && !L.jump) R6.UI.text(ctx, '#' + U.pad(L.p ? L.p.num : 0) + ' está hesitando…', 640, R6.H - 70, { size: 16, align: 'center', color: '#ddd', weight: 700, shadow: true });
    }
    drawVest(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.text(ctx, 'ESCOLHA UM NÚMERO', 640, 90, { size: 56, fam: 'title', align: 'center', color: '#fff', spacing: 4 });
      R6.UI.text(ctx, 'Os coletes foram dispostos em ordem. Você não sabe para que serve o número.', 640, 126, { size: 17, align: 'center', color: '#bbb' });
      const n = this.people.length + 1; this.vRects = [];
      const cols = Math.min(8, n), w = 110, h = 90, x0 = 640 - (cols * w + (cols - 1) * 12) / 2;
      for (let v = 1; v <= n; v++) {
        const i = v - 1, x = x0 + (i % cols) * (w + 12), y = 170 + Math.floor(i / cols) * (h + 12);
        const r = { x, y, w, h }; this.vRects.push(r); const taken = this.taken.has(v), hov = this.vestMenuI === v;
        R6.UI.panel(ctx, x, y, w, h, { fill: taken ? 'rgba(40,40,44,.6)' : hov ? '#e8336d' : 'rgba(14,16,22,.95)', stroke: hov ? '#fff' : 'rgba(255,255,255,.15)', shadow: false, lw: hov ? 2 : 1 });
        R6.UI.text(ctx, String(v), x + w / 2, y + 56, { size: 44, fam: 'title', align: 'center', color: taken ? '#555' : '#fff' });
        if (taken) R6.UI.text(ctx, 'OCUPADO', x + w / 2, y + 78, { size: 11, align: 'center', color: '#777', weight: 800 });
      }
      R6.UI.hints(ctx, [['SETAS/MOUSE', 'escolher'], ['ENTER', 'vestir']], 640, R6.H - 30, { align: 'center' });
    }
  }

  R6.GlassBridge = GlassBridge;
  R6.registerGame('glassbridge', { name: 'Ponte de Vidro', season: 1, icon: 'triangle', desc: 'Atravesse pisando no vidro certo.', create: o => new GlassBridge(o) });
})();
