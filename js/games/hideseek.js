/* ROUND 6 — hideseek.js : Hide and Seek (Season 3) — dark procedural maze, shaped keys & doors, exits, hiding spots,
   creaky floors, fake exits, hearing footsteps, flashlights. Play as BLUE (hider) or RED (seeker). Hider & seeker AI.
   Secret service door (master key) enables the early-escape route. Variant: extreme */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU, T = R6.T;
  const SHAPES = ['circle', 'triangle', 'square'];

  class HideSeek extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'hideseek'; this.name = 'hideseek';
      this.extreme = opts.variant === 'extreme';
      this.role = opts.role || null; this.stage = this.role ? 'rules' : 'draw';
      const M = R6.genMaze({ cols: 12, rows: 8, cell: 6, corr: 3, roomy: true, roomChance: 0.3, loops: 0.22, seed: opts.seed || 3100 + (R6.State.s ? R6.State.s.seed : 0), zone: (cx, cy) => (cx + cy) % 5, wallStyle: (cx, cy) => [1, 2, 3, 4, 8][(cx * 3 + cy) % 5] });
      this.M = M; this.map = M.map;
      this.world = new R6.World({ map: this.map });
      this.cam = new R6.Camera({ bounds: { x: 0, y: -40, w: this.map.pw, h: this.map.ph + 40 } });
      this.noise = new R6.Noises(); this.timeLimit = R6.Save.D(360, 300, 250) * (this.extreme ? 0.85 : 1); this.timeLeft = this.timeLimit;
      this.decorate();
    }
    rules() {
      if (this.stage === 'draw') return null;
      const hider = this.role === 'hider';
      return {
        title: this.extreme ? 'HIDE AND SEEK EXTREME' : 'ESCONDE-ESCONDE', icon: hider ? 'circle' : 'triangle', sub: hider ? 'VOCÊ É AZUL — ESCONDIDO (CHAVE)' : 'VOCÊ É VERMELHO — CAÇADOR (FACA)',
        lines: hider ? ['Encontre uma SAÍDA verdadeira ou sobreviva até o fim do tempo.', 'Portas marcadas com formas só abrem com a chave certa. Sua chave: veja no HUD.', 'E perto de outro azul: pedir que ele abra uma porta com a chave dele.', 'Esconda-se em armários (E). C = agachar (silencioso). Assoalho que range faz barulho.', 'Os círculos mostram passos que você OUVE. Se for agarrado: aperte ESPAÇO repetidamente.']
          : ['Você precisa eliminar PELO MENOS UM escondido antes do tempo acabar — ou será eliminado.', 'A lanterna segue o mouse. Os círculos mostram passos que você ouve.', 'E perto de um armário: verificar. E perto de um azul: pegar.', 'Os escondidos correm para as saídas. Cuidado com portas trancadas.'],
        keys: hider ? [['WASD', 'mover'], ['C', 'agachar'], ['E', 'porta/esconder/pedir chave'], ['Q', 'distrair']] : [['WASD', 'mover'], ['MOUSE', 'lanterna'], ['E', 'pegar/verificar'], ['SHIFT', 'correr']],
      };
    }
    decorate() {
      const M = this.M, map = this.map;
      // doors with shape locks on ~40% of links (never the first links out of start)
      this.doorList = [];
      for (const L of M.links) {
        if (M.rng.next() > 0.42) continue;
        if ((L[0] === 0 && L[1] === M.rows - 1) || (L[2] === 0 && L[3] === M.rows - 1)) continue;
        const d = R6.corridorDoor(M, L); const key = U.pick(SHAPES);
        const group = [];
        for (let k = 0; k < d.len; k++) { const tx = d.horiz ? d.tx + k : d.tx, ty = d.horiz ? d.ty : d.ty + k; if (map.get(tx, ty) === T.FLOOR) group.push(map.addDoor(tx, ty, { locked: true, key, color: { circle: '#2f6fd1', triangle: '#d1a02f', square: '#8a2fd1' }[key], horiz: d.horiz })); }
        group.forEach(dd => dd.group = group); this.doorList.push(group);
      }
      // exits: 2 real, 2 fake, in far cells
      const far = U.shuffle(M.cells.filter(c => c.cx >= M.cols - 4 || c.cy <= 1)).slice(0, 4);
      this.exits = far.map((c, i) => ({ x: c.center.x, y: c.center.y, real: i < 2, cell: c, opened: false }));
      // hiding spots (closets) in rooms
      this.spots = [];
      for (const c of M.cells) { if (!c.big && M.rng.next() > 0.3) continue; const n = c.big ? 2 : 1; for (let i = 0; i < n; i++) { const tx = c.x + M.rng.int(0, c.w - 1), ty = c.y; const p = map.center(tx, ty); this.spots.push({ x: p.x, y: p.y - 6, occ: null, checkedT: 0 }); } }
      // creaky floor tiles
      this.creaky = new Set(); for (let i = 0; i < 90; i++) { const c = U.pick(M.cells); const tx = c.x + M.rng.int(0, c.w - 1), ty = c.y + M.rng.int(0, c.h - 1); this.creaky.add(ty * map.w + tx); }
      // service door (master key) — early escape
      const sc = M.cellAt(M.cols - 1, M.rows - 1); this.service = { x: sc.center.x, y: sc.center.y + 10, cell: sc };
      // lights (some flicker)
      this.lamps = M.cells.filter((c, i) => i % 4 === 0).map(c => ({ x: c.center.x, y: c.center.y, flick: M.rng.chance(0.35) }));
      map.buildFloor((c, x, y, ts, s, tx, ty, v) => { R6.Floors.maze(c, x, y, ts, s, tx, ty, v); if (this.creaky.has(ty * map.w + tx)) { c.strokeStyle = 'rgba(90,60,30,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 4, y + 10); c.lineTo(x + ts - 4, y + 12); c.moveTo(x + 6, y + 20); c.lineTo(x + ts - 6, y + 19); c.stroke(); } });
      // objects
      for (const s of this.spots) this.world.objects.push({ x: s.x, y: s.y, sy: s.y + 4, draw: (c) => { c.fillStyle = '#6e5238'; c.fillRect(s.x - 15, s.y - 46, 30, 50); c.fillStyle = '#5a412c'; c.fillRect(s.x - 15, s.y - 46, 30, 5); c.strokeStyle = '#3a2a1c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(s.x, s.y - 40); c.lineTo(s.x, s.y + 2); c.stroke(); c.fillStyle = '#d6b640'; c.fillRect(s.x + 3, s.y - 22, 2, 5); c.fillRect(s.x - 5, s.y - 22, 2, 5); if (s.occ && s.occ.isPlayer) { c.fillStyle = 'rgba(46,196,182,.5)'; c.fillRect(s.x - 15, s.y - 46, 30, 3); } } });
      for (const e of this.exits) this.world.objects.push({ x: e.x, y: e.y, sy: e.y - 30, draw: (c) => { c.fillStyle = '#1a1c20'; c.fillRect(e.x - 26, e.y - 70, 52, 60); c.fillStyle = e.opened ? (e.real ? '#dfffe9' : '#240a0a') : '#2d6b3e'; c.fillRect(e.x - 22, e.y - 66, 44, 56); R6.UI.text(c, 'SAÍDA', e.x, e.y - 76, { size: 13, align: 'center', color: '#7dffa8', weight: 800 }); } });
      this.world.objects.push({ x: this.service.x, y: this.service.y, sy: this.service.y - 30, draw: (c) => { const s = this.service; c.fillStyle = '#2a2a30'; c.fillRect(s.x - 20, s.y - 64, 40, 56); c.fillStyle = s.opened ? '#fff6d0' : '#50505a'; c.fillRect(s.x - 16, s.y - 60, 32, 50); R6.UI.text(c, 'SERVIÇO', s.x, s.y - 70, { size: 11, align: 'center', color: '#bbb', weight: 800 }); } });
    }
    // role draw (ball machine)
    drawBall(choice) {
      const r = this.extreme ? 'hider' : (Math.random() < 0.5 ? 'hider' : 'seeker');
      this.role = r; this.ballAnim = { t: 0, ball: choice };
      if (this.campaign) R6.State.decide('hideseek_role', r, r === 'hider' ? 'Azul' : 'Vermelho');
      R6.Audio.sfx('marble');
      R6.Engine.after(1.6, () => { this.stage = 'rules'; this.phase = 'rules'; this.rulesT = 0; this.setup(); });
    }
    setup() {
      if (this.built) return; this.built = true;
      const S = R6.State, M = this.M, map = this.map;
      const look = Object.assign({}, S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 }), { vest: this.role === 'hider' ? 'blue' : 'red' });
      const start = this.role === 'hider' ? M.start : M.cellAt(0, 0);
      this.pl = this.world.add(new R6.Actor({ p: S.s ? S.player : null, look, x: start.center.x, y: start.center.y, isPlayer: true, speed: 92, runSpeed: 158, id: 'player' }));
      this.myKey = this.role === 'hider' ? U.pick(SHAPES) : null;
      this.pl.item = this.role === 'hider' ? 'key' : 'knife';
      this.cam.set(this.pl.x, this.pl.y, 1.3);
      // participants
      let people = this.campaign && S.s ? U.shuffle(S.aliveBots()) : Array.from({ length: this.extreme ? 22 : 26 }, (_, i) => { const tr = { courage: Math.random(), intel: Math.random(), fear: Math.random(), spd: Math.random(), str: Math.random(), kindness: Math.random(), betray: Math.random(), chaos: Math.random() * 0.5 }; return { num: 10 + i * 13, look: R6.Char.makeLook({ num: 10 + i * 13 }), tr, rel: U.randi(-20, 40), fake: true, alive: true }; });
      // story: key hiders are hiders (mother & soldier), the betrayers end up hiders too (can be hunted)
      const forceH = new Set(['mother', 'soldier', 'mom', 'crypto']); const forceS = new Set(['son', 'elder', 'rapper']);
      this.hiders = []; this.seekers = [];
      const nSeek = Math.round(people.length * (this.extreme ? 0.55 : 0.5)) - (this.role === 'seeker' ? 1 : 0);
      people.sort((a, b) => (forceS.has(b.key) ? 1 : 0) - (forceS.has(a.key) ? 1 : 0) || (forceH.has(a.key) ? 1 : 0) - (forceH.has(b.key) ? 1 : 0));
      people.forEach((p, i) => {
        const seek = i < nSeek && !forceH.has(p.key) || forceS.has(p.key);
        const c = seek ? M.cellAt(U.randi(0, 1), U.randi(0, 1)) : M.cellAt(U.randi(0, 1), M.rows - 1 - U.randi(0, 1));
        const lk = Object.assign({}, p.look, { vest: seek ? 'red' : 'blue' });
        const a = this.world.add(new R6.Actor({ p: p.fake ? null : p, look: lk, x: c.center.x + U.rand(-30, 30), y: c.center.y + U.rand(-30, 30), speed: seek ? 70 + p.tr.spd * 25 : 72 + p.tr.spd * 25, runSpeed: 130 + p.tr.spd * 45 }));
        a.bot = p; a.team = seek ? 'seek' : 'hide'; a.item = seek ? 'knife' : 'key'; a.canOpenDoors = true;
        a.ai = { state: 'wait', t: U.rand(0, 3), key: U.pick(SHAPES), facing: 0, kills: 0, target: null, hideT: 0, route: null };
        a.brain = (x, dt) => seek ? this.seekBrain(x, dt) : this.hideBrain(x, dt);
        if (!seek) a.doorKey = a.ai.key;
        (seek ? this.seekers : this.hiders).push(a);
      });
      this.hasMaster = S.s && S.has('master_key');
      // seekers are released after a head start
      this.release = R6.Save.D(14, 11, 8);
    }
    begin() {
      R6.Music.play('dread'); R6.Music.setIntensity(0.3); R6.Audio.loop('hum', 0.35);
      R6.Dialog.announce(this.role === 'hider' ? 'Os azuis têm uma vantagem de ' + this.release + ' segundos. Escondam-se.' : 'Os vermelhos serão liberados em ' + this.release + ' segundos. Cada vermelho precisa eliminar ao menos um azul.', null, 3);
    }
    focus() { const p = this.pl || { x: this.map.pw / 2, y: this.map.ph / 2 }; const s = this.cam.toScreen(p.x, p.y); return { x: s.x, y: s.y, look: this.pl ? this.pl.look : null, scale: 0.46 * this.cam.zoom, facing: 1 }; }
    // ---------------- helpers ----------------
    doorNear(x, y, r = 1) { const t0 = this.map.tileOf(x, y); for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) { const d = this.map.doorAt(t0.tx + ox, t0.ty + oy); if (d) return d; } return null; }
    openGroup(d, open) { (d.group || [d]).forEach(x => { if (open) x.locked = false; this.map.setDoor(x, open); }); R6.Audio.sfx(open ? 'door' : 'doorSlam', { vol: 0.5 }); this.noise.add(d.tx * 32 + 16, d.ty * 32 + 16, 160); }
    visibleTo(seeker, target) {
      if (target.hidden) return false;
      const dx = target.x - seeker.x, dy = target.y - seeker.y, d = Math.hypot(dx, dy);
      const lit = this.flash(seeker);
      const range = lit ? 300 : 110; if (d > range) return false;
      if (lit && d > 40 && Math.abs(U.angDiff(seeker.ai ? seeker.ai.facing : this.plFacing, Math.atan2(dy, dx))) > 0.55) return false;
      return this.map.los(seeker.x, seeker.y - 10, target.x, target.y - 10);
    }
    flash(a) { return a.team === 'seek' || (a === this.pl && this.role === 'seeker'); }
    killHider(h, by) {
      if (h.dead) return;
      h.kill(); R6.Audio.sfx('hitHeavy'); R6.Audio.sfx('scream', { vol: 0.6 }); this.world.fx.emit('ink', h.x, h.y - 16, 8);
      if (by && by.ai) by.ai.kills++;
      if (h === this.pl) { if (this.campaign) R6.State.eliminate(R6.State.player, 'hideseek'); this.lose({ reason: 'Você foi pego' }); return; }
      if (h.bot && !h.bot.fake) R6.Elim.kill(h.bot, { cause: 'hideseek', sfx: false, host: this, silent: U.dist(h.x, h.y, this.pl.x, this.pl.y) > 500 });
      if (by === this.pl) { this.myKills = (this.myKills || 0) + 1; if (h.bot && !h.bot.fake) { R6.State.karma(-2); if (h.bot.key) R6.State.flag('killed_' + h.bot.key, true); } R6.Toast.show('Você eliminou #' + U.pad(h.bot ? h.bot.num : 0), { color: '#ff5a6a' }); }
    }
    // ---------------- hider AI ----------------
    hideBrain(a, dt) {
      const ai = a.ai; ai.t += dt;
      if (this.phase !== 'play' || a.dead) { a.steer(0, 0); return; }
      if (a.escaped) return;
      // threat detection (hearing + seeing)
      let threat = null, td = 1e9;
      for (const s of this.seekers.concat(this.role === 'seeker' && this.pl && !this.pl.dead ? [this.pl] : [])) { if (s.dead || this.release > 0) continue; const d = U.dist(s.x, s.y, a.x, a.y); if (d < td && (d < 170 || (d < 320 && this.map.los(a.x, a.y, s.x, s.y)))) { td = d; threat = s; } }
      if (a.hidden) { ai.hideT -= dt; if (ai.hideT <= 0 && (!threat || td > 260)) this.unhide(a); return; }
      if (threat) {
        if (td < 140 && a.bot.tr.fear > 0.4 && !ai.fleeing) { const sp = this.nearestSpot(a, 200); if (sp && Math.random() < 0.6) { this.hideIn(a, sp); return; } }
        ai.fleeing = true; ai.fleeT = 2.5;
        const ang = Math.atan2(a.y - threat.y, a.x - threat.x) + U.rand(-0.6, 0.6);
        if (!a.path || Math.random() < dt * 2) { const p = this.map.nearestFree(a.x + Math.cos(ang) * 160, a.y + Math.sin(ang) * 160); a.goTo(this.world, p.x, p.y, true); }
        if (Math.random() < dt * 4) this.noise.add(a.x, a.y, 130, { color: '120,170,255' });
        return;
      }
      if (ai.fleeT > 0) { ai.fleeT -= dt; if (ai.fleeT <= 0) ai.fleeing = false; }
      // head to an exit; open doors with own key or wait
      if (!ai.goal) { const ex = U.pick(this.exits); ai.goal = ex; ai.path = null; }
      if (!a.path && ai.goal) {
        const ok = a.goTo(this.world, ai.goal.x, ai.goal.y, false);
        if (!ok) { a.stop(); const c = U.pick(this.M.cells); a.goTo(this.world, c.center.x, c.center.y, false); ai.goal = null; }
      }
      // blocked by a locked door?
      const d = this.doorNear(a.x, a.y, 1);
      if (d && d.locked && !d.open) { if (d.key === ai.key) { this.openGroup(d, true); a.emo('!', 0.8); } else if (Math.random() < dt * 0.5) { ai.goal = U.pick(this.exits.concat(this.spots.length ? [] : [])); a.stop(); } }
      if (d && !d.locked && !d.open) this.openGroup(d, true);
      // reached exit
      if (ai.goal && U.dist(a.x, a.y, ai.goal.x, ai.goal.y) < 30) {
        if (ai.goal.real) { a.escaped = true; a.visible = false; a.solid = false; ai.goal.opened = true; if (a.bot && !a.bot.fake) a.bot.escapedHS = true; }
        else { ai.goal.opened = true; ai.goal = null; a.emo('?', 1); }
      }
      if (Math.random() < dt * 0.15 && a.bot.tr.fear > 0.6) { const sp = this.nearestSpot(a, 180); if (sp) this.hideIn(a, sp); }
      if (a.spd > 20 && Math.random() < dt * 1.2) this.noise.add(a.x, a.y, a.running ? 150 : 70, { color: '120,170,255' });
    }
    nearestSpot(a, r) { let best = null, bd = r; for (const s of this.spots) { if (s.occ) continue; const d = U.dist(s.x, s.y, a.x, a.y); if (d < bd && this.map.los(a.x, a.y, s.x, s.y)) { bd = d; best = s; } } return best; }
    hideIn(a, s) { a.goTo(this.world, s.x, s.y + 12, true, () => { if (s.occ) return; s.occ = a; a.hidden = s; a.visible = false; a.solid = false; if (a.ai) a.ai.hideT = U.rand(6, 16); R6.Audio.sfx('door', { vol: 0.3 }); }); }
    unhide(a) { const s = a.hidden; if (!s) return; s.occ = null; a.hidden = null; a.visible = true; a.solid = true; a.x = s.x; a.y = s.y + 16; R6.Audio.sfx('door', { vol: 0.3 }); }
    // ---------------- seeker AI ----------------
    seekBrain(a, dt) {
      const ai = a.ai; ai.t += dt;
      if (this.phase !== 'play' || a.dead) { a.steer(0, 0); return; }
      if (this.release > 0) { a.steer(0, 0); return; }
      const sp = a.spd; if (sp > 10) ai.facing = U.lerp(ai.facing, ai.facing + U.angDiff(ai.facing, Math.atan2(a.vy, a.vx)), Math.min(1, dt * 6)); else ai.facing += dt * 0.9;
      // look for hiders (including player)
      const cands = this.hiders.concat(this.role === 'hider' && this.pl ? [this.pl] : []).filter(h => !h.dead && !h.escaped);
      let tgt = null, bd = 1e9;
      for (const h of cands) { if (this.visibleTo(a, h)) { const d = U.dist(h.x, h.y, a.x, a.y); if (d < bd) { bd = d; tgt = h; } } }
      if (tgt) { ai.target = tgt; ai.last = { x: tgt.x, y: tgt.y }; ai.state = 'chase'; }
      if (ai.state === 'chase') {
        const h = ai.target;
        if (!h || h.dead || h.escaped || h.hidden && !ai.sawHide) { ai.state = 'search'; ai.searchT = 5; }
        else {
          ai.re = (ai.re || 0) - dt; if (ai.re <= 0) { ai.re = 0.4; a.goTo(this.world, ai.last.x, ai.last.y, true); }
          if (U.dist(h.x, h.y, a.x, a.y) < 24) {
            if (h === this.pl) this.startStruggle(a);
            else this.killHider(h, a);
            ai.state = 'patrol'; ai.target = null;
          }
          if (!tgt && !a.path) { ai.state = 'search'; ai.searchT = 5; }
        }
      } else if (ai.state === 'search') {
        ai.searchT -= dt;
        if (!a.path) { const p = this.map.nearestFree(a.x + U.rand(-160, 160), a.y + U.rand(-160, 160)); a.goTo(this.world, p.x, p.y, false); }
        // check nearby closets
        for (const s of this.spots) if (U.dist(s.x, s.y, a.x, a.y) < 40 && s.checkedT <= 0 && Math.random() < dt * (0.8 + a.bot.tr.intel)) { s.checkedT = 8; a.emo('?', 0.8); R6.Audio.sfx('door', { vol: 0.25 }); if (s.occ) { const h = s.occ; this.unhide(h); if (h === this.pl) { this.plHidden = null; this.startStruggle(a); } else this.killHider(h, a); } }
        if (ai.searchT <= 0) ai.state = 'patrol';
      } else {
        if (!a.path) { const c = U.pick(this.M.cells); a.goTo(this.world, c.center.x, c.center.y, false); }
        for (const s of this.spots) if (U.dist(s.x, s.y, a.x, a.y) < 40 && s.checkedT <= 0 && Math.random() < dt * 0.5 * (0.5 + a.bot.tr.intel)) { s.checkedT = 10; R6.Audio.sfx('door', { vol: 0.2 }); if (s.occ) { const h = s.occ; this.unhide(h); if (h === this.pl) { this.plHidden = null; this.startStruggle(a); } else this.killHider(h, a); } }
      }
      // doors: seekers can open unlocked closed doors
      const d = this.doorNear(a.x, a.y, 1); if (d && !d.locked && !d.open) this.openGroup(d, true);
      if (sp > 20 && Math.random() < dt * 1.3) this.noise.add(a.x, a.y, a.running ? 170 : 90, { color: '255,120,120' });
    }
    hearNoise(x, y, r) { for (const s of this.seekers) { if (s.dead || s.ai.state === 'chase') continue; if (U.dist(s.x, s.y, x, y) < r) { s.ai.state = 'search'; s.ai.searchT = 6; s.goTo(this.world, x, y, true); s.emo('?', 1); } } }
    startStruggle(seeker) {
      if (this.struggle || this.result) return;
      this.struggle = { seeker, t: 0, need: R6.Save.D(8, 11, 14), n: 0 }; seeker.stop(); seeker.setAnim('grab', 0); this.pl.setAnim('grabbed', 0); R6.Audio.sfx('grab'); R6.Engine.slowmo(0.6, 0.4);
    }
    // ---------------- update ----------------
    update(dt) {
      this.t += dt;
      if (this.stage === 'draw') { if (this.ballAnim) this.ballAnim.t += dt; else { const I = R6.Input; if (I.actP('left')) this.ballSel = 0; if (I.actP('right')) this.ballSel = 1; const m = I.mouse; if (m.pressed && this.ballRects) this.ballRects.forEach((r, i) => { if (U.rectHit(m.x, m.y, r)) this.drawBall(i); }); if (I.actP('confirm')) this.drawBall(this.ballSel || 0); } return; }
      if (!this.built) this.setup();
      this.world.update(dt); this.noise.update(dt);
      for (const s of this.spots) if (s.checkedT > 0) s.checkedT -= dt;
      if (this.updateResult(dt)) { this.cam.update(dt); return; }
      if (this.updateRules(dt)) { this.cam.set(this.pl.x, this.pl.y, 1.3); return; }
      this.timeLeft -= dt; if (this.release > 0) { this.release -= dt; if (this.release <= 0) { R6.Audio.sfx('buzzer'); R6.Toast.show('Os vermelhos foram liberados!', { color: '#ff3b5c' }); } }
      if (this.struggle) this.updStruggle(dt);
      else this.updPlayer(dt);
      if (this.timeLeft <= 0) this.timeUp();
      const threat = this.role === 'hider' && this.seekers.some(s => !s.dead && s.ai.state === 'chase' && s.ai.target === this.pl);
      R6.Music.setIntensity(threat ? 1 : 0.35 + (this.timeLeft < 60 ? 0.3 : 0));
      this.cam.follow(this.pl.x, this.pl.y - 10, this.plHidden ? 1.6 : 1.3); this.cam.update(dt);
    }
    updStruggle(dt) {
      const S = this.struggle; S.t += dt;
      if (R6.Input.actP('action')) { S.n++; R6.Audio.sfx('hit', { vol: 0.4 }); this.cam.shake(3, 0.1); }
      if (S.n >= S.need) { this.struggle = null; S.seeker.stun = 2; S.seeker.clearAnim(); S.seeker.setAnim('stagger', 0.8); this.pl.clearAnim(); R6.Toast.show('Você se soltou! CORRA!', { color: '#2ec4b6' }); const ang = Math.atan2(S.seeker.y - this.pl.y, S.seeker.x - this.pl.x); S.seeker.vx += Math.cos(ang) * 200; S.seeker.vy += Math.sin(ang) * 200; }
      else if (S.t > 2.4) { this.struggle = null; this.pl.clearAnim(); this.killHider(this.pl, S.seeker); }
    }
    updPlayer(dt) {
      const I = R6.Input, pl = this.pl; if (pl.dead) return;
      // hidden in a closet
      if (this.plHidden) { pl.steer(0, 0); if (I.actP('interact') || I.axis().x || I.axis().y) { this.unhide(pl); this.plHidden = null; } return; }
      const sneak = I.act('sneak'), run = I.act('run') && !sneak;
      const ax = I.axis(); pl.steer(ax.x, ax.y, run); pl.slow = sneak ? 0.55 : 1; pl.idleAnim = sneak ? 'crouch' : 'idle';
      if (sneak && pl.spd > 5) pl.setAnim('sneak', 0.1);
      this.plFacing = Math.atan2(this.cam.toWorld(I.mouse.x, I.mouse.y).y - pl.y, this.cam.toWorld(I.mouse.x, I.mouse.y).x - pl.x);
      if (pl.spd > 12) {
        const tile = this.map.tileOf(pl.x, pl.y); const creak = this.creaky.has(tile.ty * this.map.w + tile.tx);
        this.stepT = (this.stepT || 0) + dt;
        if (creak && this.lastCreak !== tile.tx + ',' + tile.ty) { this.lastCreak = tile.tx + ',' + tile.ty; R6.Audio.sfx('squeak', { vol: 0.5 }); this.noise.add(pl.x, pl.y, 230, { color: '255,210,120' }); if (this.role === 'hider') this.hearNoise(pl.x, pl.y, 230); }
        if (!sneak && this.stepT > (run ? 0.3 : 0.5)) { this.stepT = 0; const r = run ? 180 : 75; this.noise.add(pl.x, pl.y, r); if (this.role === 'hider') this.hearNoise(pl.x, pl.y, r); }
      }
      if (I.actP('interact')) this.interact();
      if (I.actP('alt') && this.role === 'hider' && !(this.thrown) && (this.stones == null || this.stones > 0)) { this.stones = (this.stones == null ? 3 : this.stones) - 1; const m = this.cam.toWorld(I.mouse.x, I.mouse.y); this.thrown = { x0: pl.x, y0: pl.y - 20, x1: m.x, y1: m.y, t: 0 }; }
      if (this.thrown) { const th = this.thrown; th.t += dt * 2.5; if (th.t >= 1) { this.noise.add(th.x1, th.y1, 260, { color: '255,220,120' }); R6.Audio.sfx('stepHard'); this.hearNoise(th.x1, th.y1, 300); this.thrown = null; } }
      // exits / service door
      if (this.role === 'hider') {
        for (const e of this.exits) if (U.dist(pl.x, pl.y, e.x, e.y) < 30) { if (e.real) { e.opened = true; this.escape(); return; } else if (!e.opened) { e.opened = true; R6.Audio.sfx('error'); R6.Toast.show('Saída falsa! É só um armário vazio.', { color: '#ff5a6a' }); } }
      }
    }
    interact() {
      const pl = this.pl; const d = this.doorNear(pl.x, pl.y, 1);
      if (this.hasMaster && U.dist(pl.x, pl.y, this.service.x, this.service.y) < 44 && !this.service.opened) {
        R6.Dialog.show({ who: null, text: 'A chave-mestra gira na fechadura da porta de SERVIÇO. Do outro lado, um corredor escuro — e o cheiro do mar.', choices: [
          { t: 'Fugir agora (abandonar o jogo)', cb: () => { this.service.opened = true; R6.State.flag('early_escape', true); R6.State.decide('early_escape', 'yes', 'Fugiu pela porta de serviço'); this.chips = 100; this.win({ title: 'FUGA', sub: 'VOCÊ SAIU PELA PORTA DE SERVIÇO', wait: 2.6 }); } },
          { t: 'Ainda não. Fechar a porta.', cb: () => { } },
        ] });
        return;
      }
      if (this.role === 'seeker') {
        const h = this.hiders.find(h => !h.dead && !h.escaped && !h.hidden && U.dist(h.x, h.y, pl.x, pl.y) < 34);
        if (h) { pl.setAnim('punch', 0.3); pl.faceTo(h.x, h.y); this.killHider(h, pl); return; }
        const s = this.spots.find(s => U.dist(s.x, s.y, pl.x, pl.y) < 42);
        if (s) { R6.Audio.sfx('door', { vol: 0.5 }); if (s.occ) { const h = s.occ; this.unhide(h); h.stun = 0.8; h.emo('!', 1); R6.Toast.show('Achei!', { color: '#ff5a6a' }); } else R6.Toast.show('Vazio.', { color: '#aaa' }); return; }
        if (d && !d.locked) this.openGroup(d, !d.open);
        return;
      }
      // hider: closet
      const s = this.spots.find(s => !s.occ && U.dist(s.x, s.y, pl.x, pl.y) < 42);
      if (s) { s.occ = pl; pl.hidden = s; this.plHidden = s; pl.visible = false; R6.Audio.sfx('door', { vol: 0.4 }); return; }
      if (d) {
        if (!d.locked) { this.openGroup(d, !d.open); return; }
        if (d.key === this.myKey) { this.openGroup(d, true); R6.Toast.show('Sua chave abriu a porta.', { color: '#2ec4b6' }); return; }
        const helper = this.hiders.find(h => !h.dead && !h.hidden && !h.escaped && h.ai.key === d.key && U.dist(h.x, h.y, pl.x, pl.y) < 220);
        if (helper) {
          const willing = !helper.bot.fake ? helper.bot.rel > -20 : true;
          if (willing) { helper.goTo(this.world, d.tx * 32 + 16, d.ty * 32 + 16, true, () => { this.openGroup(d, true); helper.say('Vai, rápido!', 1.5); }); helper.say('Eu tenho essa chave!', 1.5); if (!helper.bot.fake) R6.State.addRel(helper.bot, 3, 'teamed', { silent: true }); }
          else helper.say('Se vira sozinho.', 1.6);
        } else R6.Toast.show('Porta trancada (' + ({ circle: 'CÍRCULO', triangle: 'TRIÂNGULO', square: 'QUADRADO' }[d.key]) + '). Ache um azul com essa chave.', { color: '#ff5a6a' });
      }
    }
    escape() {
      if (this.result) return;
      this.chips = 110; if (this.campaign) R6.State.flag('hs_escaped', true);
      this.pl.visible = false; this.finishOthers(); this.win({ sub: 'VOCÊ ENCONTROU A SAÍDA' });
    }
    timeUp() {
      if (this.result) return;
      if (this.role === 'seeker' && !(this.myKills > 0)) { if (this.campaign) R6.State.eliminate(R6.State.player, 'hideseek'); this.lose({ reason: 'Você não eliminou ninguém' }); return; }
      this.finishOthers(); this.chips = 100; this.win({ sub: this.role === 'hider' ? 'VOCÊ SOBREVIVEU ATÉ O FIM' : 'VOCÊ CUMPRIU A REGRA' });
    }
    finishOthers() {
      // seekers without a kill are eliminated
      if (!this.campaign) return;
      for (const s of this.seekers) if (!s.dead && s.ai.kills === 0 && s.bot && !s.bot.fake && !s.bot.key) R6.Elim.kill(s.bot, { cause: 'hideseek', silent: true });
      // extra off-screen losses so the game has the weight of the show
      for (const h of this.hiders) if (!h.dead && !h.escaped && h.bot && !h.bot.fake && !h.bot.key && Math.random() < 0.25) R6.Elim.kill(h.bot, { cause: 'hideseek', silent: true });
    }
    debugWin() { if (this.stage === 'draw') { this.role = 'hider'; this.stage = 'rules'; this.setup(); } this.phase = 'play'; this.escape(); }
    // ---------------- render ----------------
    render(ctx) {
      if (this.stage === 'draw') return this.drawDraw(ctx);
      const cam = this.cam, t = this.t;
      ctx.fillStyle = '#060508'; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      this.world.drawFloorExtra = (c) => {
        this.noise.draw(c);
        // seekers' flashlight cones
        for (const s of this.seekers) { if (s.dead) continue; const a = s.ai.facing; const g = c.createRadialGradient(s.x, s.y - 10, 5, s.x, s.y - 10, 300); g.addColorStop(0, 'rgba(255,245,200,.12)'); g.addColorStop(1, 'rgba(255,245,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(s.x, s.y - 10); c.arc(s.x, s.y - 10, 300, a - 0.55, a + 0.55); c.closePath(); c.fill(); }
      };
      this.world.draw(ctx, cam);
      if (this.thrown) { const th = this.thrown; ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(U.lerp(th.x0, th.x1, th.t), U.lerp(th.y0, th.y1, th.t) - Math.sin(th.t * Math.PI) * 60, 4, 0, TAU); ctx.fill(); }
      cam.end(ctx);
      // darkness: player light + lamps + seeker flashlights
      const pls = cam.toScreen(this.pl.x, this.pl.y - 16);
      const lights = [{ x: pls.x, y: pls.y, r: this.plHidden ? 90 : 190 * cam.zoom, a: 0.9 }];
      if (this.role === 'seeker') lights.push({ x: pls.x, y: pls.y, r: 380 * cam.zoom, a: 0.95, cone: { ang: this.plFacing || 0, spread: 0.55 }, color: '#fff2c0' });
      for (const l of this.lamps) { const fl = l.flick ? (Math.sin(t * 17 + l.x) > 0.3 ? 1 : 0.2) : 1; const s = cam.toScreen(l.x, l.y); lights.push({ x: s.x, y: s.y, r: 150 * cam.zoom, a: 0.5 * fl, color: '#ffe0a0' }); }
      for (const s of this.seekers) { if (s.dead || U.dist(s.x, s.y, this.pl.x, this.pl.y) > 600) continue; const sp = cam.toScreen(s.x, s.y - 10); lights.push({ x: sp.x, y: sp.y, r: 280 * cam.zoom, a: 0.6, cone: { ang: s.ai.facing, spread: 0.5 } }); }
      R6.Light.draw(ctx, this.extreme ? 0.97 : 0.93, lights);
      // hearing cues
      if (this.role === 'hider') for (const s of this.seekers) if (!s.dead && s.spd > 10 && U.dist(s.x, s.y, this.pl.x, this.pl.y) < 520) R6.drawEdgeCue(ctx, cam, s.x, s.y, 'rgba(255,90,110,.8)');
      else if (this.role === 'seeker') for (const h of this.hiders) if (!h.dead && !h.hidden && h.spd > 20 && U.dist(h.x, h.y, this.pl.x, this.pl.y) < 460) R6.drawEdgeCue(ctx, cam, h.x, h.y, 'rgba(110,170,255,.8)');
      R6.UI.vignette(ctx, 0.5);
      if (this.phase === 'play') {
        const hider = this.role === 'hider';
        const alive = this.hiders.filter(h => !h.dead).length + (hider ? 1 : 0), escaped = this.hiders.filter(h => h.escaped).length;
        R6.HUD.draw(ctx, { game: (this.extreme ? 'HIDE AND SEEK EXTREME' : 'ESCONDE-ESCONDE') + (this.release > 0 ? ' · LIBERAÇÃO EM ' + Math.ceil(this.release) : ''), timer: Math.max(0, this.timeLeft), danger: this.struggle != null, objective: hider ? (this.plHidden ? 'Escondido. Mova-se ou E para sair.' : 'Ache uma SAÍDA verdadeira ou sobreviva. E: porta/armário · C: agachar') : (this.myKills ? 'Regra cumprida. Sobreviva até o fim.' : 'Elimine pelo menos um azul. E: pegar / verificar armário'), hide: this.campaign ? {} : { prize: true } });
        R6.UI.panel(ctx, 16, 96, 280, 44, { fill: 'rgba(6,8,12,.75)', shadow: false });
        if (hider) { R6.UI.text(ctx, 'SUA CHAVE:', 30, 124, { size: 14, weight: 800, color: '#bbb' }); R6.UI.shapeIcon(ctx, this.myKey, 130, 119, 9, '#e8c24a', 3); R6.UI.text(ctx, 'AZUIS ' + alive + ' · FUGIRAM ' + escaped, 150, 124, { size: 13, weight: 700, color: '#9fc2ff' }); }
        else R6.UI.text(ctx, 'ELIMINAÇÕES: ' + (this.myKills || 0) + ' · AZUIS VIVOS ' + this.hiders.filter(h => !h.dead && !h.escaped).length, 30, 124, { size: 14, weight: 800, color: '#ff9aa6' });
        if (this.hasMaster) R6.UI.text(ctx, '⚿ Chave-mestra: porta de SERVIÇO no canto inferior direito', 640, R6.H - 70, { size: 14, align: 'center', color: '#f2c14e', weight: 700, shadow: true });
      }
      if (this.struggle) { R6.UI.text(ctx, 'VOCÊ FOI AGARRADO! ESPAÇO! ESPAÇO!', 640, 250, { size: 42, fam: 'title', align: 'center', color: '#ff3b5c', shadow: true }); R6.UI.bar(ctx, 440, 280, 400, 14, this.struggle.n / this.struggle.need, { color: '#2ec4b6' }); R6.UI.bar(ctx, 440, 300, 400, 6, 1 - this.struggle.t / 2.4, { color: '#ff3b5c' }); }
      this.drawRules(ctx);
    }
    drawDraw(ctx) {
      ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.text(ctx, 'SORTEIO DAS EQUIPES', 640, 110, { size: 56, fam: 'title', align: 'center', color: '#fff', spacing: 4 });
      R6.UI.text(ctx, 'Pegue uma bola da máquina. AZUL = esconder (chave). VERMELHO = caçar (faca).', 640, 150, { size: 18, align: 'center', color: '#bbb' });
      // ball machine
      ctx.fillStyle = '#2a2d36'; ctx.fillRect(540, 220, 200, 260); ctx.fillStyle = 'rgba(180,220,255,.15)'; ctx.beginPath(); ctx.arc(640, 260, 90, 0, TAU); ctx.fill();
      for (let i = 0; i < 20; i++) { const a = i * 2.4 + this.t, r = 20 + (i * 13) % 60; ctx.fillStyle = i % 2 ? '#2f6fd1' : '#d13a3a'; ctx.beginPath(); ctx.arc(640 + Math.cos(a) * r, 270 + Math.sin(a) * r * 0.6, 10, 0, TAU); ctx.fill(); }
      this.ballRects = [{ x: 420, y: 520, w: 180, h: 60 }, { x: 680, y: 520, w: 180, h: 60 }];
      if (!this.ballAnim) { this.ballRects.forEach((r, i) => R6.UI.button(ctx, r.x, r.y, r.w, r.h, i ? 'BOLA DA DIREITA' : 'BOLA DA ESQUERDA', { hover: (this.ballSel || 0) === i, size: 18 })); }
      else { const k = Math.min(1, this.ballAnim.t * 1.5); const col = this.role === 'hider' ? '#2f6fd1' : '#d13a3a'; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(640, 540 - k * 20, 30 * k, 0, TAU); ctx.fill(); if (k >= 1) R6.UI.text(ctx, this.role === 'hider' ? 'AZUL — VOCÊ VAI SE ESCONDER' : 'VERMELHO — VOCÊ VAI CAÇAR', 640, 630, { size: 34, fam: 'title', align: 'center', color: col, shadow: true }); }
    }
  }

  R6.HideSeek = HideSeek;
  R6.registerGame('hideseek', { name: 'Esconde-Esconde', season: 3, icon: 'circle', desc: 'Azuis escondem, vermelhos caçam.', create: o => new HideSeek(o) });
})();
