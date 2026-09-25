/* ROUND 6 — skysquid.js : Sky Squid Game (Season 3 finale) — three sky towers (SQUARE, TRIANGLE, CIRCLE), per-round
   elimination quotas, the START BUTTON from tower 2 on, push/punch/grab-throw/dodge/block with knockback %, wind gusts,
   alliances & betrayals, bridges between towers, final battle and the final choice. Variant: endless */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const TOWERS = [
    { name: 'QUADRADO', shape: 'square', x: 700, top: 560, hw: 330, col: '#e8336d' },
    { name: 'TRIÂNGULO', shape: 'triangle', x: 1850, top: 500, hw: 260, col: '#f2c14e' },
    { name: 'CÍRCULO', shape: 'circle', x: 2900, top: 440, hw: 200, col: '#2ec4b6' },
  ];

  class Brawler {
    constructor(o) { Object.assign(this, { x: o.x, y: 0, vx: 0, vy: 0, dir: o.dir || 1, look: o.look, p: o.p || null, isPlayer: !!o.isPlayer, dmg: 0, st: 100, state: 'idle', t: 0, animT: Math.random() * 2, anim: 'idle', inv: 0, cd: 0, falling: false, fallT: 0, out: false, ally: false, target: null, think: 0, tower: 0, name: o.name || '' }); }
    get grounded() { return this.y >= 0 && !this.falling; }
    set(s, a) { this.state = s; this.t = 0; if (a) { this.anim = a; this.animT = 0; } }
    canAct() { return this.state === 'idle' || this.state === 'walk' || (this.state === 'attack' && this.t > this.atk.dur * 0.75); }
  }
  const ATK = {
    punch: { dur: 0.3, act: [0.08, 0.17], range: 56, dmg: 7, kb: 150, st: 6, anim: 'punch' },
    push: { dur: 0.45, act: [0.12, 0.25], range: 64, dmg: 10, kb: 330, st: 16, anim: 'push' },
    kick: { dur: 0.5, act: [0.12, 0.26], range: 74, dmg: 12, kb: 280, st: 14, anim: 'kick' },
  };

  class SkySquid extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'skysquid'; this.name = 'skysquid';
      this.endless = opts.variant === 'endless';
      this.cam = new R6.Camera({ bounds: { x: 0, y: -300, w: 3500, h: 1500 } }); this.cam.set(TOWERS[0].x, 380, 0.85);
      this.tower = 0; this.stage = 'fight'; this.roundT = 0; this.running = false; this.buttonPressed = false; this.quota = 0; this.elimRound = 0; this.bridge = 0;
      this.wind = 0; this.windT = 6; this.clouds = Array.from({ length: 22 }, () => ({ x: Math.random() * 3600, y: 700 + Math.random() * 500, s: U.rand(0.6, 1.6), v: U.rand(8, 30) }));
      this.birds = Array.from({ length: 5 }, () => ({ x: Math.random() * 3400, y: U.rand(100, 300), v: U.rand(30, 60) }));
      this.wave = 0; this.kills = 0;
      this.build();
    }
    rules() {
      return {
        title: this.endless ? 'SKY SQUID ENDLESS' : 'SKY SQUID GAME', icon: 'triangle', sub: this.endless ? 'ONDAS SEM FIM NO TOPO DA TORRE' : 'O ÚLTIMO JOGO · TRÊS TORRES NO CÉU',
        lines: this.endless ? ['Derrube as ondas de adversários da torre.', 'Quanto mais dano, mais longe eles voam.'] : [
          'Em cada torre há uma COTA: pelo menos N jogadores precisam cair antes do tempo acabar.', 'Se a cota não for cumprida, TODOS são eliminados.',
          'Da segunda torre em diante, alguém precisa apertar o BOTÃO para começar a rodada (E perto dele).', 'J soco · K empurrão · L agarrar e arremessar · SHIFT esquiva · I bloquear · W pular',
          'Q perto de alguém: propor aliança. Aliados não te atacam… até o tempo ficar curto.'],
        keys: [['A D', 'mover'], ['J K L', 'atacar'], ['SHIFT', 'esquiva'], ['I', 'bloquear'], ['Q', 'aliança'], ['E', 'botão']],
      };
    }
    build() {
      const S = R6.State; const look = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 }); const T0 = TOWERS[0];
      this.pl = new Brawler({ x: T0.x - 60, look, isPlayer: true, p: S.s ? S.player : null, name: 'VOCÊ' });
      let bots;
      if (this.endless) bots = [];
      else if (this.campaign && S.s) bots = S.aliveBots();
      else bots = Array.from({ length: 11 }, (_, i) => { const tr = { str: Math.random(), spd: Math.random(), intel: Math.random(), courage: Math.random(), fear: Math.random(), betray: Math.random(), kindness: Math.random() }; return { num: 30 + i * 37, look: R6.Char.makeLook({ num: 30 + i * 37 }), tr, rel: U.randi(-30, 50), fake: true, alive: true }; });
      this.fighters = [this.pl];
      bots.forEach((p, i) => { const b = new Brawler({ x: T0.x - T0.hw + 40 + (i + 1) * ((T0.hw * 2 - 80) / (bots.length + 1)), look: p.look, p, dir: Math.random() < 0.5 ? 1 : -1, name: p.key ? p.name : '#' + U.pad(p.num) }); b.ally = p.rel >= 50; b.aggr = 0.3 + p.tr.courage * 0.4 + (p.tr.betray || 0) * 0.3; this.fighters.push(b); });
      if (this.endless) this.spawnWave();
      this.setQuota();
    }
    spawnWave() {
      this.wave++; const n = 2 + this.wave; const T = TOWERS[0];
      for (let i = 0; i < n; i++) { const tr = { str: U.rand(0.3, 0.6) + this.wave * 0.04, spd: Math.random(), intel: Math.random(), courage: 0.8, fear: 0.2, betray: 0.9, kindness: 0.1 }; const b = new Brawler({ x: T.x + (i % 2 ? 1 : -1) * U.rand(120, T.hw - 30), look: R6.Char.makeLook({ num: 100 + this.wave * 10 + i }), p: { num: 100 + i, tr, fake: true, rel: -50 }, name: 'ONDA ' + this.wave }); b.y = -400 - i * 60; b.vy = 0; b.aggr = 0.8; this.fighters.push(b); }
      R6.Banner.show('ONDA ' + this.wave, n + ' adversários', { dur: 1.8 });
    }
    alive() { return this.fighters.filter(f => !f.out); }
    setQuota() {
      const n = this.alive().length;
      if (this.endless) { this.quota = 999; this.roundTime = 999; return; }
      if (this.tower === 2) { this.quota = n - 1; this.roundTime = R6.Save.D(150, 130, 110); }
      else { this.quota = Math.max(1, Math.round(n * (this.tower === 0 ? 0.3 : 0.4))); if (n - this.quota < 3) this.quota = Math.max(1, n - 3); this.roundTime = R6.Save.D(75, 65, 55); }
      this.elimRound = 0; this.roundT = this.roundTime; this.running = this.tower === 0; this.buttonPressed = this.tower === 0; this.buttonWait = 45;
    }
    begin() {
      R6.Music.play('action'); R6.Music.setIntensity(0.5); R6.Audio.loop('wind', 0.5);
      if (!this.endless) R6.Dialog.announce('Torre do ' + TOWERS[0].name + '. Pelo menos ' + this.quota + ' jogadores precisam cair em ' + this.roundTime + ' segundos. Caso contrário, todos serão eliminados.', null, 4);
    }
    focus() { const s = this.cam.toScreen(this.pl.x, TOWERS[this.tower].top); return { x: s.x, y: s.y, look: this.pl.look, scale: 1.2 * this.cam.zoom, facing: 1 }; }
    T() { return TOWERS[this.tower]; }
    // ------------------------------------------------ combat
    attack(f, key) {
      const a = ATK[key]; if (f.st < a.st * 0.5 || !f.canAct()) return;
      f.atk = Object.assign({ hit: false, key }, a); f.set('attack', a.anim); f.st -= a.st; f.vx += f.dir * 50; R6.Audio.sfx('punchAir', { vol: 0.4 });
    }
    resolve(att) {
      if (att.state !== 'attack' || att.atk.hit) return; const a = att.atk; if (att.t < a.act[0] || att.t > a.act[1]) return;
      for (const d of this.fighters) {
        if (d === att || d.out || d.falling) continue;
        const dx = (d.x - att.x) * att.dir; if (dx < 0 || dx > a.range || Math.abs(d.y - att.y) > 60) continue;
        a.hit = true;
        if (d.inv > 0) continue;
        if (d.state === 'block' && d.dir === -att.dir) { d.vx += att.dir * a.kb * 0.2; d.dmg += a.dmg * 0.2; R6.Audio.sfx('block'); continue; }
        d.dmg += a.dmg; const kb = a.kb * (1 + d.dmg / 90);
        d.vx += att.dir * kb; d.vy = Math.max(d.vy, 120 + kb * 0.25); d.y = Math.max(d.y, 1); d.set('hit', 'stagger');
        R6.Audio.sfx(a.dmg > 9 ? 'hitHeavy' : 'hit'); this.fx.emit('hit', d.x, this.T().top - 80, 6); if (d.isPlayer || att.isPlayer) this.cam.shake(5, 0.2);
        this.provoke(d, att);
        break;
      }
    }
    grab(att) {
      if (!att.canAct() || att.st < 20) return; att.st -= 20; att.set('grab', 'grab'); R6.Audio.sfx('grab');
      const d = this.fighters.find(o => o !== att && !o.out && !o.falling && Math.abs(o.x - att.x) < 50 && o.inv <= 0 && o.state !== 'dodge');
      if (!d) return;
      // throw toward the nearest edge
      const T = this.T(); const toEdge = d.x < T.x ? -1 : 1;
      d.dmg += 14; const kb = 360 * (1 + d.dmg / 90); d.vx = toEdge * kb; d.vy = 380; d.y = 1; d.set('hit', 'flail'); att.dir = toEdge;
      R6.Audio.sfx('whoosh'); R6.Engine.slowmo(0.4, 0.4); this.cam.shake(8, 0.3); this.provoke(d, att);
    }
    provoke(victim, att) {
      if (victim.isPlayer || !victim.p) return;
      victim.target = att; // revenge
      if (att.isPlayer && !victim.p.fake) { R6.State.addRel(victim.p, -8, 'fought', { silent: true }); if (victim.ally) { victim.ally = false; R6.Toast.show(victim.name + ' não confia mais em você!', { color: '#ff5a6a' }); } }
    }
    // ------------------------------------------------ AI
    ai(b, dt) {
      if (!b.canAct() && b.state !== 'block') return;
      b.think -= dt; if (b.think > 0) return; b.think = U.rand(0.18, 0.45);
      const T = this.T(); const tr = b.p.tr;
      if (!this.running && !this.endless) {
        // before the button: tension, idling, some press it
        if (this.tower > 0 && !this.buttonPressed && b.aggr > 0.6 && Math.random() < 0.08) { const bx = T.x; b.goal = bx; }
        if (b.goal != null) { b.vx = Math.sign(b.goal - b.x) * 120; b.dir = Math.sign(b.vx) || b.dir; b.set('walk', 'walk'); if (Math.abs(b.goal - b.x) < 20) { b.goal = null; this.pressButton(b); } }
        else { b.vx = 0; b.set('idle', 'idle'); }
        return;
      }
      const left = this.roundT; const behind = this.quota - this.elimRound;
      const desperate = !this.endless && left < this.roundTime * 0.35 && behind > 0;
      // alliance checks / betrayal
      if (b.ally && desperate && (tr.betray || 0) > 0.55 && Math.random() < 0.15 && !b.betrayed) { b.ally = false; b.betrayed = true; b.target = this.pl; R6.Toast.show(b.name + ' está se voltando contra você!', { color: '#ff3b5c', icon: 'x' }); R6.Dialog.toast(b.p, U.pick(['Desculpa. É você ou eu.', 'Nada pessoal.', 'Não dá mais pra dividir.']), 2); }
      // choose target
      if (!b.target || b.target.out || b.target.falling || Math.random() < 0.1) {
        const cands = this.fighters.filter(o => o !== b && !o.out && !o.falling && !(b.ally && o.isPlayer) && !(o.ally && this.pl.ally === false && false));
        let best = null, bv = -1e9;
        for (const o of cands) {
          const d = Math.abs(o.x - b.x); const edge = T.hw - Math.abs(o.x - T.x);
          let v = -d * 0.01 - edge * 0.01 + o.dmg * 0.02 + (o.isPlayer ? (b.p.rel < -20 ? 2 : 0.3) : 0) - (o.ally && b.ally ? 3 : 0);
          if (b.ally && o.target === this.pl) v += 2; // defend the player
          if (b.p.friends && o.p && b.p.friends.includes(o.p.id)) v -= 3;
          if (v > bv) { bv = v; best = o; }
        }
        b.target = best;
      }
      const o = b.target; if (!o) { b.vx = 0; return; }
      const dx = o.x - b.x; b.dir = Math.sign(dx) || b.dir; const d = Math.abs(dx);
      // avoid edges
      const myEdge = T.hw - Math.abs(b.x - T.x);
      if (myEdge < 40) { b.vx = Math.sign(T.x - b.x) * 150; b.set('walk', 'walk'); return; }
      if (d > 60) { b.vx = b.dir * (110 + tr.spd * 60); b.set('walk', 'walk'); return; }
      b.vx *= 0.3;
      const r = Math.random();
      if (o.state === 'attack' && r < (tr.intel || 0.5) * 0.4) { b.set('block', 'block'); b.blockT = 0.4; return; }
      if (r < 0.2 && b.st > 25) { this.grab(b); return; }
      if (r < 0.5) this.attack(b, 'push'); else if (r < 0.75) this.attack(b, 'punch'); else if (r < 0.9) this.attack(b, 'kick');
      else if (b.st > 20) { b.set('dodge', 'dodge'); b.vx = -b.dir * 240; b.inv = 0.3; b.st -= 15; }
    }
    pressButton(who) {
      if (this.buttonPressed) return; this.buttonPressed = true; this.running = true; this.roundT = this.roundTime;
      R6.Audio.sfx('buzzer'); R6.Audio.sfx('stamp'); this.cam.shake(6, 0.3);
      R6.Dialog.announce((who.isPlayer ? 'Você' : who.name) + ' apertou o botão. A rodada começou: ' + this.quota + ' precisam cair.', null, 2.6);
      if (who.isPlayer && this.campaign) R6.State.decide('sky_button_' + this.tower, 'pressed', '');
    }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.fx.update(dt);
      for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 3700) c.x = -300; }
      for (const b of this.birds) { b.x += b.v * dt; if (b.x > 3600) b.x = -100; }
      if (this.updateResult(dt)) { this.physAll(dt); this.camUpd(dt); return; }
      if (this.updateRules(dt)) { this.camUpd(dt); return; }
      if (this.choice || (R6.Dialog.active && R6.Dialog.cur && R6.Dialog.cur.choices)) { this.camUpd(dt); return; }
      if (this.stage === 'bridge') { this.updBridge(dt); this.physAll(dt); this.camUpd(dt); return; }
      // wind
      this.windT -= dt; if (this.windT <= 0) { this.windT = U.rand(5, 10); this.wind = U.rand(-1, 1) * R6.Save.D(90, 130, 170); R6.Audio.sfx('wind'); R6.Toast.show('RAJADA DE VENTO ' + (this.wind > 0 ? '→' : '←'), { color: '#9fd4ff' }); } else this.wind *= Math.exp(-dt * 0.7);
      // round timer
      if (this.running && !this.endless) { this.roundT -= dt; if (this.roundT <= 0) return this.quotaFail(); }
      else if (!this.running && this.tower > 0) { this.buttonWait -= dt; if (this.buttonWait <= 0) { R6.Dialog.announce('Ninguém apertou o botão. O tempo começa agora.', null, 2); this.pressButton({ name: 'O sistema' }); } }
      this.updPlayer(dt);
      for (const b of this.fighters) if (!b.isPlayer && !b.out && !b.falling) this.ai(b, dt);
      for (const f of this.fighters) this.resolve(f);
      this.physAll(dt);
      R6.Music.setIntensity(this.running ? U.clamp(1 - this.roundT / this.roundTime + 0.5, 0.5, 1) : 0.4);
      this.checkFinalTwo();
      this.camUpd(dt);
    }
    updPlayer(dt) {
      const p = this.pl; if (p.out || p.falling) return; const I = R6.Input;
      const ax = (I.act('right') ? 1 : 0) - (I.act('left') ? 1 : 0);
      if (p.canAct() || p.state === 'block') {
        if (I.act('block') && p.grounded) { if (p.state !== 'block') p.set('block', 'block'); }
        else if (p.state === 'block') p.set('idle', 'idle');
        if (p.state !== 'block') {
          if (ax) { p.vx = ax * (I.act('run') ? 210 : 160); p.dir = ax; if (p.state !== 'walk' && p.grounded) p.set('walk', 'walk'); } else if (p.state === 'walk') p.set('idle', 'idle');
          if (I.pressed('KeyW') && p.grounded) { p.vy = 520; p.y = 1; p.set('air', 'jump'); R6.Audio.sfx('jump', { vol: 0.4 }); }
          if (I.actP('punch')) this.attack(p, 'punch');
          if (I.actP('kick')) this.attack(p, 'push');
          if (I.actP('grab')) this.grab(p);
          if (I.actP('dodge') && p.st > 15 && p.grounded) { p.set('dodge', 'dodge'); p.vx = (ax || -p.dir) * 300; p.inv = 0.35; p.st -= 15; R6.Audio.sfx('whoosh', { vol: 0.4 }); }
        }
      }
      if (I.actP('interact')) {
        const T = this.T(); if (this.tower > 0 && !this.buttonPressed && Math.abs(p.x - T.x) < 50) this.pressButton(p);
      }
      if (I.actP('alt')) {
        const o = this.fighters.find(f => !f.isPlayer && !f.out && !f.falling && Math.abs(f.x - p.x) < 90);
        if (o && o.p) {
          const acc = o.p.fake ? Math.random() < 0.5 : o.p.rel > 10 || (o.p.tr.fear > 0.6 && Math.random() < 0.6) || o.p.tr.kindness > 0.7;
          if (acc && !o.betrayed) { o.ally = true; o.target = null; R6.Dialog.toast(o.p, U.pick(['Tá. Juntos até o fim desta torre.', 'Combinado. Eu cubro suas costas.', 'Aliança. Por enquanto.']), 2); if (!o.p.fake) R6.State.addRel(o.p, 5, 'allied', { silent: true }); }
          else R6.Dialog.toast(o.p, U.pick(['Nem pensar.', 'Aqui em cima não existe aliado.', 'Você vai me empurrar na primeira chance.']), 2);
        }
      }
    }
    physAll(dt) {
      const T = this.T();
      for (const f of this.fighters) {
        if (f.out) continue;
        f.t += dt; f.animT += dt; if (f.inv > 0) f.inv -= dt;
        f.st = Math.min(100, f.st + dt * 12);
        if (f.state === 'block') { f.blockT = (f.blockT || 0.4) - dt; if (!f.isPlayer && f.blockT <= 0) f.set('idle', 'idle'); }
        if (f.state === 'attack' && f.t > f.atk.dur) f.set('idle', 'idle');
        if ((f.state === 'hit' && f.t > 0.4) || (f.state === 'dodge' && f.t > 0.4) || (f.state === 'grab' && f.t > 0.4) || (f.state === 'air' && f.grounded)) f.set('idle', 'idle');
        // horizontal
        if (f.state === 'walk' || f.state === 'air') { } else f.vx *= Math.exp(-(f.state === 'hit' ? 2.2 : 8) * dt);
        f.vx += this.wind * dt * (f.grounded ? 0.5 : 1.3) * (f.state === 'block' ? 0.3 : 1);
        if (!f.isPlayer && f.state === 'walk' && Math.abs(f.vx) < 5) f.set('idle', 'idle');
        f.x += f.vx * dt;
        // vertical (y = height above top; positive up)
        const NB = TOWERS[Math.min(2, this.tower + 1)];
        const onTop = Math.abs(f.x - T.x) <= T.hw || (this.stage === 'bridge' && this.bridge >= 1 && f.x > T.x && f.x <= NB.x + NB.hw);
        if (f.falling) { f.fallT += dt; f.vy -= 1300 * dt; f.y += f.vy * dt; f.anim = 'flail'; if (f.y < -900) this.eliminate(f); continue; }
        if (f.y > 0 || f.vy > 0) { f.vy -= 1500 * dt; f.y += f.vy * dt; if (f.y <= 0) { if (onTop) { f.y = 0; f.vy = 0; } } }
        if (f.y <= 0 && !onTop) { f.falling = true; f.fallT = 0; f.vy = 0; R6.Audio.sfx('scream', { vol: f.isPlayer ? 1 : 0.6 }); R6.Audio.sfx('fall', { vol: 0.5 }); R6.Engine.slowmo(0.35, 1); if (f.isPlayer) this.cam.shake(6, 0.5); }
      }
      // body separation
      const al = this.fighters.filter(f => !f.out && !f.falling);
      for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) { const a = al[i], b = al[j]; const d = b.x - a.x; if (Math.abs(d) < 26 && Math.abs(a.y - b.y) < 40 && a.state !== 'dodge' && b.state !== 'dodge') { const push = (26 - Math.abs(d)) / 2 * Math.sign(d || 1); a.x -= push; b.x += push; } }
    }
    eliminate(f) {
      if (f.out) return; f.out = true;
      if (f.isPlayer) { if (this.campaign) R6.State.eliminate(R6.State.player, 'skysquid'); this.score = this.kills; this.lose({ reason: 'Você caiu da torre' }); return; }
      this.elimRound++; this.kills++;
      if (f.p && !f.p.fake) R6.Elim.kill(f.p, { cause: 'skysquid', sfx: false, host: this });
      R6.Audio.sfx('thud', { vol: 0.2 });
      if (this.endless) { this.score = this.kills; this.chips = this.kills * 8; if (this.alive().length === 1) R6.Engine.after(1.2, () => { if (!this.result) this.spawnWave(); }); return; }
      if (this.running && this.elimRound >= this.quota) this.roundDone();
    }
    roundDone() {
      this.running = false;
      if (this.tower === 2) { // the last tower: last one standing
        if (this.alive().length === 1) this.victory();
        return;
      }
      R6.Audio.sfx('pass'); R6.Banner.show('COTA CUMPRIDA', 'A ponte para a torre do ' + TOWERS[this.tower + 1].name + ' está se estendendo', { color: '#2ec4b6', dur: 3 });
      this.stage = 'bridge'; this.bridge = 0; this.bridgeT = 0;
      for (const f of this.fighters) if (!f.out && !f.isPlayer) { f.target = null; f.set('idle', 'idle'); }
    }
    updBridge(dt) {
      this.bridge = Math.min(1, this.bridge + dt * 0.5); this.bridgeT += dt;
      const A = TOWERS[this.tower], B = TOWERS[this.tower + 1];
      if (this.bridge >= 1) {
        // everyone walks across
        let allOver = true;
        for (const f of this.fighters) { if (f.out || f.falling) continue; const tx = B.x - B.hw + 40 + (this.fighters.indexOf(f) % 8) * ((B.hw * 2 - 80) / 8); if (Math.abs(f.x - tx) > 6) { f.vx = Math.sign(tx - f.x) * 160; f.dir = Math.sign(f.vx); f.anim = 'walk'; allOver = false; f.bridgeWalk = true; } else { f.vx = 0; f.anim = 'idle'; } f.x += 0; }
        if (allOver && this.bridgeT > 2.5) {
          this.tower++; this.stage = 'fight'; for (const f of this.fighters) { f.bridgeWalk = false; f.y = 0; f.vy = 0; f.dmg = Math.max(0, f.dmg - 30); }
          this.setQuota();
          R6.Dialog.announce(this.tower === 2 ? 'Torre do CÍRCULO. Apenas um sairá daqui. Apertem o botão quando estiverem prontos.' : 'Torre do ' + this.T().name + '. ' + this.quota + ' precisam cair. Apertem o botão para começar.', null, 3.5);
        }
      }
    }
    physBridge(f) { return true; }
    quotaFail() {
      if (this.result) return;
      R6.Audio.sfx('buzzer'); R6.Dialog.announce('A cota não foi cumprida. Todos os jogadores desta torre estão eliminados.', null, 2.4);
      for (const f of this.fighters) if (!f.out && !f.isPlayer && f.p && !f.p.fake) R6.Elim.kill(f.p, { silent: true });
      if (this.campaign) R6.State.eliminate(R6.State.player, 'skysquid');
      this.lose({ reason: 'A cota não foi cumprida' });
    }
    victory() {
      if (this.result) return;
      this.chips = 250; this.win({ title: 'WINNER', sub: this.campaign ? 'O ÚLTIMO NO CÉU · ' + U.money(R6.State.s.prize) : 'O ÚLTIMO NO CÉU', wait: 4 });
    }
    // final two: player + a loyal ally → the final choice
    checkFinalTwo() {
      if (this.tower !== 2 || this.choice || this.result || !this.running) return;
      const al = this.alive(); if (al.length !== 2 || !al.includes(this.pl)) return;
      const o = al.find(f => !f.isPlayer); if (!o.p || o.p.fake || o.p.rel < 50 || o.betrayed) return;
      this.choice = true; this.running = false; o.target = null; o.vx = 0; o.set('idle', 'idle');
      R6.Music.stop(2); R6.Engine.slowmo(0.5, 1);
      R6.Dialog.show([
        { who: o.p, text: 'Só sobramos nós dois. Você sabe como isso termina.', expr: 'sad' },
        { who: o.p, text: 'Lá fora… alguém tem que contar o que aconteceu aqui. Tem que ser você.', expr: 'sad', choices: [
          { t: '"Não. Nós dois saímos daqui. Vamos quebrar essa regra."', cb: () => this.sacrifice(o) },
          { t: 'Lutar — só pode sobrar um.', cb: () => { R6.State.decide('sky_final', 'fight', 'Lutou contra o aliado'); R6.State.flag('betrayed_ally_final', true); R6.State.karma(-4); this.choice = false; this.running = true; o.target = this.pl; o.ally = false; o.betrayed = true; R6.Music.play('action'); } },
        ] },
      ]);
    }
    sacrifice(o) {
      R6.State.decide('sky_final', 'sacrifice', 'O aliado se sacrificou'); R6.State.flag('ally_sacrifice', o.p.key || o.p.num); R6.State.karma(3);
      R6.Dialog.show([
        { who: o.p, text: 'Você é teimoso. Por isso mesmo tem que ser você.', expr: 'happy' },
        { mode: 'narr', text: 'Antes que você consiga segurar a mão estendida, ' + o.name + ' dá um passo para trás. Para o céu.', onDone: () => { o.vx = -o.dir * 60; o.x = this.T().x + (o.x < this.T().x ? -1 : 1) * (this.T().hw + 12); o.falling = true; R6.Engine.slowmo(0.25, 2.5); R6.Audio.sfx('wind'); } },
      ]);
      R6.Engine.after(3.2, () => { this.choice = false; this.victory(); });
    }
    camUpd(dt) {
      const T = this.T(); const p = this.pl;
      let cx, cy, z;
      if (this.stage === 'bridge') { const B = TOWERS[Math.min(2, this.tower + 1)]; cx = (T.x + B.x) / 2; cy = (T.top + B.top) / 2 - 80; z = 0.55; }
      else { const al = this.alive().filter(f => !f.falling); const xs = al.map(f => f.x); const mn = Math.min(...xs, p.x), mx = Math.max(...xs, p.x); cx = U.lerp((mn + mx) / 2, p.x, 0.4); z = U.clamp(1100 / Math.max(500, mx - mn + 400), 0.6, 1.25); cy = T.top - 120 - (p.falling ? p.y * 0.5 : 0); }
      this.cam.follow(cx, cy, z); this.cam.update(dt);
    }
    debugWin() { this.phase = 'play'; if (this.campaign) for (const f of this.fighters) if (!f.isPlayer && !f.out && f.p && !f.p.fake) R6.Elim.kill(f.p, { silent: true }); this.victory(); }
    // ------------------------------------------------ render
    render(ctx) {
      const cam = this.cam, t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#3d6ea8'); g.addColorStop(0.55, '#9cc4e8'); g.addColorStop(1, '#e8f0f6'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      // far horizon (parallax)
      ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 8; i++) { const x = ((i * 260 - cam.x * 0.1) % 1600 + 1600) % 1600 - 160; ctx.beginPath(); ctx.ellipse(x, 520 + (i % 3) * 30, 150, 26, 0, 0, TAU); ctx.fill(); }
      cam.begin(ctx);
      // clouds below
      for (const c of this.clouds) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 140 * c.s, 34 * c.s, 0, 0, TAU); ctx.ellipse(c.x + 60 * c.s, c.y - 14 * c.s, 90 * c.s, 30 * c.s, 0, 0, TAU); ctx.fill(); }
      for (const b of this.birds) { ctx.strokeStyle = '#334'; ctx.lineWidth = 2; ctx.beginPath(); const f = Math.sin(t * 8 + b.x) * 5; ctx.moveTo(b.x - 10, b.y - f); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + 10, b.y - f); ctx.stroke(); }
      // towers
      TOWERS.forEach((T, i) => {
        const tg = ctx.createLinearGradient(T.x - T.hw, 0, T.x + T.hw, 0); tg.addColorStop(0, '#5a6270'); tg.addColorStop(0.5, '#8a93a0'); tg.addColorStop(1, '#4a505c');
        ctx.fillStyle = tg; ctx.fillRect(T.x - T.hw * 0.55, T.top, T.hw * 1.1, 1400);
        ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let y = T.top + 60; y < T.top + 1400; y += 80) ctx.fillRect(T.x - T.hw * 0.55, y, T.hw * 1.1, 6);
        // top platform
        ctx.fillStyle = '#d9d4c8'; ctx.fillRect(T.x - T.hw, T.top - 6, T.hw * 2, 22); ctx.fillStyle = '#b3ada0'; ctx.fillRect(T.x - T.hw, T.top + 16, T.hw * 2, 10);
        ctx.fillStyle = T.col; ctx.fillRect(T.x - T.hw, T.top - 8, T.hw * 2, 4);
        R6.UI.shapeIcon(ctx, T.shape, T.x, T.top + 120, 50, 'rgba(255,255,255,.35)', 8);
        R6.UI.text(ctx, T.name, T.x, T.top + 220, { size: 36, fam: 'title', align: 'center', color: 'rgba(255,255,255,.4)' });
        if (i > 0) R6.Props.button(ctx, T.x, T.top - 6, 1.3, this.tower === i ? this.buttonPressed : i < this.tower, t);
      });
      // bridge
      if (this.stage === 'bridge' || this.bridge > 0) { const A = TOWERS[Math.min(this.tower, 1)], B = TOWERS[Math.min(this.tower + 1, 2)]; if (this.stage === 'bridge') { const x0 = A.x + A.hw, x1 = B.x - B.hw; const len = (x1 - x0) * this.bridge; ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0, A.top); ctx.lineTo(x0 + len, A.top + (B.top - A.top) * this.bridge); ctx.stroke(); } }
      // fighters
      const T = this.T();
      for (const f of this.fighters) {
        if (f.out && !f.falling) continue; if (f.y < -900) continue;
        const baseTop = f.bridgeWalk ? this.bridgeY(f.x) : T.top;
        const y = baseTop - f.y;
        let anim = f.anim; if (f.falling) anim = 'flail';
        R6.Char.draw(ctx, f.look, f.x, y, { view: 'side', dir: f.dir, anim, t: f.animT, scale: 1.15, highlight: f.isPlayer ? 'rgba(255,255,255,.6)' : f.ally ? 'rgba(46,196,182,.6)' : null, shadow: !f.falling && f.y < 5, zoom: cam.zoom });
        if (!f.falling && !f.out && f.dmg > 0) R6.UI.text(ctx, Math.round(f.dmg) + '%', f.x, y - 150, { size: 14, align: 'center', weight: 800, color: f.dmg > 80 ? '#ff3b5c' : f.dmg > 40 ? '#f2c14e' : '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 3 });
        if (f.ally && !f.falling) R6.UI.shapeIcon(ctx, 'circle', f.x, y - 168, 5, '#2ec4b6', 2, true);
      }
      if (this.tower > 0 && !this.buttonPressed && Math.abs(this.pl.x - T.x) < 60) { ctx.save(); ctx.translate(T.x - 50, T.top - 80); R6.UI.keyHint(ctx, 'E', 'APERTAR BOTÃO', 0, 0); ctx.restore(); }
      this.fx.draw(ctx);
      cam.end(ctx);
      R6.UI.vignette(ctx, 0.35);
      if (this.phase === 'play') {
        const txt = this.endless ? 'SKY SQUID ENDLESS · ONDA ' + this.wave : 'SKY SQUID GAME · TORRE DO ' + T.name;
        R6.HUD.draw(ctx, { game: txt, timer: this.running && !this.endless ? Math.max(0, this.roundT) : null, sub: this.endless ? 'DERRUBADOS: ' + this.kills : this.stage === 'bridge' ? 'Atravessando…' : this.running ? 'COTA: ' + this.elimRound + ' / ' + this.quota + ' CAÍRAM' : 'AGUARDANDO O BOTÃO (' + Math.ceil(this.buttonWait) + 's)', subColor: this.running && this.elimRound < this.quota ? '#ff7a8a' : '#2ec4b6', objective: this.tower === 2 ? 'Seja o último na torre do Círculo' : 'Garanta que ' + this.quota + ' caiam — sem ser um deles', hide: this.campaign ? { feed: false } : { prize: true } });
        R6.UI.panel(ctx, 16, 96, 250, 50, { fill: 'rgba(6,8,12,.72)', shadow: false });
        R6.UI.text(ctx, 'DANO ' + Math.round(this.pl.dmg) + '%', 30, 118, { size: 16, weight: 800, color: this.pl.dmg > 60 ? '#ff3b5c' : '#fff' });
        R6.UI.bar(ctx, 130, 110, 120, 8, this.pl.st / 100, { color: '#f2c14e' });
        R6.UI.text(ctx, 'VIVOS NA TORRE: ' + this.alive().filter(f => !f.falling).length, 30, 138, { size: 13, weight: 700, color: '#bbb' });
      }
      this.drawRules(ctx);
    }
    bridgeY(x) { const A = TOWERS[this.tower], B = TOWERS[Math.min(2, this.tower + 1)]; if (x <= A.x + A.hw) return A.top; if (x >= B.x - B.hw) return B.top; const k = (x - (A.x + A.hw)) / ((B.x - B.hw) - (A.x + A.hw)); return U.lerp(A.top, B.top, k); }
  }

  R6.SkySquid = SkySquid;
  R6.registerGame('skysquid', { name: 'Sky Squid Game', season: 3, icon: 'triangle', desc: 'Três torres. Um sobrevivente.', create: o => new SkySquid(o) });
})();
