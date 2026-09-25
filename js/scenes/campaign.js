/* ROUND 6 — campaign.js : the campaign director — chapters for seasons 1-3, branching, checkpoints, retries, season select */
'use strict';
(function () {
  const U = R6.U;
  const S = () => R6.State;
  const go = (sc, t) => R6.Engine.go(sc, { t: t || 'fade', dur: t === 'view' ? 2.1 : t === 'iris' ? 1.4 : 1.1 });
  const TS = 32;

  function game(id, opts, t) {
    return (next) => { R6.Save.unlockGame(id); const sc = R6.Games[id].create(Object.assign({ mode: 'campaign', onWin: (sum) => next(sum) }, opts || {})); go(sc, t); };
  }
  function hub(cfg) { return (next) => { const h = new R6.HubScene(Object.assign({}, typeof cfg === 'function' ? cfg() : cfg, { onDone: r => next(r) })); go(h, 'fade'); }; }
  function cut(fn) { return (next) => { const sc = fn(next); if (sc) go(sc, 'fade'); }; }

  // hub talk overrides: key characters give hints / story lines
  function keyTalk(map) {
    return (h, a, again) => {
      const p = a.p; if (!p.key || !map[p.key]) return null;
      const f = map[p.key]; const r = typeof f === 'function' ? f(h, p, again) : f;
      if (!r) return null; return (Array.isArray(r) ? r : [r]).map(x => typeof x === 'string' ? { who: p, text: x } : Object.assign({ who: p }, x));
    };
  }

  const CH = [
    // ============================================================ SEASON 1
    { id: 's1_intro', season: 1, run: cut(n => R6.Story.s1Intro(n)) },
    { id: 'g_ddakji', season: 1, run: game('ddakji', { variant: 'recruiter' }) },
    { id: 's1_card', season: 1, run: cut(n => R6.Story.s1Card(n)) },
    { id: 'h1_arrival', season: 1, run: hub({ id: 'h1a', season: 1, title: 'DORMITÓRIO · DIA 1', intro: h => R6.Story.hubWakeS1(h), tasks: [{ id: 'talk_any', text: 'Converse com alguém' }], minTime: 20, events: 1,
      talk: keyTalk({ oldman: ['Eu tenho um tumor aqui dentro, sabia? Prefiro jogar a esperar a morte em casa. Ha!', { text: 'Fique perto de mim, jovem. Eu dou sorte.', expr: 'happy' }], schemer: 'Minha mãe acha que eu sou um executivo de sucesso em Nova York. Não conta pra ela.', thief: 'Você tem cara de quem confia em qualquer um. Aqui dentro isso mata.', worker: 'Meu patrão não me paga há seis meses. Tenho mulher e um filho pequeno.' }) }) },
    { id: 'g_redlight', season: 1, run: game('redlight', { variant: 's1' }, 'iris') },
    { id: 'h1_vote', season: 1, run: hub({ id: 'h1v', season: 1, title: 'DORMITÓRIO · A VOTAÇÃO', intro: h => R6.Story.hubAfterRL(h), voteAfter: 35, vote: Object.assign({}, R6.VOTES.v1), askIntent: true, events: 0, minTime: 0, noLeave: true }) },
    { id: 's1_home', season: 1, when: () => S().flag('v1_result') === 'X', run: cut(n => R6.Story.s1Home(() => { R6.returnAfterLeave(); n(); }, () => endingThenCredits('comum'))) },
    { id: 'h1_day2', season: 1, run: hub(() => ({ id: 'h1d2', season: 1, title: 'DORMITÓRIO · DIA 2', meal: true, events: 3, minTime: 30,
      tasks: [{ id: 'talk_any', text: 'Converse com alguém' }, { id: 'lighter', text: '(opcional) Algo brilha debaixo de um beliche…', optional: true }],
      items: [{ id: 'lighter', x: 50.5 * TS, y: 23.5 * TS, onTake: h => h.completeTask('lighter') }],
      rumors: ['Um dos jogadores viu os guardas carregando caixas de açúcar e agulhas.', 'Tem gente que prefere formas simples. Sabe-se lá por quê.'], rumorFlag: 'hint_dalgona',
      talk: keyTalk({ schemer: (h, p) => p.rel >= 20 || R6.State.has('bread') === false && p.rel >= 10 ? [{ text: '(baixo) Eu vi os guardas cozinhando açúcar. O próximo jogo tem a ver com doce. Escolha o formato mais simples.', expr: 'neutral' }, { text: 'Não conta pra ninguém.', expr: 'neutral' }].map(x => (R6.State.flag('hint_dalgona', true), x)) : ['Eu estou pensando. Me deixa pensar.'], oldman: 'Quando eu era criança, a gente brincava de tudo isso na rua. Até escurecer.', thief: 'Não me olha assim. Eu sei me virar sozinha.' }) })) },
    { id: 'g_dalgona', season: 1, run: game('dalgona', {}, 'iris') },
    { id: 'h1_night', season: 1, run: hub({ id: 'h1n', season: 1, title: 'DORMITÓRIO · NOITE 2', night: true, riot: true, events: 0, minTime: 0, noLeave: true,
      intro: h => [{ caption: 'A NOITE DO MOTIM', sub: 'Pouca comida. Muito medo. As luzes vão se apagar.', dur: 3.2, big: true }, { narr: 'Os mais fortes decidiram que, se menos gente acordar amanhã, o prêmio de cada um aumenta.' }],
      afterRiot: h => h.done({}) }) },
    { id: 'h1_tug', season: 1, run: hub({ id: 'h1t', season: 1, title: 'DORMITÓRIO · MANHÃ', events: 1, minTime: 20, tasks: [{ id: 'talk_any', text: 'Converse com alguém sobre as equipes' }],
      intro: h => [{ announce: 'Formem equipes de 10 jogadores. O próximo jogo é em equipe.' }, { narr: 'Todos procuram os mais fortes. Ninguém quer mulheres ou velhos no time.' }],
      talk: keyTalk({ oldman: () => { R6.State.flag('hint_tug', true); return [{ text: 'Cabo de guerra não é só força, sabia? No começo, segurem firme e deitem o corpo para trás.', expr: 'happy' }, { text: 'E quando o outro time ficar desequilibrado… três passos à frente, todos juntos. Eles caem sozinhos.', expr: 'happy' }]; }, schemer: 'Se for força, a gente perde. Precisamos de estratégia.' }) }) },
    { id: 'g_tug', season: 1, run: game('tugofwar', {}, 'view') },
    { id: 'h1_after_tug', season: 1, run: hub({ id: 'h1at', season: 1, title: 'DORMITÓRIO · DIA 4', events: 2, minTime: 25, tasks: [{ id: 'talk_any', text: 'Converse com alguém' }],
      talk: keyTalk({ oldman: 'Você tem um amigo aqui dentro? Um de verdade? Na minha época a gente chamava de kkanbu.', worker: 'Obrigado por não me deixar sozinho lá. Obrigado.' }) }) },
    { id: 'g_marbles', season: 1, run: game('marbles', {}, 'view') },
    { id: 'h1_glass', season: 1, run: hub({ id: 'h1g', season: 1, title: 'DORMITÓRIO · DIA 5', events: 1, minTime: 20, tasks: [{ id: 'talk_any', text: 'Converse com alguém' }],
      talk: keyTalk({ glass: () => { R6.State.flag('hint_glass', true); return [{ text: 'Eu trabalhei 30 anos numa fábrica de vidro. Vidro temperado e vidro comum refletem a luz de um jeito diferente.' }, { text: 'Se houver luz forte, eu consigo ver. Se apagarem as luzes… aí é sorte.' }]; } }) }) },
    { id: 'g_glass', season: 1, run: game('glassbridge', {}, 'view') },
    { id: 's1_dinner', season: 1, run: cut(n => R6.Story.s1Dinner(n)) },
    { id: 'g_squid', season: 1, when: () => !S().flag('s1_clause3'), run: game('squidfinal', {}, 'fade') },
    { id: 's1_clause3', season: 1, when: () => !!S().flag('s1_clause3'), run: cut(n => R6.Story.s1Clause3End(n)) },
    { id: 's1_end', season: 1, run: cut(n => R6.Story.s1End(n)) },
    // ============================================================ SEASON 2
    { id: 's2_season', season: 2, run: (next) => { startSeason(2); go(R6.Story.s2Intro(next), 'fade'); } },
    { id: 'g_bread', season: 2, run: game('breadlottery') },
    { id: 'g_rps', season: 2, run: game('rps', { variant: 'roulette' }) },
    { id: 's2_arrival', season: 2, run: cut(n => R6.Story.s2Arrival(n)) },
    { id: 'h2_arrival', season: 2, run: hub({ id: 'h2a', season: 2, title: 'TEMPORADA 2 · DIA 1', intro: h => R6.Story.hubWakeS2(h), events: 1, minTime: 25, tasks: [{ id: 'talk_any', text: 'Converse com alguém' }],
      talk: keyTalk({ buddy: 'Lembra quando a gente roubava pêssegos da feira? Parecia o fim do mundo levar bronca.', fm001: 'Estou aqui pela minha filha. Tratamento caro. E você? Você já esteve aqui antes, não esteve?', soldier: 'Se precisar de alguém que saiba lutar, sabe onde me achar.', mother: 'Por favor, não conta pra ninguém que eu estou grávida.', crypto: 'Ei, ei. Se você souber alguma coisa sobre os jogos, a gente divide a informação, beleza?' }) }) },
    { id: 'g_redlight2', season: 2, run: game('redlight2', { variant: 's2' }, 'iris') },
    { id: 'h2_vote1', season: 2, run: hub({ id: 'h2v1', season: 2, title: 'VOTAÇÃO', voteAfter: 30, askIntent: true, vote: Object.assign({}, R6.VOTES.v2_1), noLeave: true, events: 0, minTime: 0,
      intro: h => R6.Story.hubAfterRL(h) }) },
    { id: 's2_exodo', season: 2, when: () => S().flag('v2_1_result') === 'X' && S().flag('exodo'), run: () => endingThenCredits('exodo') },
    { id: 'h2_day', season: 2, run: hub({ id: 'h2d', season: 2, title: 'O CONTRA X', meal: true, events: 3, minTime: 30, tasks: [{ id: 'talk_any', text: 'Converse com seus aliados' }],
      talk: keyTalk({ fm001: 'Os do X estão ficando nervosos. Fique perto de mim hoje à noite.', soldier: 'O grupo do O está afiando colheres. Não durma.' }) }) },
    { id: 'g_sixlegs', season: 2, run: game('sixlegs', {}, 'view') },
    { id: 'h2_vote2', season: 2, run: hub({ id: 'h2v2', season: 2, title: 'VOTAÇÃO', voteAfter: 25, askIntent: true, vote: Object.assign({}, R6.VOTES.v2_2), noLeave: true, events: 0, minTime: 0 }) },
    { id: 'g_mingle', season: 2, run: game('mingle', {}, 'iris') },
    { id: 'h2_vote3', season: 2, run: hub({ id: 'h2v3', season: 2, title: 'A ÚLTIMA VOTAÇÃO', voteAfter: 25, askIntent: true, vote: Object.assign({}, R6.VOTES.v2_3, { after: (h, res) => h.run(R6.Story.s2RevoltPlan(h), () => h.done({ vote: res })) }), noLeave: true, events: 0, minTime: 0 }) },
    { id: 'g_revolt', season: 2, run: game('revolt', {}, 'iris') },
    { id: 's2_end', season: 2, run: cut(n => { revoltConsequences(); return R6.Story.s2End(n); }) },
    // ============================================================ SEASON 3
    { id: 's3_season', season: 3, run: (next) => { startSeason(3); go(R6.Story.s3Intro(next), 'fade'); } },
    { id: 'h3_1', season: 3, run: hub({ id: 'h3a', season: 3, title: 'TEMPORADA 3 · DIA 1', night: true, events: 1, minTime: 20, tasks: [{ id: 'talk_any', text: 'Converse com alguém' }],
      talk: keyTalk({ soldier: 'Não foi culpa sua. Eles sabiam de tudo desde o começo.', mother: 'Está chegando a hora. Eu sinto. E se nascer aqui dentro?', crypto: 'Eu… eu não tive nada a ver com a traição, tá? Eu nem estava lá.' }) }) },
    { id: 'g_hideseek', season: 3, run: game('hideseek', {}, 'iris') },
    { id: 's3_early', season: 3, when: () => !!S().flag('early_escape'), run: () => endingThenCredits('fuga', true) },
    { id: 's3_after_hs', season: 3, run: cut(n => R6.Story.s3AfterHS(n)) },
    { id: 'h3_2', season: 3, run: hub({ id: 'h3b', season: 3, title: 'TEMPORADA 3 · DIA 2', events: 2, minTime: 20, tasks: [{ id: 'talk_any', text: 'Converse com alguém' }] }) },
    { id: 'g_jumprope', season: 3, run: game('jumprope', {}, 'view') },
    { id: 's3_dinner', season: 3, run: cut(n => R6.Story.s3Dinner(n)) },
    { id: 'g_skysquid', season: 3, run: game('skysquid', {}, 'view') },
    { id: 'victory', season: 3, run: cut(n => R6.Story.victory(n)) },
    { id: 'g_escape', season: 3, run: game('escape', {}, 'iris') },
    { id: 'ending', season: 3, run: (next, res) => { const id = R6.Endings.pick(res && res.route); R6.Endings.play(id, next); } },
    { id: 'winner', season: 3, run: (next) => go(R6.WinnerScene(next), 'fade') },
    { id: 'farewell', season: 3, run: (next) => go(R6.FarewellScene(next), 'fade') },
    { id: 'credits', season: 3, run: (next) => { completeCampaign(); go(R6.CreditsScene(() => { R6.Save.clearCampaign(); go(R6.MenuScene(), 'fade'); }), 'fade'); } },
  ];

  function endingThenCredits(id, winnerScreen) {
    R6.Endings.play(id, () => {
      const after = () => go(R6.CreditsScene(() => { R6.Save.clearCampaign(); go(R6.MenuScene(), 'fade'); }), 'fade');
      if (winnerScreen) go(R6.WinnerScene(() => after()), 'fade'); else after();
    });
  }
  function completeCampaign() { const m = R6.Save.meta; m.seasonsUnlocked = 3; for (const id in R6.Games) m.gamesUnlocked[id] = true; m.campaignDone = (m.campaignDone || 0) + 1; R6.Save.saveMeta(); }

  function startSeason(n) {
    const s = S().s; s.season = n; s.day = 1;
    if (n === 2) { s.flags.badge = null; S().buildRoster(2); R6.Elim.reset(); }
    if (n === 3) { /* roster continues from season 2 */ }
    R6.Save.meta.seasonsUnlocked = Math.max(R6.Save.meta.seasonsUnlocked, n); R6.Save.saveMeta();
  }
  function revoltConsequences() {
    const st = S();
    // the failed revolt: many rebels (X voters) are executed; trusting #001 costs more lives
    const susp = st.flag('suspect_001');
    for (const p of st.aliveBots()) { if (p.key) continue; if (p.lastVote === 'X' && Math.random() < (susp ? 0.45 : 0.7)) R6.Elim.kill(p, { cause: 'revolt', silent: true }); }
    if (!susp && st.keyAlive('marine')) R6.Elim.kill(st.byKey('marine'), { cause: 'revolt', silent: true, noCard: true });
    if (!susp && st.keyAlive('soldier') && Math.random() < 0.5) { R6.Elim.kill(st.byKey('soldier'), { cause: 'revolt', silent: true, noCard: true }); }
    if (st.keyAlive('fm001')) { const p = st.byKey('fm001'); p.alive = false; p.cause = 'frontman'; st.alive--; } // the infiltrator simply leaves the game
    // ensure a sensible number of players for season 3
    const bots = st.aliveBots().filter(p => !p.key);
    while (bots.length > 58) { const p = bots.splice(Math.floor(Math.random() * bots.length), 1)[0]; R6.Elim.kill(p, { silent: true }); }
  }

  const Campaign = {
    CH,
    idx: 0,
    start(profile) {
      S().newGame(profile); R6.Elim.reset();
      Campaign.run(0);
    },
    run(i, res) {
      // skip chapters whose condition is false
      while (i < CH.length && CH[i].when && !CH[i].when()) i++;
      if (i >= CH.length) { go(R6.MenuScene(), 'fade'); return; }
      Campaign.idx = i; S().s.chapter = i;
      const ch = CH[i];
      S().checkpoint(ch.id);
      R6.Elim.reset();
      try { ch.run((r) => Campaign.next(r), res); } catch (e) { R6.Engine.reportError(e); }
    },
    next(res) {
      const cur = CH[Campaign.idx];
      // S2 vote 1: a decisive X means the exodus ending
      if (cur && cur.id === 'h2_vote1' && S().flag('v2_1_result') === 'X') S().flag('exodo', true);
      Campaign.run(Campaign.idx + 1, res);
    },
    retry() {
      if (!S().reloadCheckpoint()) { go(R6.MenuScene(), 'fade'); return; }
      R6.Elim.reset();
      const i = S().s.chapter || 0;
      Campaign.idx = i;
      try { CH[i].run(r => Campaign.next(r)); } catch (e) { R6.Engine.reportError(e); }
    },
    continueSave() {
      const d = R6.Save.readCampaign(); if (!d) return false;
      S().restore(d.state); R6.Elim.reset(); S().lastCheckpoint = d;
      const i = d.state.chapter || 0; Campaign.idx = i;
      try { CH[i].run(r => Campaign.next(r)); } catch (e) { R6.Engine.reportError(e); }
      return true;
    },
    // start a campaign directly at a season (season select) with plausible prior history
    startSeason(n, profile) {
      S().newGame(profile);
      const st = S();
      if (n >= 2) {
        st.s.flags.s1_winner = true; st.s.player.gamesWon = 6; st.s.player.money = 45.6e9;
        startSeason(2);
      }
      if (n >= 3) {
        startSeason(3);
        // simulate season 2 results
        for (const p of st.aliveBots()) { if (p.key === 'fm001') { p.alive = false; st.alive--; continue; } if (!p.key && Math.random() < 0.86) R6.Elim.kill(p, { silent: true }); }
        if (st.keyAlive('buddy') && Math.random() < 0.5) st.byKey('buddy').alive = false;
        st.recount(); st.s.flags.revolt_reached = true;
      }
      R6.Elim.reset();
      const id = n === 1 ? 's1_intro' : n === 2 ? 's2_season' : 's3_season';
      const i = CH.findIndex(c => c.id === id);
      if (n >= 2) { Campaign.idx = i; st.s.chapter = i; st.checkpoint(id); CH[i].run = CH[i].run; if (n === 2) { go(R6.Story.s2Intro(() => Campaign.next()), 'fade'); } else { go(R6.Story.s3Intro(() => Campaign.next()), 'fade'); } return; }
      Campaign.run(i);
    },
    chapterName(i) { const c = CH[i]; return c ? c.id : '?'; },
  };
  R6.Campaign = Campaign;
})();
