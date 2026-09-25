/* ROUND 6 — tugofwar.js : Tug of War — team building, rhythm heaves, stance, team tactics (hold / 3 steps forward / heave),
   stamina, sync, AI team with bursts & fatigue, suspended platforms, cinematic fall of the losing team */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const GROUND = 560, EDGE_L = 900, EDGE_R = 1500, W = 2400;

  class TugOfWar extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'tugofwar'; this.name = 'tugofwar';
      this.variant = opts.variant || 'normal';
      this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: W, h: 1100 } });
      this.cam.set(W / 2, 420, 0.72);
      this.stage = 'team';
      this.level = opts.level || 0; this.wins = 0;
      this.pos = 0; this.vel = 0; this.sync = 0.8; this.stamina = 1; this.oppStamina = 1;
      this.beatT = 0; this.beatInt = 1.0; this.beatFlash = 0; this.lastHit = null; this.combo = 0;
      this.tactic = null; this.tacticT = 0; this.cool = { hold: 0, steps: 0, heave: 0 };
      this.oppBurst = 0; this.oppStumble = 0; this.oppStrain = 0; this.falling = null; this.fallT = 0; this.axeT = 0;
      this.hasTrick = !this.campaign || (R6.State.s && (R6.State.has('hint_tug') || R6.State.flag('hint_tug')));
      this.buildCandidates();
    }
    rules() {
      if (this.stage === 'team') return null;
      return {
        title: this.variant === 'challenge' ? 'TUG OF WAR CHALLENGE' : 'CABO DE GUERRA', icon: 'square', sub: 'EQUIPE DE 10 · PLATAFORMAS SUSPENSAS',
        lines: [
          'Puxe a corda até a equipe rival cair da plataforma.',
          'ESPAÇO no ritmo do anel = puxada sincronizada (erros quebram a sincronia).',
          'Segure S para ancorar e inclinar o corpo para trás (defesa, gasta menos fôlego).',
          '1 SEGUREM · 2 TRÊS PASSOS À FRENTE (quando eles forçarem demais) · 3 PUXEM!',
        ],
        keys: [['ESPAÇO', 'puxar no ritmo'], ['S', 'ancorar'], ['1 2 3', 'táticas']],
      };
    }
    buildCandidates() {
      const S = R6.State;
      let pool;
      if (this.campaign && S.s) {
        pool = S.aliveBots().filter(p => !p.flags);
        // prefer key characters + a random set of others
        const keys = pool.filter(p => p.key && p.key !== 'gangster' && p.key !== 'wild');
        const others = U.shuffle(pool.filter(p => !p.key)).slice(0, 18 - keys.length);
        pool = keys.concat(others);
      } else {
        pool = Array.from({ length: 18 }, (_, i) => { const look = R6.Char.makeLook({ num: 30 + i * 11 }); const str = Math.random(); return { num: 30 + i * 11, name: R6.Roster.genName(new U.RNG(i + 7)), look, tr: { str, spd: Math.random(), intel: Math.random(), loyalty: Math.random() }, sk: { physical: str }, rel: U.randi(-30, 60), alive: true, fake: true }; });
      }
      this.cands = pool.map(p => ({ p, str: U.clamp(p.tr.str * 0.8 + (p.look.build - 0.9) * 0.9 + (p.look.fem ? -0.08 : 0) + (p.look.age === 2 ? -0.25 : 0), 0.08, 1), willing: p.rel > -25 || p.key === 'oldman', picked: false }));
      this.cands.sort((a, b) => (b.p.key ? 1 : 0) - (a.p.key ? 1 : 0) || b.str - a.str);
      this.teamMenuI = 0;
      if (this.opts.team) { this.team = this.opts.team; this.stage = 'rules'; this.setupTeams(); }
    }
    pickedCount() { return this.cands.filter(c => c.picked).length; }
    confirmTeam() {
      let team = this.cands.filter(c => c.picked);
      // auto-fill with whoever is left (the unpicked get assigned anyway)
      for (const c of this.cands) if (team.length < 9 && !c.picked && c.willing) { c.picked = true; team.push(c); }
      this.team = team.map(c => c.p);
      if (this.campaign) {
        R6.State.decide('tug_team', this.team.map(p => p.num).join(','), '');
        for (const p of this.team) R6.State.addRel(p, 6, 'teamed', { silent: true });
        const skipped = this.cands.filter(c => !c.picked && c.p.key);
        for (const c of skipped) R6.State.addRel(c.p, -8, 'abandoned', { silent: true });
      }
      this.stage = 'rules'; this.phase = 'rules'; this.rulesT = 0;
      this.setupTeams();
    }
    setupTeams() {
      const S = R6.State; const plLook = S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 });
      // left team: player at front? player picks position 3 (middle-front)
      const L = this.team.slice(0, 9).map(p => ({ p, look: p.look, str: U.clamp(p.tr.str * 0.8 + (p.look.build - 0.9) * 0.9 + (p.look.fem ? -0.08 : 0) + (p.look.age === 2 ? -0.25 : 0), 0.1, 1) }));
      L.splice(2, 0, { p: S.s ? S.player : null, look: plLook, str: 0.6, isPlayer: true });
      this.L = L.map((m, i) => Object.assign(m, { x: 700 - i * 68, baseX: 700 - i * 68, t: Math.random() * 3, fall: null, anim: 'pull' }));
      // right team: strong opponents
      let opp;
      const lvlBoost = this.variant === 'challenge' ? this.level * 0.07 : 0;
      if (this.campaign && S.s) {
        const inTeam = new Set(this.team.map(p => p.id));
        opp = U.shuffle(S.aliveBots().filter(p => !p.key && !inTeam.has(p.id))).sort((a, b) => b.tr.str - a.tr.str).slice(0, 25);
        opp = U.shuffle(opp).slice(0, 10);
      } else opp = Array.from({ length: 10 }, (_, i) => ({ num: 300 + i * 7, look: R6.Char.makeLook({ num: 300 + i * 7, fem: false, build: U.rand(1.05, 1.2) }), tr: { str: U.rand(0.55, 0.95) }, fake: true }));
      this.R = opp.map((p, i) => ({ p, look: p.look, str: U.clamp(p.tr.str * 0.85 + (p.look.build - 0.9) * 0.9 + 0.08 + lvlBoost, 0.2, 1.15) * R6.Save.D(1, 1.08, 1.16), x: 1700 + i * 68, baseX: 1700 + i * 68, t: Math.random() * 3, fall: null, anim: 'pull' }));
      this.sumL = this.L.reduce((a, m) => a + m.str, 0); this.sumR = this.R.reduce((a, m) => a + m.str, 0);
      this.advice = this.team.find(p => p.key === 'oldman') ? 'oldman' : null;
      this.hasTrick = this.hasTrick || !!this.team.find(p => p.key === 'schemer');
    }
    begin() {
      R6.Music.play('action'); R6.Music.setIntensity(0.3); R6.Audio.loop('crowd', 0.3);
      this.countdown = 3.2; this.cam.set(W / 2, 430, 0.72);
      R6.Dialog.announce('Que comece o cabo de guerra. A equipe que cair da plataforma será eliminada.', null, 2.6);
      if (this.advice) R6.Engine.after(0.8, () => { const m = this.L.find(m => m.p && m.p.key === 'oldman'); if (m) R6.Dialog.toast(m.p, 'Nos primeiros segundos, SEGUREM! Inclinem o corpo para trás, pés firmes!', 3.4); });
      if (this.hasTrick && this.campaign) R6.Engine.after(4.5, () => { const m = this.L.find(m => m.p && m.p.key === 'schemer'); if (m) R6.Dialog.toast(m.p, 'Quando eles perderem o ritmo, todos dão três passos à frente. Confiem em mim.', 3.4); });
    }
    focus() { const m = this.L ? this.L[2] : null; if (!m) return { x: 640, y: 500, scale: 1 }; const s = this.cam.toScreen(m.x, GROUND); return { x: s.x, y: s.y, look: m.look, scale: 1.25 * this.cam.zoom, facing: 1 }; }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.fx.update(dt);
      if (this.stage === 'team') return this.updateTeamPick(dt);
      if (this.updateResult(dt)) { this.updateFall(dt); this.cam.update(dt); return; }
      if (this.updateRules(dt)) return;
      if (this.countdown > 0) { const c0 = Math.ceil(this.countdown); this.countdown -= dt; if (Math.ceil(this.countdown) !== c0 && this.countdown > 0) R6.Audio.sfx('beep'); if (this.countdown <= 0) { R6.Audio.sfx('whistle'); this.startT = this.t; } this.animMembers(dt, 0); this.cam.update(dt); return; }
      if (this.falling) { this.updateFall(dt); this.cam.update(dt); return; }
      const I = R6.Input; const el = this.t - this.startT;
      for (const k in this.cool) this.cool[k] = Math.max(0, this.cool[k] - dt);
      // beat
      this.beatInt = U.lerp(1.0, 0.8, Math.min(1, el / 40));
      this.beatT += dt; if (this.beatT >= this.beatInt) { this.beatT -= this.beatInt; this.beatFlash = 0.18; if (!this.hitThisBeat) { this.sync = Math.max(0.35, this.sync - 0.05); this.combo = 0; } this.hitThisBeat = false; R6.Audio.sfx('tick', { vol: 0.5 }); }
      if (this.beatFlash > 0) this.beatFlash -= dt;
      if (I.actP('action')) {
        const ph = this.beatT / this.beatInt; const off = Math.min(ph, 1 - ph) * this.beatInt;
        const win = R6.Save.D(0.12, 0.09, 0.07);
        if (this.hitThisBeat) { this.sync = Math.max(0.35, this.sync - 0.04); this.lastHit = { t: 0, q: 'CEDO DEMAIS' }; }
        else if (off < win * 0.5) { this.sync = Math.min(1.3, this.sync + 0.07); this.combo++; this.lastHit = { t: 0, q: 'PERFEITO' }; this.hitThisBeat = true; this.pulse = 0.35; R6.Audio.sfx('hit', { vol: 0.5 }); }
        else if (off < win) { this.sync = Math.min(1.3, this.sync + 0.035); this.combo++; this.lastHit = { t: 0, q: 'BOM' }; this.hitThisBeat = true; this.pulse = 0.25; R6.Audio.sfx('hit', { vol: 0.35 }); }
        else { this.sync = Math.max(0.35, this.sync - 0.06); this.combo = 0; this.lastHit = { t: 0, q: 'FORA DO RITMO' }; }
        if (this.combo > 0 && this.combo % 8 === 0) R6.Toast.show('Equipe sincronizada! ×' + this.combo, { color: '#2ec4b6' });
      }
      if (this.lastHit) { this.lastHit.t += dt; if (this.lastHit.t > 0.7) this.lastHit = null; }
      if (this.pulse > 0) this.pulse -= dt;
      const anchor = I.act('down');
      // tactics
      const dg = I.digitP();
      if (dg === 1 && this.cool.hold <= 0) { this.tactic = 'hold'; this.tacticT = 3; this.cool.hold = 9; this.shout('SEGUREM! Pés firmes!'); }
      if (dg === 2 && this.cool.steps <= 0) {
        if (!this.hasTrick && this.campaign) { R6.Toast.show('Ninguém na equipe conhece essa tática…', { color: '#ff5a6a' }); }
        else { this.cool.steps = 14; this.threeSteps(); }
      }
      if (dg === 3 && this.cool.heave <= 0 && this.stamina > 0.25) { this.tactic = 'heave'; this.tacticT = 2.2; this.cool.heave = 7; this.shout('PUXEEEEM!'); this.stamina -= 0.18; }
      if (this.tacticT > 0) { this.tacticT -= dt; if (this.tacticT <= 0) this.tactic = null; }
      // forces
      const staminaK = 0.45 + this.stamina * 0.55;
      let fL = this.sumL * (0.62 + this.sync * 0.38) * staminaK * (1 + (this.pulse > 0 ? 0.25 : 0));
      if (anchor) fL *= 0.82; if (this.tactic === 'heave') fL *= 1.55; if (this.tactic === 'hold') fL *= 0.9;
      let resist = (anchor ? 0.35 : 0) + (this.tactic === 'hold' ? 0.4 : 0);
      if (el < 10 && anchor) resist += 0.15; // the old man's advice: lean back in the first seconds
      // opponent AI
      this.oppStrain = U.clamp(this.oppStrain + dt * (this.oppBurst > 0 ? 0.35 : -0.15), 0, 1);
      if (this.oppBurst > 0) this.oppBurst -= dt; else if (Math.random() < dt * 0.22 && this.oppStamina > 0.3) { this.oppBurst = U.rand(1.2, 2.4); this.oppStamina -= 0.1; }
      const oppK = (0.5 + this.oppStamina * 0.5) * (this.oppBurst > 0 ? 1.4 : 1) * (0.9 + Math.sin(this.t * 2.1) * 0.08);
      let fR = this.oppStumble > 0 ? this.sumR * 0.05 : this.sumR * 0.86 * oppK;
      if (this.oppStumble > 0) this.oppStumble -= dt;
      // stamina
      this.stamina = U.clamp(this.stamina - dt * (anchor ? 0.012 : 0.03) * (this.tactic === 'heave' ? 3 : 1) + dt * (this.tactic === 'hold' ? 0.01 : 0), 0, 1);
      this.oppStamina = U.clamp(this.oppStamina - dt * 0.022 + (this.oppBurst > 0 ? -dt * 0.03 : dt * 0.004), 0.15, 1);
      // rope dynamics (+pos = rope moves LEFT = good for us)
      const net = (fL - fR);
      const acc = net * 14 - this.vel * 2.2 - (net < 0 ? net * resist * 14 : 0);
      this.vel += acc * dt; this.pos += this.vel * dt;
      this.animMembers(dt, fL / Math.max(1, this.sumL));
      // win / lose check
      const frontL = this.L[0].x, frontR = this.R[0].x;
      if (frontR < EDGE_R - 6) this.startFall('R');
      else if (frontL > EDGE_L + 6) this.startFall('L');
      R6.Music.setIntensity(U.clamp(0.3 + Math.abs(this.pos) / 250, 0.3, 1));
      // camera follows the rope center with cinematic push-in when close to an edge
      const danger = Math.max((frontL - (EDGE_L - 200)) / 200, ((EDGE_R + 200) - frontR) / 200);
      this.cam.follow(1200 - this.pos * 0.9, 440, U.lerp(0.72, 0.95, U.clamp(danger, 0, 1)));
      this.cam.update(dt);
    }
    shout(t) { const m = this.L[2]; this.bubble = { text: t, t: 0 }; R6.Audio.sfx('whistle', { vol: 0.25 }); }
    threeSteps() {
      this.shout('TRÊS PASSOS À FRENTE! AGORA!');
      // effectiveness depends on opponent strain (they are over-pulling)
      const good = this.oppStrain > 0.45 || this.oppBurst > 0;
      this.stepAnim = 0.6;
      R6.Engine.after(0.6, () => {
        if (this.result || this.falling) return;
        if (good) { this.oppStumble = 1.8; this.pos -= 25; this.vel = -10; R6.Audio.sfx('crowdGasp'); R6.Toast.show('Os rivais perderam o equilíbrio! PUXEM!', { color: '#2ec4b6' }); this.R.forEach((m, i) => { if (i < 5 && Math.random() < 0.6) m.stumble = 1.2; }); R6.Engine.slowmo(0.4, 0.8); }
        else { this.pos -= 45; this.vel = -40; R6.Toast.show('Cedo demais — eles não estavam forçando!', { color: '#ff5a6a' }); }
      });
    }
    animMembers(dt, effort) {
      const shiftL = this.pos, shiftR = this.pos;
      for (const m of this.L) { m.t += dt; m.x = m.baseX - shiftL + (this.stepAnim > 0 ? (0.6 - this.stepAnim) * 50 : 0); m.effort = 0.6 + effort * 0.5; }
      for (const m of this.R) { m.t += dt; m.x = m.baseX - shiftR; if (m.stumble > 0) m.stumble -= dt; }
      if (this.stepAnim > 0) { this.stepAnim -= dt; if (this.stepAnim <= 0) for (const m of this.L) m.baseX += 30; }
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > 1.8) this.bubble = null; }
    }
    startFall(side) {
      this.falling = { side, t: 0, axe: false }; this.fallT = 0;
      const losers = side === 'L' ? this.L : this.R;
      losers.forEach((m, i) => { m.fall = { t: -i * 0.07, vx: side === 'L' ? 260 : -260, vy: -60, y: 0, rot: 0 }; });
      R6.Audio.sfx('crowdGasp'); R6.Engine.slowmo(0.3, 1.8);
      if (side === 'L') { R6.Audio.sfx('scream'); }
    }
    updateFall(dt) {
      if (!this.falling) return;
      const F = this.falling; F.t += dt;
      const losers = F.side === 'L' ? this.L : this.R, winners = F.side === 'L' ? this.R : this.L;
      for (const m of losers) {
        const f = m.fall; if (!f) continue; f.t += dt; if (f.t < 0) continue;
        m.x += f.vx * dt;
        const edge = F.side === 'L' ? EDGE_L : EDGE_R;
        const over = F.side === 'L' ? m.x > edge : m.x < edge;
        if (over) { f.vy += 1500 * dt; f.y += f.vy * dt; f.rot += dt * (F.side === 'L' ? 3 : -3); if (!f.sc && f.y > 60) { f.sc = true; if (Math.random() < 0.5) R6.Audio.sfx('scream', { vol: 0.5, gap: 0.15 }); } }
      }
      for (const m of winners) { m.won = true; }
      if (F.t > 0.9 && !F.axe) { F.axe = true; this.axeT = 0; R6.Audio.sfx('metal'); R6.Audio.sfx('rope'); this.cam.shake(10, 0.5); }
      if (F.axe) this.axeT += dt;
      if (F.t > 2.2 && !F.done) {
        F.done = true;
        // record eliminations
        if (F.side === 'R') {
          if (this.campaign) { for (const m of this.R) if (m.p && !m.p.fake) R6.Elim.kill(m.p, { cause: 'tug', sfx: false, silent: true, feed: true }); this.resolveOtherMatches(); }
          if (this.variant === 'challenge') { this.level++; this.score = this.level; this.scoreId = 'tug_challenge'; this.scoreLabel = 'EQUIPES DERRUBADAS'; this.chips = this.level * 40; R6.Banner.show('EQUIPE ' + this.level + ' DERRUBADA', 'Próxima equipe é mais forte…', { dur: 2 }); R6.Engine.after(2.2, () => { if (!this.result) this.nextChallenge(); }); return; }
          this.chips = 80; this.win({ sub: 'A EQUIPE RIVAL CAIU' });
        } else {
          if (this.campaign) { for (const m of this.L) if (m.p && !m.isPlayer && m.p.alive) R6.Elim.kill(m.p, { cause: 'tug', sfx: false, silent: true }); R6.State.eliminate(R6.State.player, 'tug'); }
          this.lose({ reason: 'Sua equipe caiu da plataforma' });
        }
      }
      this.cam.follow(F.side === 'L' ? EDGE_L + 100 : EDGE_R - 100, 560, 0.8);
    }
    nextChallenge() {
      this.falling = null; this.pos = 0; this.vel = 0; this.stamina = 1; this.oppStamina = 1; this.sync = 0.8;
      this.L.forEach((m, i) => { m.baseX = 700 - i * 68; m.fall = null; });
      this.setupTeams(); this.countdown = 3.2;
    }
    resolveOtherMatches() {
      // the remaining teams play their own matches: half of them are eliminated
      const S = R6.State; const inGame = new Set([...this.L, ...this.R].map(m => m.p && m.p.id));
      const rest = U.shuffle(S.aliveBots().filter(p => !inGame.has(p.id)));
      const teams = []; for (let i = 0; i + 10 <= rest.length; i += 10) teams.push(rest.slice(i, i + 10));
      for (let i = 0; i + 1 < teams.length; i += 2) {
        const a = teams[i], b = teams[i + 1];
        const hasKeyA = a.some(p => p.key), hasKeyB = b.some(p => p.key);
        let loser;
        if (hasKeyA && !hasKeyB) loser = b; else if (hasKeyB && !hasKeyA) loser = a;
        else if (hasKeyA && hasKeyB) loser = null;
        else { const sa = a.reduce((s, p) => s + p.tr.str, 0), sb = b.reduce((s, p) => s + p.tr.str, 0); loser = Math.random() < sa / (sa + sb) ? b : a; }
        if (loser) for (const p of loser) R6.Elim.kill(p, { cause: 'tug', silent: true, sfx: false });
      }
    }
    debugWin() { if (this.stage === 'team') this.confirmTeam(); this.phase = 'play'; this.countdown = 0; this.startFall('R'); this.falling.t = 2.1; }
    // ------------------------------------------------ team pick
    updateTeamPick(dt) {
      const I = R6.Input; const n = this.cands.length;
      const cols = 3;
      if (I.actP('down')) { this.teamMenuI = Math.min(n, this.teamMenuI + cols); R6.Audio.sfx('hover'); }
      if (I.actP('up')) { this.teamMenuI = Math.max(0, this.teamMenuI - cols); R6.Audio.sfx('hover'); }
      if (I.actP('right')) { this.teamMenuI = Math.min(n, this.teamMenuI + 1); R6.Audio.sfx('hover'); }
      if (I.actP('left')) { this.teamMenuI = Math.max(0, this.teamMenuI - 1); R6.Audio.sfx('hover'); }
      const m = I.mouse;
      if (this.rects) this.rects.forEach((r, i) => { if (U.rectHit(m.x, m.y, r)) { if (m.moved) this.teamMenuI = i; if (m.pressed) this.toggle(i); } });
      if (I.actP('confirm') || I.actP('interact')) this.toggle(this.teamMenuI);
    }
    toggle(i) {
      if (i >= this.cands.length) { if (this.pickedCount() >= 1 || !this.campaign) { R6.Audio.sfx('confirm'); this.confirmTeam(); } else R6.Audio.sfx('error'); return; }
      const c = this.cands[i];
      if (!c.willing) { R6.Audio.sfx('error'); R6.Toast.show((c.p.key ? c.p.name : '#' + U.pad(c.p.num)) + ' se recusa a entrar na sua equipe.', { color: '#ff5a6a' }); return; }
      if (!c.picked && this.pickedCount() >= 9) { R6.Audio.sfx('error'); return; }
      c.picked = !c.picked; R6.Audio.sfx(c.picked ? 'confirm' : 'back');
    }
    // ------------------------------------------------ render
    render(ctx) {
      const cam = this.cam, t = this.t;
      // hall
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#07080c'); g.addColorStop(1, '#141820'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      cam.begin(ctx);
      // back wall with painted shapes + scoreboard
      ctx.fillStyle = '#10131a'; ctx.fillRect(0, -200, W, GROUND + 200);
      ctx.globalAlpha = 0.08; for (let x = 60; x < W; x += 160) R6.UI.shapeIcon(ctx, ['circle', 'triangle', 'square'][(x / 160) % 3 | 0], x, 120 + (x % 3) * 40, 40, '#e8336d', 6); ctx.globalAlpha = 1;
      R6.Props.board(ctx, 1030, 60, 340, 130, [{ t: 'CABO DE GUERRA', s: 22, c: '#ff4d6d' }, { t: this.stage === 'team' ? '--' : 'SYNC ' + Math.round(this.sync * 100) + '%', s: 30, c: '#ffd166' }]);
      // spotlights
      for (const sx of [450, 1950]) { const sg = ctx.createRadialGradient(sx, -200, 0, sx, GROUND, 700); sg.addColorStop(0, 'rgba(255,245,220,.22)'); sg.addColorStop(1, 'rgba(255,245,220,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(sx - 30, -200); ctx.lineTo(sx + 30, -200); ctx.lineTo(sx + 420, GROUND); ctx.lineTo(sx - 420, GROUND); ctx.closePath(); ctx.fill(); }
      // void (gap) with fog
      const vg = ctx.createLinearGradient(0, GROUND, 0, 1100); vg.addColorStop(0, '#05060a'); vg.addColorStop(1, '#000'); ctx.fillStyle = vg; ctx.fillRect(EDGE_L, GROUND - 20, EDGE_R - EDGE_L, 700);
      ctx.fillStyle = 'rgba(120,130,150,.06)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(1200 + Math.sin(t * 0.3 + i) * 200, 900 + i * 20, 300, 30, 0, 0, TAU); ctx.fill(); }
      // platforms (industrial towers)
      for (const [x0, x1] of [[-50, EDGE_L], [EDGE_R, W + 50]]) {
        const pg = ctx.createLinearGradient(0, GROUND, 0, 1100); pg.addColorStop(0, '#5a606b'); pg.addColorStop(1, '#1b1e24'); ctx.fillStyle = pg; ctx.fillRect(x0, GROUND, x1 - x0, 600);
        ctx.fillStyle = '#c9cdd3'; ctx.fillRect(x0, GROUND - 6, x1 - x0, 10);
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 4; for (let x = x0 + 40; x < x1; x += 120) { ctx.beginPath(); ctx.moveTo(x, GROUND + 10); ctx.lineTo(x + 60, GROUND + 200); ctx.moveTo(x + 60, GROUND + 10); ctx.lineTo(x, GROUND + 200); ctx.stroke(); }
        ctx.fillStyle = '#e8336d'; const ex = x1 === EDGE_L ? EDGE_L - 14 : EDGE_R; ctx.fillRect(ex, GROUND - 6, 14, 10);
      }
      // guillotine axe above the gap center
      const axeY = this.falling && this.falling.axe ? Math.min(GROUND - 60, -80 + this.axeT * 2000) : -80;
      ctx.fillStyle = '#2a2d33'; ctx.fillRect(1180, -300, 40, axeY + 220); ctx.fillStyle = '#b9c0c9'; ctx.beginPath(); ctx.moveTo(1150, axeY); ctx.lineTo(1250, axeY); ctx.lineTo(1235, axeY + 60); ctx.lineTo(1165, axeY + 60); ctx.fill();
      if (this.stage !== 'team' && this.L) {
        // rope
        const ry = GROUND - 62;
        const lEnd = this.L[this.L.length - 1].x - 40, rEnd = this.R[this.R.length - 1].x + 40;
        const cut = this.falling && this.falling.axe;
        const sag = 18 + Math.sin(t * 3) * 2;
        ctx.strokeStyle = '#b89a62'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        if (!cut) { ctx.beginPath(); ctx.moveTo(lEnd, ry); ctx.quadraticCurveTo(1200 - this.pos, ry + sag, rEnd, ry); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.beginPath(); ctx.moveTo(lEnd, ry); ctx.lineTo(1190, ry + 40 + this.axeT * 300); ctx.moveTo(1210, ry + 40 + this.axeT * 300); ctx.lineTo(rEnd, ry); ctx.stroke(); }
        // center marker
        const mx = 1200 - this.pos; if (!cut) { ctx.fillStyle = '#e8336d'; ctx.beginPath(); ctx.moveTo(mx, ry + sag * 0.5); ctx.lineTo(mx - 10, ry + sag * 0.5 + 34); ctx.lineTo(mx + 10, ry + sag * 0.5 + 34); ctx.fill(); }
        // members
        const drawM = (m, dir) => {
          const f = m.fall; let y = GROUND, rot = 0;
          if (m.won && !m.winAnim) m.winAnim = m.isPlayer || Math.random() < 0.5 ? 'celebrate' : Math.random() < 0.5 ? 'sit' : 'cry';
          let anim = m.won ? m.winAnim : m.stumble > 0 ? 'stagger' : this.tactic === 'hold' && dir === 1 ? 'heave' : 'pull';
          if (this.countdown > 0) anim = 'pull';
          if (f && f.t > 0) { y += f.y; rot = f.rot; anim = f.y > 20 ? 'flail' : 'stagger'; }
          ctx.save(); ctx.translate(m.x, y); ctx.rotate(rot);
          R6.Char.draw(ctx, m.look, 0, 0, { view: 'side', dir, anim, t: m.t, scale: 1.25, effort: m.effort || 1, pullRate: 5 + (this.pulse > 0 ? 6 : 0), highlight: m.isPlayer ? 'rgba(255,255,255,.5)' : null, shadow: !f || f.y < 5, zoom: cam.zoom });
          ctx.restore();
        };
        for (let i = this.L.length - 1; i >= 0; i--) drawM(this.L[i], 1);
        for (let i = this.R.length - 1; i >= 0; i--) drawM(this.R[i], -1);
        if (this.bubble) { const m = this.L[2]; R6.drawBubble(ctx, { text: this.bubble.text, t: this.bubble.t, dur: 1.8 }, m.x, GROUND - 150, cam.zoom); }
      }
      this.fx.draw(ctx);
      cam.end(ctx);
      R6.UI.vignette(ctx, 0.5);
      if (this.stage === 'team') return this.drawTeamPick(ctx);
      if (this.phase === 'play') this.drawHUD(ctx);
      this.drawRules(ctx);
    }
    drawHUD(ctx) {
      R6.HUD.draw(ctx, { game: this.variant === 'challenge' ? 'TUG OF WAR CHALLENGE · EQUIPE ' + (this.level + 1) : 'CABO DE GUERRA', objective: this.countdown > 0 ? 'Preparem-se…' : 'ESPAÇO no ritmo · S ancorar · 1 2 3 táticas', hide: this.variant === 'challenge' ? { prize: true } : {} });
      if (this.countdown > 0) { R6.UI.text(ctx, String(Math.ceil(this.countdown)), 640, 300, { size: 140, fam: 'title', align: 'center', color: '#fff', shadow: true }); return; }
      // beat ring
      const cx = 640, cy = 610; const ph = this.beatT / this.beatInt;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, TAU); ctx.stroke();
      const rr = 34 + (1 - ph) * 70; ctx.strokeStyle = U.rgba('#e8336d', Math.min(1, ph + 0.2)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
      if (this.beatFlash > 0) { ctx.fillStyle = `rgba(232,51,109,${this.beatFlash * 3})`; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, TAU); ctx.fill(); }
      R6.UI.text(ctx, 'PUXA', cx, cy + 1, { size: 16, align: 'center', base: 'middle', weight: 800, color: '#fff' });
      if (this.lastHit) R6.UI.text(ctx, this.lastHit.q, cx, cy - 58, { size: 20, align: 'center', weight: 800, color: this.lastHit.q === 'PERFEITO' ? '#2ec4b6' : this.lastHit.q === 'BOM' ? '#f2c14e' : '#ff5a6a', alpha: 1 - this.lastHit.t / 0.7 });
      ctx.restore();
      // bars
      const bx = 40, by = 560;
      R6.UI.panel(ctx, bx - 12, by - 20, 290, 120, { fill: 'rgba(6,8,12,.75)', shadow: false });
      R6.UI.text(ctx, 'SINCRONIA', bx, by, { size: 13, weight: 800, color: '#ccc' }); R6.UI.bar(ctx, bx + 90, by - 9, 170, 10, (this.sync - 0.35) / 0.95, { color: '#2ec4b6' });
      R6.UI.text(ctx, 'FÔLEGO', bx, by + 26, { size: 13, weight: 800, color: '#ccc' }); R6.UI.bar(ctx, bx + 90, by + 17, 170, 10, this.stamina, { color: '#f2c14e' });
      R6.UI.text(ctx, 'RIVAIS', bx, by + 52, { size: 13, weight: 800, color: '#ccc' }); R6.UI.bar(ctx, bx + 90, by + 43, 170, 10, this.oppStrain, { color: '#ff5a6a', mark: 0.45 });
      R6.UI.text(ctx, 'FORÇA  ' + this.sumL.toFixed(1) + ' × ' + this.sumR.toFixed(1), bx, by + 80, { size: 13, weight: 800, color: '#999' });
      // tactic buttons
      const tx = 930, ty = 560; const T = [['1', 'SEGUREM', 'hold', 9], ['2', '3 PASSOS', 'steps', 14], ['3', 'PUXEM!', 'heave', 7]];
      T.forEach(([k, l, id, max], i) => {
        const x = tx + i * 112; const cd = this.cool[id]; const dis = cd > 0 || (id === 'steps' && !this.hasTrick);
        R6.UI.button(ctx, x, ty, 104, 48, l, { disabled: dis, size: 15, sub: '' });
        R6.UI.text(ctx, k, x + 8, ty + 14, { size: 12, weight: 800, color: '#fff' });
        if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, ty + 48 - 48 * cd / max, 104, 48 * cd / max); }
      });
      if (this.oppStrain > 0.45 && this.hasTrick && this.cool.steps <= 0) R6.UI.text(ctx, 'ELES ESTÃO FORÇANDO DEMAIS — AGORA!', 1098, ty - 14, { size: 14, align: 'center', color: '#2ec4b6', weight: 800, alpha: 0.6 + Math.sin(this.t * 10) * 0.4 });
    }
    drawTeamPick(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.text(ctx, 'MONTE SUA EQUIPE', 640, 70, { size: 54, fam: 'title', align: 'center', color: '#fff', spacing: 4 });
      R6.UI.text(ctx, `Escolha até 9 jogadores (${this.pickedCount()}/9). Força importa — mas confiança e estratégia também.`, 640, 104, { size: 17, align: 'center', color: '#bbb' });
      this.rects = [];
      const cols = 3, w = 380, h = 62, x0 = 640 - (cols * w + (cols - 1) * 14) / 2, y0 = 126;
      this.cands.forEach((c, i) => {
        const x = x0 + (i % cols) * (w + 14), y = y0 + Math.floor(i / cols) * (h + 8);
        const r = { x, y, w, h }; this.rects.push(r); const hov = i === this.teamMenuI;
        R6.UI.panel(ctx, x, y, w, h, { fill: c.picked ? 'rgba(46,196,182,.22)' : 'rgba(10,12,18,.9)', stroke: hov ? '#fff' : c.picked ? '#2ec4b6' : 'rgba(255,255,255,.1)', shadow: false, lw: hov ? 2 : 1 });
        R6.Char.portrait(ctx, c.p.look, x + 31, y + 31, 50, c.willing ? 'neutral' : 'angry', this.t, false);
        R6.UI.text(ctx, '#' + U.pad(c.p.num) + (c.p.key ? '  ' + c.p.name : ''), x + 64, y + 22, { size: 15, weight: 800, color: c.p.key ? '#ffd166' : '#fff', maxW: 230 });
        R6.UI.text(ctx, 'FORÇA', x + 64, y + 44, { size: 11, weight: 800, color: '#999' }); R6.UI.bar(ctx, x + 108, y + 37, 110, 8, c.str, { color: '#e8336d' });
        const tg = c.p.fake ? { t: c.p.rel > 30 ? 'AMIGO' : 'NEUTRO', c: '#aaa' } : R6.State.tag(c.p);
        R6.UI.text(ctx, c.willing ? tg.t : 'RECUSA', x + w - 12, y + 44, { size: 12, align: 'right', weight: 800, color: c.willing ? tg.c : '#ff3b5c' });
        if (c.picked) R6.UI.shapeIcon(ctx, 'circle', x + w - 20, y + 18, 7, '#2ec4b6', 3, true);
      });
      const n = this.cands.length; const bx = 640 - 150, by = y0 + Math.ceil(n / cols) * (h + 8) + 10;
      const r = { x: bx, y: by, w: 300, h: 48 }; this.rects.push(r);
      R6.UI.button(ctx, bx, by, 300, 48, 'CONFIRMAR EQUIPE', { hover: this.teamMenuI === n, size: 20 });
      R6.UI.hints(ctx, [['SETAS/MOUSE', 'navegar'], ['ESPAÇO/CLIQUE', 'escolher']], 640, R6.H - 18, { align: 'center' });
    }
  }

  R6.TugOfWar = TugOfWar;
  R6.registerGame('tugofwar', { name: 'Cabo de Guerra', season: 1, icon: 'square', desc: 'Derrube a equipe rival da plataforma.', create: o => new TugOfWar(o) });
})();
