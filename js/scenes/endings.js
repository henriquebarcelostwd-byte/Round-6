/* ROUND 6 — endings.js : the endings (each with its own cutscene), the WINNER stats screen, the final send-off and the credits */
'use strict';
(function () {
  const U = R6.U;
  const S = () => R6.State;
  const L = () => R6.StoryLooks;

  const ENDINGS = {
    vitoria: { n: 1, title: 'FINAL 1 — VITÓRIA', desc: 'Você venceu e recebeu o prêmio.' },
    fuga: { n: 2, title: 'FINAL 2 — FUGA', desc: 'Você escapou antes do encerramento da competição.' },
    sacrificio: { n: 3, title: 'FINAL 3 — SACRIFÍCIO', desc: 'Você venceu — mas alguém pagou o preço por você.' },
    segredo: { n: 4, title: 'FINAL 4 — SEGREDO', desc: 'Você descobriu a sala sem nome e a verdade sobre os jogos.' },
    dark: { n: 5, title: 'FINAL 5 — DARK ENDING', desc: 'Você escapou. O jogo não terminou.' },
    comum: { n: 6, title: 'FINAL EXTRA — VIDA COMUM', desc: 'Você rasgou o cartão e nunca mais voltou.' },
    exodo: { n: 7, title: 'FINAL EXTRA — ÊXODO', desc: 'A maioria votou X. Todos foram para casa.' },
  };
  R6.ENDINGS = ENDINGS;

  function pickEnding(route) {
    const s = S();
    if (s.flag('early_escape')) return 'fuga';
    if (route === 'A') return 'fuga';
    if (route === 'C') return 'dark';
    if (route === 'D') return 'segredo';
    return s.flag('ally_sacrifice') ? 'sacrificio' : 'vitoria';
  }

  const Endings = {
    pick: pickEnding,
    play(id, next) {
      R6.Save.unlockEnding(id); R6.Save.unlockScene('ending_' + id, ENDINGS[id].title);
      const sc = Endings[id](next);
      R6.Engine.go(sc, { t: 'fade', dur: 1.5 });
    },
    card(id) { return [{ music: null }, { caption: ENDINGS[id].title, sub: ENDINGS[id].desc, dur: 4.5, big: true }]; },
    vitoria(next) {
      const el = { floor: 'B7' };
      const a = R6.cutscene({
        id: 'end_vitoria', stage: 'elevator', music: 'dread', stageProps: el, cam: [640, 380, 1.3],
        actors: [{ id: 'p', look: L().me(), x: 640, dir: 1, view: 'front', anim: 'idle' }],
        onUpdate: (sc, dt) => { sc.ft = (sc.ft || 0) + dt; const f = Math.max(-7, Math.min(1, -7 + Math.floor(sc.ft / 0.7))); el.floor = f <= 0 ? 'B' + Math.abs(f - 0) : 'T'; if (f === 1) el.floor = 'TÉRREO'; },
        steps: [{ sfx: 'elevator' }, { narr: 'As portas se fecham. Os números sobem. Ninguém te segue.' }, { wait: 3.5 }, { sfx: 'ding' }, { narr: 'Luz do dia. De verdade.' }],
        onEnd: () => R6.Engine.go(b, { t: 'white', dur: 1.6 }),
      });
      const b = R6.cutscene({
        id: 'end_vitoria2', stage: 'cityday', music: 'victory', cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L().civ('#e9e4da'), x: -80, dir: 1 }, { id: 'k', look: L().npc(301), x: 1200, dir: -1, anim: 'idle' }],
        steps: [
          { move: 'p', to: [980] },
          { narr: 'O cartão do banco pesa mais que qualquer coisa que você já carregou. ' + U.money(S().s.prize) + '.' },
          { say: 'p', text: 'Esse dinheiro não é meu. É de todos que ficaram lá.', expr: 'sad' },
          { narr: 'Você passa o ano seguinte encontrando as famílias, uma por uma. Algumas fecham a porta. Outras choram com você.' },
          ...Endings.card('vitoria'),
        ],
        onEnd: next,
      });
      return a;
    },
    fuga(next) {
      const a = R6.cutscene({
        id: 'end_fuga', stage: 'archive', music: 'action', cam: [700, 380, 1.2], vignette: 0.9,
        stageProps: { world(ctx, cam, t) { ctx.fillStyle = '#0b0c0f'; ctx.fillRect(-200, 0, 3000, 560); ctx.fillStyle = '#2a2d33'; for (let x = 0; x < 3000; x += 90) ctx.fillRect(x, 120 + Math.sin(x) * 10, 20, 440); ctx.fillStyle = '#16181c'; ctx.fillRect(-200, 560, 3000, 200); ctx.fillStyle = 'rgba(80,120,160,.15)'; ctx.fillRect(-200, 540, 3000, 20); } },
        actors: [{ id: 'p', look: L().me(), x: -80, dir: 1 }, { id: 'g', look: L().guard('triangle', 71), x: -500, dir: 1, item: 'flashlight' }],
        steps: [
          { par: [[{ move: 'p', to: [1600], run: true }], [{ camFollow: 'p', zoom: 1.2 }], [{ wait: 1 }, { move: 'g', to: [900], run: true }]] },
          { narr: 'O túnel de manutenção desce até o mar. Atrás de você, uma lanterna. À frente, o som das ondas.' },
        ],
        onEnd: () => R6.Engine.go(b, { t: 'white', dur: 1.8 }),
      });
      const hasDet = true;
      const b = R6.cutscene({
        id: 'end_fuga2', stage: 'beach', music: 'credits', cam: [800, 380, 1.1],
        actors: [{ id: 'p', look: L().me(), x: 150, dir: 1 }, { id: 'd', look: L().det(), x: 2500, dir: -1 }],
        steps: [
          { move: 'p', to: [700] }, { anim: 'p', name: 'kneel', hold: 1.5 },
          { narr: 'Amanhecer. Areia. Você sai da boca do túnel sem prêmio, sem nome, sem nada. E vivo.' },
          { move: 'd', to: [900] },
          { say: 'd', name: 'DETETIVE KANG', text: 'Eu disse que ia estar no mar. Vem. O barco está logo ali.' },
          { anim: 'p', name: 'idle' }, { say: 'p', text: 'Eles ainda estão lá dentro. Os outros.', expr: 'sad' },
          { say: 'd', name: 'DETETIVE KANG', text: 'Então a gente volta. Com todo mundo. Mas primeiro você sobrevive.' },
          ...Endings.card('fuga'),
        ],
        onEnd: next,
      });
      return a;
    },
    sacrificio(next) {
      const key = S().flag('ally_sacrifice'); const ally = typeof key === 'string' ? S().byKey(key) : S().byNum(key);
      const name = ally ? ally.name : 'seu aliado';
      return R6.cutscene({
        id: 'end_sacrificio', stage: 'home', music: 'sad', cam: [800, 380, 1.15],
        actors: [{ id: 'p', look: L().civ('#2d2d33'), x: -80, dir: 1 }, { id: 'f', look: R6.Char.makeLook({ fem: true, age: 1, outfit: 'civil', seed: 404 }), x: 1100, dir: -1 }, { id: 'c', look: R6.Char.makeLook({ age: 0, h: 0.7, outfit: 'civil', seed: 405 }), x: 1180, dir: -1, scale: 1 }],
        steps: [
          { caption: 'MESES DEPOIS', sub: 'Uma casa pequena, do outro lado da cidade.', dur: 3, big: true },
          { move: 'p', to: [860] },
          { say: 'f', name: 'FAMÍLIA', text: 'Você é… você estava com ' + name + '?' },
          { say: 'p', text: name + ' me pediu para contar o que aconteceu. E para entregar isto.', expr: 'sad' },
          { narr: 'Você entrega o cartão do banco. O prêmio inteiro. Ninguém ali consegue dizer nada.' },
          { anim: 'c', name: 'celebrate', hold: 0.1 }, { anim: 'c', name: 'idle' },
          { say: 'p', text: name + ' deu um passo para trás para que eu pudesse sair. Eu nunca vou esquecer.', expr: 'cry' },
          ...Endings.card('sacrificio'),
        ],
        onEnd: next,
      });
    },
    segredo(next) {
      const old = S().s.flags.oldman_left || S().s.flags.oldman_gift;
      return R6.cutscene({
        id: 'end_segredo', stage: 'archive', music: 'dread', cam: [900, 380, 1.15],
        actors: [{ id: 'p', look: L().me(), x: -80, dir: 1 }],
        drawOverlay: (ctx, sc) => { if (sc.doc) { R6.UI.panel(ctx, 340, 120, 600, 380, { fill: '#efe6cf', stroke: '#8a6a2a', lw: 3 }); R6.UI.text(ctx, sc.doc.title, 640, 170, { size: 30, fam: 'title', align: 'center', color: '#3a2a1a' }); R6.UI.para(ctx, sc.doc.text, 640, 200, 540, { size: 18, align: 'center', color: '#3a2a1a' }); } },
        steps: [
          { move: 'p', to: [860] },
          { narr: 'A parede cede. Do outro lado: arquivos. Décadas de arquivos. Nomes, números, fotos.' },
          { call: sc => { R6.Engine.scene.doc = { title: 'JOGO Nº 1 · 1988', text: 'Anfitrião: O. I-H. (jogador 001 em diversas edições). "Assistir não basta. Eu queria sentir de novo a emoção de jogar."' }; R6.Audio.sfx('zip'); } },
          { wait: 3 },
          { say: 'p', text: old ? 'O velho do número 1… Ele nunca morreu nas bolinhas. Ele era o dono de tudo isso.' : 'O número 1 da primeira edição… era o próprio anfitrião.', expr: 'shock' },
          { call: () => { R6.Engine.scene.doc = { title: 'LISTA DE CONVIDADOS', text: 'Nomes de empresários, políticos, herdeiros. Máscaras douradas. Datas. Valores apostados em cada jogador.' }; R6.Audio.sfx('zip'); } },
          { wait: 3 }, { call: () => { R6.Engine.scene.doc = null; } },
          { say: 'p', text: 'Com isso, eles não podem mais se esconder.', expr: 'determined' },
          { narr: 'Você enche uma mochila de pastas e sai pelo duto de ventilação. Semanas depois, os jornais do mundo inteiro publicam os nomes.' },
          ...Endings.card('segredo'),
        ],
        onEnd: next,
      });
    },
    dark(next) {
      const sea = { dawn: 0.1 };
      const a = R6.cutscene({
        id: 'end_dark', stage: 'sea', music: 'dread', stageProps: sea, cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L().me(), x: 900, dir: 1, anim: 'sit' }],
        drawWorld: (c, sc) => { const g = sc.stage.ground; c.fillStyle = '#e8e4d8'; c.beginPath(); c.moveTo(700, g - 60); c.lineTo(1150, g - 60); c.lineTo(1100, g - 10); c.lineTo(740, g - 10); c.closePath(); c.fill(); },
        onUpdate: (sc, dt) => { sea.dawn = Math.min(0.8, sea.dawn + dt * 0.03); },
        steps: [
          { narr: 'A passagem dos VIPs termina num cais particular. Um barco sem piloto. Você rema até o sol nascer.' },
          { wait: 2 }, { narr: 'Atrás de você, a ilha encolhe até virar uma mancha escura no horizonte.' },
        ],
        onEnd: () => R6.Engine.go(b, { t: 'fade', dur: 1.5 }),
      });
      const b = R6.cutscene({
        id: 'end_dark2', stage: 'cityday', music: 'dread', cam: [900, 380, 1.15],
        actors: [{ id: 'p', look: L().civ('#2d2d33'), x: -80, dir: 1 }, { id: 'r', look: R6.Char.makeLook({ outfit: 'suit', hs: 'slick', hair: '#c9a15a', skin: '#f0cfb2', seed: 909 }), x: 1300, dir: -1, anim: 'kneel' }, { id: 'v', look: L().npc(910), x: 1180, dir: 1, anim: 'kneel' }],
        steps: [
          { caption: 'SEIS MESES DEPOIS', sub: 'Outro país. Outra estação.', dur: 3, big: true },
          { move: 'p', to: [800] },
          { sfx: 'paper' }, { wait: 0.4 }, { sfx: 'slap' },
          { narr: 'Um homem de terno, ajoelhado no chão da estação, joga ddakji com um estranho.' },
          { say: 'r', name: 'HOMEM DE TERNO', text: 'Would you like to play a game?' },
          { face: 'p', dir: 1 }, { say: 'p', text: '…Não acabou. Nunca vai acabar.', expr: 'shock' },
          { narr: 'No bolso do seu casaco — você não sabe como chegou ali — um cartão. Três formas. E, no verso, escrito à mão: "Bem-vindo de volta, ' + U.pad(S().s.player.num) + '."' },
          ...Endings.card('dark'),
        ],
        onEnd: next,
      });
      return a;
    },
    comum(next) {
      return R6.cutscene({
        id: 'end_comum', stage: 'home', music: 'sad', cam: [800, 380, 1.15],
        actors: [{ id: 'p', look: L().civ('#4a4a50'), x: 1060, dir: -1, anim: 'sitSad' }],
        steps: [
          { caption: 'ANOS DEPOIS', sub: 'Você nunca mais ligou para aquele número.', dur: 3, big: true },
          { narr: 'Você trabalha em dois empregos. As dívidas diminuem devagar. Às vezes, na TV, uma notícia sobre centenas de desaparecidos. Você muda de canal.' },
          { say: 'p', text: 'Eu escolhi viver. Mesmo que seja assim.', expr: 'sad' },
          ...Endings.card('comum'),
        ],
        onEnd: next,
      });
    },
    exodo(next) {
      return R6.cutscene({
        id: 'end_exodo', stage: 'street', music: 'credits', rain: false, cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L().civ('#1f2a3a'), x: -80, dir: 1 }].concat([1, 2, 3, 4].map(i => ({ id: 'n' + i, look: L().npc(700 + i), x: -200 - i * 80, dir: 1 }))),
        steps: [
          { caption: 'X VENCEU', sub: 'Pela primeira vez, a maioria escolheu ir embora.', dur: 3.2, big: true },
          { par: [[{ move: 'p', to: [900] }], [{ move: 'n1', to: [2600] }], [{ move: 'n2', to: [2600] }], [{ move: 'n3', to: [2600] }], [{ move: 'n4', to: [2600] }]] },
          { narr: 'Você não destruiu o jogo. Mas trezentas pessoas voltaram para casa naquela noite porque você convenceu cada uma delas.' },
          ...Endings.card('exodo'),
        ],
        onEnd: next,
      });
    },
  };
  R6.Endings = Endings;

  // ------------------------------------------------ WINNER stats screen
  R6.WinnerScene = function (next) {
    const s = S().s; const allies = S().allies(40).length; const stats = s.stats;
    const reward = R6.Save.addChips(Math.round(s.prize / 1e8) + s.player.gamesWon * 30);
    const lines = [
      ['NÚMERO DO JOGADOR', '#' + U.pad(s.player.num)],
      ['PRÊMIO FINAL', U.money(s.prize)],
      ['JOGOS VENCIDOS', String(s.player.gamesWon)],
      ['ALIADOS SOBREVIVENTES', String(allies)],
      ['JOGADORES ELIMINADOS', String(stats.eliminated)],
      ['VIDAS SALVAS POR VOCÊ', String(stats.saved || 0)],
      ['TRAIÇÕES', String(stats.betrayals || 0)],
    ];
    return {
      name: 'winner', t: 0, pausable: false, fx: new R6.Particles(800),
      enter() { R6.Music.play('victory'); R6.Save.unlockScene('winner', 'WINNER'); },
      update(dt) { this.t += dt; this.fx.update(dt); if (Math.random() < 0.5) this.fx.emit('money', U.rand(0, R6.W), -20, 1); if (this.t > 3 && (R6.Input.confirmP() || this.t > 14) && !this.left) { this.left = true; next(); } },
      render(ctx) {
        ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, R6.W, R6.H);
        this.fx.draw(ctx);
        const k = Math.min(1, this.t / 1.2);
        R6.UI.text(ctx, 'WINNER', 640, 150, { size: 140 * (0.8 + k * 0.2), fam: 'title', align: 'center', base: 'middle', color: '#f2c14e', alpha: k, spacing: 14, shadow: 'rgba(242,193,78,.7)', shadowBlur: 40 });
        R6.Char.portrait(ctx, s.player.look, 640, 290, 110, 'determined', this.t, false);
        lines.forEach(([a, b], i) => { const a2 = U.clamp((this.t - 1 - i * 0.35) * 2, 0, 1); R6.UI.text(ctx, a, 620, 380 + i * 36, { size: 18, align: 'right', weight: 800, color: '#999', alpha: a2, spacing: 2 }); R6.UI.text(ctx, b, 660, 380 + i * 36, { size: 24, fam: 'mono', color: '#fff', alpha: a2 }); });
        if (this.t > 4) R6.UI.text(ctx, '+' + reward + ' FICHAS PARA A LOJA EXTRA', 640, 660, { size: 16, align: 'center', color: '#e8336d', weight: 800 });
        if (this.t > 3) R6.UI.text(ctx, 'ENTER para continuar', 640, 700, { size: 14, align: 'center', color: '#777' });
        R6.UI.vignette(ctx, 0.6);
      },
    };
  };

  // ------------------------------------------------ farewell (complex left behind) + credits with scenes in the background
  R6.FarewellScene = function (next) {
    const isl = { zoom: 1.6, panX: 0, dawn: 0.2 };
    return R6.cutscene({
      id: 'farewell', stage: 'island', music: 'credits', stageProps: isl, letterbox: 1,
      onUpdate: (sc, dt) => { isl.zoom = Math.max(0.25, isl.zoom - dt * 0.05); isl.panX -= dt * 8; isl.dawn = Math.min(1, isl.dawn + dt * 0.03); },
      steps: [{ wait: 3 }, { caption: 'O COMPLEXO FICA PARA TRÁS', sub: 'Mas nenhum deles vai embora de você.', dur: 5 }, { wait: 6 }],
      onEnd: next,
    });
  };

  const CREDITS = [
    ['ROUND 6: THE LAST GAME', ''], ['UM JOGO 2D INSPIRADO NO UNIVERSO DE ROUND 6 / SQUID GAME', ''], ['', ''],
    ['DIREÇÃO E DESIGN DE JOGO', 'Claude Code'], ['PROGRAMAÇÃO DE MOTOR', 'Canvas 2D · JavaScript puro'], ['ARTE PROCEDURAL DE PERSONAGENS', 'Esqueleto articulado · 3 vistas · 30+ animações'],
    ['INTELIGÊNCIA ARTIFICIAL', 'Rotinas sociais · memória · alianças · traição · pânico'], ['ÁUDIO', 'Síntese procedural WebAudio · trilhas originais'],
    ['JOGOS', 'Ddakji · Batatinha Frita · Dalgona · Cabo de Guerra · Bolinhas de Gude · Ponte de Vidro · Squid Game'], ['', 'Pão ou Loteria · Pedra, Papel e Tesoura: Menos Um · Seis Pernas · Mingle · A Revolta'], ['', 'Esconde-Esconde · Pular Corda · Sky Squid Game · A Fuga'],
    ['JOGOS EXTRAS ORIGINAIS', 'Clock Run · Color Rooms · Number Hunt · Falling Tiles · Freeze Challenge'],
    ['PERSONAGENS ORIGINAIS', 'Yoo Il-hwan · Seo Tae-min · Kang Ha-eun · Rafiq Hossain · Jang Deok-man · Oh Mi-ja'], ['', 'Baek Jin-woo · Tak Man-su · Yoon Ha-ri · Min Ji-a · Choi Dae-han · Detetive Kang'],
    ['E TODOS OS 456', 'que nunca voltaram para casa.'], ['', ''], ['Obra de fã, sem afiliação com a Netflix ou os criadores da série.', ''], ['OBRIGADO POR JOGAR', ''],
  ];
  R6.CreditsScene = function (next) {
    const vignettes = ['doll', 'glass', 'tug', 'towers', 'marbles', 'mingle'];
    const extras = R6.Char;
    return {
      name: 'credits', t: 0, pausable: false, y: R6.H + 40, look: S().s ? S().s.player.look : R6.Char.makeLook({ num: 456 }),
      looks: Array.from({ length: 12 }, (_, i) => R6.Char.makeLook({ seed: 40 + i, num: 40 + i })),
      enter() { R6.Music.play('credits'); R6.Save.unlockScene('credits', 'Créditos'); },
      update(dt) { this.t += dt; this.y -= dt * (R6.Input.act('action') ? 160 : 42); if ((this.y < -CREDITS.length * 56 - 200 || R6.Input.actP('back')) && !this.left) { this.left = true; next(); } },
      render(ctx) {
        ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, R6.W, R6.H);
        // background scene vignettes cycling (scenes from the game)
        const idx = Math.floor(this.t / 8) % vignettes.length, k = (this.t % 8) / 8; const a = Math.min(1, Math.min(k, 1 - k) * 5) * 0.55;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(900, 420);
        const v = vignettes[idx], t = this.t;
        if (v === 'doll') { R6.Props.tree(ctx, 0, 180, 1, t); R6.Props.doll(ctx, 0, 190, 0.9, { t, face: (Math.sin(t) + 1) / 2 }); }
        else if (v === 'glass') { for (let i = -3; i <= 3; i++) R6.Props.glassPanel(ctx, i * 80 - 30, 100, 70, 20, { broken: i === 1, glint: 0.3 }); R6.Char.draw(ctx, this.look, 10, 104, { view: 'side', anim: 'jump', t, scale: 1.1 }); }
        else if (v === 'tug') { for (let i = 0; i < 4; i++) R6.Char.draw(ctx, this.looks[i], -200 + i * 60, 150, { view: 'side', dir: 1, anim: 'pull', t: t + i, scale: 1 }); ctx.strokeStyle = '#b89a62'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-260, 90); ctx.lineTo(220, 90); ctx.stroke(); }
        else if (v === 'towers') { for (let i = 0; i < 3; i++) { ctx.fillStyle = '#8a93a0'; ctx.fillRect(-260 + i * 200, 40 - i * 30, 90, 400); R6.UI.shapeIcon(ctx, ['square', 'triangle', 'circle'][i], -215 + i * 200, 120 - i * 30, 26, '#fff', 4); } }
        else if (v === 'marbles') { for (let i = 0; i < 10; i++) R6.drawMarble(ctx, -120 + i * 26, 120 + Math.sin(t * 2 + i) * 6, 11, ['#7fc4ff', '#ff7fa8', '#ffd166'][i % 3]); R6.Char.draw(ctx, this.look, -200, 200, { view: 'side', anim: 'hold', t, scale: 1.3 }); }
        else { ctx.fillStyle = '#8a5a9a'; ctx.beginPath(); ctx.ellipse(0, 150, 260, 90, 0, 0, U.TAU); ctx.fill(); for (let i = 0; i < 8; i++) R6.Char.draw(ctx, this.looks[4 + i], Math.cos(t * 0.5 + i) * 180, 150 + Math.sin(t * 0.5 + i) * 60, { view: 'front', anim: 'walk', t: t + i, scale: 0.6 }); }
        ctx.restore();
        let y = this.y;
        for (const [a, b] of CREDITS) {
          if (y > -60 && y < R6.H + 60) {
            if (a) R6.UI.text(ctx, a, 380, y, { size: a === 'ROUND 6: THE LAST GAME' || a === 'OBRIGADO POR JOGAR' ? 40 : 18, fam: a.length < 30 && !b ? 'title' : 'body', align: 'center', weight: 800, color: b ? '#e8336d' : '#fff', spacing: 2 });
            if (b) R6.UI.text(ctx, b, 380, y + 24, { size: 17, align: 'center', color: '#ddd', maxW: 700 });
          }
          y += 56;
        }
        R6.UI.vignette(ctx, 0.7);
        R6.UI.text(ctx, 'ESPAÇO acelera · ESC pula', R6.W - 20, R6.H - 16, { size: 12, align: 'right', color: '#555' });
      },
    };
  };
})();
