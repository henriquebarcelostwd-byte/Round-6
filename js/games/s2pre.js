/* ROUND 6 — s2pre.js : Season 2 pre-games — Bread or Lottery (scratch card), Rock-Paper-Scissors Minus One,
   and the cinematic, non-instructional "revolver" event that uses RPS losses to decide who takes each turn */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const recruiterLook = () => R6.Char.makeLook({ outfit: 'suit', hs: 'slick', hair: '#1a1411', skin: '#e9c3a0', build: 1.0, h: 1.04, seed: 77, glasses: false, beard: null });
  R6.recruiterLook = recruiterLook;

  // ======================================================= BREAD OR LOTTERY
  const SYMS = ['circle', 'triangle', 'square', 'star', 'umbrella'];
  class BreadLottery extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'breadlottery'; this.name = 'breadlottery';
      this.stage = R6.Env.stages.park; this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: this.stage.w, h: 760 } }); this.cam.set(1000, 380, 1.1);
      this.rec = recruiterLook();
      const S = R6.State; this.pl = Object.assign({}, S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 }), { outfit: 'civil', civ: { top: '#3a3f47', bottom: '#2d2d33' } });
      this.homeless = Array.from({ length: 6 }, (_, i) => ({ look: R6.Char.makeLook({ outfit: 'civil', seed: 600 + i, civ: { top: ['#5a4b3b', '#4b5a4b', '#3b4b5a', '#6b5a3b', '#4a4a4a', '#5a3b3b'][i], bottom: '#3a3a3a' } }), x: 760 - i * 70, state: 'wait', t: Math.random() * 3, choice: null }));
      this.step = 'watch'; this.watchT = 0; this.scratch = null; this.pick = null;
    }
    rules() {
      return { title: 'PÃO OU LOTERIA', icon: 'square', sub: 'O PRIMEIRO TESTE DO RECRUTADOR', lines: ['O homem de terno oferece uma escolha aos sem-teto: um pão, ou um bilhete de loteria.', 'Quem escolhe o bilhete precisa raspá-lo na frente de quem escolheu o pão.', 'Raspe com o mouse (segure e arraste). Três símbolos iguais = prêmio.', 'A sua escolha diz muito sobre você — e alguém está observando.'], keys: [['MOUSE', 'raspar'], ['1 2', 'escolher']] };
    }
    begin() {
      R6.Music.play('dread'); R6.Audio.loop('wind', 0.3);
      R6.Dialog.show([
        { mode: 'narr', text: 'Dois anos depois. Um parque, tarde da noite. Você encontrou o homem de terno — o mesmo da estação.' },
        { who: { name: 'RECRUTADOR', look: this.rec }, text: 'Senhoras e senhores. Hoje vocês têm uma escolha: pão… ou um bilhete de loteria.', expr: 'smirk' },
      ]);
    }
    focus() { const s = this.cam.toScreen(900, 560); return { x: s.x, y: s.y, look: this.pl, scale: 1.3, facing: 1 }; }
    update(dt) {
      this.t += dt; this.fx.update(dt); this.cam.update(dt);
      for (const h of this.homeless) h.t += dt;
      if (this.updateResult(dt)) return;
      if (this.updateRules(dt)) return;
      if (R6.Dialog.active) return;
      if (this.step === 'watch') {
        this.watchT += dt;
        // homeless people choose one by one
        const idx = Math.floor(this.watchT / 1.6);
        this.homeless.forEach((h, i) => { if (i < idx && !h.choice) { h.choice = Math.random() < 0.72 ? 'lottery' : 'bread'; h.win = h.choice === 'lottery' && Math.random() < 0.12; R6.Audio.sfx(h.choice === 'lottery' ? 'zip' : 'pop', { vol: 0.4 }); if (h.win) { R6.Audio.sfx('coin'); h.emo = 1; } } });
        if (idx > this.homeless.length + 1) { this.step = 'choose'; this.menu = new R6.UI.Menu([{ label: 'PÃO', icon: 'circle', sub: 'comer agora', action: () => this.choose('bread') }, { label: 'BILHETE DE LOTERIA', icon: 'square', sub: 'arriscar', action: () => this.choose('lottery') }]); R6.Dialog.show({ who: { name: 'RECRUTADOR', look: this.rec }, text: 'E você? Parece que já não tem fome faz tempo… Pão ou loteria?', expr: 'smirk' }); }
      } else if (this.step === 'choose') this.menu.update(dt);
      else if (this.step === 'scratch') this.updScratch(dt);
      else if (this.step === 'bread') { this.breadT += dt; if (this.breadT > 4.5 && !this.breadDone) { this.breadDone = true; this.afterBread(); } }
    }
    choose(c) {
      this.pick = c; if (this.campaign) R6.State.decide('bread_lottery', c, c === 'bread' ? 'Pão' : 'Loteria');
      if (c === 'lottery') {
        this.step = 'scratch';
        const win = Math.random() < R6.Save.D(0.35, 0.25, 0.18);
        const sym = U.pick(SYMS); const cells = [];
        if (win) { const pos = U.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3); for (let i = 0; i < 6; i++) cells.push(pos.includes(i) ? sym : U.pick(SYMS.filter(s => s !== sym))); }
        else { const pool = []; SYMS.forEach(s => { pool.push(s, s); }); U.shuffle(pool); for (let i = 0; i < 6; i++) cells.push(pool[i]); const cnt = {}; cells.forEach(s => cnt[s] = (cnt[s] || 0) + 1); for (const s in cnt) if (cnt[s] >= 3) cells[cells.indexOf(s)] = SYMS.find(x => (cnt[x] || 0) === 0) || 'star'; }
        this.scratch = { cells, win, cv: null, revealed: 0 }; this.makeCoat();
      } else {
        this.step = 'bread'; this.breadT = 0; R6.Audio.sfx('pop');
        R6.Dialog.toast({ name: 'RECRUTADOR', look: this.rec }, 'Pão. Interessante. Agora assista enquanto os outros raspam.', 3, { expr: 'smirk' });
      }
    }
    makeCoat() {
      const cv = document.createElement('canvas'); cv.width = 520; cv.height = 280; const c = cv.getContext('2d');
      const g = c.createLinearGradient(0, 0, 520, 280); g.addColorStop(0, '#b9bec6'); g.addColorStop(0.5, '#dfe3e8'); g.addColorStop(1, '#a4aab3'); c.fillStyle = g; c.fillRect(0, 0, 520, 280);
      c.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 400; i++) c.fillRect(Math.random() * 520, Math.random() * 280, 2, 2);
      c.font = R6.UI.font(30, 800, 'title'); c.fillStyle = 'rgba(70,70,80,.45)'; c.textAlign = 'center'; c.fillText('RASPE AQUI', 260, 150);
      this.scratch.cv = cv; this.scratch.cx = c;
    }
    updScratch(dt) {
      const S = this.scratch; const m = R6.Input.mouse;
      const x0 = 380, y0 = 250;
      if (m.down && !S.done) {
        const lx = m.x - x0, ly = m.y - y0;
        if (lx > -20 && ly > -20 && lx < 540 && ly < 300) {
          const c = S.cx; c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(lx, ly, 22, 0, TAU); c.fill();
          if (S.last) { c.lineWidth = 44; c.lineCap = 'round'; c.beginPath(); c.moveTo(S.last.x, S.last.y); c.lineTo(lx, ly); c.stroke(); }
          c.globalCompositeOperation = 'source-over'; S.last = { x: lx, y: ly };
          this.scrT = (this.scrT || 0) - dt; if (this.scrT <= 0) { this.scrT = 0.08; R6.Audio.sfx('scrape', { vol: 0.3 }); }
          this.fx.emit('dust', m.x, m.y, 1, { color: '#c9ced6', size: 0.4 });
        }
      } else S.last = null;
      // keyboard fallback
      if (R6.Input.act('action')) { const c = S.cx; c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(Math.random() * 520, Math.random() * 280, 30, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
      S.chk = (S.chk || 0) - dt;
      if (S.chk <= 0 && !S.done) {
        S.chk = 0.25; const d = S.cx.getImageData(0, 0, 520, 280).data; let clear = 0; for (let i = 3; i < d.length; i += 64) if (d[i] < 40) clear++;
        S.revealed = clear / (d.length / 64);
        if (S.revealed > 0.62) { S.done = true; this.afterScratch(); }
      }
    }
    afterScratch() {
      const S = this.scratch; const R = R6.State;
      if (S.win) { R6.Audio.sfx('win'); this.fx.emit('money', 640, 300, 30); if (this.campaign) { R.s.player.money += 1000000; R.karma(0); } }
      else R6.Audio.sfx('error');
      R6.Dialog.show([
        { who: { name: 'RECRUTADOR', look: this.rec }, text: S.win ? 'Veja só. A sorte sorriu para você. Mas sorte… não dura.' : 'Nada. Você sabia que quase ninguém ganha. E mesmo assim escolheu o papel ao pão.', expr: 'smirk' },
        { mode: 'narr', text: 'Ele recolhe o carrinho e se afasta devagar em direção à estação. Você o segue a uma distância segura.', onDone: () => this.finish() },
      ]);
    }
    afterBread() {
      const lines = [{ who: { name: 'RECRUTADOR', look: this.rec }, text: 'As pessoas dizem que querem só sobreviver. Mas quase todas escolhem a chance de ficar ricas.', expr: 'smirk' }];
      if (this.campaign) lines.push({ choice: true });
      R6.Dialog.show(lines.filter(l => !l.choice));
      if (this.campaign) R6.Dialog.show({ who: null, text: 'Uma menina ao seu lado olha para o seu pão, com fome.', choices: [{ t: 'Dar o pão para ela', cb: () => { R6.State.karma(3); R6.State.flag('gave_bread', true); R6.Toast.show('Você deu o pão.', { color: '#2ec4b6' }); } }, { t: 'Comer o pão', cb: () => { } }] });
      R6.Dialog.show({ mode: 'narr', text: 'O recrutador recolhe o carrinho e se afasta. Você o segue a uma distância segura.', onDone: () => this.finish() });
    }
    finish() { this.chips = 30; this.win({ title: 'ESCOLHA FEITA', sub: this.pick === 'bread' ? 'VOCÊ ESCOLHEU O PÃO' : 'VOCÊ ESCOLHEU A LOTERIA', wait: 2.4 }); }
    debugWin() { this.phase = 'play'; this.pick = 'bread'; this.finish(); }
    render(ctx) {
      const st = this.stage;
      R6.Env.render(ctx, st, this.cam, this.t, c => {
        const g = st.ground;
        // cart
        c.fillStyle = '#6b4b33'; c.fillRect(960, g - 90, 150, 60); c.fillStyle = '#e9d9b0'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(980 + i * 26, g - 96, 12, 8, 0, 0, TAU); c.fill(); } c.fillStyle = '#e8336d'; c.fillRect(1070, g - 108, 30, 18);
        c.fillStyle = '#333'; c.beginPath(); c.arc(985, g - 22, 14, 0, TAU); c.arc(1085, g - 22, 14, 0, TAU); c.fill();
        R6.Char.draw(c, this.rec, 1150, g, { view: 'side', dir: -1, anim: 'idle', t: this.t, scale: 1.3, expr: 'smirk' });
        for (const h of this.homeless) R6.Char.draw(c, h.look, h.x, g + 10, { view: 'side', dir: 1, anim: h.choice === 'lottery' ? (h.win ? 'celebrate' : 'sad') : h.choice === 'bread' ? 'eat' : 'idle', t: h.t, scale: 1.2 });
        R6.Char.draw(c, this.pl, 870, g + 20, { view: 'side', dir: 1, anim: this.step === 'bread' ? 'eat' : 'idle', t: this.t, scale: 1.3 });
      });
      R6.UI.vignette(ctx, 0.6);
      if (this.step === 'choose' && !R6.Dialog.active) { R6.UI.panel(ctx, 440, 470, 400, 140, { fill: 'rgba(8,10,14,.92)' }); this.menu.draw(ctx, 460, 486, 360, 52, 12, { size: 20 }); }
      if (this.step === 'scratch' && this.scratch) this.drawCard(ctx);
      this.fx.draw(ctx);
      this.drawRules(ctx);
    }
    drawCard(ctx) {
      const S = this.scratch; const x0 = 380, y0 = 250;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.panel(ctx, x0 - 30, y0 - 90, 580, 400, { fill: '#f4e7c8', stroke: '#c9a36b', lw: 3 });
      R6.UI.text(ctx, 'LOTERIA DA SORTE', 640, y0 - 50, { size: 40, fam: 'title', align: 'center', color: '#8a2a2a', spacing: 3 });
      R6.UI.text(ctx, 'TRÊS SÍMBOLOS IGUAIS = ₩1.000.000', 640, y0 - 22, { size: 15, align: 'center', color: '#5a3a1a', weight: 800 });
      for (let i = 0; i < 6; i++) { const cx = x0 + 90 + (i % 3) * 170, cy = y0 + 70 + Math.floor(i / 3) * 140; ctx.fillStyle = '#fff8e8'; ctx.fillRect(cx - 70, cy - 55, 140, 110); R6.UI.shapeIcon(ctx, S.cells[i], cx, cy, 30, '#b8322f', 5); }
      ctx.drawImage(S.cv, x0, y0);
      if (S.done) R6.UI.text(ctx, S.win ? 'PRÊMIO!' : 'NÃO FOI DESSA VEZ', 640, y0 + 340, { size: 36, fam: 'title', align: 'center', color: S.win ? '#2ec4b6' : '#ff5a6a', shadow: true });
      else R6.UI.text(ctx, 'Segure o mouse e raspe · ' + Math.floor(S.revealed * 100) + '%', 640, y0 + 340, { size: 16, align: 'center', color: '#fff', weight: 700 });
    }
  }
  R6.BreadLottery = BreadLottery;
  R6.registerGame('breadlottery', { name: 'Pão ou Loteria', season: 2, icon: 'square', desc: 'A escolha do recrutador.', create: o => new BreadLottery(o) });

  // ======================================================= RPS MINUS ONE (+ revolver event)
  const G = ['rock', 'paper', 'scissors'], GN = { rock: 'PEDRA', paper: 'PAPEL', scissors: 'TESOURA' };
  const beats = (a, b) => (a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper');

  function drawHand(ctx, x, y, s, g, skin, flip, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.globalAlpha *= alpha;
    const sd = U.shade(skin, -0.18);
    ctx.fillStyle = '#2d3340'; ctx.fillRect(-70, -18, 34, 36); // sleeve
    ctx.fillStyle = sd; R6.UI.rrect(ctx, -40, -22, 44, 44, 12); ctx.fill();
    ctx.fillStyle = skin; R6.UI.rrect(ctx, -38, -20, 42, 40, 12); ctx.fill();
    const finger = (fx, fy, len, ang, w = 9) => { ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang); ctx.fillStyle = skin; R6.UI.rrect(ctx, 0, -w / 2, len, w, w / 2); ctx.fill(); ctx.strokeStyle = sd; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); };
    if (g === 'rock') { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? skin : U.shade(skin, -0.06); R6.UI.rrect(ctx, 0, -20 + i * 10, 14, 10, 5); ctx.fill(); ctx.strokeStyle = sd; ctx.lineWidth = 1; ctx.stroke(); } finger(-18, 16, 22, -0.2, 10); }
    else if (g === 'paper') { for (let i = 0; i < 4; i++) finger(0, -15 + i * 10, 36 - Math.abs(i - 1.5) * 4, -0.08 + i * 0.05); finger(-16, 18, 24, 0.6, 10); }
    else { finger(0, -12, 40, -0.3); finger(0, -2, 40, 0.15); ctx.fillStyle = skin; R6.UI.rrect(ctx, 0, 4, 14, 16, 6); ctx.fill(); ctx.strokeStyle = sd; ctx.stroke(); finger(-16, 18, 20, 0.5, 10); }
    ctx.restore();
  }
  R6.drawRPSHand = drawHand;

  class RPSMinusOne extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'rps'; this.name = 'rps';
      this.variant = opts.variant || (this.campaign ? 'roulette' : 'practice');
      this.stage = R6.Env.stages.room; this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: 1400, h: 760 } }); this.cam.set(700, 400, 1.2);
      this.rec = recruiterLook(); const S = R6.State;
      this.pl = Object.assign({}, S.s ? S.s.player.look : R6.Char.makeLook({ num: 456 }), { outfit: 'civil', civ: { top: '#3a3f47', bottom: '#2d2d33' } });
      this.wins = 0; this.losses = 0; this.need = 3; this.hist = []; this.round = 0;
      this.chambers = 6; this.cyl = 0; this.live = U.randi(2, 5); this.recPulls = 0; this.plPulls = 0;
      this.step = 'pick'; this.pick = [null, null]; this.sel = 0;
      this.skill = R6.Save.D(0.45, 0.6, 0.75);
    }
    rules() {
      return {
        title: 'PEDRA, PAPEL, TESOURA: MENOS UM', icon: 'triangle', sub: this.variant === 'roulette' ? 'O JOGO DO RECRUTADOR' : 'MELHOR DE 5',
        lines: ['Cada um mostra DUAS mãos (pedra, papel ou tesoura).', 'Depois de ver as mãos do outro, cada um recolhe UMA — "menos um".', 'A mão que sobra decide a rodada. Empate: joga de novo.', this.variant === 'roulette' ? 'Quem perde a rodada enfrenta a vez no tambor. Ele sempre jogou com a sorte.' : 'Vença 3 rodadas.'],
        keys: [['1 2 3', 'escolher gesto'], ['A / D', 'mão'], ['ENTER', 'confirmar']],
      };
    }
    begin() {
      R6.Music.play('dread'); R6.Music.setIntensity(0.2); R6.Audio.loop('hum', 0.4);
      if (this.variant === 'roulette') R6.Dialog.show([
        { mode: 'narr', text: 'Uma sala vazia, uma lâmpada, uma mesa. Ele te esperava.' },
        { who: { name: 'RECRUTADOR', look: this.rec }, text: 'Você voltou. Veio atrás de mim, mesmo com todo aquele dinheiro. As pessoas não mudam.', expr: 'smirk' },
        { who: { name: 'RECRUTADOR', look: this.rec }, text: 'Vamos jogar. Pedra, papel e tesoura… menos um. Quem perder, faz a vez do tambor. Seis câmaras.', expr: 'smirk' },
        { who: R6.State.s ? R6.State.player : { name: 'VOCÊ', look: this.pl }, text: 'Se eu ganhar, você me diz onde fica o jogo.', expr: 'determined' },
      ]);
    }
    focus() { const s = this.cam.toScreen(560, 560); return { x: s.x, y: s.y, look: this.pl, scale: 1.4, facing: 1 }; }
    aiPick() { // two hands, with a weak preference learned from the player
      const cnt = { rock: 1, paper: 1, scissors: 1 }; this.hist.forEach(h => cnt[h]++);
      const fav = G.reduce((a, b) => cnt[a] > cnt[b] ? a : b);
      const counter = { rock: 'paper', paper: 'scissors', scissors: 'rock' }[fav];
      const a = Math.random() < this.skill ? counter : U.pick(G); let b = U.pick(G); if (b === a && Math.random() < 0.7) b = U.pick(G.filter(x => x !== a));
      return [a, b];
    }
    aiKeep(mine, theirs) {
      const score = g => theirs.reduce((s, t) => s + (beats(g, t) ? 1 : beats(t, g) ? -1 : 0), 0);
      const sa = score(mine[0]), sb = score(mine[1]);
      if (Math.random() > this.skill) return U.randi(0, 1);
      return sa === sb ? U.randi(0, 1) : sa > sb ? 0 : 1;
    }
    update(dt) {
      this.t += dt; this.fx.update(dt); this.cam.update(dt);
      if (this.updateResult(dt)) return;
      if (this.updateRules(dt)) return;
      if (R6.Dialog.active) return;
      const I = R6.Input;
      if (this.step === 'pick') {
        if (I.actP('left')) { this.sel = 0; R6.Audio.sfx('hover'); } if (I.actP('right')) { this.sel = 1; R6.Audio.sfx('hover'); }
        const d = I.digitP(); if (d >= 1 && d <= 3) { this.pick[this.sel] = G[d - 1]; R6.Audio.sfx('click'); if (this.sel === 0 && !this.pick[1]) this.sel = 1; }
        const m = I.mouse; if (m.pressed && this.btns) for (const b of this.btns) if (U.rectHit(m.x, m.y, b)) { this.pick[b.h] = b.g; this.sel = b.h; R6.Audio.sfx('click'); if (b.h === 0 && !this.pick[1]) this.sel = 1; }
        if ((I.actP('confirm') || (m.pressed && this.okBtn && U.rectHit(m.x, m.y, this.okBtn))) && this.pick[0] && this.pick[1]) { this.ai = this.aiPick(); this.step = 'reveal'; this.revT = 0; R6.Audio.sfx('stamp'); }
      } else if (this.step === 'reveal') {
        this.revT += dt;
        if (this.revT > 1.2) { this.step = 'minus'; this.minT = R6.Save.D(4, 3, 2.2); this.keep = null; }
      } else if (this.step === 'minus') {
        this.minT -= dt;
        if (Math.floor(this.minT) !== Math.floor(this.minT + dt)) R6.Audio.sfx('tick');
        if (I.actP('left') || I.digitP() === 1) this.keep = 0; if (I.actP('right') || I.digitP() === 2) this.keep = 1;
        const m = I.mouse; if (m.pressed && this.keepBtns) this.keepBtns.forEach((b, i) => { if (U.rectHit(m.x, m.y, b)) this.keep = i; });
        if (this.minT <= 0 || (this.keep != null && I.actP('confirm'))) {
          if (this.keep == null) this.keep = U.randi(0, 1);
          this.aiKeepI = this.aiKeep(this.ai, this.pick);
          const mine = this.pick[this.keep], his = this.ai[this.aiKeepI];
          this.hist.push(mine);
          this.step = 'result'; this.resT = 0; R6.Audio.sfx('whoosh');
          this.res = beats(mine, his) ? 'win' : beats(his, mine) ? 'lose' : 'tie';
        }
      } else if (this.step === 'result') {
        this.resT += dt;
        if (this.resT > 1.8 && !this.resDone) {
          this.resDone = true;
          if (this.res === 'tie') { this.say('Empate.'); this.nextRound(); }
          else if (this.variant === 'roulette') this.startTurn(this.res === 'win' ? 'rec' : 'pl');
          else { if (this.res === 'win') this.wins++; else this.losses++; if (this.wins >= this.need) { this.chips = 60; this.win({ sub: 'VOCÊ VENCEU ' + this.wins + ' × ' + this.losses }); } else if (this.losses >= this.need) this.lose({ reason: 'Ele venceu ' + this.losses + ' × ' + this.wins }); else this.nextRound(); }
        }
      } else if (this.step === 'turn') this.updTurn(dt);
    }
    say(t) { this.msg = { t: 0, text: t }; }
    nextRound() { this.round++; this.step = 'pick'; this.pick = [null, null]; this.sel = 0; this.resDone = false; }
    startTurn(who) {
      this.step = 'turn'; this.turn = { who, t: 0, phase: 'lift', pulled: false };
      R6.Audio.loop('heartbeat', 0.9); R6.Music.setIntensity(0.8);
      this.cam.to(who === 'pl' ? 560 : 840, 360, 1.7, 1.2);
      if (who === 'rec') R6.Dialog.toast({ name: 'RECRUTADOR', look: this.rec }, U.pick(['Minha vez. Eu sempre tive sorte.', 'Não se preocupe comigo.', 'Olhe bem. É assim que se vive.']), 2.2, { expr: 'smirk' });
    }
    updTurn(dt) {
      const T = this.turn; T.t += dt;
      if (T.phase === 'lift' && T.t > 1.4) {
        if (T.who === 'rec') T.phase = 'pull';
        else { T.phase = 'wait'; }
      }
      if (T.phase === 'wait') { T.hold = (T.hold || 0) + (R6.Input.act('action') || R6.Input.mouse.down ? dt : -dt * 0.5); T.hold = Math.max(0, T.hold); if (T.hold > 1.2 || T.t > 12) T.phase = 'pull'; }
      if (T.phase === 'pull' && !T.pulled) {
        T.pulled = true; T.pullT = 0;
        const isLive = this.cyl === this.live;
        let fatal = isLive;
        if (T.who === 'pl' && fatal && R6.Save.diff() !== 'extreme') { fatal = false; this.live = Math.min(this.chambers - 1, this.live + 1); }
        if (T.who === 'rec') this.recPulls++; else this.plPulls++;
        T.fatal = fatal;
        if (fatal) { R6.Audio.stopLoop('heartbeat', 0.1); R6.Engine.flash('#ffffff', 1.4); R6.Audio.sfx('gun'); R6.Audio.sfx('ding', { delay: 0.2 }); this.cam.shake(12, 0.4); }
        else { R6.Audio.sfx('tick'); R6.Audio.sfx('tock', { delay: 0.05 }); }
        this.cyl++;
      }
      if (T.pulled) {
        T.pullT += dt;
        if (T.pullT > 2.4 && !T.done) {
          T.done = true; R6.Audio.stopLoop('heartbeat', 0.3); this.cam.to(700, 400, 1.2, 1);
          if (T.fatal && T.who === 'rec') { this.recGone = true; this.endRoulette(); }
          else if (T.fatal && T.who === 'pl') { if (this.campaign) R6.State.eliminate(R6.State.player, 'roulette'); this.lose({ reason: 'A sorte acabou' }); }
          else { this.say(T.who === 'pl' ? 'Clique. Vazio. Você ainda respira.' : 'Clique. Ele sorri.'); if (this.cyl >= this.chambers) { this.cyl = 0; this.live = U.randi(1, 5); } this.nextRound(); }
        }
      }
    }
    endRoulette() {
      R6.Music.stop(2);
      const lines = [
        { mode: 'narr', text: 'O silêncio depois é o pior som que você já ouviu. A cadeira do outro lado da mesa está vazia.' },
        { mode: 'narr', text: 'No bolso do paletó dele, um cartão com três formas e um número de telefone. E um endereço: o cais do porto.' },
      ];
      if (this.campaign) { R6.State.flag('recruiter_gone', true); R6.State.give('map'); }
      lines[lines.length - 1].onDone = () => { this.chips = 80; this.win({ title: 'SOBREVIVENTE', sub: 'O RECRUTADOR PERDEU O PRÓPRIO JOGO', wait: 3 }); };
      R6.Dialog.show(lines);
    }
    debugWin() { this.phase = 'play'; if (this.variant === 'roulette') { this.recGone = true; this.win({ wait: 0.3 }); } else { this.wins = 3; this.win({ wait: 0.3 }); } }
    render(ctx) {
      const st = this.stage; const T = this.turn;
      R6.Env.render(ctx, st, this.cam, this.t, c => {
        const g = st.ground;
        R6.Char.draw(c, this.pl, 540, g, { view: 'side', dir: 1, anim: T && T.who === 'pl' && T.phase !== 'lift' ? (T.pulled && !T.fatal ? 'sad' : 'hold') : 'sit', t: this.t, scale: 1.45, expr: T && T.who === 'pl' ? 'scared' : 'determined' });
        if (!this.recGone) R6.Char.draw(c, this.rec, 860, g, { view: 'side', dir: -1, anim: T && T.who === 'rec' && T.phase !== 'lift' ? 'hold' : 'sit', t: this.t, scale: 1.45, expr: 'smirk' });
        else { c.save(); c.translate(900, g - 20); c.rotate(1.4); c.fillStyle = '#2a1d16'; c.fillRect(-30, -10, 60, 12); c.restore(); }
        // the revolver: a dark silhouette resting on the table (never detailed)
        if (!T || T.phase === 'lift' && T.t < 0.5) { c.fillStyle = '#121214'; c.fillRect(680, g - 82, 46, 8); c.fillRect(676, g - 82, 10, 14); }
      });
      R6.UI.vignette(ctx, 0.75);
      // chamber indicator (abstract)
      if (this.variant === 'roulette' && this.phase === 'play') {
        const cx = 1140, cy = 140; R6.UI.panel(ctx, cx - 90, cy - 70, 180, 150, { fill: 'rgba(6,8,12,.8)', shadow: false });
        R6.UI.text(ctx, 'TAMBOR', cx, cy - 46, { size: 13, align: 'center', weight: 800, color: '#aaa', spacing: 2 });
        for (let i = 0; i < this.chambers; i++) { const a = -Math.PI / 2 + i / this.chambers * TAU; const x = cx + Math.cos(a) * 36, y = cy + 14 + Math.sin(a) * 36; ctx.fillStyle = i < this.cyl ? '#333' : '#777'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); if (i === this.cyl) { ctx.strokeStyle = '#e8336d'; ctx.lineWidth = 2.5; ctx.stroke(); } }
        R6.UI.text(ctx, 'VOCÊ ' + this.plPulls + ' · ELE ' + this.recPulls, cx, cy + 72, { size: 12, align: 'center', color: '#888', weight: 700 });
      }
      if (this.phase === 'play' && !R6.Dialog.active) this.drawUI(ctx);
      if (this.msg) { this.msg.t += 1 / 60; if (this.msg.t < 2.2) R6.UI.text(ctx, this.msg.text, 640, 160, { size: 30, fam: 'title', align: 'center', color: '#fff', shadow: true, alpha: Math.min(1, (2.2 - this.msg.t) * 2) }); }
      this.drawRules(ctx);
    }
    drawUI(ctx) {
      const skin = this.pl.skin, rskin = this.rec.skin;
      if (this.variant !== 'roulette') R6.UI.text(ctx, this.wins + '  ×  ' + this.losses, 640, 60, { size: 44, fam: 'mono', align: 'center', color: '#f2c14e' });
      if (this.step === 'pick') {
        R6.UI.panel(ctx, 250, 450, 780, 250, { fill: 'rgba(8,10,14,.9)' });
        R6.UI.text(ctx, 'ESCOLHA SUAS DUAS MÃOS', 640, 480, { size: 22, align: 'center', weight: 800 });
        this.btns = [];
        for (let h = 0; h < 2; h++) {
          const bx = h === 0 ? 290 : 670;
          R6.UI.text(ctx, h === 0 ? 'MÃO ESQUERDA' : 'MÃO DIREITA', bx + 160, 512, { size: 14, align: 'center', weight: 800, color: this.sel === h ? '#e8336d' : '#999' });
          G.forEach((g, i) => { const r = { x: bx + i * 110, y: 524, w: 100, h: 110, g, h: h }; this.btns.push(r); const on = this.pick[h] === g; R6.UI.panel(ctx, r.x, r.y, r.w, r.h, { fill: on ? 'rgba(232,51,109,.35)' : 'rgba(20,22,28,.9)', stroke: on ? '#e8336d' : this.sel === h ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.1)', shadow: false }); drawHand(ctx, r.x + 50, r.y + 50, 0.9, g, skin, false); R6.UI.text(ctx, (i + 1) + ' ' + GN[g], r.x + 50, r.y + 102, { size: 12, align: 'center', weight: 800, color: '#ddd' }); });
        }
        this.okBtn = { x: 540, y: 650, w: 200, h: 40 };
        R6.UI.button(ctx, 540, 650, 200, 40, 'MOSTRAR', { hover: !!(this.pick[0] && this.pick[1]), disabled: !(this.pick[0] && this.pick[1]), size: 18 });
      }
      if (this.step === 'reveal' || this.step === 'minus' || this.step === 'result') {
        const k = Math.min(1, (this.revT || 1) * 3);
        const out = (h, isAI) => this.step === 'result' && ((isAI ? this.aiKeepI : this.keep) !== h);
        for (let h = 0; h < 2; h++) {
          drawHand(ctx, 420, 300 + h * 150, 1.6 * k, this.pick[h], skin, false, out(h, false) ? 0.2 : 1);
          drawHand(ctx, 860, 300 + h * 150, 1.6 * k, this.ai[h], rskin, true, out(h, true) ? 0.2 : 1);
        }
        if (this.step === 'minus') {
          R6.UI.text(ctx, 'MENOS UM! QUAL MÃO VOCÊ MANTÉM?', 640, 150, { size: 34, fam: 'title', align: 'center', color: '#fff', shadow: true });
          R6.UI.text(ctx, Math.ceil(this.minT) + '', 640, 210, { size: 60, fam: 'mono', align: 'center', color: '#ff3b5c' });
          this.keepBtns = [{ x: 250, y: 250, w: 250, h: 110 }, { x: 250, y: 400, w: 250, h: 110 }];
          this.keepBtns.forEach((b, i) => { ctx.strokeStyle = this.keep === i ? '#2ec4b6' : 'rgba(255,255,255,.15)'; ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h); R6.UI.text(ctx, (i + 1) + ' · MANTER', b.x + 12, b.y + 22, { size: 13, weight: 800, color: this.keep === i ? '#2ec4b6' : '#aaa' }); });
        }
        if (this.step === 'result') {
          const txt = this.res === 'win' ? 'VOCÊ VENCEU A RODADA' : this.res === 'lose' ? 'VOCÊ PERDEU A RODADA' : 'EMPATE';
          R6.UI.text(ctx, txt, 640, 150, { size: 42, fam: 'title', align: 'center', color: this.res === 'win' ? '#2ec4b6' : this.res === 'lose' ? '#ff3b5c' : '#fff', shadow: true });
        }
      }
      if (this.step === 'turn') {
        const T = this.turn;
        if (T.who === 'pl' && T.phase === 'wait') { R6.UI.text(ctx, 'SUA VEZ. SEGURE ESPAÇO.', 640, 620, { size: 30, fam: 'title', align: 'center', color: '#fff', shadow: true }); R6.UI.bar(ctx, 490, 640, 300, 10, T.hold / 1.2, { color: '#ff3b5c' }); }
        if (T.pulled && !T.fatal) R6.UI.text(ctx, 'CLIQUE.', 640, 300, { size: 80, fam: 'title', align: 'center', color: '#ddd', alpha: Math.max(0, 1 - T.pullT / 2) });
      }
    }
  }
  R6.RPSMinusOne = RPSMinusOne;
  R6.registerGame('rps', { name: 'Pedra, Papel e Tesoura: Menos Um', season: 2, icon: 'triangle', desc: 'Duas mãos. Menos uma.', create: o => new RPSMinusOne(o) });
})();
