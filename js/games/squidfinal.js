/* ROUND 6 — squidfinal.js : Squid Game (S1 final) — side-view brawler in the rain: hop until the waist, punches/combos,
   kick, grab & throw, block, dodge roll, knockdowns, AI defender, mercy/finish choice, slow-motion ending */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const GROUND = 560, W = 1900, WAIST = 760, HEAD = 1600, OUT = 150;

  class Fighter {
    constructor(o) {
      Object.assign(this, { x: o.x, y: 0, vx: 0, vy: 0, dir: o.dir || 1, hp: 100, st: 100, guard: 100, state: 'idle', t: 0, look: o.look, isPlayer: !!o.isPlayer, p: o.p || null, combo: 0, comboT: 0, hitT: 0, inv: 0, cd: 0, grabbed: null, down: false, hop: !!o.hop, anim: 'idle', animT: 0, name: o.name || '' });
    }
    get grounded() { return this.y >= 0; }
    set(state, anim, animReset = true) { this.state = state; this.t = 0; if (anim) { this.anim = anim; if (animReset) this.animT = 0; } }
    update(dt, arena) {
      this.t += dt; this.animT += dt; if (this.inv > 0) this.inv -= dt; if (this.cd > 0) this.cd -= dt; if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
      this.st = Math.min(100, this.st + dt * (this.state === 'block' ? 6 : 14));
      if (this.state !== 'block') this.guard = Math.min(100, this.guard + dt * 12);
      // physics
      this.vy += 1800 * dt; this.y += this.vy * dt; if (this.y > 0) { if (this.vy > 300 && this.state === 'air') { R6.Audio.sfx('land', { vol: 0.5 }); arena.fx.emit('splash', this.x, GROUND, 8); } this.y = 0; this.vy = 0; if (this.state === 'air') this.set('idle', 'idle'); }
      const fric = this.grounded ? (this.state === 'dodge' ? 2 : 10) : 1;
      if (this.state === 'hit' || this.state === 'knock' || this.state === 'dodge' || this.state === 'thrown') this.vx *= Math.exp(-fric * dt * 0.6); else if (this.state !== 'walk' && this.state !== 'air') this.vx *= Math.exp(-fric * dt);
      this.x += this.vx * dt; this.x = U.clamp(this.x, 40, W - 40);
      // state timers
      if (this.state === 'hit' && this.t > 0.35) this.set('idle', 'idle');
      if (this.state === 'attack' && this.t > this.atk.dur) this.set('idle', 'idle');
      if (this.state === 'dodge' && this.t > 0.42) this.set('idle', 'idle');
      if (this.state === 'knock' && this.t > 1.2 && this.hp > 0) this.set('getup', 'getup');
      if (this.state === 'getup' && this.t > 0.8) { this.set('idle', 'idle'); this.inv = 0.5; }
      if (this.state === 'thrown' && this.grounded && this.t > 0.3) this.set('knock', 'lie');
      if (this.state === 'grabbing' && this.t > 0.5) this.set('idle', 'idle');
    }
    canAct() { return this.state === 'idle' || this.state === 'walk' || (this.state === 'attack' && this.atk && this.t > this.atk.dur * 0.7); }
  }

  const ATK = {
    p1: { dur: 0.32, act: [0.08, 0.17], range: 58, dmg: 6, kb: 90, st: 7, anim: 'punch' },
    p2: { dur: 0.32, act: [0.08, 0.17], range: 58, dmg: 7, kb: 110, st: 7, anim: 'punch2' },
    p3: { dur: 0.5, act: [0.14, 0.26], range: 66, dmg: 12, kb: 300, st: 12, anim: 'punch', knock: 0.35 },
    kick: { dur: 0.55, act: [0.14, 0.28], range: 78, dmg: 9, kb: 420, st: 16, anim: 'kick' },
    heavy: { dur: 0.7, act: [0.3, 0.42], range: 70, dmg: 16, kb: 380, st: 20, anim: 'push', knock: 0.8 },
  };

  class SquidFinal extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'squidfinal'; this.name = 'squidfinal';
      const S = R6.State;
      this.oppP = opts.opponent || (S.s ? (S.byKey('schemer') && S.byKey('schemer').alive ? S.byKey('schemer') : S.aliveBots().sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || b.tr.str - a.tr.str)[0]) : null);
      const oppLook = this.oppP ? this.oppP.look : R6.Char.makeLook({ hs: 'slick', seed: 218, num: 218 });
      this.P = new Fighter({ x: 260, dir: 1, look: S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 }), isPlayer: true, hop: true, p: S.s ? S.player : null, name: 'VOCÊ' });
      this.O = new Fighter({ x: 980, dir: -1, look: oppLook, p: this.oppP, name: this.oppP ? this.oppP.name : '#218' });
      const intel = this.oppP ? this.oppP.tr.intel : 0.8, str = this.oppP ? this.oppP.tr.str : 0.6;
      this.ai = { react: R6.Save.D(0.32, 0.22, 0.14) * (1.2 - intel * 0.4), aggro: 0.45 + str * 0.3, blockP: 0.25 + intel * 0.35 * R6.Save.D(1, 1.2, 1.4), dmgK: R6.Save.D(0.9, 1.1, 1.35), think: 0, plan: null };
      this.cam = new R6.Camera({ bounds: { x: 0, y: -200, w: W, h: 1000 } }); this.cam.set(600, 420, 1.15);
      this.rain = new R6.Rain(320); this.rain.lightning = true; this.rain.intensity = 1;
      this.outro = null; this.choice = null; this.sparks = [];
    }
    rules() {
      return {
        title: 'SQUID GAME', icon: 'triangle', sub: 'O JOGO FINAL · ATACANTE CONTRA DEFENSOR · NA CHUVA',
        lines: [
          'Chegue à CABEÇA da lula (à direita) e pressione E — ou derrube o defensor.',
          'Até passar a CINTURA da lula você só pode pular em um pé (lento e vulnerável).',
          'Se for empurrado para fora da linha à esquerda, você perde.',
          'J soco (combo) · K chute/empurrão · L agarrar e arremessar · I/CTRL bloquear · SHIFT esquiva · W pular',
        ],
        keys: [['A D', 'mover'], ['J K L', 'atacar'], ['I', 'bloquear'], ['SHIFT', 'esquivar'], ['E', 'tocar a cabeça']],
      };
    }
    begin() {
      R6.Music.play('action'); R6.Music.setIntensity(0.4);
      R6.Audio.loop('rain', 0.9); R6.Audio.loop('wind', 0.25);
      R6.Dialog.announce('Jogo final: Squid Game. O atacante vence se tocar a cabeça da lula. Que comece.', null, 2.8);
      R6.Engine.after(1.2, () => { if (this.oppP && this.oppP.key === 'schemer') R6.Dialog.toast(this.oppP, 'Você nunca ganhou de mim em nada. Nem na rua, nem aqui.', 3); });
    }
    focus() { const s = this.cam.toScreen(this.P.x, GROUND); return { x: s.x, y: s.y, look: this.P.look, scale: 1.4 * this.cam.zoom, facing: 1 }; }
    // ------------------------------------------------ combat core
    startAttack(f, key) {
      const a = ATK[key]; if (f.st < a.st * 0.5) { if (f.isPlayer) R6.Toast.show('Sem fôlego!', { color: '#ff5a6a' }); return; }
      f.atk = Object.assign({ key, hit: false }, a); f.set('attack', a.anim); f.st -= a.st; R6.Audio.sfx('punchAir', { vol: 0.6 });
      f.vx += f.dir * (key === 'heavy' ? 160 : 60);
    }
    resolveHits(att, def) {
      if (att.state !== 'attack' || !att.atk || att.atk.hit) return;
      const a = att.atk; if (att.t < a.act[0] || att.t > a.act[1]) return;
      const dx = (def.x - att.x) * att.dir;
      if (dx < 0 || dx > a.range || Math.abs(def.y - att.y) > 60) return;
      a.hit = true;
      if (def.inv > 0 || def.state === 'knock' || def.state === 'getup') return;
      if (def.state === 'dodge') { R6.Audio.sfx('whoosh', { vol: 0.4 }); return; }
      const facing = def.dir === -att.dir;
      if (def.state === 'block' && facing && def.guard > 0) {
        def.guard -= a.dmg * 3.2; def.vx += att.dir * a.kb * 0.35; R6.Audio.sfx('block'); this.fx.emit('spark', def.x - att.dir * 10, GROUND - 80, 6);
        if (def.guard <= 0) { def.set('hit', 'stagger'); def.guard = 0; R6.Toast.show(def.isPlayer ? 'Sua guarda quebrou!' : 'Guarda quebrada!', { color: '#ffd166' }); }
        return;
      }
      let dmg = a.dmg * (att.isPlayer ? 1 : this.ai.dmgK) * (def.hop ? 1.2 : 1);
      def.hp = Math.max(0, def.hp - dmg); def.vx += att.dir * a.kb * (def.hop ? 1.4 : 1); def.vy = a.knock ? -300 : -60;
      R6.Audio.sfx(a.dmg >= 12 ? 'hitHeavy' : 'hit'); this.cam.shake(a.dmg >= 12 ? 9 : 4, 0.2);
      this.fx.emit('hit', def.x - att.dir * 12, GROUND - 90 + def.y, 8); this.fx.emit('splash', def.x, GROUND, 6);
      if (def.hp <= 0) this.knockout(def, att);
      else if (a.knock || def.hop && Math.random() < 0.3) { def.set('knock', 'fall'); def.back = true; R6.Engine.slowmo(0.4, 0.4); }
      else def.set('hit', 'stagger');
      if (att.isPlayer) { att.combo++; att.comboT = 0.9; }
    }
    grab(att, def) {
      const dx = (def.x - att.x) * att.dir;
      if (att.st < 18 || dx < 0 || dx > 60 || def.state === 'knock' || def.state === 'dodge' || def.inv > 0) { att.set('grabbing', 'grab'); att.st -= 8; R6.Audio.sfx('whoosh', { vol: 0.4 }); return false; }
      att.st -= 18; att.set('grabbing', 'grab'); R6.Audio.sfx('grab');
      // throw behind
      def.set('thrown', 'flail'); def.vx = -att.dir * 380 + att.dir * 60; def.vy = -520; def.hp = Math.max(0, def.hp - 14 * (att.isPlayer ? 1 : this.ai.dmgK)); def.dir = att.dir;
      this.cam.shake(10, 0.35); R6.Engine.slowmo(0.35, 0.6);
      if (def.hp <= 0) this.knockout(def, att);
      return true;
    }
    knockout(def, att) {
      def.set('knock', 'lie'); def.down = true; def.hp = 0; R6.Engine.slowmo(0.25, 1.6); R6.Audio.sfx('thud'); this.cam.shake(12, 0.5);
      if (def.isPlayer) { R6.Engine.after(1.4, () => { if (this.campaign) R6.State.eliminate(R6.State.player, 'squid'); this.lose({ reason: 'Você foi derrotado' }); }); return; }
      // opponent down → final choice
      R6.Engine.after(1.3, () => this.finalChoice());
    }
    finalChoice() {
      if (this.result || this.choice) return;
      this.choice = true; R6.Music.stop(2);
      const o = this.oppP; const isSchemer = o && o.key === 'schemer';
      const opts = [
        { t: 'Terminar o jogo — caminhar até a cabeça da lula', cb: () => { R6.State.s && R6.State.decide('s1_final', 'finish', 'Terminou o jogo'); this.walkToHead = true; } },
        { t: 'Estender a mão — "Vamos parar. Cláusula 3. Saímos os dois."', cb: () => this.mercy() },
      ];
      if (!this.campaign) opts.pop();
      R6.Dialog.show({ who: o || { name: this.O.name, look: this.O.look }, text: isSchemer ? '(Ele está caído na lama, sem forças. A cabeça da lula está logo ali.)' : '(O adversário está caído. A cabeça da lula está logo ali.)', expr: 'pain', choices: opts });
    }
    mercy() {
      const S = R6.State; const o = this.oppP; const isSchemer = o && o.key === 'schemer';
      S.decide('s1_final', 'mercy', 'Estendeu a mão'); S.flag('s1_mercy', true); S.karma(4);
      this.P.set('idle', 'point');
      const lines = isSchemer ? [
        { who: S.player, text: 'Levanta. Se a maioria votar para parar, o jogo acaba. Nós dois saímos. Cláusula 3.', expr: 'sad' },
        { who: o, text: 'Desde crianças… você sempre foi assim. É por isso que eu nunca consegui te vencer de verdade.', expr: 'sad' },
        { who: o, text: 'Cuida da minha mãe. Ela ainda acha que eu sou o orgulho do bairro.', expr: 'cry' },
        { mode: 'narr', text: 'Ele se levanta devagar, dá as costas e caminha para fora da luz, para dentro da chuva. Um único som ecoa pela arena.' },
      ] : [
        { who: S.player, text: 'Chega. Ninguém mais precisa morrer. Vamos parar.', expr: 'sad' },
        { who: o, text: 'Parar? Depois de tudo? …Não. Eu não volto para aquela vida.', expr: 'angry' },
        { mode: 'narr', text: 'Ele recua para fora das linhas. Os guardas erguem as armas. Um único som ecoa pela arena.' },
      ];
      lines[lines.length - 1].onDone = () => {
        this.O.set('knock', 'lie'); this.oppGone = true; R6.Audio.sfx('gunFar'); R6.Engine.flash('#ffffff', 0.15);
        if (o && o.alive) R6.Elim.kill(o, { cause: 'self', sfx: false, cardSub: 'FEZ A PRÓPRIA ESCOLHA' });
        if (isSchemer) S.give('letter');
        R6.Engine.after(2.2, () => this.victory());
      };
      R6.Dialog.show(lines);
    }
    victory() {
      if (this.result) return;
      if (this.campaign && this.oppP && this.oppP.alive) R6.Elim.kill(this.oppP, { cause: 'squid', sfx: true });
      this.outro = { t: 0 }; this.P.set('outro', 'kneel');
      R6.Music.stop(1); this.rain.intensity = 1.3; R6.Engine.slowmo(0.45, 3);
      this.chips = 150;
      this.win({ title: 'WINNER', sub: R6.State.s ? '#' + U.pad(R6.State.s.player.num) + ' · ' + U.money(R6.State.s.prize) : 'VOCÊ VENCEU O SQUID GAME', wait: 6 });
    }
    // ------------------------------------------------ AI
    aiUpdate(dt) {
      const o = this.O, p = this.P, A = this.ai;
      if (o.down || this.oppGone || !o.canAct() && o.state !== 'block') return;
      o.dir = p.x > o.x ? 1 : -1;
      A.think -= dt;
      const dist = Math.abs(p.x - o.x);
      // react to player attacks: block or dodge
      if (p.state === 'attack' && p.t < 0.06 && dist < 110 && !A.reacting) {
        A.reacting = true;
        R6.Engine.after(A.react, () => { A.reacting = false; if (!o.canAct() && o.state !== 'idle') return; const r = Math.random(); if (r < A.blockP) { o.set('block', 'block'); o.blockT = 0.5; } else if (r < A.blockP + 0.15 && o.st > 20) { o.set('dodge', 'dodge'); o.vx = -o.dir * 260; o.inv = 0.35; o.st -= 15; } });
      }
      if (o.state === 'block') { o.blockT -= dt; if (o.blockT <= 0) o.set('idle', 'idle'); return; }
      if (A.think > 0) return;
      A.think = U.rand(0.15, 0.4);
      // defend the head: stay between the player and the head
      const guardX = U.clamp(p.x + 85, WAIST - 150, HEAD - 80);
      if (dist > 95) { o.vx = U.clamp((guardX - o.x) * 3, -200, 200); o.set('walk', 'walk', o.anim !== 'walk'); return; }
      const r = Math.random();
      if (p.state === 'block' && r < 0.45 && o.st > 20) { o.vx = o.dir * 120; this.grab(o, p); return; }
      if (r < A.aggro * 0.45) this.startAttack(o, o.combo % 3 === 0 ? 'p1' : o.combo % 3 === 1 ? 'p2' : 'p3');
      else if (r < A.aggro * 0.7) this.startAttack(o, 'kick');
      else if (r < A.aggro * 0.8 && o.hp < 50) this.startAttack(o, 'heavy');
      else if (r < 0.85) { o.set('block', 'block'); o.blockT = 0.4; }
      else { o.vx = -o.dir * 150; o.set('walk', 'walk'); }
      o.combo = (o.combo + 1) % 3;
    }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.fx.update(dt); this.rain.update(dt);
      this.P.update(dt, this); this.O.update(dt, this);
      if (this.outro) { this.outro.t += dt; if (this.outro.t > 2) this.P.anim = 'cry'; this.cam.follow(this.P.x, 440, 1.8); this.cam.update(dt); this.updateResult(dt); return; }
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      const p = this.P, o = this.O, I = R6.Input;
      if (this.walkToHead) { p.dir = 1; p.x += 110 * dt; p.anim = 'walk'; p.animT += dt; if (p.x >= HEAD + 40) { this.walkToHead = false; this.P.set('idle', 'idle'); R6.Audio.sfx('stamp'); this.fx.emit('splash', p.x, GROUND, 20); this.victory(); } this.follow(dt); return; }
      if (this.choice || R6.Dialog.active && R6.Dialog.cur && R6.Dialog.cur.choices) { this.follow(dt); return; }
      // waist crossing
      if (p.hop && p.x > WAIST) { p.hop = false; R6.Audio.sfx('pass', { vol: 0.5 }); R6.Toast.show('Você passou a cintura — agora pode usar os dois pés!', { color: '#2ec4b6' }); }
      // player controls
      if (!p.down && p.state !== 'knock' && p.state !== 'thrown' && p.state !== 'getup') {
        const ax = (I.act('right') ? 1 : 0) - (I.act('left') ? 1 : 0);
        if (p.canAct() || p.state === 'block' || p.state === 'air') {
          if (I.act('block') && p.grounded) { if (p.state !== 'block') p.set('block', 'block'); p.guard -= dt * 4; }
          else if (p.state === 'block') p.set('idle', 'idle');
          if (p.state !== 'block') {
            const sp = p.hop ? 95 : I.act('run') ? 210 : 150;
            if (ax) { p.vx = ax * sp; p.dir = ax; if (p.grounded && p.state !== 'attack') { if (p.state !== 'walk') p.set('walk', p.hop ? 'jump' : 'walk'); } if (p.hop && p.grounded) { p.vy = -170; p.st -= dt * 6; } }
            else if (p.state === 'walk') p.set('idle', 'idle');
            if (I.actP('jump') && p.grounded && !p.hop && I.pressed('KeyW')) { p.vy = -620; p.set('air', 'jump'); R6.Audio.sfx('jump', { vol: 0.4 }); }
            if (I.actP('punch')) { const k = p.combo % 3 === 0 ? 'p1' : p.combo % 3 === 1 ? 'p2' : 'p3'; this.startAttack(p, k); }
            if (I.actP('kick')) this.startAttack(p, 'kick');
            if (I.actP('grab')) this.grab(p, o);
            if (I.actP('dodge') && p.st > 15 && p.grounded) { p.set('dodge', 'dodge'); p.vx = (ax || -p.dir) * 330; p.inv = 0.38; p.st -= 15; R6.Audio.sfx('whoosh', { vol: 0.5 }); }
          }
        }
        if (!ax && p.state !== 'walk') p.dir = o.x > p.x ? 1 : -1;
      }
      // tap the head
      if (p.x > HEAD - 30 && I.actP('interact') && !p.down) { R6.Audio.sfx('stamp'); this.fx.emit('splash', p.x, GROUND, 20); if (this.campaign) R6.State.decide('s1_final', 'head', 'Tocou a cabeça'); this.victory(); return; }
      // out of bounds (pushed out of the lines)
      if (p.x < OUT && !this.result) { if (this.campaign) R6.State.eliminate(R6.State.player, 'squid'); R6.Audio.sfx('buzzer'); this.lose({ reason: 'Você saiu das linhas' }); }
      this.aiUpdate(dt);
      this.resolveHits(p, o); this.resolveHits(o, p);
      // body collision
      const d = o.x - p.x; if (Math.abs(d) < 34 && !o.down && o.state !== 'knock' && p.state !== 'dodge' && o.state !== 'dodge') { const push = (34 - Math.abs(d)) / 2 * Math.sign(d || 1); p.x -= push; o.x += push; }
      if (o.state === 'walk' && Math.abs(o.vx) < 10) o.set('idle', 'idle');
      R6.Music.setIntensity(U.clamp(1 - Math.min(p.hp, o.hp) / 100 + 0.3, 0.3, 1));
      this.follow(dt);
    }
    follow(dt) { const mx = (this.P.x + this.O.x) / 2; const spread = Math.abs(this.P.x - this.O.x); this.cam.follow(mx, 430, U.clamp(1.35 - spread / 1600, 0.85, 1.3)); this.cam.update(dt); }
    debugWin() { this.phase = 'play'; this.O.hp = 0; this.O.down = true; if (this.campaign && this.oppP && this.oppP.alive) R6.Elim.kill(this.oppP, { silent: true, noCard: true }); this.outro = { t: 0 }; this.win({ title: 'WINNER', wait: 0.4 }); }
    // ------------------------------------------------ render
    render(ctx) {
      const cam = this.cam, t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#04050a'); g.addColorStop(1, '#10141f'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      // background: arena wall, guards, floodlights
      ctx.fillStyle = '#0c0f16'; ctx.fillRect(0, -200, W, GROUND + 200);
      for (let x = 60; x < W; x += 170) { ctx.fillStyle = '#12161f'; ctx.fillRect(x, 60, 90, GROUND - 60); }
      if (!this.gLooks) this.gLooks = [0, 1, 2, 3, 4, 5, 6, 7].map(i => R6.Char.makeLook({ outfit: 'guard', mask: ['circle', 'triangle', 'square'][i % 3], seed: 300 + i }));
      this.gLooks.forEach((lk, i) => R6.Char.draw(ctx, lk, 120 + i * 235, GROUND - 90, { view: 'front', anim: 'idle', t: t + i, scale: 0.95, item: 'rifle', alpha: 0.75, shadow: false }));
      for (const lx of [300, 950, 1600]) { const sg = ctx.createLinearGradient(lx, -200, lx, GROUND); sg.addColorStop(0, 'rgba(230,240,255,.35)'); sg.addColorStop(1, 'rgba(230,240,255,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(lx - 12, -200); ctx.lineTo(lx + 12, -200); ctx.lineTo(lx + 260, GROUND); ctx.lineTo(lx - 260, GROUND); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#eef4ff'; ctx.fillRect(lx - 16, -205, 32, 8); }
      // wet ground with painted squid court (low perspective)
      const gg = ctx.createLinearGradient(0, GROUND - 20, 0, GROUND + 200); gg.addColorStop(0, '#5c4a36'); gg.addColorStop(1, '#2a2119'); ctx.fillStyle = gg; ctx.fillRect(0, GROUND - 20, W, 400);
      ctx.save(); ctx.strokeStyle = 'rgba(245,240,230,.85)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.rect(OUT, GROUND - 14, 420, 44); ctx.stroke(); // square (bottom of squid)
      ctx.beginPath(); ctx.moveTo(OUT + 420, GROUND + 30); ctx.lineTo(OUT + 420 + (HEAD - OUT - 600), GROUND + 8); ctx.lineTo(OUT + 420, GROUND - 14); ctx.stroke(); // triangle (body)
      ctx.beginPath(); ctx.ellipse(HEAD + 40, GROUND + 8, 150, 22, 0, 0, TAU); ctx.stroke(); // circle (head)
      ctx.strokeStyle = 'rgba(255,90,120,.9)'; ctx.beginPath(); ctx.moveTo(WAIST, GROUND - 16); ctx.lineTo(WAIST, GROUND + 32); ctx.stroke();
      ctx.restore();
      R6.UI.text(ctx, 'CABEÇA', HEAD + 40, GROUND + 70, { size: 30, fam: 'title', align: 'center', color: 'rgba(255,255,255,.35)' });
      R6.UI.text(ctx, 'CINTURA', WAIST, GROUND + 70, { size: 24, fam: 'title', align: 'center', color: 'rgba(255,120,140,.45)' });
      // puddles reflecting lights
      ctx.fillStyle = 'rgba(200,220,255,.08)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(150 + i * 200, GROUND + 60 + (i % 3) * 30, 70, 8, 0, 0, TAU); ctx.fill(); }
      // fighters
      const drawF = (f) => {
        let anim = f.anim; let at = f.animT;
        if (f.state === 'knock') anim = f.down ? 'lie' : f.anim;
        if (f.state === 'walk' && f.hop) anim = 'jump';
        const look = f.hp <= 0 && !f.isPlayer && this.oppGone ? Object.assign({}, f.look, { tint: 'dead' }) : f.look;
        // mud reflection
        ctx.save(); ctx.globalAlpha = 0.18; ctx.translate(f.x, GROUND + 4); ctx.scale(1, -0.45); R6.Char.draw(ctx, look, 0, 0, { view: 'side', dir: f.dir, anim, t: at, scale: 1.4, shadow: false, back: f.back }); ctx.restore();
        R6.Char.draw(ctx, look, f.x, GROUND + f.y, { view: 'side', dir: f.dir, anim, t: at, scale: 1.4, back: f.back, expr: f.state === 'hit' ? 'pain' : f.hp < 30 ? 'strain' : 'angry', highlight: f.inv > 0 && f.state === 'dodge' ? 'rgba(255,255,255,.6)' : null });
      };
      drawF(this.O); drawF(this.P);
      this.fx.draw(ctx);
      cam.end(ctx);
      this.rain.draw(ctx);
      R6.UI.vignette(ctx, 0.6, '#01030a');
      if (this.phase === 'play' && !this.outro) this.drawHUD(ctx);
      if (this.outro) R6.UI.letterbox(ctx, Math.min(1, this.outro.t));
      this.drawRules(ctx);
    }
    drawHUD(ctx) {
      R6.HUD.draw(ctx, { game: 'SQUID GAME', objective: this.P.hop ? 'Pule em um pé até a CINTURA · depois vá até a CABEÇA (E)' : this.P.x > HEAD - 30 ? 'PRESSIONE E PARA TOCAR A CABEÇA!' : 'Chegue à CABEÇA da lula ou derrube o defensor', hide: { player: true, feed: true, prize: true } });
      const bar = (x, f, align) => {
        const w = 360;
        R6.UI.panel(ctx, x, 16, w, 76, { fill: 'rgba(6,8,12,.75)', shadow: false });
        R6.Char.portrait(ctx, f.look, align === 'left' ? x + 36 : x + w - 36, 54, 60, f.hp < 30 ? 'pain' : 'determined', this.t, false);
        const bx = align === 'left' ? x + 74 : x + 14;
        R6.UI.text(ctx, f.name, align === 'left' ? bx : x + w - 74, 34, { size: 15, weight: 800, align: align === 'left' ? 'left' : 'right', color: '#fff' });
        R6.UI.bar(ctx, bx, 44, 272, 12, f.hp / 100, { color: f.hp < 30 ? '#ff3b5c' : '#e8336d' });
        R6.UI.bar(ctx, bx, 62, 272, 6, f.st / 100, { color: '#f2c14e' });
        R6.UI.bar(ctx, bx, 74, 272, 5, f.guard / 100, { color: '#9fd4ff' });
      };
      bar(16, this.P, 'left'); bar(R6.W - 376, this.O, 'right');
    }
  }

  R6.SquidFinal = SquidFinal;
  R6.registerGame('squidfinal', { name: 'Squid Game (Final T1)', season: 1, icon: 'triangle', desc: 'A luta final na chuva.', create: o => new SquidFinal(o) });
})();
