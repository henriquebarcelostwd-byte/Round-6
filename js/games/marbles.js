/* ROUND 6 — marbles.js : Marbles — partner choice, 4 modes (odd/even, hole shot, line throw, which hand), bets & risk,
   bluffing AI that learns your patterns, cheating choice, emotional endings, tournament variant */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;

  // ---------- alley stage (painted neighborhood set) ----------
  R6.Env.stages.alley = {
    w: 1600, ground: 560, music: 'sad',
    back(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#f2a65a'); g.addColorStop(0.5, '#f7c77e'); g.addColorStop(1, '#e98a6b');
      ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
      ctx.fillStyle = 'rgba(255,240,210,.7)'; for (let i = 0; i < 6; i++) { const x = (i * 260 + 60) % 1400, y = 60 + (i % 3) * 50; ctx.beginPath(); ctx.ellipse(x, y, 90, 20, 0, 0, TAU); ctx.ellipse(x + 50, y - 12, 50, 18, 0, 0, TAU); ctx.fill(); }
      // painted-set seams (it's a studio set)
      ctx.strokeStyle = 'rgba(120,60,30,.12)'; ctx.lineWidth = 2; for (let x = 0; x < R6.W; x += 213) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke(); }
    },
    world(ctx, cam, t) {
      const g = this.ground;
      const houses = [[0, '#c9b28a', '#6b3f2a'], [380, '#b7c2c9', '#35506b'], [760, '#d6c29a', '#7a3b2e'], [1140, '#c4b7a6', '#3f5a45']];
      for (const [x, wall, roof] of houses) {
        ctx.fillStyle = wall; ctx.fillRect(x + 10, g - 300, 360, 300);
        ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 10, g - 300); ctx.lineTo(x + 190, g - 380); ctx.lineTo(x + 390, g - 300); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * 50, g - 300); ctx.lineTo(x + 190, g - 380); ctx.stroke(); }
        ctx.fillStyle = '#5a3a28'; ctx.fillRect(x + 150, g - 150, 70, 150);
        ctx.fillStyle = '#e9d9a8'; ctx.fillRect(x + 50, g - 240, 70, 60); ctx.fillRect(x + 250, g - 240, 70, 60);
        ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 4; ctx.strokeRect(x + 50, g - 240, 70, 60); ctx.strokeRect(x + 250, g - 240, 70, 60);
      }
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, g - 330); ctx.quadraticCurveTo(800, g - 280, 1600, g - 330); ctx.stroke();
      const cl = ['#e8336d', '#f2c14e', '#fff', '#2a9d8f']; for (let i = 0; i < 14; i++) { const x = 60 + i * 110; ctx.fillStyle = cl[i % 4]; ctx.fillRect(x, g - 318 + Math.sin(i) * 6, 26, 32); }
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(700, g - 360, 10, 360); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(705, g - 365, 12, 0, TAU); ctx.fill();
      const gg = ctx.createLinearGradient(0, g, 0, g + 200); gg.addColorStop(0, '#b08a5a'); gg.addColorStop(1, '#7a5a38'); ctx.fillStyle = gg; ctx.fillRect(0, g, this.w, 220);
    },
  };

  const MODES = {
    oddeven: { name: 'PAR OU ÍMPAR', icon: 'circle', desc: 'Um esconde bolinhas na mão; o outro aposta e adivinha par ou ímpar.' },
    hole: { name: 'TIRO NO BURACO', icon: 'circle', desc: 'Quem jogar a bolinha mais perto do buraco leva a aposta.' },
    line: { name: 'ALVO NA LINHA', icon: 'square', desc: 'Mais perto da linha sem passar dela vence. Passou, perdeu.' },
    hand: { name: 'QUAL MÃO?', icon: 'triangle', desc: 'Adivinhe em qual mão estão as bolinhas. Arriscado.' },
  };

  function marbleColor(i) { return ['#7fc4ff', '#ff7fa8', '#ffd166', '#8bd17c', '#c39bff', '#ff9f5a'][i % 6]; }
  function drawMarble(ctx, x, y, r, c) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, c); g.addColorStop(1, U.shade(c, -0.45));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.6, 1.9); ctx.stroke();
  }
  R6.drawMarble = drawMarble;

  class Marbles extends R6.GameBase {
    constructor(opts = {}) {
      super(opts);
      this.gameId = 'marbles'; this.name = 'marbles';
      this.variant = opts.variant || 'normal';
      this.tourney = this.variant === 'tournament' ? 0 : -1;
      this.stage = this.campaign && !opts.partner ? 'partner' : 'intro';
      this.timeLimit = R6.Save.D(420, 360, 300); this.timeLeft = this.timeLimit;
      this.pm = 10; this.om = 10; this.round = 0; this.chooser = 'player';
      this.hist = []; // player's hidden counts (for AI learning)
      this.guessHist = []; // player's guesses
      this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: 1600, h: 760 } }); this.cam.set(800, 400, 1.15);
      this.flying = []; this.sub = null; this.msg = null; this.lines = [];
      this.pl = R6.State.s ? R6.State.s.player.look : R6.Char.makeLook({ num: 456 });
      if (opts.partner) this.setOpponent(opts.partner);
      else if (!this.campaign) this.setOpponent(this.makeTourneyOpp(0));
      if (this.stage === 'partner') this.buildPartnerList();
    }
    makeTourneyOpp(i) {
      const names = [['Tio Bae', 0.35, 0.3], ['Sra. Oh', 0.55, 0.6], ['O Apostador', 0.8, 0.85]];
      const [name, skill, bluff] = names[Math.min(2, i)];
      return { name, look: R6.Char.makeLook({ seed: 900 + i, age: i === 0 ? 2 : 1 }), num: 200 + i * 11, tr: { intel: skill, betray: bluff, chaos: 0.3, kindness: 0.5 }, sk: { precision: skill }, fake: true, rel: 0 };
    }
    setOpponent(p) {
      this.opp = p; this.oppLook = p.look;
      this.skill = U.clamp((p.sk ? p.sk.precision : 0.5) * 0.7 + (p.tr.intel || 0.5) * 0.3, 0.1, 0.95) * R6.Save.D(0.9, 1.05, 1.2);
      this.bluff = U.clamp(p.tr.betray * 0.7 + p.tr.intel * 0.3, 0.05, 0.95);
      this.forgetful = p.key === 'oldman';
    }
    rules() {
      if (this.stage === 'partner') return null;
      return {
        title: this.variant === 'tournament' ? 'MARBLES TOURNAMENT' : 'BOLINHAS DE GUDE', icon: 'circle', sub: this.variant === 'tournament' ? '3 ADVERSÁRIOS · 10 BOLINHAS CADA' : 'VOCÊ CONTRA SEU PARCEIRO · 10 BOLINHAS CADA',
        lines: [
          'Pegue todas as bolinhas do adversário antes do tempo acabar.',
          'A cada rodada, um de vocês escolhe o jogo e a aposta.',
          'Par ou Ímpar · Tiro no Buraco · Alvo na Linha · Qual Mão?',
          'O adversário blefa e aprende seus padrões. Varie!',
          'Se o tempo acabar e os dois ainda tiverem bolinhas, ambos são eliminados.',
        ],
        keys: [['MOUSE', 'arrastar e soltar para jogar'], ['1-4', 'escolhas']],
      };
    }
    // ------------------------------------------------ partner choice
    buildPartnerList() {
      const S = R6.State;
      const keys = S.aliveBots().filter(p => p.key && p.key !== 'gangster' && p.key !== 'wild');
      const others = U.shuffle(S.aliveBots().filter(p => !p.key)).slice(0, 3);
      this.partners = keys.concat(others).map(p => ({ p, accept: p.rel > -20 || p.key === 'oldman' }));
      this.partnerMenu = new R6.UI.Menu(this.partners.map(c => ({
        label: (c.p.key ? c.p.name : 'Jogador') + '  #' + U.pad(c.p.num), sub: c.accept ? R6.State.tag(c.p).t : 'RECUSA',
        action: () => this.choosePartner(c),
      })));
    }
    choosePartner(c) {
      if (!c.accept) { R6.Audio.sfx('error'); R6.Dialog.show({ who: c.p, text: U.pick(['Com você? Nem pensar.', 'Procure outro.', 'Eu não confio em você.']), expr: 'angry' }); return; }
      this.setOpponent(c.p);
      R6.State.decide('marbles_partner', c.p.key || c.p.num, c.p.name);
      R6.State.addRel(c.p, 10, 'teamed', { silent: true });
      this.stage = 'reveal';
      const lines = [
        { who: c.p, text: c.p.key === 'oldman' ? 'Eu? Ha! Eu não tenho ninguém mesmo. Vamos ser parceiros, então.' : 'Tá. Juntos a gente tem mais chance.', expr: 'happy' },
        { mode: 'announce', name: 'ANÚNCIO', text: 'Cada jogador recebeu um saco com 10 bolinhas. Neste jogo, vocês jogam contra o seu parceiro. Quem pegar todas as 10 bolinhas do adversário vence.' },
        { who: c.p, text: c.p.key === 'oldman' ? 'Contra… o parceiro? Hmm. Então vamos jogar direitinho, hein.' : 'Contra… você? Não. Não pode ser.', expr: 'shock' },
      ];
      R6.Dialog.show(lines.map((l, i) => i === lines.length - 1 ? Object.assign(l, { onDone: () => { this.stage = 'intro'; this.phase = 'rules'; this.rulesT = 0; } }) : l));
      R6.Audio.sfx('announce');
    }
    // ------------------------------------------------ flow
    begin() {
      this.stage = 'play'; R6.Music.play('sad'); R6.Music.setIntensity(0.3);
      this.say(this.opp, this.forgetful ? 'Faz tempo que não jogo bolinha… eu era bom nisso, sabia?' : 'Que vença o melhor.');
      this.nextRound();
    }
    say(p, text, expr) { this.bubble = { who: p === 'pl' ? 'pl' : 'op', text, t: 0, dur: Math.max(2.4, text.length * 0.06) }; }
    nextRound() {
      if (this.result) return;
      this.round++;
      this.sub = null;
      if (this.pm <= 0 || this.om <= 0) return this.endMatch();
      if (this.round > 1) this.chooser = this.chooser === 'player' ? 'opp' : 'player';
      if (this.chooser === 'player') this.menuMode();
      else this.aiChooseMode();
    }
    menuMode() {
      this.sub = { k: 'choose' };
      const ids = Object.keys(MODES);
      this.modeMenu = new R6.UI.Menu(ids.map(id => ({ label: MODES[id].name, sub: '', icon: MODES[id].icon, action: () => this.pickStake(id) })).concat(this.canCheat() ? [{ label: 'ENGANAR O VELHO (contar errado)', color: '#ff5a6a', action: () => this.cheat() }] : []));
    }
    canCheat() { return this.forgetful && this.campaign && !this.cheated && this.pm < 10; }
    cheat() {
      this.cheated = true; R6.State.decide('marbles_cheat', 'yes', 'Enganou o velho');
      R6.State.karma(-3); R6.State.addRel(this.opp, -10, 'cheated', { silent: true }); R6.State.flag('cheated_oldman', true);
      const k = Math.min(3, this.om); this.transfer('op', k);
      this.say('op', 'Hm? Eu… eu tinha mais, não tinha? Minha cabeça… deve ser minha cabeça.');
      R6.Engine.after(2.8, () => this.nextRound());
      this.sub = { k: 'wait' };
    }
    pickStake(mode) {
      const max = Math.min(this.pm, this.om);
      this.sub = { k: 'stake', mode, stake: Math.min(max, mode === 'hand' ? 3 : 2), max };
    }
    aiChooseMode() {
      // AI picks the mode it's best at and stakes by confidence
      const ids = Object.keys(MODES);
      const mode = this.skill > 0.6 ? U.pick(['hole', 'line', 'oddeven']) : U.pick(ids);
      const max = Math.min(this.pm, this.om);
      const stake = U.clamp(Math.round(max * (0.2 + this.skill * 0.3 + (this.om > this.pm ? 0.2 : 0)) + U.randi(-1, 1)), 1, max);
      this.sub = { k: 'announce', mode, stake, t: 0 };
      this.say('op', U.pick(['Minha vez de escolher: ', 'Vamos de ', 'Que tal ']) + MODES[mode].name.toLowerCase() + '. Aposto ' + stake + '.');
    }
    startMode(mode, stake) {
      this.sub = { k: mode, stake, t: 0 };
      const S = this.sub;
      if (mode === 'oddeven') {
        S.playerHides = this.round % 2 === 0; // alternate who hides
        if (S.playerHides) { S.hide = Math.min(this.pm, 3); S.step = 'hide'; }
        else { S.oppHide = this.aiHideCount(); S.step = 'bet'; S.bet = Math.min(stake, this.pm); S.tell = this.makeTell(S.oppHide); }
      } else if (mode === 'hand') {
        S.playerHides = this.round % 2 === 1;
        if (S.playerHides) S.step = 'handhide'; else { S.oppHand = this.aiHand(); S.step = 'handguess'; S.tell = this.makeHandTell(S.oppHand); }
      } else { // hole / line physics
        S.turn = this.chooser === 'player' ? 'player' : 'opp'; S.marbles = []; S.throws = { player: null, opp: null }; S.target = mode === 'hole' ? { x: 640, y: 250 } : { y: 230 };
        S.drag = null; S.aiDelay = 1.2;
      }
    }
    // --- AI brains ---
    aiHideCount() {
      const n = this.om; if (n <= 1) return 1;
      // bluffers pick parity the player guessed less often
      const pe = this.guessHist.filter(g => g === 'par').length, po = this.guessHist.length - pe;
      let par = pe > po ? 'impar' : pe < po ? 'par' : (Math.random() < 0.5 ? 'par' : 'impar');
      if (Math.random() > this.skill) par = Math.random() < 0.5 ? 'par' : 'impar';
      let c = U.randi(1, Math.min(n, 6)); if ((c % 2 === 0 ? 'par' : 'impar') !== par) c = c > 1 ? c - 1 : c + 1;
      return U.clamp(c, 1, n);
    }
    aiGuess() {
      // pattern learning: look at the last hidden parities of the player
      const h = this.hist.map(c => c % 2 === 0 ? 'par' : 'impar');
      if (h.length >= 2 && Math.random() < this.skill) {
        const last = h[h.length - 1], prev = h[h.length - 2];
        if (last === prev) return last; // expects repetition
        return last === 'par' ? 'impar' : 'par'; // expects alternation
      }
      if (this.sub.tellChoice === 'nervous' && Math.random() < this.skill) return Math.random() < 0.5 ? 'par' : 'impar';
      return Math.random() < 0.5 ? 'par' : 'impar';
    }
    makeTell(count) {
      const truth = count % 2 === 0 ? 'par' : 'impar';
      const lying = Math.random() < this.bluff * 0.8;
      const says = lying ? (truth === 'par' ? 'impar' : 'par') : truth;
      const hint = says === 'par' ? U.pick(['Suas mãos estão bem fechadas… parece um número redondo.', '"Hoje estou com sorte nos pares", ele(a) diz.', 'Você ouve as bolinhas baterem em pares.']) : U.pick(['Ele(a) sorri de canto: "ímpar é o meu número".', 'Um dedo está meio aberto — parece sobrar uma.', 'Você nota uma bolinha solitária entre os dedos.']);
      return { says, lying, hint };
    }
    aiHand() { return Math.random() < 0.5 ? 'esq' : 'dir'; }
    makeHandTell(h) { const lying = Math.random() < this.bluff * 0.8; const says = lying ? (h === 'esq' ? 'dir' : 'esq') : h; return { says, hint: says === 'esq' ? 'Ele(a) protege a mão ESQUERDA junto ao corpo.' : 'O punho DIREITO está mais tenso.' }; }
    transfer(toWho, k) {
      k = Math.max(0, Math.floor(k));
      if (toWho === 'pl') { k = Math.min(k, this.om); this.om -= k; this.pm += k; } else { k = Math.min(k, this.pm); this.pm -= k; this.om += k; }
      for (let i = 0; i < k; i++) this.flying.push({ from: toWho === 'pl' ? 'op' : 'pl', t: -i * 0.12, c: marbleColor(i + this.round) });
      if (k) R6.Audio.sfx('marble');
      if (k >= 1) R6.Engine.after(0.3, () => R6.Audio.sfx('marble'));
    }
    resolve(winner, k, text) {
      this.transfer(winner, k);
      this.msg = { text, t: 0, good: winner === 'pl' };
      R6.Audio.sfx(winner === 'pl' ? 'coin' : 'error');
      if (this.forgetful && winner === 'pl' && Math.random() < 0.4) this.say('op', U.pick(['Ah… você é bom nisso.', 'Onde eu estava mesmo? Ah, sim, no jogo.', 'Minha casa… tinha um portão azul, sabia?']));
      else if (winner === 'op') this.say('op', U.pick(['Hehe. Essa foi minha.', 'Sorte.', 'Desculpa, mas preciso delas.']));
      this.sub = { k: 'wait' };
      R6.Engine.after(2.4, () => this.nextRound());
    }
    endMatch() {
      if (this.ended) return; this.ended = true;
      const playerWon = this.om <= 0;
      if (this.tourney >= 0) {
        if (playerWon) {
          this.tourney++;
          if (this.tourney >= 3) { this.score = 3; this.scoreId = 'marbles_tourney'; this.scoreLabel = 'ADVERSÁRIOS VENCIDOS'; this.chips = 250; this.win({ title: 'CAMPEÃO', sub: 'MARBLES TOURNAMENT' }); return; }
          R6.Banner.show('ADVERSÁRIO ' + this.tourney + ' VENCIDO', 'Próximo: ' + this.makeTourneyOpp(this.tourney).name, { dur: 2.2 });
          R6.Engine.after(2.4, () => { this.setOpponent(this.makeTourneyOpp(this.tourney)); this.pm = 10; this.om = 10; this.round = 0; this.hist = []; this.guessHist = []; this.ended = false; this.timeLeft = this.timeLimit; this.chooser = 'player'; this.nextRound(); });
        } else { this.score = this.tourney; this.scoreId = 'marbles_tourney'; this.scoreLabel = 'ADVERSÁRIOS VENCIDOS'; this.lose({ reason: 'Suas bolinhas acabaram' }); }
        return;
      }
      if (!this.campaign) { if (playerWon) { this.chips = 70; this.win({ sub: 'VOCÊ PEGOU TODAS AS BOLINHAS' }); } else this.lose({ reason: 'Suas bolinhas acabaram' }); return; }
      this.sub = { k: 'ending' };
      const p = this.opp; const S = R6.State;
      if (playerWon) {
        const lines = [];
        if (p.key === 'oldman') {
          lines.push({ who: p, text: this.cheated ? 'Você acha que eu não percebi? Eu percebi tudo. Tudo bem… está tudo bem.' : 'Eu tenho mais uma. Olha só. E essa… essa eu quero que seja sua.', expr: 'sad' });
          lines.push({ who: p, text: 'Nós somos kkanbu, lembra? Kkanbu divide tudo. Não tem "meu" e "seu".', expr: 'happy' });
          lines.push({ who: p, text: 'Obrigado. Graças a você, eu me diverti muito.', expr: 'happy' });
          S.give('marble'); S.flag('oldman_gift', true);
        } else if (p.key === 'thief') {
          lines.push({ who: p, text: 'Tudo bem. Eu nunca ia conseguir voltar mesmo.', expr: 'sad' });
          lines.push({ who: p, text: 'Se você sair daqui… meu irmão está num orfanato perto do rio Han. Cuide dele.', expr: 'cry' });
          S.flag('promise_067', true);
        } else if (p.key === 'worker') {
          lines.push({ who: p, text: 'Você venceu, irmão. Eu… eu só queria mandar dinheiro para o meu filho.', expr: 'sad' });
        } else if (p.key === 'schemer') {
          lines.push({ who: p, text: 'Hah. Do nosso bairro, quem diria que você ia me vencer em alguma coisa.', expr: 'sad' });
          lines.push({ who: p, text: 'A minha mãe acha que eu estou em viagem de negócios. Deixa ela acreditar nisso.', expr: 'sad' });
          S.flag('schemer_out_marbles', true);
        } else lines.push({ who: p, text: U.pick(['Pode ficar. Eu já sabia que ia acabar assim.', 'Não esquece de mim, tá?', 'Só… vai. Não olha para trás.']), expr: 'sad' });
        lines[lines.length - 1].onDone = () => {
          this.oppShot = { t: 0 };
          R6.Engine.after(1.4, () => { R6.Audio.sfx('gun'); if (p.alive) R6.Elim.kill(p, { cause: 'marbles', sfx: false, host: this, cardSub: p.key === 'oldman' ? 'ELIMINADO (?)' : 'ELIMINADO' }); if (p.key === 'oldman') S.flag('oldman_left', true); this.resolveOthers(); this.chips = 70; this.win({ sub: 'VOCÊ PEGOU TODAS AS BOLINHAS', wait: 3.6 }); });
        };
        R6.Dialog.show(lines);
      } else {
        R6.Dialog.show({ who: p, text: p.key === 'oldman' ? 'Desculpa… desculpa. O jogo é assim.' : 'Me perdoa. Eu preciso sair daqui.', expr: 'sad', onDone: () => { S.eliminate(S.player, 'marbles'); this.lose({ reason: 'Suas bolinhas acabaram' }); } });
      }
    }
    resolveOthers() {
      // every other pair plays: half of the rest is eliminated; key story outcomes are respected
      const S = R6.State; const pool = U.shuffle(S.aliveBots().filter(p => p !== this.opp));
      const fate = {
        oldman: 'out', worker: this.opp.key === 'worker' ? null : 'out', girl: 'out', schemer: 'in', thief: this.opp.key === 'thief' ? null : 'in', gangster: 'in', wild: 'in', glass: 'in',
      };
      if (this.opp.key === 'worker') fate.schemer = 'in';
      if (fate.worker === 'out') S.flag('worker_tricked', true);
      const nonKey = pool.filter(p => !p.key);
      for (const p of pool) if (p.key && fate[p.key] === 'out' && p.alive) R6.Elim.kill(p, { cause: 'marbles', silent: true, noCard: p.key !== 'worker' && p.key !== 'girl' });
      for (let i = 0; i < nonKey.length; i += 2) { const a = nonKey[i], b = nonKey[i + 1]; if (!b) break; const loser = Math.random() < 0.5 ? a : b; R6.Elim.kill(loser, { cause: 'marbles', silent: true }); }
    }
    debugWin() { if (!this.opp && this.partners) { const c = this.partners.find(c => c.accept) || this.partners[0]; if (c) { this.setOpponent(c.p); R6.State.decide('marbles_partner', c.p.key || c.p.num, c.p.name); } } this.stage = 'play'; this.phase = 'play'; this.om = 0; this.pm = 20; if (this.campaign && this.opp) { this.opp && this.opp.alive && R6.Elim.kill(this.opp, { silent: true, noCard: true }); this.resolveOthers(); } this.win({ wait: 0.3 }); }
    focus() { const s = this.cam.toScreen(560, 560); return { x: s.x, y: s.y, look: this.pl, scale: 1.8 * this.cam.zoom, facing: 1 }; }
    // ------------------------------------------------ update
    update(dt) {
      this.t += dt; this.fx.update(dt); this.cam.update(dt);
      for (const f of this.flying) f.t += dt; this.flying = this.flying.filter(f => f.t < 0.9);
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
      if (this.msg) { this.msg.t += dt; if (this.msg.t > 2.4) this.msg = null; }
      if (this.updateResult(dt)) return;
      if (this.stage === 'partner') { if (!R6.Dialog.active) this.partnerMenu.update(dt); return; }
      if (this.stage === 'reveal') return;
      if (this.updateRules(dt)) return;
      if (R6.Dialog.active) return;
      if (!this.ended) { this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.timeout(); return; } }
      const S = this.sub; if (!S) return;
      const I = R6.Input;
      if (S.k === 'choose') { this.modeMenu.update(dt); return; }
      if (S.k === 'stake') {
        if (I.actP('left') || I.actP('down')) S.stake = Math.max(1, S.stake - 1);
        if (I.actP('right') || I.actP('up')) S.stake = Math.min(S.max, S.stake + 1);
        const d = I.digitP(); if (d && d <= S.max) S.stake = d;
        if (I.mouse.wheel) S.stake = U.clamp(S.stake - I.mouse.wheel, 1, S.max);
        if (I.actP('confirm')) { R6.Audio.sfx('confirm'); this.startMode(S.mode, S.stake); }
        if (I.actP('back')) this.menuMode();
        return;
      }
      if (S.k === 'announce') { S.t += dt; if (S.t > 2.4 || (S.t > 0.6 && I.confirmP())) this.startMode(S.mode, S.stake); return; }
      if (S.k === 'oddeven') return this.updOddEven(dt, S, I);
      if (S.k === 'hand') return this.updHand(dt, S, I);
      if (S.k === 'hole' || S.k === 'line') return this.updThrow(dt, S, I);
    }
    timeout() {
      if (this.ended) return; this.ended = true;
      R6.Dialog.announce('O tempo acabou. Os dois jogadores ainda têm bolinhas.', () => {
        if (this.campaign) { R6.State.eliminate(R6.State.player, 'marbles'); if (this.opp.alive && !this.opp.fake) R6.Elim.kill(this.opp, { silent: true }); }
        this.lose({ reason: 'O tempo acabou' });
      });
    }
    updOddEven(dt, S, I) {
      if (S.step === 'hide') {
        if (I.actP('left') || I.actP('down')) S.hide = Math.max(1, S.hide - 1);
        if (I.actP('right') || I.actP('up')) S.hide = Math.min(this.pm, S.hide + 1);
        const d = I.digitP(); if (d && d <= this.pm) S.hide = d;
        if (I.actP('confirm')) {
          R6.Audio.sfx('marble'); S.step = 'tellq';
          this.tellMenu = new R6.UI.Menu([
            { label: 'Encarar com calma', sub: 'neutro', action: () => this.oeReveal('calm') },
            { label: 'Rir e provocar: "Adivinha!"', sub: 'blefe', action: () => this.oeReveal('bluff') },
            { label: 'Evitar o olhar', sub: 'nervoso', action: () => this.oeReveal('nervous') },
          ]);
          this.say('op', U.pick(['Hmm… deixa eu olhar nos seus olhos.', 'Par ou ímpar… par ou ímpar…', 'Você está suando?']));
        }
        return;
      }
      if (S.step === 'tellq') { this.tellMenu.update(dt); return; }
      if (S.step === 'bet') {
        if (I.actP('left') || I.actP('down')) S.bet = Math.max(1, S.bet - 1);
        if (I.actP('right') || I.actP('up')) S.bet = Math.min(this.pm, S.bet + 1);
        if (I.mouse.wheel) S.bet = U.clamp(S.bet - I.mouse.wheel, 1, this.pm);
        if (!this.oeMenu) this.oeMenu = new R6.UI.Menu([{ label: 'PAR', icon: 'circle', action: () => this.oeGuess('par') }, { label: 'ÍMPAR', icon: 'triangle', action: () => this.oeGuess('impar') }], { horizontal: true });
        this.oeMenu.update(dt);
      }
    }
    oeReveal(tell) {
      const S = this.sub; S.tellChoice = tell; this.hist.push(S.hide);
      let guess = this.aiGuess();
      if (tell === 'bluff' && Math.random() < 0.35 * (1 - this.skill)) guess = S.hide % 2 === 0 ? 'impar' : 'par';
      const bet = U.clamp(Math.round(this.om * (0.2 + this.skill * 0.3)), 1, this.om);
      const truth = S.hide % 2 === 0 ? 'par' : 'impar';
      this.say('op', 'Aposto ' + bet + '. ' + (guess === 'par' ? 'PAR.' : 'ÍMPAR.'));
      S.step = 'show'; S.aiGuess = guess;
      R6.Engine.after(1.8, () => {
        if (guess === truth) this.resolve('op', bet, `Você tinha ${S.hide}. ${truth.toUpperCase()} — ele(a) acertou.`);
        else this.resolve('pl', bet, `Você tinha ${S.hide}. ${truth.toUpperCase()} — ele(a) errou!`);
      });
    }
    oeGuess(g) {
      const S = this.sub; this.oeMenu = null; this.guessHist.push(g);
      const truth = S.oppHide % 2 === 0 ? 'par' : 'impar';
      S.step = 'show'; S.revealed = true;
      R6.Engine.after(1.2, () => {
        if (g === truth) this.resolve('pl', S.bet, `Ele(a) tinha ${S.oppHide}. ${truth.toUpperCase()} — você acertou!`);
        else this.resolve('op', S.bet, `Ele(a) tinha ${S.oppHide}. ${truth.toUpperCase()} — você errou.`);
      });
    }
    updHand(dt, S, I) {
      if (S.step === 'handhide') {
        if (!this.hMenu) this.hMenu = new R6.UI.Menu([{ label: 'MÃO ESQUERDA', action: () => this.handHide('esq') }, { label: 'MÃO DIREITA', action: () => this.handHide('dir') }], { horizontal: true });
        this.hMenu.update(dt); return;
      }
      if (S.step === 'handguess') {
        if (!this.hMenu) this.hMenu = new R6.UI.Menu([{ label: 'ESQUERDA', action: () => this.handGuess('esq') }, { label: 'DIREITA', action: () => this.handGuess('dir') }], { horizontal: true });
        this.hMenu.update(dt);
      }
    }
    handHide(h) {
      this.hMenu = null; const S = this.sub; S.step = 'show';
      const g = Math.random() < 0.5 + (this.skill - 0.5) * 0.3 && this.lastHand ? (this.lastHand === 'esq' ? 'dir' : 'esq') : (Math.random() < 0.5 ? 'esq' : 'dir');
      this.lastHand = h;
      this.say('op', 'Hmm… ' + (g === 'esq' ? 'esquerda!' : 'direita!'));
      R6.Engine.after(1.6, () => { if (g === h) this.resolve('op', S.stake, 'Ele(a) achou as bolinhas.'); else this.resolve('pl', S.stake, 'Errou! As bolinhas estavam na outra mão.'); });
    }
    handGuess(g) {
      this.hMenu = null; const S = this.sub; S.step = 'show'; S.revealed = true;
      R6.Engine.after(1.2, () => { if (g === S.oppHand) this.resolve('pl', S.stake, 'Você achou!'); else this.resolve('op', S.stake, 'Mão vazia…'); });
    }
    updThrow(dt, S, I) {
      // physics
      for (const m of S.marbles) {
        if (m.stopped) continue;
        const sp = Math.hypot(m.vx, m.vy);
        const fr = 170 * dt; if (sp <= fr) { m.vx = m.vy = 0; m.stopped = true; }
        else { m.vx -= m.vx / sp * fr; m.vy -= m.vy / sp * fr; }
        // bumps
        m.vx += Math.sin(m.y * 0.05 + m.x * 0.02) * 6 * dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (S.k === 'hole') { const d = Math.hypot(m.x - S.target.x, m.y - S.target.y); if (d < 13 && sp < 260) { m.inHole = true; m.stopped = true; m.x = S.target.x; m.y = S.target.y; R6.Audio.sfx('marble'); } }
        if (m.y < 150) { m.y = 150; m.vy = -m.vy * 0.4; R6.Audio.sfx('marble', { vol: 0.4 }); }
        if (m.x < 120 || m.x > 1160) { m.vx = -m.vx * 0.5; m.x = U.clamp(m.x, 120, 1160); }
        for (const o of S.marbles) if (o !== m) { const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy); if (d < 14 && d > 0) { const nx = dx / d, ny = dy / d; const p = (m.vx - o.vx) * nx + (m.vy - o.vy) * ny; if (p > 0) { m.vx -= p * nx; m.vy -= p * ny; o.vx += p * nx; o.vy += p * ny; o.stopped = false; R6.Audio.sfx('marble'); } } }
      }
      const allStopped = S.marbles.every(m => m.stopped);
      if (S.turn === 'player' && !S.throws.player) {
        const m = I.mouse; const sx = 640, sy = 640;
        if (m.pressed) S.drag = { x: m.x, y: m.y };
        if (S.drag) { S.aim = { dx: sx - m.x, dy: sy - m.y }; if (m.released) { const dx = sx - m.x, dy = sy - m.y; const l = Math.hypot(dx, dy); const pw = Math.min(l, 260) / 260; if (l > 8) { this.throwMarble('player', dx / l * pw * 720, dy / l * pw * 720); } S.drag = null; S.aim = null; } }
        // keyboard fallback: arrows aim, hold space for power
        if (!S.drag) {
          S.kAng = (S.kAng != null ? S.kAng : -Math.PI / 2) + (I.act('left') ? -dt : 0) + (I.act('right') ? dt : 0);
          if (I.act('action')) S.kPow = Math.min(1, (S.kPow || 0) + dt * 0.7);
          if (I.actR('action') && S.kPow) { this.throwMarble('player', Math.cos(S.kAng) * S.kPow * 720, Math.sin(S.kAng) * S.kPow * 720); S.kPow = 0; }
        }
      } else if (S.turn === 'opp' && !S.throws.opp) {
        S.aiDelay -= dt;
        if (S.aiDelay <= 0 && allStopped) {
          const tx = S.k === 'hole' ? S.target.x : 640 + U.rand(-60, 60), ty = S.k === 'hole' ? S.target.y : S.target.y + 18;
          const dx = tx - 640, dy = ty - 640; const d = Math.hypot(dx, dy);
          const v0 = Math.sqrt(2 * 170 * d) * (1 + U.rand(-1, 1) * (1 - this.skill) * 0.22);
          const ang = Math.atan2(dy, dx) + U.rand(-1, 1) * (1 - this.skill) * 0.12;
          this.throwMarble('opp', Math.cos(ang) * v0, Math.sin(ang) * v0);
        }
      }
      if (S.throws.player && S.throws.opp && allStopped && !S.done) {
        S.done = true;
        const score = m => { if (!m) return 1e9; if (S.k === 'hole') return m.inHole ? -1 : Math.hypot(m.x - S.target.x, m.y - S.target.y); return m.y < S.target.y ? 1e8 : m.y - S.target.y; };
        const a = score(S.throws.player), b = score(S.throws.opp);
        R6.Engine.after(0.8, () => {
          if (Math.abs(a - b) < 0.5) { this.msg = { text: 'Empate. Ninguém leva.', t: 0 }; this.sub = { k: 'wait' }; R6.Engine.after(2, () => this.nextRound()); }
          else if (a < b) this.resolve('pl', S.stake, S.k === 'hole' && a < 0 ? 'Direto no buraco!' : 'A sua ficou mais perto!');
          else this.resolve('op', S.stake, b >= 1e8 ? '' : S.k === 'line' && a >= 1e8 ? 'A sua passou da linha!' : 'A dele(a) ficou mais perto.');
        });
      }
    }
    throwMarble(who, vx, vy) {
      const S = this.sub; const m = { x: 640, y: 640, vx, vy, c: who === 'player' ? '#7fc4ff' : '#ff7fa8', who, stopped: false };
      S.marbles.push(m); S.throws[who] = m; R6.Audio.sfx('whoosh', { vol: 0.4 });
      if (who === 'player') { S.turn = 'opp'; S.aiDelay = 1.3; } else S.turn = 'player';
      if (S.throws.player && S.throws.opp) S.turn = 'none';
    }
    // ------------------------------------------------ render
    render(ctx) {
      const st = R6.Env.stages.alley;
      const S = this.sub;
      const throwing = S && (S.k === 'hole' || S.k === 'line');
      if (!throwing) {
        R6.Env.render(ctx, st, this.cam, this.t, c => {
          const g = st.ground;
          const plAnim = this.stage === 'partner' ? 'idle' : S && (S.k === 'oddeven' || S.k === 'hand') ? 'hold' : 'idle';
          R6.Char.draw(c, this.pl, 560, g, { view: 'side', dir: 1, anim: plAnim, t: this.t, scale: 1.8 });
          if (this.opp && this.stage !== 'partner') {
            const shot = this.oppShot; const oa = shot ? 'sad' : S && (S.k === 'oddeven' || S.k === 'hand') ? 'hold' : this.forgetful ? 'look' : 'idle';
            R6.Char.draw(c, this.oppLook, 1040, g, { view: 'side', dir: -1, anim: oa, t: this.t, scale: 1.8, expr: shot ? 'sad' : null });
          }
          if (this.bubble && this.opp) R6.drawBubble(c, this.bubble, this.bubble.who === 'pl' ? 560 : 1040, g - 200, 1);
        });
      } else this.renderThrow(ctx, S);
      R6.UI.vignette(ctx, 0.45);
      if (this.stage === 'partner') return this.drawPartner(ctx);
      if (this.phase === 'play' && this.stage === 'play') this.drawHUD(ctx, S);
      this.drawRules(ctx);
    }
    renderThrow(ctx, S) {
      // top-down close-up of the dirt yard
      ctx.fillStyle = '#9c7a4c'; ctx.fillRect(0, 0, R6.W, R6.H);
      if (!this._dirt) { const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const c = cv.getContext('2d'); c.fillStyle = '#a8845a'; c.fillRect(0, 0, 640, 360); for (let i = 0; i < 4000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(80,55,30,.18)' : 'rgba(255,230,190,.12)'; c.fillRect(Math.random() * 640, Math.random() * 360, 2, 2); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(90,70,50,.5)'; c.beginPath(); c.arc(Math.random() * 640, Math.random() * 360, U.rand(1.5, 4), 0, TAU); c.fill(); } this._dirt = cv; }
      ctx.drawImage(this._dirt, 0, 0, R6.W, R6.H);
      ctx.fillStyle = '#6b5236'; ctx.fillRect(0, 0, R6.W, 150); ctx.fillStyle = '#c9b28a'; ctx.fillRect(0, 0, R6.W, 130);
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; for (let x = 0; x < R6.W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 130); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(560, 660, 160, 4); R6.UI.text(ctx, 'LINHA DE ARREMESSO', 640, 690, { size: 13, align: 'center', color: '#fff', weight: 800 });
      if (S.k === 'hole') { const g = ctx.createRadialGradient(S.target.x, S.target.y, 2, S.target.x, S.target.y, 16); g.addColorStop(0, '#1a120a'); g.addColorStop(1, '#5a4028'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(S.target.x, S.target.y, 16, 13, 0, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = '#e8336d'; ctx.fillRect(120, S.target.y - 2, 1040, 4); R6.UI.text(ctx, 'NÃO PASSE DA LINHA', 640, S.target.y - 12, { size: 13, align: 'center', color: '#e8336d', weight: 800 }); }
      for (const m of S.marbles) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(m.x + 3, m.y + 4, 8, 4, 0, 0, TAU); ctx.fill(); drawMarble(ctx, m.x, m.y, 8, m.c); }
      if (S.turn === 'player' && !S.throws.player) {
        drawMarble(ctx, 640, 640, 8, '#7fc4ff');
        if (S.aim) { const l = Math.hypot(S.aim.dx, S.aim.dy); const pw = Math.min(l, 260) / 260; ctx.strokeStyle = `rgba(255,255,255,${0.4 + pw * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(640, 640); ctx.lineTo(640 + S.aim.dx / Math.max(1, l) * (40 + pw * 60), 640 + S.aim.dy / Math.max(1, l) * (40 + pw * 60)); ctx.stroke(); ctx.setLineDash([]); R6.UI.bar(ctx, 560, 600, 160, 8, pw, { color: '#e8336d' }); }
        else if (S.kPow) R6.UI.bar(ctx, 560, 600, 160, 8, S.kPow, { color: '#e8336d' });
        R6.UI.text(ctx, 'Clique e ARRASTE para trás, depois solte', 640, 110, { size: 18, align: 'center', color: '#3a2a18', weight: 800 });
      } else if (S.turn === 'opp') R6.UI.text(ctx, 'Vez do adversário…', 640, 110, { size: 18, align: 'center', color: '#3a2a18', weight: 800 });
    }
    drawHUD(ctx, S) {
      R6.HUD.draw(ctx, { game: this.variant === 'tournament' ? 'MARBLES TOURNAMENT · ' + (this.tourney + 1) + '/3' : 'BOLINHAS DE GUDE', timer: this.timeLeft, hide: this.variant === 'tournament' || !this.campaign ? { prize: true, feed: true } : { feed: true } });
      // marble counters
      const drawCount = (x, label, n, col) => {
        R6.UI.panel(ctx, x - 120, 104, 240, 70, { fill: 'rgba(6,8,12,.78)', shadow: false });
        R6.UI.text(ctx, label, x, 124, { size: 13, align: 'center', weight: 800, color: '#bbb', spacing: 2 });
        for (let i = 0; i < Math.min(20, n); i++) drawMarble(ctx, x - 95 + (i % 10) * 21, 144 + Math.floor(i / 10) * 18, 7, col);
        R6.UI.text(ctx, String(n), x + 108, 158, { size: 22, align: 'right', fam: 'mono', color: '#fff' });
      };
      drawCount(200, 'VOCÊ', this.pm, '#7fc4ff'); drawCount(1080, (this.opp && this.opp.key ? this.opp.name : 'ADVERSÁRIO').toUpperCase(), this.om, '#ff7fa8');
      for (const f of this.flying) { if (f.t < 0) continue; const k = U.ease.inOut(Math.min(1, f.t / 0.8)); const x0 = f.from === 'pl' ? 200 : 1080, x1 = f.from === 'pl' ? 1080 : 200; drawMarble(ctx, U.lerp(x0, x1, k), 150 - Math.sin(k * Math.PI) * 120, 9, f.c); }
      if (this.msg) R6.UI.text(ctx, this.msg.text, 640, 230, { size: 30, fam: 'title', align: 'center', color: this.msg.good ? '#8bd17c' : '#ff7a6a', shadow: true, spacing: 2, alpha: Math.min(1, (2.4 - this.msg.t) * 2) });
      if (!S) return;
      const panel = (h) => { R6.UI.panel(ctx, 340, 400, 600, h, { fill: 'rgba(8,10,14,.9)' }); };
      if (S.k === 'choose') { panel(250); R6.UI.text(ctx, 'SUA VEZ: ESCOLHA O JOGO', 640, 432, { size: 20, align: 'center', weight: 800 }); this.modeMenu.draw(ctx, 380, 448, 520, 40, 6, { size: 17 }); }
      if (S.k === 'stake') { panel(170); R6.UI.text(ctx, MODES[S.mode].name, 640, 436, { size: 28, fam: 'title', align: 'center' }); R6.UI.para(ctx, MODES[S.mode].desc, 640, 450, 540, { size: 15, align: 'center', color: '#bbb' }); R6.UI.text(ctx, '◀  APOSTA: ' + S.stake + '  ▶', 640, 520, { size: 30, align: 'center', fam: 'mono', color: '#f2c14e' }); R6.UI.text(ctx, 'ENTER confirma · ESC volta', 640, 552, { size: 13, align: 'center', color: '#999' }); }
      if (S.k === 'announce') { panel(90); R6.UI.text(ctx, 'O ADVERSÁRIO ESCOLHEU: ' + MODES[S.mode].name, 640, 438, { size: 20, align: 'center', weight: 800 }); R6.UI.text(ctx, 'APOSTA: ' + S.stake, 640, 470, { size: 24, align: 'center', fam: 'mono', color: '#f2c14e' }); }
      if (S.k === 'oddeven') {
        if (S.step === 'hide') { panel(150); R6.UI.text(ctx, 'VOCÊ ESCONDE. QUANTAS BOLINHAS NA MÃO?', 640, 436, { size: 18, align: 'center', weight: 800 }); for (let i = 0; i < S.hide; i++) drawMarble(ctx, 640 - (S.hide - 1) * 12 + i * 24, 480, 10, '#7fc4ff'); R6.UI.text(ctx, '◀  ' + S.hide + '  ▶     ENTER fecha a mão', 640, 528, { size: 20, align: 'center', color: '#f2c14e', fam: 'mono' }); }
        if (S.step === 'tellq') { panel(200); R6.UI.text(ctx, 'ELE(A) ESTÁ TE ESTUDANDO. COMO VOCÊ REAGE?', 640, 432, { size: 18, align: 'center', weight: 800 }); this.tellMenu.draw(ctx, 380, 448, 520, 40, 6, { size: 16, align: 'left' }); }
        if (S.step === 'bet') { panel(210); R6.UI.text(ctx, 'ELE(A) ESCONDEU BOLINHAS. PAR OU ÍMPAR?', 640, 432, { size: 18, align: 'center', weight: 800 }); R6.UI.para(ctx, '👁 ' + S.tell.hint, 640, 446, 540, { size: 15, align: 'center', color: '#9fd4ff' }); R6.UI.text(ctx, '◀  SUA APOSTA: ' + S.bet + '  ▶', 640, 508, { size: 22, align: 'center', color: '#f2c14e', fam: 'mono' }); if (this.oeMenu) this.oeMenu.draw(ctx, 430, 530, 200, 50, 20, { size: 22 }); }
        if (S.step === 'show' && S.revealed) { panel(80); for (let i = 0; i < S.oppHide; i++) drawMarble(ctx, 640 - (S.oppHide - 1) * 12 + i * 24, 440, 10, '#ff7fa8'); }
      }
      if (S.k === 'hand') {
        if (S.step === 'handhide') { panel(140); R6.UI.text(ctx, 'ESCONDA ' + S.stake + ' BOLINHA(S) EM UMA DAS MÃOS', 640, 436, { size: 18, align: 'center', weight: 800 }); if (this.hMenu) this.hMenu.draw(ctx, 390, 470, 240, 50, 20, { size: 20 }); }
        if (S.step === 'handguess') { panel(170); R6.UI.text(ctx, 'EM QUAL MÃO ESTÃO AS BOLINHAS?', 640, 432, { size: 18, align: 'center', weight: 800 }); R6.UI.para(ctx, '👁 ' + S.tell.hint, 640, 446, 540, { size: 15, align: 'center', color: '#9fd4ff' }); if (this.hMenu) this.hMenu.draw(ctx, 390, 496, 240, 50, 20, { size: 20 }); }
      }
      if (this.bubble && (S.k === 'hole' || S.k === 'line')) { R6.UI.panel(ctx, 800, 190, 440, 60, { fill: 'rgba(250,248,242,.95)', stroke: '#ccc' }); R6.UI.para(ctx, this.bubble.text, 1020, 200, 420, { size: 15, align: 'center', color: '#222' }); }
    }
    drawPartner(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, R6.W, R6.H);
      R6.UI.text(ctx, 'ESCOLHA UM PARCEIRO', 640, 90, { size: 56, fam: 'title', align: 'center', color: '#fff', spacing: 4 });
      R6.UI.text(ctx, 'Formem duplas. Escolha bem: você vai jogar com essa pessoa.', 640, 126, { size: 18, align: 'center', color: '#ccc' });
      this.partnerMenu.draw(ctx, 380, 160, 520, 44, 8, { size: 18, align: 'left' });
      const it = this.partners[this.partnerMenu.i]; if (it) { R6.Char.portrait(ctx, it.p.look, 1060, 300, 150, it.accept ? 'neutral' : 'angry', this.t, false); R6.UI.para(ctx, it.p.bio || '', 1060, 390, 300, { size: 15, align: 'center', color: '#bbb' }); }
    }
  }

  R6.Marbles = Marbles;
  R6.registerGame('marbles', { name: 'Bolinhas de Gude', season: 1, icon: 'circle', desc: 'Pegue as 10 bolinhas do seu parceiro.', create: o => new Marbles(o) });
})();
