/* ROUND 6 — hub.js : the dormitory — explorable top-down hub with bunk towers, prize piggy bank, dining, bathroom, restricted area,
   guards & cameras; bot routines (sleep, eat, talk, argue, alliances, watch the prize), social interactions (talk, share, ally,
   persuade, provoke, steal, comfort), random events, meals, votes (O/X), night riot, and the procession to the next game */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU, T = R6.T;
  const TS = 32, MW = 64, MH = 44;

  // ------------------------------------------------ dorm map
  function buildDorm(season) {
    const map = new R6.TileMap(MW, MH, TS);
    map.fill(0, 0, MW - 1, MH - 1, T.WALL, 6);
    map.fill(2, 6, MW - 3, MH - 3, T.FLOOR, 0);                 // main hall
    map.fill(29, 1, 34, 5, T.FLOOR, 2);                          // stairs corridor (exit)
    map.fill(2, 35, 12, MH - 3, T.FLOOR, 1); map.fill(3, 34, 11, 34, T.WALL, 6); map.set(7, 34, T.FLOOR, 1); // bathroom
    map.fill(MW - 9, 6, MW - 3, 12, T.FLOOR, 3); map.fill(MW - 10, 6, MW - 10, 12, T.WALL, 6);              // restricted room
    const exitDoor = [map.addDoor(31, 5, { color: '#3a3f4a' }), map.addDoor(32, 5, { color: '#3a3f4a' })];
    const sealed = map.addDoor(MW - 10, 9, { locked: true, color: '#8a1f33', horiz: false });
    // bunk blocks (LOW tiles) 3x3
    const bunks = [];
    const cols = [4, 9, 14, 45, 50, 55], rows = [8, 14, 20, 26];
    for (const bx of cols) for (const by of rows) {
      if (bx >= 45 && by === 8) continue; // restricted room corner
      map.fill(bx, by, bx + 2, by + 1, T.LOW);
      for (let lv = 0; lv < 5; lv++) bunks.push({ bx, by, lv, x: (bx + 1.5) * TS + (lv - 2) * 10, y: (by + 2.6) * TS, taken: null });
    }
    // dining tables
    const tables = [];
    for (let i = 0; i < 3; i++) { const tx = 22 + i * 7, ty = 33; map.fill(tx, ty, tx + 4, ty, T.LOW); tables.push({ tx, ty, x: (tx + 2.5) * TS, y: ty * TS }); }
    map.buildFloor((c, x, y, ts, s, tx, ty, v) => {
      if (s === 1) { c.fillStyle = (tx + ty) % 2 ? '#dfe7ea' : '#cfd9dd'; c.fillRect(x, y, ts, ts); c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(x, y, ts, 1); c.fillRect(x, y, 1, ts); return; }
      if (s === 2) { c.fillStyle = ['#f4b6c8', '#a9d8e8', '#f7df8e', '#b8e0b0'][ty % 4]; c.fillRect(x, y, ts, ts); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x, y + ts - 6, ts, 3); return; }
      if (s === 3) { c.fillStyle = '#3a2a2e'; c.fillRect(x, y, ts, ts); return; }
      const base = season === 3 ? '#bdb8ae' : '#d8d4ca';
      c.fillStyle = (tx + ty) % 2 ? base : U.shade(base, -0.035); c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(x, y, ts, 1); c.fillRect(x, y, 1, ts);
      if (tx >= 20 && tx <= 43 && ty >= 16 && ty <= 28 && (tx + ty) % 7 === 0) { c.fillStyle = 'rgba(232,51,109,.06)'; c.fillRect(x, y, ts, ts); }
    });
    return { map, bunks, tables, exitDoor, sealed, pig: { x: 32 * TS, y: 21 * TS }, exitPos: { x: 32 * TS, y: 3 * TS }, bath: { x: 7 * TS, y: 38 * TS }, board: { x: 32 * TS, y: 12 * TS } };
  }
  R6.buildDorm = buildDorm;

  // ------------------------------------------------ phrase banks
  const SAY = {
    idle: ['Eu não durmo desde ontem.', 'Quanto tempo mais isso vai durar?', 'Minha filha faz aniversário amanhã…', 'Você viu os guardas? Nunca tiram a máscara.', 'Eu devo trezentos milhões. Não tenho para onde voltar.', 'Isso é real? Diz que isso não é real.', 'Alguém tem um cigarro?', 'Eu só quero ir pra casa.', 'Tem gente aqui que ia matar a própria mãe por esse dinheiro.', 'Fica perto de quem é forte.'],
    prize: ['Olha aquele porco… está enchendo.', 'Cada pessoa que cai vira cem milhões ali dentro.', 'Com esse dinheiro eu nunca mais trabalho.', 'É dinheiro manchado. Mas é dinheiro.'],
    fear: ['Eu vi o homem ao meu lado cair…', 'Minhas mãos não param de tremer.', 'Eu não vou sobreviver ao próximo.', 'Eles atiraram sem hesitar.'],
    ally: ['Estamos juntos nessa, né?', 'Eu confio em você. Não me decepciona.', 'Se precisar, é só chamar.'],
    enemy: ['Tô de olho em você.', 'Vai dormir de olho aberto hoje.', 'Não chega perto.'],
    night: ['Shhh… tem alguém acordado ali.', 'Dorme com os pés virados para a porta.', 'Hoje à noite vai ter confusão.'],
    O: ['Eu voto O. Não saio daqui sem dinheiro.', 'Lá fora eu já morri faz tempo.'],
    X: ['X. Ninguém precisa morrer por isso.', 'Vamos votar para sair enquanto dá.'],
  };
  function pickLine(hub, p) {
    const s = R6.State; let bank = SAY.idle;
    if (p.rel >= 45 && Math.random() < 0.5) bank = SAY.ally; else if (p.rel <= -35 && Math.random() < 0.6) bank = SAY.enemy;
    else if ((p.fear || 0) > 0.6 && Math.random() < 0.5) bank = SAY.fear; else if (Math.random() < 0.25) bank = SAY.prize;
    if (hub.night && Math.random() < 0.5) bank = SAY.night;
    if (p.mem.length && Math.random() < 0.3) { const m = p.mem[p.mem.length - 1]; const who = '#' + U.pad(s.s.player.num); const t = { saved: 'O ' + who + ' salvou minha vida.', helped: who + ' me ajudou. Não esqueço.', pushed: who + ' me empurrou. Eu vi.', stole: 'Alguém roubou minhas coisas… acho que foi o ' + who + '.', betrayed: 'Não confiem no ' + who + '.', shared: who + ' dividiu a comida comigo.', witness_help: 'Vi o ' + who + ' ajudando gente. Raro aqui.', witness_betray: 'O ' + who + ' é traiçoeiro.' }[m]; if (t) return t; }
    return U.pick(bank);
  }

  // ------------------------------------------------ hub scene
  class HubScene {
    constructor(cfg = {}) {
      this.cfg = cfg; this.name = 'hub:' + (cfg.id || 'dorm'); this.pausable = true;
      this.season = cfg.season || (R6.State.s ? R6.State.s.season : 1);
      const D = buildDorm(this.season); this.D = D; this.map = D.map;
      this.world = new R6.World({ map: this.map });
      this.cam = new R6.Camera({ bounds: { x: 0, y: -30, w: this.map.pw, h: this.map.ph + 30 }, minZoom: 0.5 });
      this.t = 0; this.night = !!cfg.night; this.lights = this.night ? 0.35 : 1; this.hp = 100;
      this.events = []; this.eventCd = U.rand(12, 20); this.eventsDone = 0; this.maxEvents = cfg.events != null ? cfg.events : 2;
      this.tasks = (cfg.tasks || []).map(t => Object.assign({ done: false }, t));
      this.runner = null; this.letterbox = 0; this.fx = this.world.fx; this.prompt = null; this.leaving = false;
      this.skippable = true; this.talked = new Set(); this.persuaded = new Set();
      this.spawn();
    }
    // ---------- spawning ----------
    spawn() {
      const S = R6.State, D = this.D;
      const myBunk = D.bunks.find(b => b.bx === 14 && b.by === 20 && b.lv === 2);
      myBunk.taken = 'player'; this.myBunk = myBunk;
      const look = S.s.player.look;
      const start = this.cfg.start || { x: myBunk.x, y: myBunk.y + 20 };
      this.pl = this.world.add(new R6.Actor({ p: S.player, look: Object.assign({}, look, { badge: S.flag('badge') || null }), x: start.x, y: start.y, isPlayer: true, speed: 95, runSpeed: 165, id: 'p' }));
      this.pl.canOpenDoors = true;
      // who is present: key chars + allies + random, capped
      const alive = S.aliveBots();
      const keys = alive.filter(p => p.key);
      const others = U.shuffle(alive.filter(p => !p.key)).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
      const cap = Math.min(alive.length, this.cfg.cap || 110);
      const present = keys.concat(others.slice(0, Math.max(0, cap - keys.length)));
      this.bots = [];
      const free = U.shuffle(D.bunks.filter(b => !b.taken));
      present.forEach((p, i) => {
        const bunk = free[i % free.length]; bunk.taken = p;
        let x = bunk.x + U.rand(-14, 14), y = bunk.y + U.rand(4, 30);
        if (p.key) { const near = D.bunks.filter(b => Math.abs(b.bx - myBunk.bx) <= 5 && Math.abs(b.by - myBunk.by) <= 6); const b2 = near[i % near.length]; x = b2.x + U.rand(-20, 20); y = b2.y + U.rand(10, 40); }
        const pos = this.map.nearestFree(x, y);
        const lk = Object.assign({}, p.look, { badge: p.badge || null });
        const a = this.world.add(new R6.Actor({ p, look: lk, x: pos.x, y: pos.y, speed: 60 + p.tr.spd * 30, runSpeed: 120 + p.tr.spd * 40, id: p.key ? 'k:' + p.key : 'b' + p.num }));
        a.bunk = bunk; a.canOpenDoors = false;
        if (!p.inv) p.inv = Math.random() < 0.35 ? [U.pick(['bread', 'egg', 'bread', 'lighter', 'spoon'].filter(k => R6.ITEMS[k]))].filter(Boolean) : [];
        a.ai = { act: null, t: U.rand(0, 6), cd: U.rand(1, 8), partner: null };
        a.brain = (b, dt) => this.botBrain(b, dt);
        this.bots.push(a);
      });
      // guards
      this.guards = [];
      const gl = [[29.5, 7.5, 'down'], [34.5, 7.5, 'down'], [MW - 11.5, 9.5, 'left']];
      gl.forEach(([gx, gy, d], i) => { const g = this.world.add(new R6.Actor({ look: R6.Char.makeLook({ outfit: 'guard', mask: ['circle', 'triangle', 'square'][i % 3], seed: 70 + i }), x: gx * TS, y: gy * TS, solid: true, pushable: false, mass: 99, id: 'g' + i })); g.dir = d; g.item = 'rifle'; g.kind = 'guard'; g.frozen = true; this.guards.push(g); });
      // world objects: bunks, tables, pig, cameras, board, items
      const O = this.world.objects;
      const blocks = new Map(); for (const b of D.bunks) blocks.set(b.bx + ',' + b.by, b);
      for (const b of blocks.values()) { const x = b.bx * TS, y = (b.by + 2) * TS; O.push({ x: x + 48, y, sy: y - 4, draw: (c) => R6.Props.bunk(c, x, y, 96, 30, 5, { ladder: true }) }); }
      for (const t of D.tables) O.push({ x: t.x, y: t.y, sy: t.y + 30, draw: (c) => { c.fillStyle = '#9aa0a6'; c.fillRect(t.tx * TS, t.ty * TS - 6, 160, 26); c.fillStyle = '#7d8388'; c.fillRect(t.tx * TS, t.ty * TS + 20, 160, 8); if (this.meal) for (let k = 0; k < 4; k++) R6.Props.tray(c, t.tx * TS + 22 + k * 38, t.ty * TS + 6, {}); } });
      O.push({ x: D.pig.x, y: D.pig.y, sy: 99999, draw: (c, t) => { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(D.pig.x, D.pig.y + 40, 70, 18, 0, 0, TAU); c.fill(); R6.Props.piggy(c, D.pig.x, D.pig.y - 150 + Math.sin(t * 0.8) * 3, 64, Math.min(1, S.s.prize / 45.6e9), t, { cable: 400 }); } });
      for (const [cx, cy, a] of [[3, 7, 0.6], [MW - 4, 7, 2.5], [3, 32, -0.6], [MW - 4, 32, 3.6]]) O.push({ x: cx * TS, y: cy * TS, sy: cy * TS - 30, draw: (c, t) => R6.Props.camera(c, cx * TS, cy * TS - 20, a + Math.sin(t * 0.4) * 0.5, { t }) });
      O.push({ x: 7 * TS, y: 36 * TS, sy: 36 * TS, draw: (c) => { R6.UI.text(c, 'BANHEIRO', 7 * TS + 16, 35 * TS - 4, { size: 14, align: 'center', color: '#445', weight: 800 }); } });
      O.push({ x: (MW - 10) * TS, y: 8 * TS, sy: 8 * TS, draw: (c) => { R6.UI.text(c, 'ÁREA RESTRITA', (MW - 10) * TS - 40, 8 * TS, { size: 12, align: 'center', color: '#a33', weight: 800 }); } });
      this.items = (this.cfg.items || []).map(it => Object.assign({ taken: false }, it));
      for (const it of this.items) O.push({ x: it.x, y: it.y, sy: it.y, draw: (c, t) => { if (it.taken) return; c.fillStyle = `rgba(242,193,78,${0.25 + Math.sin(t * 4) * 0.1})`; c.beginPath(); c.arc(it.x, it.y, 12, 0, TAU); c.fill(); c.fillStyle = '#f2c14e'; c.fillRect(it.x - 5, it.y - 3, 10, 6); } });
      if (this.cfg.vote) O.push({ x: D.board.x, y: D.board.y, sy: D.board.y, draw: (c) => this.drawBoard(c) });
      this.cam.set(this.pl.x, this.pl.y, 1.2);
    }
    // ---------- runner host API ----------
    getActor(id) {
      if (id === 'p' || id === 'player') return this.pl;
      if (typeof id === 'string' && id.startsWith('key:')) id = 'k:' + id.slice(4);
      return this.world.find(id);
    }
    spawn2(d) { const a = this.world.add(new R6.Actor({ id: d.spawn, look: d.look || (d.p && d.p.look), p: d.p, x: d.x, y: d.y })); a.dir = d.dir || 'down'; if (d.item) a.item = d.item; if (d.guard) { a.kind = 'guard'; a.item = 'rifle'; } return a; }
    despawn(id) { const a = this.world.find(id); if (a) this.world.remove(a); }
    eliminate(id, st) { const a = this.getActor(id); if (!a) return; a.kill({ back: st.back }); R6.Audio.sfx(st.sfx || 'gun'); if (a.p && a.p.alive && st.count !== false) R6.Elim.kill(a.p, { cause: st.cause || 'dorm', silent: true, sfx: false, host: this }); }
    run(steps, onEnd) {
      const host = { cam: this.cam, world: this.world, fx: this.world.fx, getActor: id => this.getActor(id), spawn: d => this.spawn2(d), despawn: id => this.despawn(id), eliminate: (id, st) => this.eliminate(id, st), letterbox: 1, get camTarget() { return null; }, set camTarget(v) { } };
      this.runner = new R6.Runner(host, steps, () => { this.runner = null; onEnd && onEnd(); });
    }
    get busy() { return !!this.runner || R6.Dialog.active; }
    // ---------- lifecycle ----------
    enter() {
      R6.Elim.reset();
      R6.Music.play(this.night ? 'dread' : this.cfg.music || 'dorm'); R6.Music.setIntensity(0.2);
      R6.Audio.loop('hum', 0.4); R6.Audio.loop('crowd', this.night ? 0.05 : 0.18);
      if (this.cfg.intro) this.run(this.cfg.intro(this), () => this.afterIntro());
      else this.afterIntro();
    }
    afterIntro() {
      if (this.cfg.vote) {
        if (this.cfg.askIntent) return this.askIntent();
        if (this.cfg.voteAfter) return this.beginPreVote();
        return this.startVote();
      }
      if (this.cfg.riot) return this.startRiot();
      if (this.cfg.meal) R6.Engine.after(2, () => this.startMeal());
      if (this.cfg.onStart) this.cfg.onStart(this);
    }
    exit() { }
    focus() { const s = this.cam.toScreen(this.pl.x, this.pl.y); return { x: s.x, y: s.y, look: this.pl.look, scale: 0.46 * this.cam.zoom, facing: 1 }; }
    // ---------- bot routine AI ----------
    botBrain(a, dt) {
      if (this.leaving) return;
      const ai = a.ai; ai.t += dt; ai.cd -= dt;
      if (this.riot) return this.riotBrain(a, dt);
      if (a.lie && ai.act !== 'sleep') a.lie = null;
      if (a.path) return;
      if (ai.cd > 0) {
        if (ai.act === 'talk' && ai.partner) { a.faceTo(ai.partner.x, ai.partner.y); if (Math.random() < dt * 0.35) a.say(pickLine(this, a.p), 2.4); }
        if (ai.act === 'argue' && ai.partner) { a.faceTo(ai.partner.x, ai.partner.y); a.forceAnim = 'argue'; if (Math.random() < dt * 0.5) a.say(U.pick(['Você acha que eu sou idiota?', 'Fala isso de novo!', 'Sai daqui!', 'Vai ver só no próximo jogo.']), 2); }
        if (ai.act === 'pig' && Math.random() < dt * 0.1) a.say(U.pick(SAY.prize), 2.4);
        return;
      }
      a.forceAnim = null; a.idleAnim = 'idle'; a.lie = null;
      const p = a.p; const r = Math.random();
      const nightK = this.night ? 0.7 : 0.15;
      if (this.meal && !ai.ate) { const tb = U.pick(this.D.tables); a.goTo(this.world, tb.x + U.rand(-70, 70), tb.y + U.rand(40, 60), false, () => { a.faceTo(tb.x, tb.y); a.idleAnim = 'eat'; ai.ate = true; }); ai.act = 'eat'; ai.cd = U.rand(8, 16); return; }
      if (r < nightK) { // sleep at own bunk
        a.goTo(this.world, a.bunk.x + U.rand(-10, 10), a.bunk.y - 6, false, () => { a.lie = { anim: 'sleep' }; });
        ai.act = 'sleep'; ai.cd = U.rand(15, 40); return;
      }
      if (r < nightK + 0.2 && p.friends.length) { // talk with a friend who is present
        const fr = this.bots.find(b => b !== a && !b.dead && p.friends.includes(b.p.id) && !b.ai.partner);
        if (fr) { ai.partner = fr; fr.ai.partner = a; ai.act = fr.ai.act = 'talk'; ai.cd = fr.ai.cd = U.rand(6, 12); a.goTo(this.world, fr.x + 26, fr.y, false, () => { a.faceTo(fr.x, fr.y); fr.faceTo(a.x, a.y); }); fr.stop(); fr.idleAnim = 'talk'; a.idleAnim = 'talk'; setTimeout(() => { ai.partner = null; fr.ai.partner = null; }, ai.cd * 1000); return; }
      }
      if (r < nightK + 0.26 && p.rivals.length && !this.night) {
        const rv = this.bots.find(b => b !== a && !b.dead && p.rivals.includes(b.p.id) && !b.ai.partner && U.dist(a.x, a.y, b.x, b.y) < 500);
        if (rv) { ai.partner = rv; ai.act = 'argue'; ai.cd = U.rand(3, 6); rv.ai.partner = a; rv.ai.act = 'argue'; rv.ai.cd = ai.cd; a.goTo(this.world, rv.x + 24, rv.y, false); setTimeout(() => { ai.partner = null; rv.ai.partner = null; }, ai.cd * 1000); return; }
      }
      if (r < nightK + 0.36) { const P = this.D.pig; a.goTo(this.world, P.x + U.rand(-120, 120), P.y + U.rand(40, 120), false, () => { a.face('up'); a.idleAnim = 'look'; }); ai.act = 'pig'; ai.cd = U.rand(5, 10); return; }
      if (r < nightK + 0.42) { a.goTo(this.world, this.D.bath.x + U.rand(-60, 60), this.D.bath.y + U.rand(-30, 40), false); ai.act = 'bath'; ai.cd = U.rand(4, 8); return; }
      if (r < nightK + 0.55 && (p.fear || 0) > 0.55) { a.goTo(this.world, a.bunk.x, a.bunk.y + 10, false, () => { a.idleAnim = Math.random() < 0.5 ? 'sitSad' : 'cry'; }); ai.act = 'sad'; ai.cd = U.rand(8, 14); return; }
      // wander
      const tx = U.rand(20, 44) * TS, ty = U.rand(14, 32) * TS; const q = this.map.nearestFree(tx, ty);
      a.goTo(this.world, q.x, q.y, false); ai.act = 'wander'; ai.cd = U.rand(2, 6);
      if (Math.random() < 0.15) a.say(pickLine(this, p), 2.6);
    }
    // ---------- update ----------
    update(dt) {
      this.t += dt;
      this.world.update(dt);
      if (this.runner) this.runner.update(dt);
      this.lights = U.approach(this.lights, this.night && !this.riotLightsOn ? (this.riot ? 0.06 : 0.35) : 1, dt * 1.5);
      if (this.preVote) this.updPreVote(dt);
      if (this.vote) this.updVote(dt);
      if (this.riot) this.updRiot(dt);
      if (!this.busy && !this.leaving && !this.vote) this.updPlayer(dt);
      else if (!this.runner) this.pl.steer(0, 0);
      if (!this.busy && !this.leaving && !this.riot && !this.vote) this.updEvents(dt);
      for (const e of this.events) e.update && e.update(dt);
      this.events = this.events.filter(e => !e.done);
      // camera
      if (!this.runner || !this.cam.busy) { if (!this.runner) { if (this.vote && this.voteCam) this.cam.follow(this.voteCam.x, this.voteCam.y, 0.95); else this.cam.follow(this.pl.x, this.pl.y - 20, this.cfg.zoom || 1.15); } }
      this.cam.update(dt);
      // leave trigger: all tasks done + guards call
      if (!this.leaving && !this.busy && !this.vote && !this.riot && this.readyToLeave() && !this.calling) { this.calling = true; R6.Engine.after(this.cfg.callDelay != null ? this.cfg.callDelay : 2.5, () => this.callGuards()); }
    }
    readyToLeave() { return this.tasks.every(t => t.done || t.optional) && this.t > (this.cfg.minTime != null ? this.cfg.minTime : 20) && !this.cfg.noLeave; }
    completeTask(id) { const t = this.tasks.find(t => t.id === id); if (t && !t.done) { t.done = true; R6.Audio.sfx('confirm', { vol: 0.5 }); R6.Toast.show('✓ ' + t.text, { color: '#2ec4b6' }); } }
    updPlayer(dt) {
      const I = R6.Input, pl = this.pl;
      if (pl.lie && (I.axis().x || I.axis().y)) pl.lie = null;
      const ax = I.axis(); pl.steer(ax.x, ax.y, I.act('run'));
      // interaction prompt
      this.prompt = null;
      const near = this.world.near(pl.x, pl.y, 42, a => a !== pl && !a.dead && a.visible);
      near.sort((a, b) => U.dist2(a.x, a.y, pl.x, pl.y) - U.dist2(b.x, b.y, pl.x, pl.y));
      const it = this.items.find(i => !i.taken && U.dist(i.x, i.y, pl.x, pl.y) < 36);
      const atBunk = U.dist(pl.x, pl.y, this.myBunk.x, this.myBunk.y) < 50;
      if (it) this.prompt = { x: it.x, y: it.y - 30, label: 'PEGAR', fn: () => this.pickItem(it) };
      else if (near.length) { const a = near[0]; this.prompt = { x: a.x, y: a.y - 70, label: a.kind === 'guard' ? 'FALAR' : 'INTERAGIR', fn: () => this.interact(a) }; }
      else if (atBunk && this.cfg.canSleep) this.prompt = { x: this.myBunk.x, y: this.myBunk.y - 60, label: 'DORMIR', fn: () => this.sleep() };
      else if (U.dist(pl.x, pl.y, (MW - 10) * TS, 9 * TS) < 60) this.prompt = { x: (MW - 10) * TS, y: 9 * TS - 60, label: 'PORTA', fn: () => R6.Toast.show('Trancada. Um guarda está de olho em você.', { color: '#ff5a6a' }) };
      if (this.prompt && I.actP('interact')) this.prompt.fn();
      if (I.actP('tab')) this.showRelations = !this.showRelations;
      // emotes (shop)
      const d = I.digitP(); if (d >= 5 && d <= 8) this.emote(d);
      // proximity task checks
      for (const t of this.tasks) if (!t.done && t.near && U.dist(pl.x, pl.y, t.near.x, t.near.y) < 70) this.completeTask(t.id);
    }
    emote(d) {
      const E = R6.EMOTES || {}; const eq = Object.keys(R6.Save.meta.owned).filter(k => k.startsWith('emote_')); const id = eq[d - 5]; if (!id) return;
      const e = E[id]; if (!e) return; this.pl.setAnim(e.anim, 1.6); this.pl.emo(e.icon, 1.4); R6.Audio.sfx('pop', { vol: 0.3 });
      for (const b of this.world.near(this.pl.x, this.pl.y, 120, x => x.ai)) if (Math.random() < 0.5) b.emo(U.pick(['?', '…', '♥']), 1);
    }
    pickItem(it) {
      it.taken = true; R6.State.give(it.id); R6.Audio.sfx('coin');
      if (it.flag) R6.State.flag(it.flag, true);
      const seen = this.world.near(this.pl.x, this.pl.y, 180, a => a.ai && !a.dead).map(a => a.p);
      if (it.owner) { const o = R6.State.byKey(it.owner); if (o) { R6.State.addRel(o, -20, 'stole'); R6.State.witness(seen, 'witness_steal', -5); } }
      if (it.onTake) it.onTake(this);
    }
    sleep() {
      if (this.cfg.onSleep) return this.cfg.onSleep(this);
      this.pl.lie = { anim: 'sleep' }; this.pl.x = this.myBunk.x; this.pl.y = this.myBunk.y - 6; this.completeTask('sleep');
      R6.Toast.show('Você deita e fecha os olhos por um tempo…', { color: '#9fc2ff' });
    }
    // ---------- social interactions ----------
    interact(a) {
      if (a.kind === 'guard') { R6.Dialog.show({ who: { name: 'GUARDA', look: a.look }, text: U.pick(['Volte para o seu lugar.', '…', 'Conversar com os funcionários é proibido.']), expr: 'neutral' }); return; }
      if (this.cfg.onTalk && this.cfg.onTalk(this, a)) return;
      const p = a.p; const S = R6.State; const tag = S.tag(p);
      a.stop(); a.faceTo(this.pl.x, this.pl.y); this.pl.faceTo(a.x, a.y);
      const choices = [];
      if (!this.talked.has(p.id)) choices.push({ t: 'Conversar', cb: () => this.talk(a) }); else choices.push({ t: 'Conversar (de novo)', cb: () => this.talk(a, true) });
      const food = ['bread', 'egg'].find(f => S.has(f));
      if (food) choices.push({ t: 'Dividir comida (' + R6.ITEMS[food].name + ')', cb: () => { S.take(food); S.addRel(p, 18, 'shared'); S.s.stats.helped++; S.karma(1); a.setAnim('eat', 2); a.say('Obrigado… de verdade.', 2); S.witness(this.world.near(a.x, a.y, 150, x => x.ai && x !== a).map(x => x.p), 'witness_help', 3); } });
      if (p.rel >= 15 && !p.allied) choices.push({ t: 'Propor aliança', cb: () => this.ally(a) });
      if (this.cfg.persuade && !this.persuaded.has(p.id)) choices.push({ t: 'Convencer a votar ' + this.cfg.persuade.side, sub: 'votação', cb: () => this.persuade(a) });
      if ((a.anim === 'cry' || a.anim === 'sitSad' || (p.fear || 0) > 0.6)) choices.push({ t: 'Consolar', cb: () => { S.addRel(p, 10, 'comforted'); p.fear = Math.max(0, (p.fear || 0) - 0.25); a.clearAnim(); a.idleAnim = 'idle'; a.say('…Obrigado. Eu precisava disso.', 2.4); } });
      if (a.lie && p.inv && p.inv.length) choices.push({ t: 'Roubar enquanto dorme', color: '#ff5a6a', cb: () => this.steal(a) });
      choices.push({ t: 'Provocar', color: '#ff5a6a', cb: () => this.provoke(a) });
      choices.push({ t: 'Sair', cb: () => { } });
      R6.Dialog.show({ who: p, text: this.greeting(a), expr: p.rel < -20 ? 'angry' : p.rel > 30 ? 'happy' : 'neutral', choices });
    }
    greeting(a) {
      const p = a.p;
      if (p.key && this.cfg.keyLines && this.cfg.keyLines[p.key]) return this.cfg.keyLines[p.key];
      if (p.rel <= -40) return U.pick(['O que você quer?', 'Fala logo.', 'Não gosto de você.']);
      if (p.rel >= 45) return U.pick(['Ei, parceiro.', 'Que bom te ver inteiro.', 'Você está bem?']);
      return U.pick(['Hm?', 'Oi.', 'Precisa de alguma coisa?', '#' + U.pad(p.num) + '. E você?']);
    }
    talk(a, again) {
      const p = a.p; const S = R6.State;
      if (!again) { this.talked.add(p.id); S.addRel(p, 4 + p.tr.kindness * 4, null, { silent: true }); this.completeTask('talk_' + (p.key || 'any')); this.completeTask('talk_any'); }
      const lines = this.cfg.talk && this.cfg.talk(this, a, again);
      if (lines && lines.length) { R6.Dialog.show(lines); return; }
      const bio = p.bio || '';
      R6.Dialog.show([{ who: p, text: again ? pickLine(this, p) : (U.pick(['Eu? ', 'Minha história? ', '']) + bio), expr: p.fear > 0.6 ? 'sad' : 'neutral' }]);
    }
    ally(a) {
      const p = a.p; const S = R6.State;
      const ok = p.rel >= 25 || Math.random() < p.tr.trust * 0.6;
      if (ok) { p.allied = true; S.addRel(p, 15, 'allied'); a.emo('♥', 1.5); R6.Dialog.show({ who: p, text: U.pick(['Fechado. A gente se protege.', 'Aliança. Mas não me faz me arrepender.', 'Juntos até o fim, então.']), expr: 'happy' }); S.log('Aliança com ' + S.label(p)); }
      else R6.Dialog.show({ who: p, text: U.pick(['Ainda não confio em você.', 'Me dá um motivo primeiro.', 'Aqui dentro cada um por si.']), expr: 'neutral' });
    }
    persuade(a) {
      const p = a.p; const S = R6.State; const side = this.cfg.persuade.side; this.persuaded.add(p.id);
      const ok = p.rel >= 10 && Math.random() < 0.45 + p.rel / 150 + (side === 'X' ? (p.fear || 0) * 0.3 : p.tr.greed * 0.3);
      if (ok) { p.voteForce = side; S.addRel(p, 3, 'persuaded', { silent: true }); R6.Dialog.show({ who: p, text: side === 'X' ? 'Tem razão. Ninguém deveria morrer por isso. Vou votar X.' : 'Você tem razão. Eu preciso desse dinheiro. Voto O.', expr: 'neutral' }); }
      else R6.Dialog.show({ who: p, text: side === 'X' ? 'Sair? Pra quê? Lá fora eu já estou morto.' : 'Continuar? Você é louco.', expr: 'angry' });
    }
    steal(a) {
      const p = a.p; const S = R6.State; const item = p.inv.shift(); S.give(item);
      const seen = this.world.near(a.x, a.y, 200, x => x.ai && x !== a && !x.lie).map(x => x.p);
      S.s.stats.betrayals++; S.karma(-2);
      if (seen.length) { S.witness(seen, 'witness_steal', -10); R6.Toast.show(seen.length + ' pessoa(s) viram você roubar.', { color: '#ff5a6a' }); if (Math.random() < 0.5) { a.lie = null; S.addRel(p, -35, 'stole'); a.say('LADRÃO!', 2); } }
      else S.remember(p, 'stole');
    }
    provoke(a) {
      const p = a.p; const S = R6.State; S.addRel(p, -15, 'insulted');
      const tough = p.tr.courage * 0.6 + p.tr.str * 0.4;
      if (tough > 0.55) { R6.Dialog.show({ who: p, text: U.pick(['Repete isso.', 'Quer apanhar aqui mesmo?', 'Você escolheu a pessoa errada.']), expr: 'angry', onDone: () => this.brawl(a) }); }
      else { a.emo('!', 1); a.say('…Me deixa em paz.', 2); S.witness(this.world.near(a.x, a.y, 150, x => x.ai && x !== a).map(x => x.p), 'witness_fight', -4); }
    }
    brawl(a) {
      // quick stylized scuffle resolved by timing presses
      const p = a.p; const S = R6.State;
      this.events.push({
        t: 0, hits: 0, recv: 0, done: false, a,
        update(dt) {
          this.t += dt; const hub = R6.Engine.scene; if (!hub || !hub.pl) { this.done = true; return; }
          hub.pl.faceTo(a.x, a.y); a.faceTo(hub.pl.x, hub.pl.y);
          if (R6.Input.actP('interact') || R6.Input.actP('action')) { this.hits++; hub.pl.setAnim(this.hits % 2 ? 'punch' : 'punch2', 0.3); R6.Audio.sfx('hit'); a.setAnim('stagger', 0.3); hub.cam.shake(3, 0.15); }
          if (Math.random() < dt * (0.8 + p.tr.str)) { this.recv++; a.setAnim('punch', 0.3); R6.Audio.sfx('hit'); hub.pl.setAnim('stagger', 0.3); hub.hp = Math.max(20, hub.hp - 6); S.s.player.hp = Math.max(20, S.s.player.hp - 6); }
          if (this.t > 3) {
            this.done = true; const won = this.hits > this.recv * 1.3 + 2;
            S.witness(hub.world.near(a.x, a.y, 200, x => x.ai && x !== a).map(x => x.p), 'witness_fight', -5);
            R6.Toast.show(won ? 'Você venceu a briga.' : 'Você apanhou feio.', { color: won ? '#f2c14e' : '#ff5a6a' });
            S.addRel(p, won ? -10 : -5, 'fought', { silent: true });
            if (hub.guards[0]) { hub.guards[0].emo('!', 1.5); R6.Audio.sfx('whistle', { vol: 0.5 }); }
          }
        },
      });
      R6.Toast.show('BRIGA! Aperte E / ESPAÇO para bater!', { color: '#ff5a6a', icon: 'x' });
    }
    // ---------- random events ----------
    updEvents(dt) {
      if (this.eventsDone >= this.maxEvents) return;
      this.eventCd -= dt; if (this.eventCd > 0) return;
      this.eventCd = U.rand(18, 30);
      const pool = HUB_EVENTS.filter(e => e.can(this));
      if (!pool.length) return;
      const ev = U.weighted(pool, e => e.w || 1);
      this.eventsDone++; ev.start(this);
    }
    // ---------- meal ----------
    startMeal() {
      this.meal = true; R6.Audio.sfx('announce');
      R6.Dialog.announce('Hora da refeição.', null, 2);
      if (!R6.State.has('bread') && !R6.State.has('egg')) R6.State.give(this.season === 1 ? 'egg' : 'bread');
      this.bots.forEach(b => { b.ai.cd = U.rand(0, 3); b.ai.ate = false; });
    }
    // ---------- vote (O / X) ----------
    askIntent() {
      const S = R6.State;
      R6.Dialog.show({ who: S.player, text: 'A votação vai começar em breve. O que você pretende fazer?', choices: [
        { t: 'Convencer os outros a votar O (continuar)', color: '#3a86ff', cb: () => { this.intendVote = 'O'; this.cfg.persuade = { side: 'O' }; this.beginPreVote(); } },
        { t: 'Convencer os outros a votar X (encerrar)', color: '#ff3b5c', cb: () => { this.intendVote = 'X'; this.cfg.persuade = { side: 'X' }; this.beginPreVote(); } },
        { t: 'Ficar quieto e observar', cb: () => { this.beginPreVote(); } },
      ] });
    }
    beginPreVote() {
      const dur = this.cfg.voteAfter || 0;
      if (!dur) return this.startVote();
      this.preVote = { t: dur, dur };
      this.cfg.objective = this.cfg.persuade ? 'Converse com os jogadores e convença-os a votar ' + this.cfg.persuade.side + '. Vá até o PLACAR para iniciar a votação.' : 'Circule pelo dormitório. Vá até o PLACAR quando estiver pronto.';
      R6.Toast.show('A votação começa em ' + Math.round(dur) + 's — ou quando você for até o placar.', { color: '#ffd166', dur: 4 });
    }
    updPreVote(dt) {
      const P = this.preVote; if (!P || this.busy) return;
      P.t -= dt;
      const B = this.D.board;
      if (P.t <= 0 || U.dist(this.pl.x, this.pl.y, B.x, B.y + 40) < 70) { this.preVote = null; this.cfg.objective = null; R6.Audio.sfx('announce'); this.startVote(); }
    }
    startVote() {
      const S = R6.State; const V = this.cfg.vote;
      const bots = S.aliveBots();
      const list = bots.map(p => {
        let pO = p.voteLean + (V.bias || 0) - (p.fear || 0) * 0.25 + (S.s.prize / 45.6e9) * 0.25;
        if (p.voteForce) pO = p.voteForce === 'O' ? 0.95 : 0.05;
        if (p.rel >= 45 && this.intendVote) pO = U.lerp(pO, this.intendVote === 'O' ? 1 : 0, 0.6);
        if (V.keyVotes && V.keyVotes[p.key]) pO = V.keyVotes[p.key] === 'O' ? 1 : 0;
        return { p, v: Math.random() < pO ? 'O' : 'X' };
      }).sort((a, b) => a.p.num - b.p.num);
      this.vote = { list, i: 0, t: 0, O: 0, X: 0, playerDone: false, done: false, plNum: S.s.player.num, speed: 0.06, menu: null };
      // everyone gathers in front of the board, facing it
      const B = this.D.board; this.byId = new Map(this.bots.map(b => [b.p.id, b]));
      const P = this.D.pig; const slots = []; for (let r = 0; r < 16; r++) for (let c = -13; c <= 13; c++) { const x = B.x + c * 34 + (r % 2) * 17, y = B.y + 110 + r * 30; if (U.dist(x, y, P.x, P.y - 150) > 95) slots.push({ x, y }); }
      const order = this.bots.filter(b => !b.dead).sort((a, b) => U.dist2(a.x, a.y, B.x, B.y) - U.dist2(b.x, b.y, B.x, B.y));
      order.forEach((b, k) => { const sl = slots[k % slots.length]; b.lie = null; b.clearAnim(); b.idleAnim = 'idle'; b.ai.cd = 999; b.ai.act = 'vote'; const q = this.map.nearestFree(sl.x + U.rand(-6, 6), sl.y + U.rand(-5, 5)); b.goTo(this.world, q.x, q.y, false, () => b.face('up')); });
      this.pl.lie = null; const pq = this.map.nearestFree(B.x + 20, B.y + 80); this.pl.goTo(this.world, pq.x, pq.y, false, () => this.pl.face('up'));
      this.voteCam = { x: B.x, y: B.y + 10 };
      R6.Music.play('tension'); R6.Music.setIntensity(0.4);
      R6.Dialog.announce(V.text || 'Conforme a cláusula 3, o jogo pode ser encerrado se a maioria concordar. Vamos votar. O para continuar, X para encerrar.', null, 3.5);
    }
    updVote(dt) {
      const V = this.vote; if (V.done || R6.Dialog.active && !R6.Dialog.cur.auto) return;
      V.t += dt;
      if (V.t < 3.6) return;
      if (V.waiting) return;
      V.acc = (V.acc || 0) + dt;
      while (V.acc > V.speed && V.i <= V.list.length) {
        V.acc -= V.speed;
        const next = V.list[V.i];
        if (!V.playerDone && (!next || next.p.num > V.plNum)) { V.waiting = true; this.playerVote(); return; }
        if (!next) { this.finishVote(); return; }
        V[next.v]++; next.p.lastVote = next.v; V.i++; V.last = next; R6.Audio.sfx('vote', { vol: 0.25, gap: 0.02 });
        const va = this.byId && this.byId.get(next.p.id); if (va && !va.dead) { va.emo(next.v, 1.4); if (V.list.length - V.i < 12 || Math.random() < 0.05) va.setAnim('vote', 0.8); }
        if (V.list.length - V.i < 6) V.speed = 0.5; // slow down at the end for suspense
      }
    }
    playerVote() {
      const V = this.vote;
      R6.Dialog.show({ who: R6.State.player, text: 'Sua vez. #' + U.pad(V.plNum) + '. O placar está ' + V.O + ' × ' + V.X + '.', choices: [
        { t: 'O — continuar o jogo', color: '#3a86ff', cb: () => this.castVote('O') },
        { t: 'X — encerrar o jogo', color: '#ff3b5c', cb: () => this.castVote('X') },
      ] });
    }
    castVote(v) {
      const V = this.vote; V[v]++; V.playerDone = true; V.waiting = false; V.mine = v; R6.Audio.sfx('stamp');
      R6.State.decide(this.cfg.vote.id, v, 'Votou ' + v); R6.State.flag('badge', this.season === 2 ? v : null); this.pl.look.badge = this.season === 2 ? v : null;
      // allies react
      for (const b of this.bots) if (b.p.rel >= 40) { b.p.voteForce = b.p.voteForce || v; }
      for (const e of V.list.slice(V.i)) if (e.p.voteForce) e.v = e.p.voteForce;
    }
    finishVote() {
      const V = this.vote; V.done = true; const S = R6.State;
      let res = V.O > V.X ? 'O' : V.X > V.O ? 'X' : 'tie';
      // the infiltrator (#001 in season 2) casts the deciding vote when it is close
      if (this.cfg.vote.rig && Math.abs(V.O - V.X) <= 1) { res = 'O'; V.rigged = true; S.flag('saw_rig_' + this.cfg.vote.id, true); }
      if (res === 'tie') res = this.cfg.vote.tie || 'X';
      V.result = res; S.flag(this.cfg.vote.id + '_result', res);
      for (const e of V.list) { if (e.p.lastVote) { if (V.mine && e.p.lastVote === V.mine) S.remember(e.p, 'voted_same'); if (this.season === 2) e.p.badge = e.p.lastVote; } }
      for (const b of this.bots) if (this.season === 2) b.look.badge = b.p.lastVote || null;
      R6.Audio.sfx('buzzer');
      R6.Banner.show(res === 'O' ? 'O VENCEU' : 'X VENCEU', V.O + ' × ' + V.X + (V.rigged ? ' · O ÚLTIMO VOTO VEIO DO #001' : ''), { color: res === 'O' ? '#3a86ff' : '#ff3b5c', dur: 3.4, big: true });
      for (const e of V.list) { const va = this.byId && this.byId.get(e.p.id); if (va && !va.dead && V.mine) { if (e.v === V.mine) { if (Math.random() < 0.15) va.emo('♥', 1.5); } else if (Math.random() < 0.1) va.say(U.pick(['Traidor.', 'Você não entende nada.', 'Covarde.', 'Egoísta.']), 2.2); } }
      R6.Engine.after(3.6, () => { this.vote = null; for (const b of this.bots) { if (b.ai) { b.ai.cd = U.rand(0, 4); b.ai.act = null; } } if (this.cfg.vote.after) this.cfg.vote.after(this, res); else this.done({ vote: res }); });
    }
    drawBoard(c) {
      const B = this.D.board;
      if (!this.vote) { R6.Props.board(c, B.x - 160, B.y - 150, 320, 110, [{ t: 'O 000   ×   X 000', s: 30, c: '#ffffff' }, { t: this.preVote ? 'VOTAÇÃO EM ' + Math.ceil(this.preVote.t) + 's' : 'VOTAÇÃO', s: 20, c: '#ffd166' }]); return; }
      const V = this.vote;
      R6.Props.board(c, B.x - 160, B.y - 150, 320, 110, [{ t: 'O ' + U.pad(V.O, 3) + '   ×   X ' + U.pad(V.X, 3), s: 30, c: '#ffffff' }, { t: V.last ? '#' + U.pad(V.last.p.num) + ' → ' + V.last.v : 'VOTAÇÃO', s: 20, c: V.last && V.last.v === 'O' ? '#3a86ff' : '#ff4d6d' }]);
      c.fillStyle = '#3a86ff'; c.beginPath(); c.arc(B.x - 40, B.y - 20, 16, 0, TAU); c.fill(); c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(B.x + 40, B.y - 20, 16, 0, TAU); c.fill();
      R6.UI.text(c, 'O', B.x - 40, B.y - 14, { size: 18, align: 'center', color: '#fff', weight: 800 }); R6.UI.text(c, 'X', B.x + 40, B.y - 14, { size: 18, align: 'center', color: '#fff', weight: 800 });
    }
    // ---------- night riot ----------
    startRiot() {
      const S = R6.State; this.night = true; this.riot = { t: 0, dur: R6.Save.D(55, 70, 85), kills: 0, killT: 3, hitCd: 0 };
      R6.Music.play('action'); R6.Music.setIntensity(0.9); R6.Audio.sfx('doorSlam'); R6.Audio.sfx('crowdGasp'); R6.Audio.loop('heartbeat', 0.5);
      // attackers: bullies/aggressive + enemies of the player
      for (const b of this.bots) { const tr = b.p.tr; b.ai.riotRole = (tr.betray > 0.7 && tr.str > 0.55 && !b.p.key) || b.p.key === 'gangster' || b.p.rel <= -40 ? 'attacker' : b.p.rel >= 40 || b.p.allied ? 'ally' : Math.random() < 0.5 ? 'hide' : 'victim'; b.ai.hp = 3; b.lie = null; }
      R6.Dialog.announce('…', null, 0.6);
      R6.Toast.show('AS LUZES SE APAGARAM. SOBREVIVA ATÉ ELAS VOLTAREM.', { color: '#ff3b5c', icon: 'x', dur: 5 });
    }
    riotBrain(a, dt) {
      const R = this.riot; const role = a.ai.riotRole; if (a.dead) return;
      if (a.stun > 0) return;
      if (role === 'attacker') {
        let tgt = a.ai.tgt;
        if (!tgt || tgt.dead || Math.random() < dt * 0.3) { const opts = this.world.near(a.x, a.y, 300, x => (x === this.pl || x.ai && x.ai.riotRole !== 'attacker') && !x.dead); tgt = opts.length ? (opts.includes(this.pl) && (a.p.rel < 0 || Math.random() < 0.4) ? this.pl : U.pick(opts)) : this.pl; a.ai.tgt = tgt; }
        const d = U.dist(a.x, a.y, tgt.x, tgt.y);
        if (d > 26) { a.ai.re = (a.ai.re || 0) - dt; if (a.ai.re <= 0) { a.ai.re = 0.5; a.goTo(this.world, tgt.x, tgt.y, true); } }
        else if ((a.ai.atk = (a.ai.atk || 0) - dt) <= 0) {
          a.ai.atk = U.rand(0.7, 1.3); a.setAnim('punch', 0.3); a.faceTo(tgt.x, tgt.y); R6.Audio.sfx('hit', { vol: 0.5, gap: 0.05 });
          if (tgt === this.pl) { if (!(this.plBlock > 0)) { this.hp -= R6.Save.D(7, 10, 13); R6.Engine.flash('#ff1133', 0.12); this.cam.shake(5, 0.2); } }
          else if (tgt.ai) { tgt.ai.hp--; tgt.setAnim('stagger', 0.4); if (tgt.ai.hp <= 0 && !tgt.p.key) { tgt.kill(); R6.Elim.kill(tgt.p, { cause: 'riot', silent: true, sfx: false }); R6.Audio.sfx('scream', { vol: 0.4, gap: 0.3 }); R.kills++; } }
        }
      } else if (role === 'ally') {
        const foe = this.world.near(this.pl.x, this.pl.y, 200, x => x.ai && x.ai.riotRole === 'attacker' && !x.dead)[0];
        if (foe) { if (U.dist(a.x, a.y, foe.x, foe.y) > 26) { a.ai.re = (a.ai.re || 0) - dt; if (a.ai.re <= 0) { a.ai.re = 0.5; a.goTo(this.world, foe.x, foe.y, true); } } else if ((a.ai.atk = (a.ai.atk || 0) - dt) <= 0) { a.ai.atk = U.rand(0.8, 1.4); a.setAnim('push', 0.3); foe.stun = 0.8; foe.vx += (foe.x - a.x) * 4; foe.vy += (foe.y - a.y) * 4; R6.Audio.sfx('hit', { vol: 0.4 }); } }
        else if (U.dist(a.x, a.y, this.pl.x, this.pl.y) > 60 && !a.path) a.goTo(this.world, this.pl.x + U.rand(-30, 30), this.pl.y + U.rand(-30, 30), true);
      } else if (role === 'hide') { if (!a.path && !a.ai.hid) { a.ai.hid = true; a.goTo(this.world, a.bunk.x, a.bunk.y - 6, true, () => { a.idleAnim = 'crouch'; }); } }
      else { if (!a.path) { const q = this.map.nearestFree(a.x + U.rand(-100, 100), a.y + U.rand(-100, 100)); a.goTo(this.world, q.x, q.y, true); } }
    }
    updRiot(dt) {
      const R = this.riot; R.t += dt; if (this.plBlock > 0) this.plBlock -= dt;
      const I = R6.Input;
      if (!this.busy) {
        const ax = I.axis(); this.pl.steer(ax.x, ax.y, I.act('run'));
        if (I.actP('interact') || I.actP('punch') || I.actP('action')) {
          const foes = this.world.near(this.pl.x, this.pl.y, 46, x => x.ai && x.ai.riotRole === 'attacker' && !x.dead);
          this.pl.setAnim(foes.length ? 'push' : 'punch', 0.3);
          for (const f of foes) { f.stun = 1.1; f.setAnim('stagger', 0.6); const ang = Math.atan2(f.y - this.pl.y, f.x - this.pl.x); f.vx += Math.cos(ang) * 260; f.vy += Math.sin(ang) * 260; R6.Audio.sfx('hitHeavy'); f.ai.hp--; if (f.ai.hp <= 0 && !f.p.key) { f.kill(); R6.Elim.kill(f.p, { cause: 'riot', silent: true, sfx: false }); R6.State.flag('riot_killed', true); } }
        }
        if (I.actP('block')) this.plBlock = 0.6;
      }
      // off-screen deaths in the dark
      R.killT -= dt; if (R.killT <= 0) { R.killT = U.rand(2, 4.5); const v = U.pick(R6.State.aliveBots().filter(p => !p.key && !this.bots.some(b => b.p === p))); if (v) { R6.Elim.kill(v, { cause: 'riot', silent: true, sfx: false }); R6.Audio.sfx('scream', { vol: 0.25, gap: 0.5 }); R6.Audio.sfx('thud', { vol: 0.3, delay: 0.4 }); } }
      if (this.hp <= 0 && !this.riotLost) { this.riotLost = true; R6.Audio.stopLoop('heartbeat'); R6.State.eliminate(R6.State.player, 'riot'); this.fakeGame = new R6.GameBase({ mode: 'campaign' }); R6.Flow.defeat(this.fakeGame, { line: 'Morreu no escuro, antes mesmo do próximo jogo.' }); return; }
      if (R.t >= R.dur && !R.ending) {
        R.ending = true; this.riotLightsOn = true; R6.Audio.sfx('gun'); R6.Audio.sfx('gun', { delay: 0.25 }); R6.Audio.stopLoop('heartbeat');
        R6.Dialog.announce('Parem. Vocês estão violando as regras. O próximo jogo começa ao amanhecer.', null, 3);
        for (const b of this.bots) { b.ai.riotRole = null; b.stop(); }
        R6.Engine.after(3.5, () => { this.riot = null; this.night = false; this.riotLightsOn = false; R6.Music.play('sad'); if (this.cfg.afterRiot) this.cfg.afterRiot(this); else this.done({}); });
      }
    }
    // ---------- leaving: guards arrive, procession to the stairs ----------
    callGuards() {
      if (this.leaving) return;
      R6.Audio.sfx('siren'); R6.Audio.sfx('announce', { delay: 0.8 });
      this.map.setDoor(this.D.exitDoor[0], true); this.map.setDoor(this.D.exitDoor[1], true); R6.Audio.sfx('door');
      R6.Dialog.announce(this.cfg.callText || 'Todos os jogadores, dirijam-se à saída. O próximo jogo vai começar.', null, 3);
      R6.Music.play('game'); R6.Music.setIntensity(0.15);
      this.leaving = true; this.procT = 0;
      for (const g of this.guards) g.frozen = false;
      // everyone lines up toward the exit (no teleports: they walk)
      const ex = this.D.exitPos;
      this.bots.forEach((b, i) => { b.lie = null; b.clearAnim(); b.idleAnim = 'idle'; b.canOpenDoors = true; setTimeout(() => { if (!b.dead) b.goTo(this.world, ex.x + U.rand(-50, 50), ex.y + U.rand(-30, 20), false, () => { b.visible = false; b.solid = false; }); }, 300 + i * 40); });
      this.pl.lie = null;
    }
    updLeaving(dt) { }
    done(result) { if (this.finished) return; this.finished = true; if (this.cfg.onDone) this.cfg.onDone(result || {}); }
    // ---------- render ----------
    render(ctx) {
      const cam = this.cam, t = this.t;
      ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      this.world.draw(ctx, cam);
      if (this.prompt && !this.busy) { ctx.save(); ctx.translate(this.prompt.x - 30, this.prompt.y); const s = 1 / cam.zoom; ctx.scale(s, s); R6.UI.keyHint(ctx, 'E', this.prompt.label, 0, 0); ctx.restore(); }
      cam.end(ctx);
      // lighting
      if (this.lights < 0.98) {
        const ps = cam.toScreen(this.pl.x, this.pl.y - 16);
        const L = [{ x: ps.x, y: ps.y, r: this.riot ? 150 : 230, a: 0.85 }];
        const pg = cam.toScreen(this.D.pig.x, this.D.pig.y - 150); L.push({ x: pg.x, y: pg.y, r: 200 * cam.zoom, a: 0.8, color: '#ffd98a' });
        if (this.riot && Math.random() < 0.08) R6.Engine.flash('#ffffff', 0.05);
        R6.Light.draw(ctx, 1 - this.lights, L, '#03040a');
      }
      R6.UI.vignette(ctx, 0.5);
      if (this.leaving) { this.procT += 1 / 60; if (this.procT > 1.2) { const ex = this.D.exitPos; if (U.dist(this.pl.x, this.pl.y, ex.x, ex.y) < 90 || this.procT > 25) this.done({}); } }
      // HUD
      if (!this.runner) {
        const obj = this.leaving ? 'Siga os outros até a SAÍDA (escadas ao norte).' : this.vote ? 'Votação em andamento…' : this.riot ? 'SOBREVIVA! E/J empurrar · I bloquear · fique perto dos aliados' : this.tasks.filter(t => !t.done && !t.optional).map(t => t.text)[0] || this.cfg.objective || 'Explore o dormitório. Converse. Forme alianças. (TAB: relações)';
        R6.HUD.draw(ctx, { game: this.cfg.title || (this.night ? 'DORMITÓRIO · NOITE' : 'DORMITÓRIO'), objective: obj, hp: this.riot ? this.hp : undefined, status: this.riot ? (this.hp > 50 ? 'OK' : 'FERIDO') : undefined, timer: this.riot ? Math.max(0, this.riot.dur - this.riot.t) : this.preVote ? Math.max(0, this.preVote.t) : null, danger: !!this.riot });
        if (this.tasks.length && !this.leaving && !this.vote && !this.riot) {
          R6.UI.panel(ctx, 16, 96, 300, 20 + this.tasks.length * 22, { fill: 'rgba(6,8,12,.7)', shadow: false });
          this.tasks.forEach((tk, i) => R6.UI.text(ctx, (tk.done ? '✓ ' : '○ ') + tk.text, 28, 118 + i * 22, { size: 14, weight: 700, color: tk.done ? '#2ec4b6' : tk.optional ? '#999' : '#eee', maxW: 280 }));
        }
        if (this.vote) this.drawVoteUI(ctx);
        if (this.showRelations) this.drawRelations(ctx);
        else if (!this.vote && !this.riot) R6.UI.text(ctx, 'TAB: relações', R6.W - 20, R6.H - 18, { size: 13, align: 'right', color: '#888' });
      }
      if (this.runner) this.runner.renderOverlay(ctx);
    }
    drawVoteUI(ctx) {
      const V = this.vote; const tot = V.list.length + 1;
      R6.UI.panel(ctx, 340, 110, 600, 80, { fill: 'rgba(6,8,12,.85)' });
      const w = 560; const o = V.O / tot, x = V.X / tot;
      ctx.fillStyle = '#3a86ff'; ctx.fillRect(360, 130, w * o, 20); ctx.fillStyle = '#ff3b5c'; ctx.fillRect(360 + w - w * x, 130, w * x, 20);
      ctx.fillStyle = '#fff'; ctx.fillRect(360 + w / 2 - 1, 124, 2, 32);
      R6.UI.text(ctx, 'O ' + V.O, 360, 178, { size: 22, fam: 'mono', color: '#3a86ff' }); R6.UI.text(ctx, V.X + ' X', 920, 178, { size: 22, fam: 'mono', color: '#ff3b5c', align: 'right' });
      R6.UI.text(ctx, 'MAIORIA: ' + (Math.floor(tot / 2) + 1), 640, 178, { size: 14, align: 'center', color: '#bbb', weight: 800 });
    }
    drawRelations(ctx) {
      const S = R6.State; const list = S.aliveBots().filter(p => p.key || Math.abs(p.rel) >= 15).sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || b.rel - a.rel).slice(0, 14);
      R6.UI.panel(ctx, 340, 90, 600, 60 + list.length * 38, { fill: 'rgba(6,8,12,.94)' });
      R6.UI.text(ctx, 'RELAÇÕES', 640, 124, { size: 28, fam: 'title', align: 'center', color: '#fff', spacing: 3 });
      list.forEach((p, i) => {
        const y = 150 + i * 38; const tg = S.tag(p);
        R6.Char.portrait(ctx, p.look, 372, y + 14, 30, p.rel < -20 ? 'angry' : p.rel > 30 ? 'happy' : 'neutral', this.t, false);
        R6.UI.text(ctx, '#' + U.pad(p.num) + ' ' + (p.key ? p.name : ''), 396, y + 12, { size: 14, weight: 800, color: p.key ? '#ffd166' : '#fff' });
        R6.UI.text(ctx, S.lastMem(p) || R6.Roster.ARCH_PT[p.arch] || '', 396, y + 28, { size: 12, color: '#999', maxW: 300 });
        R6.UI.bar(ctx, 720, y + 8, 120, 8, (p.rel + 100) / 200, { color: tg.c, mark: 0.5 });
        R6.UI.text(ctx, tg.t, 920, y + 16, { size: 12, align: 'right', weight: 800, color: tg.c });
      });
    }
  }

  // ------------------------------------------------ random events
  const HUB_EVENTS = [
    { id: 'fight', w: 3, can: h => h.bots.filter(b => !b.dead && b.p.rivals.length).length > 1, start(h) {
      const a = U.pick(h.bots.filter(b => !b.dead && b.p.rivals.length && !b.p.key));
      if (!a) return; const b = h.bots.find(x => x !== a && !x.dead && a.p.rivals.includes(x.p.id)) || U.pick(h.bots.filter(x => x !== a && !x.dead));
      a.goTo(h.world, b.x + 22, b.y, true); a.ai.cd = 10; b.ai.cd = 10; b.stop();
      a.say('VOCÊ ROUBOU MEU LUGAR!', 2.5); R6.Audio.sfx('crowdGasp');
      R6.Toast.show('Uma briga começou perto do centro. (E para intervir)', { color: '#ff5a6a' });
      h.events.push({ t: 0, done: false, update(dt) {
        this.t += dt; a.faceTo(b.x, b.y); b.faceTo(a.x, a.y);
        if (this.t % 0.8 < dt) { a.setAnim(Math.random() < 0.5 ? 'punch' : 'push', 0.3); b.setAnim('stagger', 0.3); R6.Audio.sfx('hit', { vol: 0.4 }); }
        const d = U.dist(h.pl.x, h.pl.y, b.x, b.y);
        if (d < 60 && R6.Input.actP('interact') && !this.ask) { this.ask = true; R6.Dialog.show({ who: a.p, text: 'Sai da frente! Isso não é da sua conta!', expr: 'angry', choices: [
          { t: 'Separar os dois', cb: () => { R6.State.addRel(a.p, -8, 'insulted'); R6.State.addRel(b.p, 12, 'helped'); R6.State.karma(1); a.say('…Tá. Dessa vez passa.', 2); this.done = true; } },
          { t: 'Ajudar #' + U.pad(a.p.num) + ' a bater', color: '#ff5a6a', cb: () => { R6.State.addRel(a.p, 12, 'allied'); R6.State.addRel(b.p, -30, 'fought'); R6.State.karma(-2); b.setAnim('fall', 1.2); this.done = true; } },
          { t: 'Não se meter', cb: () => { } },
        ] }); }
        if (this.t > 9) { this.done = true; if (h.guards[0]) { R6.Audio.sfx('whistle', { vol: 0.6 }); R6.Dialog.toast({ name: 'GUARDA', look: h.guards[0].look }, 'Parem. Agora.', 1.8); } }
      } });
    } },
    { id: 'stealfood', w: 2, can: h => h.meal, start(h) {
      const bully = h.bots.find(b => !b.dead && b.p.tr.betray > 0.7 && b.p.tr.str > 0.6) || U.pick(h.bots); const vic = U.pick(h.bots.filter(b => b !== bully && !b.dead && b.p.tr.str < 0.5)) || U.pick(h.bots);
      if (!bully || !vic) return;
      bully.goTo(h.world, vic.x + 20, vic.y, true, () => { bully.setAnim('grab', 0.6); vic.setAnim('stagger', 0.6); vic.say('Ei! Essa é minha comida!', 2.4); bully.say('Agora é minha.', 2.4); });
      R6.Toast.show('#' + U.pad(bully.p.num) + ' está roubando comida de #' + U.pad(vic.p.num) + '. (E para defender)', { color: '#ff5a6a' });
      h.events.push({ t: 0, done: false, update(dt) { this.t += dt; if (U.dist(h.pl.x, h.pl.y, bully.x, bully.y) < 70 && R6.Input.actP('interact') && !this.ask) { this.ask = true; R6.Dialog.show({ who: bully.p, text: 'Quer a comida dele? Vem pegar.', expr: 'angry', choices: [
        { t: 'Defender #' + U.pad(vic.p.num), cb: () => { const win = Math.random() < 0.45 + (R6.State.s.player.karma > 0 ? 0.15 : 0) - bully.p.tr.str * 0.3; if (win) { R6.State.addRel(vic.p, 30, 'protected'); R6.State.addRel(bully.p, -25, 'fought'); R6.State.karma(2); bully.setAnim('stagger', 0.8); R6.Toast.show('Você recuperou a comida.', { color: '#2ec4b6' }); } else { R6.State.addRel(vic.p, 18, 'protected'); R6.State.addRel(bully.p, -20, 'fought'); h.hp -= 15; R6.State.s.player.hp = Math.max(30, R6.State.s.player.hp - 15); h.pl.setAnim('fall', 1); R6.Toast.show('Você apanhou, mas ele lembrou do gesto.', { color: '#ffd166' }); } R6.State.witness(h.world.near(h.pl.x, h.pl.y, 200, x => x.ai).map(x => x.p), 'witness_help', 3); this.done = true; } },
        { t: 'Deixar pra lá', cb: () => { R6.State.remember(vic.p, 'abandoned'); this.done = true; } },
      ] }); } if (this.t > 12) this.done = true; } });
    } },
    { id: 'gift', w: 2, can: h => R6.State.allies(40).some(p => h.bots.some(b => b.p === p)), start(h) {
      const al = h.bots.find(b => !b.dead && b.p.rel >= 40); if (!al) return;
      al.goTo(h.world, h.pl.x + 24, h.pl.y, false, () => { al.faceTo(h.pl.x, h.pl.y); R6.Dialog.show({ who: al.p, text: U.pick(['Guardei isso pra você. Você precisa comer.', 'Toma. Você me ajudou antes.', 'Não conta pra ninguém. Pão extra.']), expr: 'happy', onDone: () => R6.State.give('bread') }); });
    } },
    { id: 'rumor', w: 2, can: h => h.bots.some(b => b.p.tr.intel > 0.8 && b.p.rel >= 10), start(h) {
      const s = h.bots.find(b => !b.dead && b.p.tr.intel > 0.8 && b.p.rel >= 10); if (!s) return;
      const hints = h.cfg.rumors || ['Os guardas conversam entre si com números. O quadrado manda nos círculos.', 'Dizem que um dos jogadores entrou por vontade própria. Sem dívida nenhuma.', 'A porta vermelha no canto leva para a sala dos guardas.'];
      s.goTo(h.world, h.pl.x - 24, h.pl.y, false, () => { s.faceTo(h.pl.x, h.pl.y); R6.Dialog.show({ who: s.p, text: '(sussurrando) ' + U.pick(hints), expr: 'neutral', onDone: () => { if (h.cfg.rumorFlag) R6.State.flag(h.cfg.rumorFlag, true); } }); });
    } },
    { id: 'plea', w: 2, can: h => h.bots.some(b => (b.p.fear || 0) > 0.55), start(h) {
      const s = h.bots.find(b => !b.dead && (b.p.fear || 0) > 0.55 && !b.p.key) || U.pick(h.bots); if (!s) return;
      s.goTo(h.world, h.pl.x + 24, h.pl.y + 6, false, () => { s.faceTo(h.pl.x, h.pl.y); s.setAnim('cry', 3); R6.Dialog.show({ who: s.p, text: 'Por favor… posso ficar perto de você esta noite? Eu não consigo parar de tremer.', expr: 'cry', choices: [
        { t: 'Claro. Fica aqui.', cb: () => { R6.State.addRel(s.p, 22, 'comforted'); s.p.fear = Math.max(0, (s.p.fear || 0) - 0.3); R6.State.karma(1); } },
        { t: 'Cada um cuida de si.', cb: () => { R6.State.addRel(s.p, -12, 'abandoned'); } },
      ] }); });
    } },
    { id: 'alliance', w: 2, can: h => true, start(h) {
      const g = h.bots.filter(b => !b.dead && !b.p.key).slice(0, 40); const leader = g.find(b => b.p.tr.courage > 0.7) || g[0]; if (!leader) return;
      leader.goTo(h.world, h.pl.x + 26, h.pl.y, false, () => { leader.faceTo(h.pl.x, h.pl.y); R6.Dialog.show({ who: leader.p, text: 'Estamos formando um grupo. Os mais fortes vão atacar à noite. Se você estiver com a gente, a gente te protege.', choices: [
        { t: 'Entrar no grupo', cb: () => { R6.State.addRel(leader.p, 25, 'allied'); leader.p.allied = true; for (const f of leader.p.friends) { const p = R6.State.roster[f]; if (p && p.alive) R6.State.addRel(p, 12, 'allied', { silent: true }); } R6.Toast.show('Você entrou num grupo.', { color: '#2ec4b6' }); } },
        { t: 'Recusar', cb: () => R6.State.addRel(leader.p, -5, null, { silent: true }) },
      ] }); });
    } },
    { id: 'betrayal', w: 1, can: h => Object.keys(R6.State.s.player.inv).length > 0 && R6.State.allies(20).some(p => p.tr.betray > 0.65), start(h) {
      const tr = R6.State.allies(20).find(p => p.tr.betray > 0.65); const inv = Object.keys(R6.State.s.player.inv); const it = U.pick(inv);
      R6.State.take(it); R6.State.addRel(tr, -10, 'betrayed', { silent: true }); R6.State.flag('betrayed_by_' + (tr.key || tr.num), true);
      R6.Toast.show('Sumiu: ' + (R6.ITEMS[it] ? R6.ITEMS[it].name : it) + '. Você viu #' + U.pad(tr.num) + ' perto do seu beliche…', { color: '#ff3b5c', icon: 'x', dur: 5 });
    } },
    { id: 'switch', w: 1, can: h => h.bots.length > 10, start(h) {
      const b = U.pick(h.bots.filter(x => !x.dead && x.p.friends.length)); if (!b) return;
      b.say('Cansei de vocês. Vou para o outro grupo.', 3); const old = b.p.friends.slice(); b.p.friends = []; for (const f of old) { const p = R6.State.roster[f]; if (p) p.rivals.push(b.p.id); }
      R6.Toast.show('#' + U.pad(b.p.num) + ' abandonou o grupo dele.', { color: '#ffd166' });
    } },
    { id: 'guards', w: 1, can: h => true, start(h) {
      R6.Audio.sfx('doorSlam'); R6.Audio.sfx('whistle', { delay: 0.5, vol: 0.5 });
      const b = U.pick(h.bots.filter(x => !x.dead && !x.p.key)); if (!b) return;
      R6.Dialog.announce('#' + U.pad(b.p.num) + ', compareça à área restrita.', null, 2.4);
      b.canOpenDoors = true; const d = h.D.sealed; d.locked = false; h.map.setDoor(d, true);
      b.goTo(h.world, (MW - 6) * TS, 9 * TS, false, () => { b.visible = false; b.solid = false; h.map.setDoor(d, false); d.locked = true; b.p.flags = (b.p.flags || 0) | 1; });
      h.bots.forEach(x => { if (U.dist(x.x, x.y, b.x, b.y) < 300 && Math.random() < 0.4) x.say(U.pick(['Pra onde levaram ele?', 'Ele não vai voltar.', 'Por que ele?']), 2.4); });
    } },
    { id: 'prayer', w: 1, can: h => true, start(h) {
      const p = U.pick(h.bots.filter(x => !x.dead && !x.p.key)); if (!p) return;
      p.goTo(h.world, h.D.pig.x, h.D.pig.y + 80, false, () => { p.idleAnim = 'kneel'; p.say('Rezem comigo! Só a fé vai nos tirar daqui!', 3); });
      h.bots.filter(x => U.dist(x.x, x.y, h.D.pig.x, h.D.pig.y) < 300).forEach(x => { if (Math.random() < 0.3) x.say(U.pick(['Cala a boca!', 'Amém…', 'Deus não está aqui.']), 2.4); });
    } },
  ];
  R6.HUB_EVENTS = HUB_EVENTS;
  R6.HubScene = HubScene;
})();
