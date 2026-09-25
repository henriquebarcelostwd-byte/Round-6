// Full campaign flow test: menu -> creation -> every chapter (auto-skipping cutscenes, auto-winning games, auto-answering
// dialogues) -> ending -> winner -> credits -> menu. Reports chapter log, stuck chapters and errors.
// usage: node tools/flow.js [choiceMode] [maxSeconds] [startSeason]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SP = process.env.SP || '/tmp/claude-0/-home-user-Round-6/36a89ddc-d78b-5201-b254-ec17b9a7edd4/scratchpad';
const mode = process.argv[2] || 'first';
const maxS = +(process.argv[3] || 600);
const season = +(process.argv[4] || 1);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('Failed to load resource') && !t.includes('fonts.g')) errs.push(m.type() + ': ' + t); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) { } R6.Save.loadMeta(); R6.Save.meta.seasonsUnlocked = 3; });
  await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  // go to creation (NOVO JOGO) or season select
  await p.evaluate(s => R6.Engine.go(R6.CreationScene({ season: s }), { t: 'cut' }), season);
  await p.waitForTimeout(500);
  // move to "ASSINAR O CONTRATO" (last item) and confirm
  await p.evaluate(() => { const sc = R6.Engine.scene; sc.menu.i = sc.menu.items.length - 1; sc.menu.choose(); });
  await p.waitForTimeout(2500);
  await p.evaluate(([mode, HOLD]) => {
    const A = window.__auto = { log: [], lastCh: null, choices: [], stuck: 0, lastT: Date.now(), done: false, mode, hold: HOLD };
    const pick = (cur) => {
      const cs = cur.choices; let i = 0;
      if (A.mode === 'random') i = Math.floor(Math.random() * cs.length);
      else if (A.mode === 'last') i = cs.length - 1;
      while (cs[i] && cs[i].disabled) i = (i + 1) % cs.length;
      A.choices.push((R6.Campaign.CH[R6.Campaign.idx] || {}).id + ': ' + String(cur.text).slice(0, 50) + ' => ' + cs[i].t);
      return cs[i];
    };
    setInterval(() => {
      try {
        const E = R6.Engine, sc = E.scene, D = R6.Dialog;
        if (!sc || E.trans || E.paused) return;
        const ch = R6.Campaign.active ? (R6.Campaign.CH[R6.Campaign.idx] || {}).id : 'menu';
        const key = ch + '|' + sc.name;
        if (key !== A.lastCh) { A.log.push(key + ' [alive ' + R6.State.alive + ']'); A.lastCh = key; A.lastT = Date.now(); }
        if (sc.name === 'menu' && A.log.length > 3) { A.done = true; return; }
        if (A.hold && Date.now() - A.lastT < A.hold) return;
        if (sc.name === 'defeatMenu') { A.log.push('DEFEAT!'); A.done = true; return; }
        if (D.active && D.cur) { if (D.cur.choices) D.finish(pick(D.cur)); else if (!D.cur.auto) D.finish(); return; }
        if (sc.runner && sc.runner.skip && !sc.runner.skipping) { sc.runner.skip(); }
        if (sc instanceof R6.GameBase) { if (!sc.result && !sc.__won) { sc.__won = true; setTimeout(() => { if (R6.Engine.scene !== sc) return; if (sc.phase === 'rules' && sc.rules && sc.rules()) R6.debug.skipRules(); R6.debug.win(); }, 700); } return; }
        if (R6.HubScene && sc instanceof R6.HubScene) {
          if (sc.runner) return;
          if (sc.preVote) sc.preVote.t = 0;
          if (sc.riot) { sc.riot.t = sc.riot.dur + 1; return; }
          if (sc.vote) { sc.vote.speed = 0.005; return; }
          sc.tasks.forEach(t => t.done = true); sc.t = Math.max(sc.t, 999);
          if (sc.leaving) sc.done({});
          return;
        }
        if (sc.name === 'winner') { sc.t = Math.max(sc.t, 15); return; }
        if (sc.name === 'credits') { sc.y = -99999; return; }
      } catch (e) { A.log.push('DRIVER ERR ' + e.message); }
    }, 200);
  }, [mode, +(process.env.HOLD || 0)]);
  const t0 = Date.now(); let lastLen = 0, lastChange = Date.now(), shots = 0;
  while (Date.now() - t0 < maxS * 1000) {
    await p.waitForTimeout(1000);
    const st = await p.evaluate(() => ({ n: __auto.log.length, last: __auto.lastCh, done: __auto.done }));
    if (st.n !== lastLen) { lastLen = st.n; lastChange = Date.now(); if (process.env.SHOTS) { await p.waitForTimeout(+(process.env.SHOTDELAY || 700)); await p.screenshot({ path: SP + '/flow_' + String(shots++).padStart(2, '0') + '_' + st.last.replace(/[^a-z0-9_]/gi, '_') + '.png' }); } }
    if (st.done) break;
    if (Date.now() - lastChange > 45000) {
      await p.screenshot({ path: SP + '/flow_stuck.png' });
      const info = await p.evaluate(() => { const sc = R6.Engine.scene; return { scene: sc && sc.name, phase: sc && sc.phase, dlg: R6.Dialog.active && R6.Dialog.cur && String(R6.Dialog.cur.text).slice(0, 80), trans: !!R6.Engine.trans, runner: !!(sc && sc.runner), leaving: sc && sc.leaving, vote: !!(sc && sc.vote), result: sc && sc.result }; });
      console.log('STUCK', JSON.stringify(info)); break;
    }
  }
  const res = await p.evaluate(() => ({ log: __auto.log, choices: __auto.choices, errors: R6.Engine.errors.slice(0, 6), endings: R6.Save.meta.endings, state: R6.State.s && { season: R6.State.s.season, prize: R6.State.s.prize, alive: R6.State.alive, flags: Object.keys(R6.State.s.flags).join(',') } }));
  console.log(JSON.stringify({ secs: Math.round((Date.now() - t0) / 1000), ...res, errs: errs.slice(0, 12) }, null, 1));
  await b.close();
})();
