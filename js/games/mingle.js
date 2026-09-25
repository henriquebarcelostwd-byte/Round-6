/* ROUND 6 — mingle.js : Mingle — giant spinning carousel, number calls, rooms with doors, chaotic group-forming AI
   (seek allies, abandon, switch groups, close doors, push out, panic), calling allies, pulling/pushing. Variant: extreme */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const CX = 1000, CY = 1000, RA = 800, RP = 380, RR = 930;

  class Mingle extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'mingle'; this.name = 'mingle';
      this.extreme = opts.variant === 'extreme';
      this.world = new R6.World({}); this.world.sepStrength = 1;
      this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: 2000, h: 2000 } }); this.cam.set(CX, CY, 0.8);
      this.nRooms = 26; this.rooms = [];
      for (let i = 0; i < this.nRooms; i++) { const a = i / this.nRooms * TAU - Math.PI / 2; this.rooms.push({ i, a, half: TAU / this.nRooms * 0.34, open: false, count: 0, members: [], closedBy: null, light: 0, num: i + 1 }); }
      this.state = 'spin'; this.stateT = 0; this.round = 0; this.maxRounds = this.extreme ? 99 : (this.campaign ? 4 : 3);
      this.platAng = 0; this.omega = 0; this.callN = 0; this.callTime = 0;
      this.build();
    }
    rules() {
      return {
        title: this.extreme ? 'MINGLE EXTREME' : 'MINGLE', icon: 'circle', sub: 'A PLATAFORMA GIRA · A MÚSICA PARA · UM NÚMERO É CHAMADO',
        lines: ['Fique na plataforma enquanto ela gira.', 'Quando anunciarem "GRUPO DE N", entre numa sala com EXATAMENTE N pessoas.', 'N−1 ou N+1 = eliminados. Fora de uma sala = eliminado.', 'E: fechar/abrir a porta · empurrar alguém para fora · puxar alguém para o seu grupo.', 'Q: chamar seus aliados para te seguir.'],
        keys: [['WASD', 'mover'], ['SHIFT', 'correr'], ['E', 'porta / puxar / empurrar'], ['Q', 'chamar aliados']],
      };
    }
    build() {
      const S = R6.State; const look = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 });
      this.pl = this.world.add(new R6.Actor({ p: S.s ? S.player : null, look, x: CX, y: CY + 120, isPlayer: true, speed: 95, runSpeed: 165, id: 'player', scale: 0.46 }));
      let bots = this.campaign && S.s ? S.aliveBots() : Array.from({ length: this.extreme ? 90 : 120 }, (_, i) => { const tr = { courage: Math.random(), intel: Math.random(), fear: Math.random(), spd: Math.random(), str: Math.random(), kindness: Math.random(), betray: Math.random() * 0.8, chaos: Math.random() * 0.6, loyalty: Math.random(), trust: Math.random() }; return { num: i + 2, look: R6.Char.makeLook({ num: i + 2 }), tr, rel: U.randi(-20, 40), fake: true, alive: true, friends: [] }; });
      bots.forEach((p, i) => {
        const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * (RP - 30);
        const b = this.world.add(new R6.Actor({ p: p.fake ? null : p, look: p.look, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, speed: 75 + p.tr.spd * 30, runSpeed: 130 + p.tr.spd * 60, scale: 0.46 }));
        b.bot = p; b.ai = { room: null, t: 0, react: 0.2 + p.tr.fear * 0.6 + (1 - p.tr.intel) * 0.4, follow: null, re: 0 };
        b.brain = (x, dt) => this.botBrain(x, dt);
      });
      this.guards = [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * TAU; const g = this.world.add(new R6.Actor({ look: R6.Char.makeLook({ outfit: 'guard', mask: ['circle', 'triangle', 'square'][i % 3], seed: 40 + i }), x: CX + Math.cos(a) * (RA - 40), y: CY + Math.sin(a) * (RA - 40), solid: false })); g.item = 'rifle'; g.frozen = true; g.faceTo(CX, CY); g.kind = 'guard'; return g; });
    }
    begin() { R6.Audio.loop('crowd', 0.35); this.startSpin(); }
    focus() { const s = this.cam.toScreen(this.pl.x, this.pl.y); return { x: s.x, y: s.y, look: this.pl.look, scale: 0.46 * this.cam.zoom, facing: 1 }; }
    // geometry helpers
    polar(x, y) { const dx = x - CX, dy = y - CY; return { r: Math.hypot(dx, dy), a: Math.atan2(dy, dx) }; }
    roomAt(a, r) { if (r < RA - 4) return null; for (const R of this.rooms) if (Math.abs(U.angDiff(R.a, a)) < R.half) return R; return null; }
    roomPoint(R, k = 0.5) { const r = RA + 30 + k * 60; return { x: CX + Math.cos(R.a) * r, y: CY + Math.sin(R.a) * r }; }
    doorPoint(R) { return { x: CX + Math.cos(R.a) * (RA - 24), y: CY + Math.sin(R.a) * (RA - 24) }; }
    // ------------------------------------------------ phases
    startSpin() {
      this.state = 'spin'; this.stateT = 0; this.round++; this.spinDur = U.rand(7, 11) * (this.extreme ? 0.6 : 1);
      this.rooms.forEach(R => { R.open = false; R.closedBy = null; });
      R6.Music.stop(0.3); R6.Audio.loop('carousel', 0.7); this.omega = 0;
      R6.Dialog.announce(this.round === 1 ? 'Subam na plataforma. Quando a música parar, formem grupos com o número anunciado.' : 'Rodada ' + this.round + '. Voltem para a plataforma.', null, 2.6);
      for (const a of this.world.actors) if (a.ai && !a.dead) { a.ai.room = null; a.ai.follow = a.ai.follow && Math.random() < 0.6 ? a.ai.follow : null; const pp = this.polar(a.x, a.y); if (pp.r > RP - 20) { const ang = Math.random() * TAU; a.goTo(this.world, CX + Math.cos(ang) * U.rand(40, RP - 40), CY + Math.sin(ang) * U.rand(40, RP - 40), false); } }
    }
    call() {
      this.state = 'call'; this.stateT = 0;
      const alive = this.world.actors.filter(a => (a.ai || a === this.pl) && !a.dead).length;
      const opts = this.extreme ? [2, 3, 4, 5, 6, 7, 8, 9] : alive > 80 ? [4, 5, 6, 7, 8, 9, 10] : alive > 30 ? [3, 4, 5, 6, 7] : [2, 3, 4];
      this.callN = U.pick(opts); this.callTime = R6.Save.D(30, 25, 20) * (this.extreme ? 0.8 : 1);
      R6.Audio.stopLoop('carousel', 0.2); R6.Audio.sfx('buzzer'); R6.Audio.sfx('announce');
      R6.Music.play('action'); R6.Music.setIntensity(0.9);
      this.rooms.forEach(R => R.open = true); R6.Audio.sfx('doorSlam', { vol: 0.5 });
      this.bigText = { t: 0, text: 'GRUPO DE ' + this.callN + '!' };
      R6.Engine.slowmo(0.5, 0.5);
      for (const a of this.world.actors) if (a.ai && !a.dead) { a.ai.t = 0; a.ai.room = null; a.stop(); a.ai.panicT = Math.random() < a.bot.tr.fear * 0.4 ? U.rand(1, 3) : 0; }
    }
    judge() {
      this.state = 'judge'; this.stateT = 0;
      this.rooms.forEach(R => R.open = false); R6.Audio.sfx('doorSlam'); R6.Music.stop(0.2); R6.Audio.sfx('buzzer');
      this.countRooms();
      const victims = [];
      for (const a of this.world.actors) {
        if ((!a.ai && a !== this.pl) || a.dead) continue;
        const pp = this.polar(a.x, a.y); const R = this.roomAt(pp.a, pp.r);
        const ok = R && R.count === this.callN;
        if (!ok) victims.push({ a, R });
      }
      this.rooms.forEach(R => R.verdict = R.count === 0 ? null : R.count === this.callN ? 'ok' : 'bad');
      this.victims = victims; this.vi = 0; this.vT = 0.6;
    }
    // ------------------------------------------------ AI
    botBrain(a, dt) {
      const ai = a.ai; ai.t += dt;
      if (this.phase !== 'play') { a.steer(0, 0); return; }
      if (this.state === 'spin' || this.state === 'reset') {
        if (!a.path && Math.random() < dt * 0.15) { const ang = Math.random() * TAU, r = U.rand(30, RP - 40); a.goTo(this.world, CX + Math.cos(ang) * r, CY + Math.sin(ang) * r, false); }
        return;
      }
      if (this.state !== 'call') { a.steer(0, 0); return; }
      if (ai.t < ai.react) return;
      if (ai.panicT > 0) { ai.panicT -= dt; if (!a.path || Math.random() < dt) { const ang = Math.random() * TAU; a.goTo(this.world, CX + Math.cos(ang) * U.rand(100, RA - 60), CY + Math.sin(ang) * U.rand(100, RA - 60), true); } return; }
      // following the player (called ally)
      if (ai.follow === this.pl && !this.pl.dead) {
        const pp = this.polar(this.pl.x, this.pl.y); const inRoom = this.roomAt(pp.a, pp.r);
        if (inRoom) { this.goRoom(a, inRoom); }
        else if (U.dist(a.x, a.y, this.pl.x, this.pl.y) > 40) { ai.re -= dt; if (ai.re <= 0) { ai.re = 0.4; a.goTo(this.world, this.pl.x + U.rand(-20, 20), this.pl.y + U.rand(-20, 20), true); } }
        return;
      }
      const me = this.polar(a.x, a.y); const cur = this.roomAt(me.a, me.r);
      if (cur) {
        // inside a room: evaluate
        if (cur.count > this.callN) {
          // too many: the weakest/least connected leaves, or the strongest pushes someone
          const mem = cur.members.filter(m => m !== a);
          const myStatus = a.bot.tr.str + (a.bot.friends ? mem.filter(m => m.bot && a.bot.friends.includes(m.bot.id)).length * 0.3 : 0);
          if (a.bot.tr.str > 0.7 && a.bot.tr.betray > 0.5 && Math.random() < dt * 1.5) { const weak = mem.filter(m => m !== this.pl || true).sort((x, y) => (x.bot ? x.bot.tr.str : 0.5) - (y.bot ? y.bot.tr.str : 0.5))[0]; if (weak) this.pushOut(weak, a); }
          else if (myStatus < 0.6 && Math.random() < dt * (0.6 + a.bot.tr.kindness)) { ai.room = null; this.leaveRoom(a, cur); }
        } else if (cur.count === this.callN) {
          if (cur.open && a.bot.tr.intel > 0.35 && Math.random() < dt * 2.5) this.setDoor(cur, false, a);
        } else if (cur.count < this.callN) {
          if (!cur.open && Math.random() < dt * 2) this.setDoor(cur, true, a);
          if (this.callTime - this.stateT < 8 && Math.random() < dt * 0.3 && cur.count < this.callN - 1) { ai.room = null; this.leaveRoom(a, cur); }
        }
        return;
      }
      // outside: choose a room
      if (!ai.room || ai.room.count >= this.callN || !ai.room.open || Math.random() < dt * 0.2) {
        let best = null, bv = -1e9;
        for (const R of this.rooms) {
          if (!R.open) continue;
          const d = Math.abs(U.angDiff(R.a, me.a)) * RA + Math.max(0, RA - me.r);
          const need = this.callN - R.count - (R.incoming || 0);
          let v = -d * 0.01 + (need > 0 ? 4 : -8) + (need === 1 ? 3 : 0);
          if (a.bot.friends) for (const m of R.members) if (m.bot && a.bot.friends.includes(m.bot.id)) v += 3;
          if (R.members.includes(this.pl) && a.bot.rel > 30) v += 3; if (R.members.includes(this.pl) && a.bot.rel < -30) v -= 6;
          v += Math.random() * a.bot.tr.chaos * 6;
          if (v > bv) { bv = v; best = R; }
        }
        if (best) { if (ai.room) ai.room.incoming = Math.max(0, (ai.room.incoming || 0) - 1); ai.room = best; best.incoming = (best.incoming || 0) + 1; }
      }
      if (ai.room) this.goRoom(a, ai.room);
    }
    goRoom(a, R) {
      if (a.ai && a.ai.target === R && a.path) return;
      if (a.ai) a.ai.target = R;
      const d = this.doorPoint(R), p = this.roomPoint(R, Math.random());
      a.path = [d, { x: p.x + U.rand(-10, 10), y: p.y + U.rand(-10, 10) }]; a.pathI = 0; a.running = true; a.goal = p; a.repath = 2;
    }
    leaveRoom(a, R) { const d = this.doorPoint(R); a.path = [{ x: CX + Math.cos(R.a) * (RA - 90), y: CY + Math.sin(R.a) * (RA - 90) }]; a.pathI = 0; a.running = true; if (!R.open) this.setDoor(R, true, a); a.emo('…', 1); }
    setDoor(R, open, by) { if (R.open === open || this.state !== 'call') return; R.open = open; R.closedBy = open ? null : by; R6.Audio.sfx(open ? 'door' : 'doorSlam', { vol: U.dist(by.x, by.y, this.pl.x, this.pl.y) < 400 ? 0.7 : 0.2, gap: 0.05 }); }
    pushOut(victim, by) {
      const pp = this.polar(victim.x, victim.y); const R = this.roomAt(pp.a, pp.r); if (!R) return;
      if (!R.open) this.setDoor(R, true, by);
      by.setAnim('push', 0.35); by.faceTo(victim.x, victim.y);
      const d = this.doorPoint(R); victim.x = U.lerp(victim.x, d.x, 0.5); victim.y = U.lerp(victim.y, d.y, 0.5);
      victim.vx += (CX - victim.x) * 0.8; victim.vy += (CY - victim.y) * 0.8; victim.stun = 0.5;
      if (victim.ai) { victim.ai.room = null; victim.stop(); }
      R6.Audio.sfx('grab', { vol: 0.5 });
      if (victim === this.pl) R6.Toast.show('Você foi empurrado para fora!', { color: '#ff5a6a' });
      if (by === this.pl && victim.bot && !victim.bot.fake) { R6.State.addRel(victim.bot, -40, 'pushed'); R6.State.karma(-2); R6.State.s.stats.betrayals++; R6.State.witness(R.members.filter(m => m.bot && m !== victim).map(m => m.bot), 'witness_betray', -6); }
    }
    countRooms() {
      this.rooms.forEach(R => { R.members = []; R.count = 0; });
      for (const a of this.world.actors) { if ((!a.ai && a !== this.pl) || a.dead) continue; const pp = this.polar(a.x, a.y); const R = this.roomAt(pp.a, pp.r); if (R && pp.r > RA + 2) { R.members.push(a); R.count++; } }
    }
    constrain(a) {
      if (a.kind === 'guard' || a.dead) return;
      const pp = this.polar(a.x, a.y); const rr = a.r;
      if (pp.r > RA - rr) {
        const R = this.roomAt(pp.a, pp.r + 20);
        const inside = R && pp.r > RA + 4;
        if (R && (R.open || inside) && Math.abs(U.angDiff(R.a, pp.a)) < R.half - 0.004) {
          // inside room corridor: clamp to room bounds
          let r = U.clamp(pp.r, 0, RR - rr); let ang = pp.a; const da = U.angDiff(R.a, ang);
          const maxA = R.half - rr / pp.r; if (Math.abs(da) > maxA) ang = R.a - Math.sign(da) * maxA;
          if (!R.open && inside && r < RA + rr + 2) r = RA + rr + 2; // closed door keeps them in
          a.x = CX + Math.cos(ang) * r; a.y = CY + Math.sin(ang) * r;
        } else { const r = RA - rr; a.x = CX + Math.cos(pp.a) * r; a.y = CY + Math.sin(pp.a) * r; }
      }
    }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.stateT += dt;
      // carousel rotation
      if (this.state === 'spin') { this.omega = U.approach(this.omega, 0.35, dt * 0.2); }
      else this.omega = U.approach(this.omega, 0, dt * 0.6);
      this.platAng += this.omega * dt;
      if (this.omega > 0.001) for (const a of this.world.actors) { if (a.dead || a.kind === 'guard') continue; const pp = this.polar(a.x, a.y); if (pp.r < RP) { const na = pp.a + this.omega * dt; a.x = CX + Math.cos(na) * pp.r; a.y = CY + Math.sin(na) * pp.r; } }
      this.world.update(dt);
      for (const a of this.world.actors) this.constrain(a);
      this.countRooms();
      if (this.bigText) { this.bigText.t += dt; if (this.bigText.t > 2.6) this.bigText = null; }
      if (this.updateResult(dt)) { this.followCam(dt); return; }
      if (this.updateRules(dt)) { this.cam.update(dt); return; }
      this.updPlayer(dt);
      if (this.state === 'spin') {
        // everyone must be on the platform during the spin
        if (this.stateT > 4) { const pp = this.polar(this.pl.x, this.pl.y); if (pp.r > RP + 10) { this.offWarn = (this.offWarn || 0) + dt; if (this.offWarn > 4) { R6.Toast.show('Volte para a plataforma!', { color: '#ff5a6a' }); this.offWarn = 0; } } }
        if (this.stateT > this.spinDur) this.call();
      } else if (this.state === 'call') {
        if (this.stateT > this.callTime) this.judge();
      } else if (this.state === 'judge') {
        this.vT -= dt;
        if (this.vT <= 0 && this.vi < this.victims.length) {
          this.vT = 0.08; const burst = Math.min(4, this.victims.length - this.vi);
          for (let k = 0; k < burst; k++) { const v = this.victims[this.vi++]; this.kill(v.a, v.R); }
        }
        if (this.vi >= this.victims.length && this.stateT > 2.5) this.afterJudge();
      } else if (this.state === 'reset') {
        if (this.stateT > 3.5) this.startSpin();
      }
      this.followCam(dt);
    }
    followCam(dt) { this.cam.follow(this.pl.x, this.pl.y - 20, this.state === 'call' ? 0.95 : 0.8); this.cam.update(dt); }
    kill(a, R) {
      if (a.dead) return;
      a.kill(); R6.Audio.sfx(R ? 'gunFar' : 'gun', { vol: 0.5, gap: 0.04 });
      if (a === this.pl) { if (this.campaign) R6.State.eliminate(R6.State.player, 'mingle'); this.lose({ reason: R ? 'Seu grupo tinha ' + R.count + ' pessoas' : 'Você ficou fora das salas' }); return; }
      if (a.bot && !a.bot.fake) R6.Elim.kill(a.bot, { cause: 'mingle', sfx: false, silent: !a.bot.key, host: this });
      this.world.fx.emit('gray', a.x, a.y - 14, 3);
    }
    afterJudge() {
      if (this.result) return;
      const alive = this.world.actors.filter(a => a.ai && !a.dead).length;
      const endCampaign = this.campaign && (this.round >= this.maxRounds || alive <= 40);
      if (this.extreme) { this.score = this.round; this.scoreId = 'mingle_extreme'; this.scoreLabel = 'RODADAS'; this.chips = this.round * 30; }
      if (endCampaign || (!this.campaign && !this.extreme && this.round >= this.maxRounds)) { this.chips = this.chips || 110; this.win({ sub: 'VOCÊ SOBREVIVEU A ' + this.round + ' RODADAS' }); return; }
      if (this.extreme && alive < 3) { this.win({ title: 'ÚLTIMO DE PÉ', sub: this.round + ' RODADAS' }); return; }
      this.state = 'reset'; this.stateT = 0;
      R6.Banner.show('RODADA ' + this.round + ' ENCERRADA', 'Sobreviventes: ' + (alive + 1), { dur: 2.4, color: '#2ec4b6' });
      for (const a of this.world.actors) if (a.dead) { a.bodyAlpha = 0.5; }
      R6.Engine.after(1.5, () => { for (const a of this.world.actors) if (a.dead) a.visible = false; });
      this.rooms.forEach(R => { R.verdict = null; R.open = true; });
    }
    updPlayer(dt) {
      const pl = this.pl; if (pl.dead) return;
      const I = R6.Input; const ax = I.axis(); pl.steer(ax.x, ax.y, I.act('run'));
      if (I.actP('alt')) {
        const S = R6.State; const n = this.world.near(pl.x, pl.y, 260, b => b.ai && !b.dead && b.bot && (b.bot.fake ? b.bot.rel > 20 : b.bot.rel >= 30));
        n.forEach(b => { b.ai.follow = pl; b.emo('!', 1); }); pl.say(n.length ? 'Vem comigo! Fiquem juntos!' : 'Alguém…?', 2);
        R6.Toast.show(n.length ? n.length + ' aliado(s) te seguindo' : 'Nenhum aliado por perto', { color: n.length ? '#2ec4b6' : '#ff5a6a' });
      }
      if (I.actP('interact') && this.state === 'call') {
        const pp = this.polar(pl.x, pl.y); const R = this.roomAt(pp.a, pp.r);
        const others = this.world.near(pl.x, pl.y, 34, b => b.ai && !b.dead);
        if (R && pp.r < RA + 40 && !others.length) { this.setDoor(R, !R.open, pl); R6.Toast.show(R.open ? 'Porta aberta' : 'Porta fechada', { color: '#f2c14e' }); }
        else if (others.length) {
          const b = others[0]; const bpp = this.polar(b.x, b.y); const bR = this.roomAt(bpp.a, bpp.r);
          if (R && bR === R) this.pushOut(b, pl);
          else if (!bR) { b.ai.follow = pl; b.emo('!', 1); R6.Audio.sfx('grab', { vol: 0.5 }); R6.Toast.show('Você puxou #' + U.pad(b.bot.num) + ' para o seu grupo', { color: '#2ec4b6' }); if (b.bot && !b.bot.fake) R6.State.addRel(b.bot, 6, 'helped', { silent: true }); }
        } else if (R) this.setDoor(R, !R.open, pl);
      }
    }
    debugWin() { this.phase = 'play'; if (this.campaign) { const bots = this.world.actors.filter(a => a.ai && !a.dead && a.bot && !a.bot.key); for (let i = 0; i < bots.length * 0.5; i++) R6.Elim.kill(bots[i].bot, { silent: true }); } this.win({ wait: 0.3 }); }
    // ------------------------------------------------ render
    render(ctx) {
      const cam = this.cam, t = this.t;
      ctx.fillStyle = '#16121c'; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      // outer ring floor + rooms
      ctx.fillStyle = '#2a2033'; ctx.beginPath(); ctx.arc(CX, CY, RR + 30, 0, TAU); ctx.fill();
      for (const R of this.rooms) {
        const light = R.verdict === 'ok' ? '#2ec4b6' : R.verdict === 'bad' ? '#ff3b5c' : null;
        const hint = this.state === 'call' && R6.Save.diff() === 'normal' && !this.extreme;
        const col = light || (hint && R.count ? (R.count === this.callN ? '#3aa888' : R.count > this.callN ? '#b84a5a' : '#6a5a80') : ['#f4b6c8', '#a9d8e8', '#f7df8e', '#b8e0b0'][R.i % 4]);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(CX, CY, RR, R.a - R.half, R.a + R.half); ctx.arc(CX, CY, RA, R.a + R.half, R.a - R.half, true); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.stroke();
        const np = { x: CX + Math.cos(R.a) * (RR + 16), y: CY + Math.sin(R.a) * (RR + 16) };
        R6.UI.text(ctx, String(R.num), np.x, np.y + 5, { size: 16, align: 'center', color: '#fff', weight: 800 });
        if (hint && R.count) { const cp = this.roomPoint(R, 0.5); R6.UI.text(ctx, R.count + '/' + this.callN, cp.x, cp.y - 30, { size: 14, align: 'center', color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.7)', strokeW: 3 }); }
      }
      // arena floor with pattern
      const fg = ctx.createRadialGradient(CX, CY, 100, CX, CY, RA); fg.addColorStop(0, '#f0e1c8'); fg.addColorStop(1, '#d9c3a0'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(CX, CY, RA, 0, TAU); ctx.fill();
      for (let k = 0; k < 24; k++) { ctx.fillStyle = k % 2 ? 'rgba(232,51,109,.07)' : 'rgba(46,196,182,.07)'; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, RA, k / 24 * TAU, (k + 1) / 24 * TAU); ctx.fill(); }
      // wall ring with doors
      for (let i = 0; i < 180; i++) {
        const a0 = i / 180 * TAU, a1 = (i + 1) / 180 * TAU; const am = (a0 + a1) / 2;
        const R = this.rooms.find(R => Math.abs(U.angDiff(R.a, am)) < R.half);
        if (R && R.open) continue;
        ctx.strokeStyle = R ? '#7a3040' : '#5a4a6a'; ctx.lineWidth = R ? 10 : 16; ctx.beginPath(); ctx.arc(CX, CY, RA + 4, a0, a1 + 0.002); ctx.stroke();
      }
      // carousel platform
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(this.platAng);
      ctx.fillStyle = '#8a5a9a'; ctx.beginPath(); ctx.arc(0, 0, RP, 0, TAU); ctx.fill();
      for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? '#f2c14e' : '#e8336d'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, RP - 12, k / 16 * TAU, (k + 1) / 16 * TAU); ctx.closePath(); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, RP - 6, 0, TAU); ctx.stroke();
      for (let k = 0; k < 32; k++) { const a = k / 32 * TAU; ctx.fillStyle = (Math.floor(t * 6) + k) % 2 ? '#fff6c8' : '#b8903a'; ctx.beginPath(); ctx.arc(Math.cos(a) * (RP - 6), Math.sin(a) * (RP - 6), 4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#d4a73a'; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
      ctx.restore();
      this.world.draw(ctx, cam);
      cam.end(ctx);
      R6.UI.vignette(ctx, 0.45);
      if (this.state === 'judge') { ctx.fillStyle = `rgba(80,0,10,${0.18 + Math.sin(t * 12) * 0.05})`; ctx.fillRect(0, 0, R6.W, R6.H); }
      if (this.phase === 'play') {
        const pp = this.polar(this.pl.x, this.pl.y); const myR = this.roomAt(pp.a, pp.r);
        R6.HUD.draw(ctx, {
          game: (this.extreme ? 'MINGLE EXTREME' : 'MINGLE') + ' · RODADA ' + this.round, timer: this.state === 'call' ? Math.max(0, this.callTime - this.stateT) : null,
          sub: this.state === 'call' ? 'GRUPO DE ' + this.callN + (myR ? '  ·  SUA SALA: ' + myR.count + (R6.Save.diff() === 'normal' ? '/' + this.callN : '') : '  ·  ENTRE NUMA SALA!') : this.state === 'spin' ? 'A música toca… fique na plataforma' : '',
          subColor: this.state === 'call' ? (myR && myR.count === this.callN ? '#2ec4b6' : '#ff7a8a') : '#d9d2c5',
          objective: this.state === 'call' ? 'Entre numa sala com exatamente ' + this.callN + ' · E porta/puxar/empurrar · Q chamar aliados' : 'Q chamar aliados para perto de você', danger: this.state === 'call',
          hide: this.campaign ? {} : { prize: true },
        });
      }
      if (this.bigText) { const k = U.ease.outBack(Math.min(1, this.bigText.t * 3)); ctx.save(); ctx.translate(640, 330); ctx.scale(k, k); R6.UI.text(ctx, this.bigText.text, 0, 0, { size: 110, fam: 'title', align: 'center', base: 'middle', color: '#fff', shadow: 'rgba(232,51,109,.9)', shadowBlur: 30, spacing: 6, alpha: Math.min(1, (2.6 - this.bigText.t) * 2) }); ctx.restore(); }
      this.drawRules(ctx);
    }
  }

  R6.Mingle = Mingle;
  R6.registerGame('mingle', { name: 'Mingle', season: 2, icon: 'circle', desc: 'Forme grupos com o número exato.', create: o => new Mingle(o) });
})();
