/* ROUND 6 — story.js : campaign cutscene scripts (side-view stages + in-dorm scripted scenes). Actors always walk in/out, never teleport. */
'use strict';
(function () {
  const U = R6.U;
  const S = () => R6.State;
  const L = {
    me: () => S().s.player.look,
    civ: (top) => Object.assign({}, S().s.player.look, { outfit: 'civil', civ: { top: top || '#5b4a3a', bottom: '#3a3f4a' } }),
    tux: () => Object.assign({}, S().s.player.look, { outfit: 'tux' }),
    guard: (m, s) => R6.Char.makeLook({ outfit: 'guard', mask: m || 'circle', seed: s || 1 }),
    fm: () => R6.Char.makeLook({ outfit: 'frontman', seed: 2 }),
    vip: (v, s) => R6.Char.makeLook({ outfit: 'vip', vip: v, seed: s || 3 }),
    rec: () => R6.recruiterLook(),
    det: () => R6.Char.makeLook({ outfit: 'suit', hs: 'short', hair: '#15110f', skin: '#e2b894', seed: 88, civ: null, glasses: false, beard: 'stubble', outfitColors: { main: '#3b3a35', dark: '#2a2925', light: '#4d4c46', pants: '#2d2c28', pantsDark: '#1e1d1a' } }),
    mom: () => R6.Char.makeLook({ fem: true, age: 2, outfit: 'civil', hs: 'perm', hair: '#8f8d8a', seed: 55, civ: { top: '#7a5a6a', bottom: '#3a3a3a' } }),
    npc: (s) => R6.Char.makeLook({ outfit: 'civil', seed: s }),
  };
  R6.StoryLooks = L;
  const K = (k) => S().byKey(k);
  const alive = (k) => S().keyAlive(k);
  const chain = (...fns) => { const run = (i) => { if (i >= fns.length) return; const sc = fns[i](() => run(i + 1)); if (sc) R6.Engine.go(sc, { t: 'fade', dur: 1.2 }); }; return run; };

  const Story = {
    // =============================================================== SEASON 1
    s1Intro(next) {
      const sc1 = R6.cutscene({
        id: 's1_intro', title: 'Prólogo: dívidas', stage: 'home', music: 'sad', cam: [700, 380, 1.15],
        actors: [{ id: 'p', look: L.civ(), x: 300, anim: 'sleep', dir: 1, view: 'side' }],
        steps: [
          { caption: 'TEMPORADA 1', sub: 'Seul · uma madrugada qualquer', dur: 3.2, big: true },
          { sfx: 'beep' }, { wait: 0.4 }, { sfx: 'beep' },
          { narr: 'Você deve dinheiro a agiotas, ao banco e a quase todos que ainda atendem suas ligações. A última mensagem diz: "Prazo final: amanhã."' },
          { anim: 'p', name: 'getup', hold: 1 }, { anim: 'p', name: 'idle' },
          { move: 'p', to: [1060] }, { anim: 'p', name: 'sitSad', hold: 1.5 },
          { say: 'p', text: '…Nem que eu venda um rim. Não dá.', expr: 'sad' },
          { anim: 'p', name: 'idle' }, { move: 'p', to: [1500] },
        ],
        onEnd: () => R6.Engine.go(sc2, { t: 'fade', dur: 1.2 }),
      });
      const sc2 = R6.cutscene({
        id: 's1_subway', title: 'O homem de terno', stage: 'subway', music: 'dread', cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L.civ(), x: -80, dir: 1 }, { id: 'r', look: L.rec(), x: 2500, dir: -1 }, { id: 'n1', look: L.npc(31), x: 1300, z: 0.6, dir: -1 }, { id: 'n2', look: L.npc(32), x: 400, z: 0.7, dir: 1 }],
        steps: [
          { par: [[{ move: 'p', to: [720] }, { anim: 'p', name: 'sitSad' }], [{ move: 'n1', to: [-100], z: 0.6 }], [{ move: 'n2', to: [2600] }]] },
          { wait: 1 },
          { move: 'r', to: [880] }, { face: 'p', dir: 1 }, { anim: 'p', name: 'idle' },
          { say: 'r', text: 'Com licença. Você gosta de jogos?', expr: 'smirk' },
          { say: 'p', text: '…Quem é você?', expr: 'tense' },
          { say: 'r', text: 'Tenho dois ddakji aqui. Se você virar o meu, eu te dou ₩100.000. Se eu virar o seu… você me paga.', expr: 'smirk' },
          { choice: 'Um estranho oferecendo dinheiro no metrô.', id: 'accept_ddakji', opts: [
            { t: 'Aceitar o jogo', set: { eager: true } },
            { t: '"Não tenho dinheiro nem pra passagem."', then: [{ say: 'r', text: 'Então você não tem nada a perder. Um tapa, se perder. Só isso.', expr: 'smirk' }] },
          ] },
          { anim: 'r', name: 'kneel' }, { anim: 'p', name: 'kneel' }, { cam: [800, 470, 1.6], dur: 1.2 },
        ],
        onEnd: next,
      });
      return sc1;
    },
    s1Card(next) {
      const sc1 = R6.cutscene({
        id: 's1_card', title: 'O cartão', stage: 'subway', music: 'dread', cam: [800, 400, 1.3],
        actors: [{ id: 'p', look: L.civ(), x: 700, dir: 1, anim: 'idle' }, { id: 'r', look: L.rec(), x: 900, dir: -1, anim: 'idle' }],
        drawOverlay: (ctx, sc) => { if (sc.card) R6.Props.card(ctx, 640, 380, 360, { flip: sc.card.flip, code: '4 5 6' }); },
        steps: [
          { say: 'r', text: 'Você é bom nisso. Mas existe um jogo muito maior. Com um prêmio que apaga todas as suas dívidas.', expr: 'smirk' },
          { call: (h) => { const sc = R6.Engine.scene; sc.card = { flip: 0 }; R6.Audio.sfx('flip'); } },
          { wait: 1.2 }, { call: () => { const sc = R6.Engine.scene; let t = 0; return { update: dt => { t += dt; sc.card.flip = Math.min(Math.PI, t * 2.5); return t > 1.6; } }; } },
          { say: 'r', text: 'Ligue para esse número. Se decidir jogar.', expr: 'smirk' },
          { call: () => { R6.Engine.scene.card = null; } },
          { move: 'r', to: [2500] },
          { say: 'p', text: '…Três formas. Um número de telefone. Que tipo de jogo é esse?', expr: 'tense' },
        ],
        onEnd: () => R6.Engine.go(sc2, { t: 'fade', dur: 1.2 }),
      });
      const van = { x: -500 };
      const sc2 = R6.cutscene({
        id: 's1_van', title: 'A van', stage: 'street', music: 'dread', rain: true, lightning: true, cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L.civ(), x: 800, dir: 1, anim: 'hold', item: 'card' }, { id: 'g', look: L.guard('circle', 9), x: -300, dir: 1, visible: false }],
        drawWorld: (c, sc) => { const g = sc.stage.ground; c.fillStyle = '#e7e3dc'; c.fillRect(van.x, g - 150, 360, 130); c.fillStyle = '#2a2d33'; c.fillRect(van.x + 230, g - 140, 110, 60); c.fillStyle = '#111'; c.beginPath(); c.arc(van.x + 70, g - 20, 26, 0, U.TAU); c.arc(van.x + 290, g - 20, 26, 0, U.TAU); c.fill(); c.fillStyle = '#ffe9a8'; c.fillRect(van.x + 350, g - 90, 10, 16); },
        steps: [
          { narr: 'Uma cabine telefônica. Chuva. Você disca.' },
          { say: 'p', text: 'Alô? Eu… recebi um cartão.', expr: 'tense' },
          { say: { name: 'VOZ', look: L.guard('square', 7) }, text: 'Nome e data de nascimento.', name: 'VOZ' },
          { say: 'p', text: S().s.player.name + '.', expr: 'tense' },
          { say: { name: 'VOZ', look: L.guard('square', 7) }, text: 'Esteja na estação amanhã às 00h30. Um carro vai buscá-lo.', name: 'VOZ' },
          { call: () => { let t = 0; R6.Audio.sfx('whoosh'); return { update: dt => { t += dt; van.x = U.lerp(-500, 460, U.ease.outCubic(Math.min(1, t / 2.2))); return t > 2.4; } }; } },
          { sfx: 'door' }, { show: 'g' }, { call: () => { const g = R6.Engine.scene.getActor('g'); g.x = van.x + 180; } },
          { move: 'g', to: [700] },
          { say: 'g', text: 'Senha.', name: 'GUARDA' },
          { say: 'p', text: '…Batatinha frita, um, dois, três.', expr: 'tense' },
          { call: () => { const sc = R6.Engine.scene; for (let i = 0; i < 30; i++) sc.fx.emit('smoke', 780, 420, 2, { color: '#ff9ac0', size: 1.5 }); R6.Audio.sfx('zip'); } },
          { anim: 'p', name: 'fall', hold: 1.2 },
          { fade: 'out', dur: 1.5 },
        ],
        onEnd: next,
      });
      return sc1;
    },
    // in-dorm intro: waking up (runner steps for the hub)
    hubWakeS1(h) {
      const me = h.pl; me.lie = { anim: 'sleep' };
      const k = id => h.getActor('k:' + id);
      const p = h.pl; const near = (dx, dy) => [p.x + dx, p.y + dy];
      const steps = [
        { caption: 'DIA 1', sub: 'Um dormitório imenso. 456 camas.', dur: 3, big: true },
        { cam: [p.x, p.y - 40, 2.2] }, { wait: 0.6 },
        { cam: [p.x, p.y - 40, 1.2], dur: 2.5, ease: 'inOut' },
        { call: () => { me.lie = null; me.setAnim('getup', 0.8); } }, { wait: 0.9 },
        { narr: 'Todos vestem o mesmo agasalho verde. Cada um com um número no peito. O seu: #' + U.pad(S().s.player.num) + '.' },
      ];
      if (k('oldman')) steps.push({ move: 'k:oldman', to: near(34, 6) }, { face: 'k:oldman', to: [p.x, p.y] }, { say: 'key:oldman', text: 'Você também acordou aqui sem saber onde estava, hein? Eu sou o número 1. O primeiro. Ha!', expr: 'happy' });
      if (k('schemer')) steps.push({ move: 'k:schemer', to: near(-40, 10) }, { say: 'key:schemer', text: 'Não acredito. Você? Do nosso bairro? A sua mãe ainda vende no mercado?', expr: 'shock' }, { say: 'p', text: 'Tae-min? Você não estava nos Estados Unidos?', expr: 'shock' }, { say: 'key:schemer', text: '…Longa história.', expr: 'neutral' });
      if (k('thief')) steps.push({ move: 'k:thief', to: near(70, -30), async: true }, { say: 'key:thief', text: 'Sai da frente.', expr: 'angry' });
      if (k('worker')) steps.push({ move: 'k:worker', to: near(-20, 40) }, { say: 'key:worker', text: 'Desculpe… o senhor sabe onde estamos? Eu sou Rafiq. Número 199.', expr: 'scared' });
      steps.push(
        { announce: 'Bem-vindos. Todos vocês estão aqui porque vivem à beira de um precipício financeiro. Vocês participarão de 6 jogos durante 6 dias. Quem vencer todos receberá um grande prêmio em dinheiro.' },
        { announce: 'Cláusula 1: um jogador não pode parar de jogar. Cláusula 2: um jogador que se recusar a jogar será eliminado. Cláusula 3: os jogos podem ser encerrados se a maioria concordar.' },
      );
      return steps;
    },
    hubAfterRL(h) {
      const P = h.D.pig;
      return [
        { caption: 'DE VOLTA AO DORMITÓRIO', sub: 'Metade das camas está vazia.', dur: 3, big: true },
        { cam: [h.pl.x, h.pl.y - 20, 1.3] },
        { narr: 'Ninguém fala. Alguém chora baixinho num beliche alto. Os guardas empilham caixões pretos com laços cor-de-rosa em algum lugar que vocês não podem ver.' },
        { cam: [P.x, P.y - 160, 1.1], dur: 2.5 },
        { sfx: 'money' }, { call: () => { for (let i = 0; i < 40; i++) h.world.fx.emit('money', P.x + U.rand(-40, 40), P.y - 220, 1); } },
        { announce: 'Cada jogador eliminado vale ₩100.000.000. O prêmio acumulado até agora é de ' + U.money(S().s.prize) + '.' },
        { wait: 1.5 }, { cam: [h.pl.x, h.pl.y - 20, 1.15], dur: 1.5 },
      ];
    },
    s1Home(next, refuse) {
      const sc = R6.cutscene({
        id: 's1_home', title: 'A volta para casa', stage: 'street', music: 'sad', rain: true, cam: [800, 380, 1.1],
        actors: [{ id: 'p', look: L.civ(), x: -80, dir: 1 }, { id: 'c1', look: L.npc(61), x: 2500, dir: -1 }, { id: 'c2', look: L.npc(62), x: 2600, dir: -1 }],
        steps: [
          { caption: 'O JOGO FOI ENCERRADO', sub: 'A maioria votou X. Vocês acordaram numa rua qualquer.', dur: 3.4, big: true },
          { move: 'p', to: [760] },
          { narr: 'Os mesmos credores. A mesma chuva. Ninguém acredita no que você viu.' },
          { move: 'c1', to: [900], run: true }, { move: 'c2', to: [980], run: true },
          { say: 'c1', text: 'Olha quem apareceu. Cadê o dinheiro?', name: 'AGIOTA', expr: 'angry' },
          { anim: 'p', name: 'stagger', hold: 0.6 }, { sfx: 'hit' }, { anim: 'p', name: 'kneel' },
          { say: 'c2', text: 'Uma semana. Ou a gente volta para buscar o que você tiver — nem que seja um rim.', name: 'AGIOTA', expr: 'angry' },
          { move: 'c1', to: [2600] }, { move: 'c2', to: [2700], async: true },
          { narr: 'No seu bolso, amassado, outro cartão. Três formas. O mesmo número.' },
          { choice: 'Lá dentro, você pode morrer. Aqui fora, você já está morrendo.', id: 's1_return', opts: [
            { t: 'Ligar para o número. Voltar para o jogo.', set: { s1_returned: true } },
            { t: 'Rasgar o cartão. Nunca mais.', set: { s1_refused: true } },
          ] },
        ],
        onEnd: () => (S().flag('s1_refused') ? refuse() : next()),
      });
      return sc;
    },
    s1Dinner(next) {
      const fin = S().aliveBots(); const th = alive('thief') ? K('thief') : null; const sch = alive('schemer') ? K('schemer') : fin.find(p => !p.key) || fin[0];
      const actors = [{ id: 'p', look: L.tux(), x: -80, dir: 1 }, { id: 'fm', look: L.fm(), x: 2300, dir: -1, z: 0.5 }, { id: 'g', look: L.guard('square', 4), x: 1250, dir: -1, z: 0.4 }];
      if (sch) actors.push({ id: 'o', p: sch, look: Object.assign({}, sch.look, { outfit: 'tux' }), x: -200, dir: 1 });
      if (th) actors.push({ id: 't', p: th, look: Object.assign({}, th.look, { outfit: 'tux' }), x: -320, dir: 1 });
      const steps = [
        { caption: 'A ÚLTIMA NOITE', sub: 'Smokings. Música clássica. Um banquete.', dur: 3, big: true },
        { par: [[{ move: 'p', to: [720] }, { anim: 'p', name: 'sit' }], sch ? [{ move: 'o', to: [1000] }, { face: 'o', dir: -1 }, { anim: 'o', name: 'sit' }] : [], th ? [{ move: 't', to: [860] }, { anim: 't', name: 'sit' }] : []] },
        { say: 'g', name: 'GUARDA', text: 'Aproveitem o jantar. O último jogo será amanhã.' },
        { narr: 'Ao lado de cada prato, uma faca de carne. Ninguém come. Todos olham para as facas.' },
      ];
      if (th) steps.push(
        { say: 't', text: 'O corte na minha barriga não fecha. Se amanhã eu não conseguir levantar…', expr: 'pain' },
        { say: 'o', text: 'Ninguém aqui vai te carregar.', expr: 'neutral' },
        { narr: 'Mais tarde, no dormitório vazio, você vê ' + sch.name + ' olhando para ' + th.name + ' enquanto ela dorme. A faca ainda está no bolso dele.' },
        { choice: 'O que você faz esta noite?', id: 's1_night', opts: [
          { t: 'Ficar acordado ao lado dela a noite toda', set: { protected_thief: true }, rel: { thief: 30 }, karma: 3 },
          { t: 'Dormir. Não é problema seu.', set: { protected_thief: false } },
        ] },
        { if: s => s.flag('protected_thief'), then: [
          { say: 't', text: '…Você ficou acordado a noite inteira? Por quê?', expr: 'sad' },
          { say: 'p', text: 'Porque amanhã a gente pode votar. Cláusula 3. Se dois de três votarem para parar, ninguém mais morre.', expr: 'determined' },
          { say: 't', text: 'E o dinheiro?', expr: 'sad' }, { say: 'p', text: 'Que se dane o dinheiro.', expr: 'determined' },
          { choice: 'Ao amanhecer, os guardas perguntam se alguém deseja invocar a cláusula 3.', id: 's1_clause3', opts: [
            { t: 'Invocar a cláusula 3 com ela (fim do jogo, sem vencedor)', set: { s1_clause3: true } },
            { t: 'Não. Jogar o último jogo.', set: { s1_clause3: false } },
          ] },
        ], else: [
          { narr: 'Você acorda com o som de uma luta curta. Depois, silêncio. O beliche dela está vazio.' },
          { elim: 't', sfx: 'thud', cause: 'night' },
        ] },
      );
      steps.push({ say: 'fm', name: 'FRONT MAN', text: 'Amanhã, dois jogadores. Um jogo. O mais antigo deles.' });
      return R6.cutscene({ id: 's1_dinner', title: 'O jantar', stage: 'dinner', music: 'waltz', cam: [900, 400, 1.05], actors, steps, onEnd: next });
    },
    s1Clause3End(next) {
      const th = K('thief');
      return R6.cutscene({
        id: 's1_clause3', title: 'Cláusula 3', stage: 'street', music: 'sad', rain: false, cam: [900, 400, 1.1],
        actors: [{ id: 'p', look: L.civ(), x: 700, dir: 1, anim: 'lie' }, { id: 't', p: th, look: Object.assign({}, th.look, { outfit: 'civil' }), x: 820, dir: -1, anim: 'lie' }],
        steps: [
          { caption: 'O JOGO ACABOU', sub: 'Dois votos contra um. Sem vencedor.', dur: 3.2, big: true },
          { narr: 'Vocês acordam numa calçada, ao amanhecer. Sem dinheiro. Vivos.' },
          { anim: 'p', name: 'getup', hold: 1 }, { anim: 't', name: 'getup', hold: 1 }, { anim: 'p', name: 'idle' }, { anim: 't', name: 'idle' },
          { say: 't', text: 'Você é o homem mais burro que eu já conheci.', expr: 'happy' }, { say: 't', text: 'Obrigada.', expr: 'sad' },
          { narr: 'Mas o jogo não acabou de verdade. Em algum lugar, alguém já está entregando novos cartões.' },
        ],
        onEnd: next,
      });
    },
    s1End(next) {
      const won = !S().flag('s1_clause3');
      const prize = S().s.prize;
      if (won) { S().s.player.money += prize; S().flag('s1_winner', true); }
      return R6.cutscene({
        id: 's1_end', title: 'Depois do jogo', stage: 'subway', music: 'sad', cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L.civ('#2d2d33'), x: -80, dir: 1 }, { id: 'r', look: L.rec(), x: 1500, dir: -1, anim: 'kneel' }, { id: 'v', look: L.npc(77), x: 1400, dir: 1, anim: 'kneel' }],
        steps: [
          { caption: won ? 'UM ANO DEPOIS' : 'ALGUNS MESES DEPOIS', sub: won ? 'Você tem ' + U.money(prize) + ' numa conta que não consegue tocar.' : 'Você voltou a dever. Mas continua vivo.', dur: 3.6, big: true },
          { narr: won ? 'Você não gastou quase nada. Cada nota lembra um rosto.' : 'Você procurou a polícia. Ninguém acreditou.' },
          { move: 'p', to: [900] },
          { sfx: 'paper' }, { wait: 0.3 }, { sfx: 'slap' },
          { say: 'v', name: 'JOVEM', text: 'Ai! Mais uma. Eu vou ganhar dessa vez.', expr: 'pain' },
          { face: 'p', dir: 1 },
          { say: 'p', text: '…É ele. O homem do ddakji.', expr: 'shock' },
          { choice: 'Ele está recrutando outra pessoa. Agora.', id: 's1_hook', opts: [
            { t: 'Arrancar o cartão da mão do jovem', karma: 2, then: [{ move: 'p', to: [1350], run: true }, { say: 'p', text: 'Não pega esse cartão. Vai pra casa!', expr: 'angry' }, { move: 'v', to: [-100], run: true }] },
            { t: 'Seguir o recrutador de longe', then: [{ narr: 'Você o segue até a saída. Ele some na multidão, como fumaça.' }] },
          ] },
          { say: 'r', text: '(sem olhar para você) O jogo nunca termina. Ele só muda de lugar.', expr: 'smirk' },
          { move: 'r', to: [2600] },
          { narr: 'Naquela noite você faz uma promessa: vai voltar. Não pelo dinheiro. Para acabar com o jogo.' },
        ],
        onEnd: next,
      });
    },
    // =============================================================== SEASON 2
    s2Intro(next) {
      return R6.cutscene({
        id: 's2_intro', title: 'Temporada 2', stage: 'street', music: 'dread', rain: true, cam: [900, 380, 1.1],
        actors: [{ id: 'p', look: L.civ('#1f2a3a'), x: -80, dir: 1 }, { id: 'd', look: L.det(), x: 2500, dir: -1 }],
        steps: [
          { caption: 'TEMPORADA 2', sub: 'Dois anos procurando um homem de terno.', dur: 3.4, big: true },
          { move: 'p', to: [780] },
          { narr: 'Você gastou uma fortuna em detetives. Todos desistiram. Menos um.' },
          { move: 'd', to: [980] },
          { say: 'd', name: 'DETETIVE KANG', text: 'Encontrei. Ele aparece num parque, à noite. Distribui pão aos sem-teto — ou bilhetes de loteria.' },
          { say: 'p', text: 'Então eu vou até lá.', expr: 'determined' },
          { say: 'd', name: 'DETETIVE KANG', text: 'Meu irmão desapareceu numa ilha, anos atrás. Se você achar o jogo… me avisa. Vou estar no mar, procurando.' },
          { move: 'd', to: [2600] }, { move: 'p', to: [1800] },
        ],
        onEnd: next,
      });
    },
    s2Arrival(next) {
      return R6.cutscene({
        id: 's2_arrival', title: 'De volta à ilha', stage: 'van', music: 'dread', cam: [700, 380, 1.1],
        actors: [{ id: 'p', look: L.civ('#1f2a3a'), x: 560, dir: 1, anim: 'sit' }, { id: 'g', look: L.guard('triangle', 3), x: 900, dir: -1, anim: 'sit' }],
        steps: [
          { narr: 'Você ligou para o número. Deu a senha. O gás cor-de-rosa veio de novo — e dessa vez você deixou.' },
          { say: 'p', text: 'Pode me levar. Eu sei o caminho.', expr: 'determined' },
          { call: () => { const sc = R6.Engine.scene; for (let i = 0; i < 20; i++) sc.fx.emit('smoke', 700, 420, 2, { color: '#ff9ac0', size: 1.5 }); } },
          { fade: 'out', dur: 1.5 },
        ],
        onEnd: next,
      });
    },
    hubWakeS2(h) {
      const p = h.pl; const near = (dx, dy) => [p.x + dx, p.y + dy]; const k = id => h.getActor('k:' + id);
      const steps = [
        { caption: 'TEMPORADA 2 · DIA 1', sub: '456 novos jogadores. Você com o mesmo número.', dur: 3.2, big: true },
        { cam: [p.x, p.y - 30, 1.2] },
        { narr: 'O mesmo dormitório. As mesmas camas. Nada mudou — só os rostos.' },
      ];
      if (k('buddy')) steps.push({ move: 'k:buddy', to: near(36, 4), run: true }, { say: 'key:buddy', text: 'NÃO ACREDITO! É você mesmo? O que você está fazendo aqui?!', expr: 'shock' }, { say: 'p', text: 'Man-su?! Eu é que pergunto! Você não devia estar aqui!', expr: 'shock' }, { say: 'key:buddy', text: 'Perdi tudo, cara. Um cara de terno no metrô… você sabe como é.', expr: 'sad' });
      if (k('fm001')) steps.push({ move: 'k:fm001', to: near(-36, 10) }, { say: 'key:fm001', text: 'Você fala como quem já esteve aqui antes. Eu sou o 001. Se tiver um plano… eu gostaria de ouvir.', expr: 'neutral' });
      if (k('soldier')) steps.push({ move: 'k:soldier', to: near(10, 50), async: true });
      steps.push(
        { say: 'p', text: '(para todos) ESCUTEM! O primeiro jogo é Batatinha Frita! Quando a boneca virar, NÃO SE MEXAM! Quem se mexer morre!', expr: 'determined' },
        { narr: 'Alguns riem. Outros olham para você com medo. Poucos acreditam.' },
      );
      return steps;
    },
    s2RevoltPlan(h) {
      const steps = [
        { caption: 'A NOITE DOS X', sub: 'O placar dividiu o dormitório em dois.', dur: 3, big: true },
        { narr: 'Os que votaram X decidem que não vão esperar o próximo jogo. Vão tomar as armas dos guardas e invadir a sala de controle.' },
      ];
      if (alive('soldier')) steps.push({ say: 'key:soldier', text: 'Eu já fui das forças especiais. Me dá cinco minutos com uma arma e eu levo a gente até lá em cima.', expr: 'determined' });
      if (alive('fm001')) steps.push({ say: 'key:fm001', text: 'Eu fico com o grupo que protege o dormitório. Alguém precisa ficar. Confie em mim.', expr: 'neutral' });
      if (alive('buddy')) steps.push({ say: 'key:buddy', text: 'Eu vou com você. Nem pensar que eu fico aqui esperando.', expr: 'determined' },
        { choice: 'Man-su quer ir com você na invasão.', id: 'revolt_buddy', opts: [
          { t: 'Levar Man-su com você', set: { revolt_buddy: true } },
          { t: '"Fica. Protege o dormitório. Preciso que você sobreviva."', set: { revolt_buddy: false }, rel: { buddy: 5 } },
        ] });
      steps.push({ choice: 'Antes de sair, você repara que o #001 nunca parece cansado, nunca parece com medo…', id: 'suspect_001', opts: [
        { t: 'Desconfiar dele: mudar a rota do plano sem avisar', set: { suspect_001: true } },
        { t: 'Confiar nele: contar todo o plano', set: { suspect_001: false } },
      ] });
      return steps;
    },
    s2End(next) {
      const buddy = alive('buddy') ? K('buddy') : null; const took = S().flag('revolt_buddy'); const susp = S().flag('suspect_001');
      const fmP = K('fm001');
      const actors = [{ id: 'p', look: L.me(), x: 600, dir: 1, anim: 'handsup' }, { id: 'fm', look: L.fm(), x: 2300, dir: -1 }, { id: 'g1', look: L.guard('square', 11), x: 900, dir: -1, item: 'rifle' }, { id: 'g2', look: L.guard('circle', 12), x: 1000, dir: -1, item: 'rifle' }];
      if (buddy && took) actors.push({ id: 'b', p: buddy, look: buddy.look, x: 480, dir: 1, anim: 'handsup' });
      const steps = [
        { caption: 'A SALA DE CONTROLE', sub: 'Vocês chegaram à porta. Eles já esperavam.', dur: 3, big: true },
        { narr: susp ? 'Você mudou a rota. Mesmo assim, os guardas estavam no lugar certo — só que em menor número. Alguém lutou ao seu lado até o fim.' : 'O corredor estava vazio demais. Quando a porta se abriu, havia dezenas deles.' },
        { move: 'fm', to: [1200] },
        { say: 'fm', name: 'FRONT MAN', text: 'Você realmente acreditou que poderia mudar o jogo de dentro dele?' },
        { say: 'fm', name: 'FRONT MAN', text: 'Eu estava ao seu lado o tempo todo. Número 001. Comi com você. Votei com você.' },
        { narr: 'Ele tira a máscara por um instante. É o rosto calmo do homem que dormia no beliche ao lado.' },
      ];
      if (buddy && took) steps.push(
        { say: 'b', text: 'Não… não, não. Ele era um de nós!', expr: 'scared' },
        { say: 'fm', name: 'FRONT MAN', text: 'Regras são regras.' },
        { elim: 'b', cause: 'revolt', sfx: 'gun' },
        { say: 'p', text: 'MAN-SU!', expr: 'cry' }, { anim: 'p', name: 'kneel' },
      );
      steps.push({ say: 'fm', name: 'FRONT MAN', text: 'Levem-no de volta. O jogo continua. E ele vai assistir a cada minuto.' }, { fade: 'out', dur: 1.5 });
      return R6.cutscene({ id: 's2_end', title: 'Traição', stage: 'office', music: 'dread', cam: [900, 400, 1.1], actors, steps, onEnd: next });
    },
    // =============================================================== SEASON 3
    s3Intro(next) {
      const karma = S().s.player.karma; const give = karma >= 3 || S().flag('spared_guard');
      const actors = [{ id: 'p', look: L.me(), x: 640, dir: 1, anim: 'sitSad' }, { id: 'g', look: L.guard('circle', 21), x: 1500, dir: -1 }];
      const steps = [
        { caption: 'TEMPORADA 3', sub: 'Depois da revolta.', dur: 3.2, big: true },
        { narr: 'Você não fala há dois dias. As camas dos rebeldes foram retiradas. As dos que morreram também.' },
      ];
      if (give) steps.push(
        { move: 'g', to: [800] },
        { say: 'g', name: 'GUARDA 011', text: '(baixo) Eu vi o que você fez pelos outros lá fora. Eu não posso tirar você daqui. Mas posso te dar isto.' },
        { choice: 'A guarda estende uma chave pesada. "Porta de serviço. Só abre uma vez."', id: 'master_key', opts: [
          { t: 'Aceitar a chave-mestra', do: () => S().give('master_key'), set: { got_master_key: true } },
          { t: 'Recusar. "Se descobrirem, matam você."', set: { got_master_key: false }, karma: 1 },
        ] },
        { move: 'g', to: [1600] },
      );
      steps.push({ announce: 'O próximo jogo começa em breve. Os jogadores serão divididos em duas equipes.' });
      return R6.cutscene({ id: 's3_intro', title: 'Depois da revolta', stage: 'room', music: 'sad', cam: [700, 400, 1.2], actors, steps, onEnd: next });
    },
    s3AfterHS(next) {
      const mom = alive('mother') ? K('mother') : null; const sol = alive('soldier') ? K('soldier') : null;
      const actors = [{ id: 'p', look: L.me(), x: 520, dir: 1 }];
      const steps = [{ caption: 'DEPOIS DO ESCONDE-ESCONDE', sub: 'O labirinto cheirava a sangue e a tinta fresca.', dur: 3, big: true }];
      if (mom) {
        actors.push({ id: 'm', p: mom, look: mom.look, x: 900, dir: -1, anim: 'sit', item: 'baby' });
        if (sol) actors.push({ id: 's', p: sol, look: sol.look, x: 1040, dir: -1 });
        steps.push({ narr: 'Numa sala escondida do labirinto, Ji-a deu à luz.' + (sol ? ' Ha-ri ficou de guarda na porta o tempo todo.' : '') }, { say: 'm', text: 'Ela nasceu. Aqui. Neste lugar.', expr: 'cry' }, { say: 'p', text: 'Então ela vai sair daqui. Eu prometo.', expr: 'determined' });
        S().flag('baby_born', true);
      } else steps.push({ narr: 'Os que sobreviveram não se olham nos olhos. Todo mundo sabe o que o outro precisou fazer.' });
      return R6.cutscene({ id: 's3_after_hs', title: 'Uma vida nova', stage: 'room', music: 'sad', cam: [760, 400, 1.2], actors, steps, onEnd: next });
    },
    s3Dinner(next) {
      const fin = S().aliveBots().slice(0, 3);
      const actors = [{ id: 'p', look: L.me(), x: 700, dir: 1, anim: 'sit' }, { id: 'fm', look: L.fm(), x: -200, dir: 1 }, { id: 'v1', look: L.vip('deer', 51), x: 1500, z: 0.6, dir: -1 }, { id: 'v2', look: L.vip('eagle', 52), x: 1620, z: 0.6, dir: -1 }];
      const steps = [
        { caption: 'A ÚLTIMA CEIA', sub: 'Os VIPs chegaram para assistir ao final.', dur: 3, big: true },
        { say: 'v1', name: 'VIP', text: 'Aposto tudo no número ' + U.pad(S().s.player.num) + '. Ele tem aquele olhar de quem não desiste.' },
        { say: 'v2', name: 'VIP', text: 'Desistir não é o problema. O problema é o que ele vai ter que fazer para ganhar.' },
        { move: 'fm', to: [560] },
        { say: 'fm', name: 'FRONT MAN', text: 'Você ainda acredita nas pessoas? Depois de tudo o que viu aqui dentro?' },
        { choice: 'O Front Man espera uma resposta.', id: 'believe', opts: [
          { t: '"Acredito. Mesmo aqui, alguém sempre estende a mão."', set: { believes: true }, karma: 1 },
          { t: '"Não. Você venceu. Todo mundo tem um preço."', set: { believes: false } },
        ] },
        { say: 'fm', name: 'FRONT MAN', text: 'Amanhã veremos qual de nós tem razão.' },
        { move: 'fm', to: [-250] },
      ];
      return R6.cutscene({ id: 's3_dinner', title: 'A última ceia', stage: 'vip', music: 'waltz', cam: [900, 400, 1.05], actors, steps, onEnd: next });
    },
    // =============================================================== VICTORY (AAA sequence)
    victory(next) {
      const S0 = S(); const prize = S0.s.prize;
      const money = { on: false };
      const sc1 = R6.cutscene({
        id: 'victory', title: 'O vencedor', stage: 'room', music: null, cam: [700, 420, 1.3], vignette: 0.8,
        stageProps: { back(ctx, cam, t) { const g = ctx.createLinearGradient(0, 0, 0, R6.H); g.addColorStop(0, '#3d6ea8'); g.addColorStop(1, '#dfe9f2'); ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H); ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse((i * 230 + t * 10) % 1500 - 100, 540 + (i % 3) * 40, 160, 30, 0, 0, U.TAU); ctx.fill(); } }, world(ctx) { ctx.fillStyle = '#d9d4c8'; ctx.fillRect(420, 560, 560, 22); ctx.fillStyle = '#2ec4b6'; ctx.fillRect(420, 556, 560, 4); ctx.fillStyle = '#8a93a0'; ctx.fillRect(560, 582, 280, 600); } },
        actors: [{ id: 'p', look: L.me(), x: 700, dir: 1, anim: 'kneel' }, { id: 'g1', look: L.guard('square', 31), x: -100, dir: 1, item: 'rifle' }, { id: 'g2', look: L.guard('circle', 32), x: 1500, dir: -1, item: 'rifle' }],
        drawOverlay: (ctx, sc) => { if (money.on) { sc.fx.emit('money', U.rand(0, 1280), -20, 1); } },
        steps: [
          { stopLoop: 'wind' }, { loop: 'wind', vol: 0.3 },
          { wait: 1.5 }, { narr: 'Silêncio. Só o vento. Você está sozinho no topo da torre do Círculo.' },
          { cam: [700, 380, 1.7], dur: 3, ease: 'inOut' }, { wait: 1 },
          { par: [[{ move: 'g1', to: [520] }], [{ move: 'g2', to: [880] }]] },
          { anim: 'p', name: 'getup', hold: 1 }, { anim: 'p', name: 'idle' },
          { announce: 'Jogador ' + U.pad(S0.s.player.num) + ', vencedor. O prêmio de ' + U.money(prize) + ' será depositado.' },
          { call: () => { money.on = true; R6.Audio.sfx('money'); } }, { music: 'victory' }, { cam: [700, 330, 1.2], dur: 2 },
          { anim: 'p', name: 'look', hold: 2 },
          { say: 'p', text: '…Isso é o preço de todos eles.', expr: 'sad' },
          { call: () => { money.on = false; } }, { music: null },
          { sfx: 'doorSlam' }, { narr: 'Uma porta se abre na lateral da torre. Uma escada desce até o complexo.' },
          { par: [[{ move: 'p', to: [1500] }], [{ cam: [1100, 380, 1], dur: 3 }]] },
        ],
        onEnd: () => R6.Engine.go(sc2, { t: 'fade', dur: 1.2 }),
      });
      const isl = { zoom: 0.8, panX: 0, dawn: 0.3 };
      const sc2 = R6.cutscene({
        id: 'victory2', title: 'A ilha', stage: 'island', music: 'dread', letterbox: 1, stageProps: isl,
        onUpdate: (sc, dt) => { isl.zoom = U.lerp(isl.zoom, 1.6, dt * 0.15); },
        steps: [
          { caption: 'O COMPLEXO', sub: 'Uma ilha inteira construída para um jogo.', dur: 3.6 },
          { wait: 1.5 },
          { narr: 'Você nunca tinha visto de fora. Os prédios pastel. As torres. O porto. Tudo cercado por mar.' },
        ],
        onEnd: () => R6.Engine.go(sc3, { t: 'fade', dur: 1 }),
      });
      const sc3 = R6.cutscene({
        id: 'victory3', title: 'Ainda observado', stage: 'office', music: 'dread', cam: [900, 380, 1.2],
        actors: [{ id: 'fm', look: L.fm(), x: 900, dir: -1, view: 'back' }],
        drawOverlay: (ctx) => { R6.UI.text(ctx, 'CAM 07 · ALVO: ' + U.pad(S0.s.player.num), 40, 60, { size: 16, fam: 'mono', color: '#9f9' }); },
        steps: [
          { narr: 'Em uma sala cheia de monitores, alguém assiste você descer a escada.' },
          { say: 'fm', name: 'FRONT MAN', text: 'O vencedor não pode sair sabendo o que sabe. Não dessa vez.' },
          { say: { name: 'RÁDIO', look: L.guard('square', 5) }, name: 'RÁDIO', text: 'Entendido. Vamos buscá-lo no ponto de saída.' },
          { cam: [900, 380, 1.6], dur: 1.5 },
          { narr: 'Você ouve o rádio de um guarda no corredor. Eles não vão te deixar ir. Você corre.' },
        ],
        onEnd: next,
      });
      return sc1;
    },
  };
  Story.chain = chain;
  R6.Story = Story;
})();
