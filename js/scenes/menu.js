/* ROUND 6 — menu.js : animated dormitory backdrop (bunk towers, hanging piggy bank filling with money, guards, participants,
   flickering lamps, dust, falling bills), the title screen and the main menu; shared frame for the meta screens */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const BGW = 2400;

  // ------------------------------------------------ static painted dorm layer (cached)
  function paintDorm(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#141d21'); g.addColorStop(0.55, '#1f2c30'); g.addColorStop(1, '#263337');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // faint pastel stairs on the far wall (the maze of stairs above the dorm)
    const r = new U.RNG(456);
    const cols = ['#f4b6c8', '#a9d8e8', '#f7df8e', '#b8e0b0'];
    for (let k = 0; k < 9; k++) {
      let x = k * 280 + r.int(0, 60), y = r.int(30, 120); const dir = r.chance(0.5) ? 1 : -1; const n = r.int(5, 9);
      c.globalAlpha = 0.1;
      for (let i = 0; i < n; i++) { c.fillStyle = cols[(k + i) % 4]; c.fillRect(x, y, 26, 10); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y + 10, 26, 3); x += 22 * dir; y += 9; }
      c.globalAlpha = 1;
    }
    // bunk towers: far row then near row
    const drawTower = (x, base, s, dark) => {
      const lv = 6, lh = 70 * s, tw = 150 * s, top = base - lv * lh;
      const post = U.shade('#8f9aa3', -dark), postHi = U.shade('#b7c1c8', -dark);
      for (let i = 0; i < lv; i++) {
        const y = top + i * lh;
        // bed platform
        c.fillStyle = U.shade('#6f7a82', -dark); c.fillRect(x, y + lh - 10 * s, tw, 10 * s);
        c.fillStyle = U.shade('#dfe3e0', -dark); c.fillRect(x + 4 * s, y + lh - 22 * s, tw - 8 * s, 12 * s);
        // occupant: pillow + head + blanket mound (some beds empty)
        if (r.chance(0.62)) {
          c.fillStyle = U.shade('#f4f4ef', -dark); c.fillRect(x + 8 * s, y + lh - 30 * s, 22 * s, 9 * s);
          c.fillStyle = U.shade(U.pick(R6.Char.SKINS.slice(0, 6)), -dark); c.beginPath(); c.arc(x + 22 * s, y + lh - 30 * s, 7 * s, 0, TAU); c.fill();
          c.fillStyle = U.shade('#1d1612', -dark); c.beginPath(); c.arc(x + 22 * s, y + lh - 33 * s, 7 * s, Math.PI, TAU); c.fill();
          c.fillStyle = U.shade('#2b7d71', -dark); c.beginPath(); c.moveTo(x + 30 * s, y + lh - 22 * s); c.quadraticCurveTo(x + 70 * s, y + lh - 42 * s, x + tw - 14 * s, y + lh - 22 * s); c.closePath(); c.fill();
        } else if (r.chance(0.5)) { c.fillStyle = U.shade('#2b7d71', -dark - 0.1); c.fillRect(x + 50 * s, y + lh - 26 * s, 40 * s, 5 * s); }
      }
      // posts, rails & ladder
      c.fillStyle = post; c.fillRect(x - 4 * s, top - 8 * s, 7 * s, base - top + 8 * s); c.fillRect(x + tw - 3 * s, top - 8 * s, 7 * s, base - top + 8 * s);
      c.fillStyle = postHi; c.fillRect(x - 3 * s, top - 8 * s, 2 * s, base - top + 8 * s);
      for (let i = 0; i <= lv; i++) { c.fillStyle = post; c.fillRect(x - 4 * s, top + i * lh - 12 * s, tw + 8 * s, 4 * s); }
      const lx = x + tw + 6 * s;
      c.fillStyle = post; c.fillRect(lx, top, 3 * s, base - top); c.fillRect(lx + 16 * s, top, 3 * s, base - top);
      for (let y = top + 10 * s; y < base; y += 16 * s) c.fillRect(lx, y, 19 * s, 2.5 * s);
    };
    for (let x = -40; x < w; x += 170) drawTower(x, 520, 0.62, 0.35);
    // haze between rows
    c.fillStyle = 'rgba(20,29,33,.55)'; c.fillRect(0, 0, w, 540);
    for (let x = 20; x < w; x += 250) drawTower(x, 612, 1, 0.08);
    // floor
    const fg = c.createLinearGradient(0, 600, 0, h); fg.addColorStop(0, '#4a4640'); fg.addColorStop(1, '#2a2723');
    c.fillStyle = fg; c.fillRect(0, 606, w, h - 606);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
    for (let y = 620; y < h; y += 18 + (y - 600) * 0.12) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 606); c.lineTo(x + (x % 128 ? -20 : 20), h); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 604, w, 4);
  }

  // ------------------------------------------------ animated background
  class MenuBG {
    constructor() {
      this.t = 0; this.fx = new R6.Particles(260); this.bills = []; this.flick = [1, 1, 1, 1, 1, 1];
      this.dust = Array.from({ length: 60 }, () => ({ x: U.rand(0, R6.W), y: U.rand(0, R6.H), v: U.rand(4, 14), p: U.rand(0, TAU) }));
      this.walkers = [];
      const r = new U.RNG(2024);
      const add = (o) => this.walkers.push(Object.assign({ x: r.range(0, BGW), dir: r.chance(0.5) ? 1 : -1, sp: r.range(26, 46), anim: 'walk', t0: r.range(0, 10) }, o));
      for (let i = 0; i < 9; i++) { const num = r.int(2, 455); add({ look: R6.Char.makeLook({ num, seed: 300 + i }, r), y: r.range(632, 700), s: r.range(0.95, 1.2) }); }
      for (let i = 0; i < 5; i++) { const num = r.int(2, 455); add({ look: R6.Char.makeLook({ num, seed: 400 + i }, r), y: r.range(606, 618), s: r.range(0.6, 0.7) }); }
      // groups that stand still
      const a = R6.Char.makeLook({ num: 212, seed: 81 }, r), b = R6.Char.makeLook({ num: 67, seed: 82 }, r);
      add({ look: a, x: 700, y: 660, s: 1.05, anim: 'talk', dir: 1, sp: 0, still: true }); add({ look: b, x: 760, y: 662, s: 1.02, anim: 'argue', dir: -1, sp: 0, still: true });
      add({ look: R6.Char.makeLook({ num: 1, age: 2, hs: 'perm', hair: '#a9a6a0', seed: 83 }, r), x: 1500, y: 668, s: 1.0, anim: 'sitSad', dir: 1, sp: 0, still: true });
      add({ look: R6.Char.makeLook({ num: 199, seed: 84 }, r), x: 1180, y: 650, s: 1.0, anim: 'look', dir: 1, sp: 0, still: true, view: 'back' });
      // guards patrol with rifles
      ['circle', 'triangle', 'square'].forEach((m, i) => add({ look: R6.Char.makeLook({ outfit: 'guard', mask: m, seed: 90 + i }), y: 646 + i * 18, s: 1.08, sp: 24, item: 'rifle', guard: true, x: 400 + i * 800 }));
      this.walkers.sort((p, q) => p.y - q.y);
    }
    update(dt) {
      this.t += dt; this.fx.update(dt);
      for (const w of this.walkers) {
        if (w.still) continue;
        if (w.pause > 0) { w.pause -= dt; if (w.pause <= 0) w.dir *= -1; continue; }
        w.x += w.dir * w.sp * dt;
        if (w.x < -100) w.x += BGW + 200; if (w.x > BGW + 100) w.x -= BGW + 200;
        if (w.guard && Math.random() < dt * 0.05) w.pause = U.rand(1.5, 3.5);
      }
      for (let i = 0; i < this.flick.length; i++) { if (Math.random() < dt * 0.08) this.flick[i] = U.rand(0.1, 0.5); this.flick[i] = U.approach(this.flick[i], 1, dt * 2.5); }
      // bills falling into the piggy bank
      if (Math.random() < dt * 5) this.bills.push({ x: U.rand(-40, 40), y: -40, vy: U.rand(90, 140), r: U.rand(0, TAU), vr: U.rand(-3, 3) });
      for (const b of this.bills) { b.y += b.vy * dt; b.r += b.vr * dt; b.x += Math.sin(this.t * 3 + b.r) * 10 * dt; }
      this.bills = this.bills.filter(b => b.y < 150);
      if (Math.random() < dt * 0.9) this.fx.emit('money', U.rand(0, R6.W), -20, 1);
      for (const d of this.dust) { d.y += d.v * dt * 0.3; d.x += Math.sin(this.t * 0.5 + d.p) * 6 * dt; if (d.y > R6.H) { d.y = -5; d.x = U.rand(0, R6.W); } }
    }
    draw(ctx, o = {}) {
      const t = this.t;
      const img = R6.Env.cached('menu_dorm', BGW, R6.H, paintDorm);
      const off = (t * 9) % BGW;
      ctx.drawImage(img, -off, 0); ctx.drawImage(img, BGW - off, 0);
      // piggy bank (fixed focal point) with money stream
      const px = o.pigX || 900, py = 250 + Math.sin(t * 0.7) * 4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(px, py, 20, px, py, 320); gl.addColorStop(0, 'rgba(255,205,110,.28)'); gl.addColorStop(1, 'rgba(255,205,110,0)');
      ctx.fillStyle = gl; ctx.fillRect(px - 320, py - 320, 640, 640);
      ctx.restore();
      ctx.strokeStyle = '#7a8088'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, -10); ctx.lineTo(px, py - 72); ctx.stroke();
      for (const b of this.bills) { ctx.save(); ctx.translate(px + b.x * 0.4, b.y + py - 200); ctx.rotate(b.r); ctx.fillStyle = '#e1c46e'; ctx.fillRect(-9, -4, 18, 8); ctx.fillStyle = '#b89a45'; ctx.fillRect(-3, -3, 6, 6); ctx.restore(); }
      const fill = U.clamp(0.3 + (R6.Save.meta.totalEarned || 0) / 6000, 0.3, 0.95);
      R6.Props.piggy(ctx, px, py, 68, fill, t, { cable: 0 });
      // ceiling lamps & light cones
      for (let i = 0; i < 6; i++) {
        const lx = 110 + i * 215, k = this.flick[i];
        ctx.fillStyle = U.rgba('#fff8e0', 0.5 + k * 0.5); ctx.fillRect(lx - 34, 14, 68, 6);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 * k;
        const cg = ctx.createLinearGradient(0, 20, 0, 700); cg.addColorStop(0, '#fff3cf'); cg.addColorStop(1, 'rgba(255,243,207,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(lx - 34, 20); ctx.lineTo(lx + 34, 20); ctx.lineTo(lx + 170, 700); ctx.lineTo(lx - 170, 700); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // walkers (world scrolls slightly faster than the backdrop: parallax)
      const woff = (t * 12.5) % BGW;
      for (const w of this.walkers) {
        let x = w.x - woff; if (x < -120) x += BGW; if (x < -120 || x > R6.W + 120) continue;
        const moving = !w.still && !(w.pause > 0);
        R6.Char.draw(ctx, w.look, x, w.y, { view: w.view || 'side', dir: w.dir, anim: moving ? 'walk' : w.anim === 'walk' ? 'idle' : w.anim, t: t + w.t0, scale: w.s, item: w.item, shadowA: 0.35 });
      }
      this.fx.draw(ctx);
      // dust motes in the light
      ctx.fillStyle = 'rgba(255,245,220,.35)';
      for (const d of this.dust) { ctx.globalAlpha = 0.2 + Math.sin(t + d.p) * 0.15; ctx.fillRect(d.x, d.y, 2, 2); }
      ctx.globalAlpha = 1;
      if (o.dim) { ctx.fillStyle = 'rgba(4,5,8,' + o.dim + ')'; ctx.fillRect(0, 0, R6.W, R6.H); }
      if (o.leftShade !== false) {
        const lg = ctx.createLinearGradient(0, 0, 640, 0); lg.addColorStop(0, 'rgba(4,5,8,.88)'); lg.addColorStop(0.7, 'rgba(4,5,8,.35)'); lg.addColorStop(1, 'rgba(4,5,8,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, 640, R6.H);
      }
      R6.UI.vignette(ctx, 0.75);
    }
  }
  R6.MenuBG = MenuBG;
  R6.menuBG = () => (R6._menuBG = R6._menuBG || new MenuBG());

  // ------------------------------------------------ campaign chapter labels (continue card, pause menu)
  const G = { g_ddakji: 'ddakji', g_redlight: 'redlight', g_dalgona: 'dalgona', g_tug: 'tugofwar', g_marbles: 'marbles', g_glass: 'glassbridge', g_squid: 'squidfinal', g_bread: 'breadlottery', g_rps: 'rps', g_redlight2: 'redlight2', g_sixlegs: 'sixlegs', g_mingle: 'mingle', g_revolt: 'revolt', g_hideseek: 'hideseek', g_jumprope: 'jumprope', g_skysquid: 'skysquid', g_escape: 'escape' };
  const LBL = { s1_intro: 'Prólogo · A Estação', s1_card: 'O Cartão', h1_arrival: 'Dormitório · Dia 1', h1_vote: 'A Votação', s1_home: 'De Volta à Cidade', h1_day2: 'Dormitório · Dia 2', h1_night: 'A Noite do Motim', h1_tug: 'Formando Equipes', h1_after_tug: 'Dormitório · Dia 4', h1_glass: 'Dormitório · Dia 5', s1_dinner: 'O Jantar', s1_clause3: 'Cláusula 3', s1_end: 'Fim da Temporada 1', s2_season: 'Temporada 2 · O Retorno', s2_arrival: 'A Chegada', h2_arrival: 'Temporada 2 · Dia 1', h2_vote1: 'Votação', h2_day: 'O contra X', h2_vote2: 'Votação', h2_vote3: 'A Última Votação', s2_end: 'Fim da Temporada 2', s3_season: 'Temporada 3', h3_1: 'Temporada 3 · Dia 1', s3_after_hs: 'Depois do Esconde-Esconde', h3_2: 'Temporada 3 · Dia 2', s3_dinner: 'O Jantar Final', victory: 'Vitória', ending: 'Final', winner: 'Winner', farewell: 'Despedida', credits: 'Créditos' };
  R6.chapterLabel = function (id) { if (G[id] && R6.Games[G[id]]) return R6.Games[G[id]].name; return LBL[id] || id || '—'; };

  // ------------------------------------------------ shared frame for meta screens
  // R6.metaScene({ name, title, sub, update(dt, sc), render(ctx, sc), back: fn })
  R6.metaScene = function (o) {
    const sc = {
      name: o.name || 'meta', t: 0, pausable: false, bg: R6.menuBG(),
      enter() { R6.Campaign && (R6.Campaign.active = false); R6.Music.play(o.music || menuTrack()); o.enter && o.enter(sc); },
      exit() { o.exit && o.exit(sc); },
      update(dt) {
        sc.t += dt; sc.bg.update(dt);
        if (R6.Dialog.active) { sc.cool = 0.2; return; }
        if (sc.cool > 0) { sc.cool -= dt; return; }
        if (o.update && o.update(dt, sc) === 'stop') return;
        if (!sc.noBack && R6.Input.actP('back') && o.back !== false) { R6.Audio.sfx('back'); (o.back || (() => R6.Engine.go(R6.MenuScene(), { t: 'fade', dur: 0.6 })))(); }
      },
      render(ctx) {
        sc.bg.draw(ctx, { dim: o.dim != null ? o.dim : 0.55, leftShade: false });
        const k = U.ease.outCubic(Math.min(1, sc.t * 3));
        R6.UI.text(ctx, o.title || '', 60 - (1 - k) * 30, 76, { size: 54, fam: 'title', color: '#fff', spacing: 4, alpha: k, shadow: true });
        if (o.sub) R6.UI.text(ctx, o.sub, 62, 104, { size: 16, color: '#aaa', weight: 600, spacing: 2, alpha: k });
        ctx.fillStyle = R6.UI.T.accent; ctx.fillRect(60, 116, 140 * k, 3);
        chipsBadge(ctx);
        o.render && o.render(ctx, sc);
        if (o.hints !== false) R6.UI.hints(ctx, o.hints || [['↑↓←→', 'navegar'], ['ENTER', 'confirmar'], ['ESC', 'voltar']], 60, R6.H - 26, {});
      },
    };
    return sc;
  };
  function chipsBadge(ctx) {
    const txt = U.commas ? U.commas(R6.Save.meta.chips) : String(R6.Save.meta.chips);
    const w = R6.UI.measure(ctx, txt, 22, 700, 'mono') + 70;
    R6.UI.panel(ctx, R6.W - w - 24, 34, w, 40, { r: 20, fill: 'rgba(8,10,14,.8)', shadow: false });
    R6.UI.shapeIcon(ctx, 'circle', R6.W - w - 2, 54, 11, '#f2c14e', 3);
    R6.UI.shapeIcon(ctx, 'circle', R6.W - w - 2, 54, 5, '#e8336d', 0, true);
    R6.UI.text(ctx, txt, R6.W - 40, 62, { size: 22, fam: 'mono', color: '#f2c14e', align: 'right' });
    R6.UI.text(ctx, 'FICHAS', R6.W - w - 24 + w / 2, 88, { size: 11, color: '#888', align: 'center', weight: 800, spacing: 3 });
  }
  R6.chipsBadge = chipsBadge;
  function menuTrack() { const eq = R6.Save.meta.equipped.track; const it = R6.SHOP && R6.SHOP.find(i => i.id === eq); return (it && it.track) || 'menu'; }
  R6.menuTrack = menuTrack;

  // simple modal confirm on top of meta scenes (uses the dialogue system for consistent look & input)
  R6.confirm = function (text, yes, no, o = {}) {
    R6.Dialog.show({ who: { name: o.who || 'SISTEMA', look: o.look || R6.Char.makeLook({ outfit: 'guard', mask: 'square', seed: 7 }) }, text, choices: [
      { t: o.yes || 'Sim', color: '#e8336d', cb: () => yes && yes() },
      { t: o.no || 'Não', cb: () => no && no() },
    ] });
  };

  // ------------------------------------------------ MAIN MENU
  R6.MenuScene = function () {
    const hasSave = () => R6.Save.hasCampaign();
    const saveInfo = () => { const d = R6.Save.readCampaign(); if (!d || !d.state) return null; return { season: d.state.season, chapter: d.label, name: d.state.player.name, num: d.state.player.num, look: d.state.player.look, prize: d.state.prize, at: d.savedAt }; };
    const go = sc => R6.Engine.go(sc, { t: 'fade', dur: 0.7 });
    const newGame = () => { if (hasSave()) R6.confirm('Existe um jogo salvo. Começar um NOVO JOGO vai apagar o progresso atual da campanha. Continuar?', () => go(R6.CreationScene({ season: 1 }))); else go(R6.CreationScene({ season: 1 })); };
    const cont = () => { if (!hasSave()) { R6.Audio.sfx('error'); return; } R6.Engine.go({ name: 'loading', enter() { }, update() { }, render(ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R6.W, R6.H); } }, { t: 'cut' }); R6.Campaign.continueSave(); };
    const items = [
      { label: 'JOGAR', icon: 'circle', sub: () => hasSave() ? 'continuar' : 'novo jogo', action: () => hasSave() ? cont() : newGame() },
      { label: 'CONTINUAR', icon: 'triangle', disabled: !hasSave(), sub: () => { const s = saveInfo(); return s ? 'T' + s.season + ' · ' + R6.chapterLabel(s.chapter) : ''; }, action: cont },
      { label: 'NOVO JOGO', icon: 'square', action: newGame },
      { label: 'SELEÇÃO DE TEMPORADA', icon: 'circle', sub: () => R6.Save.meta.seasonsUnlocked + '/3', action: () => go(R6.SeasonSelectScene()) },
      { label: 'SELEÇÃO DE JOGO', icon: 'triangle', sub: () => Object.keys(R6.Save.meta.gamesUnlocked).filter(k => R6.Games[k]).length + '/' + Object.keys(R6.Games).filter(k => !R6.Games[k].hidden).length, action: () => go(R6.GameSelectScene()) },
      { label: 'DESAFIOS EXTRAS', icon: 'square', sub: () => (R6.EXTRAS ? R6.EXTRAS.length : 0) + ' jogos', action: () => go(R6.ExtrasScene()) },
      { label: 'LOJA', icon: 'circle', sub: 'cosméticos', action: () => go(R6.ShopScene()) },
      { label: 'GALERIA', icon: 'triangle', sub: () => Object.keys(R6.Save.meta.endings).length + '/' + Object.keys(R6.ENDINGS || {}).length + ' finais', action: () => go(R6.GalleryScene()) },
      { label: 'CONFIGURAÇÕES', icon: 'square', action: () => go(R6.SettingsScene()) },
      { label: 'CRÉDITOS', icon: 'circle', action: () => go(R6.CreditsScene(() => go(R6.MenuScene()))) },
    ];
    const sc = {
      name: 'menu', t: 0, pausable: false, bg: R6.menuBG(), mode: R6._menuSeen ? 'menu' : 'title', mk: R6._menuSeen ? 1 : 0,
      menu: new R6.UI.Menu(items, { start: hasSave() ? 0 : 0 }),
      enter() {
        if (R6.Campaign) R6.Campaign.active = false;
        R6.Music.play(menuTrack()); R6.Music.setIntensity(0.2); R6.Audio.loop('hum', 0.25);
        R6.Elim && R6.Elim.reset();
      },
      update(dt) {
        this.t += dt; this.bg.update(dt);
        if (this.mode === 'title') {
          if (this.t > 0.8 && (R6.Input.anyP())) { this.mode = 'menu'; R6._menuSeen = true; R6.Audio.sfx('confirm'); R6.Audio.sfx('whoosh', { vol: 0.4 }); R6.Input.clearAll(); }
          return;
        }
        this.mk = Math.min(1, this.mk + dt * 1.8);
        if (R6.Dialog.active) { this.cool = 0.2; return; }
        if (this.cool > 0) { this.cool -= dt; return; }
        if (this.mk > 0.6) this.menu.update(dt);
      },
      render(ctx) {
        const t = this.t;
        this.bg.draw(ctx, { dim: this.mode === 'title' ? 0.25 : 0, pigX: U.lerp(1090, 900, U.ease.inOutCubic(this.mk)) });
        const mk = U.ease.inOutCubic(this.mk);
        // logo: centered on the title screen, slides to the corner for the menu
        const lx = U.lerp(640, 270, mk), ly = U.lerp(280, 86, mk), ls = U.lerp(120, 66, mk);
        const intro = U.clamp(t / 1.2, 0, 1);
        ctx.save(); ctx.globalAlpha = intro;
        R6.UI.logo(ctx, lx, ly, ls * (0.9 + 0.1 * U.ease.outBack(intro)), t, { sub: 'THE LAST GAME' });
        ctx.restore();
        if (this.mode === 'title') {
          const a = 0.5 + Math.sin(t * 3) * 0.5;
          if (t > 1) R6.UI.text(ctx, R6.Touch && R6.Touch.isTouch ? 'TOQUE PARA COMEÇAR' : 'PRESSIONE QUALQUER TECLA', 640, 520, { size: 22, align: 'center', color: '#fff', alpha: a * Math.min(1, t - 1), spacing: 6, weight: 700, shadow: true });
          R6.UI.text(ctx, '456 PARTICIPANTES · 1 VENCEDOR · ₩45.600.000.000', 640, 470, { size: 16, align: 'center', color: '#e8c46a', alpha: intro * 0.9, spacing: 3, weight: 700 });
          R6.UI.text(ctx, 'Obra de fã, inspirada em Round 6 / Squid Game. Sem afiliação oficial.', 640, 690, { size: 12, align: 'center', color: '#666' });
          return;
        }
        ctx.save(); ctx.globalAlpha = mk; ctx.translate(-(1 - mk) * 60, 0);
        this.menu.draw(ctx, 64, 168, 420, 40, 6, { size: 19 });
        ctx.restore();
        R6.chipsBadge(ctx);
        // continue card
        const s = saveInfo();
        if (s && this.menu.i <= 1) {
          const x = R6.W - 380, y = R6.H - 190;
          R6.UI.panel(ctx, x, y, 350, 130, { fill: 'rgba(6,8,12,.86)', accent: true, alpha: mk });
          R6.Char.portrait(ctx, s.look, x + 60, y + 65, 90, 'determined', t, false);
          R6.UI.text(ctx, 'JOGO SALVO', x + 118, y + 30, { size: 12, color: '#999', weight: 800, spacing: 3 });
          R6.UI.text(ctx, '#' + U.pad(s.num) + '  ' + s.name, x + 118, y + 56, { size: 20, weight: 800, color: '#fff', maxW: 220 });
          R6.UI.text(ctx, 'TEMPORADA ' + s.season + ' · ' + R6.chapterLabel(s.chapter), x + 118, y + 80, { size: 14, color: '#e8336d', weight: 700, maxW: 220 });
          R6.UI.text(ctx, 'PRÊMIO ' + U.money(s.prize || 0), x + 118, y + 104, { size: 14, fam: 'mono', color: '#f2c14e' });
        }
        // ticker
        const msg = '   ●  456 JOGADORES   ▲  1 VENCEDOR   ■  ₩100.000.000 POR ELIMINADO   ●  ' + (R6.Save.meta.stats.eliminatedSeen || 0) + ' ELIMINAÇÕES TESTEMUNHADAS   ▲  ' + Object.keys(R6.Save.meta.endings).length + ' FINAIS DESCOBERTOS   ■  VOCÊ JOGA. NÓS ASSISTIMOS.';
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, R6.H - 28, R6.W, 28);
        const tw = R6.UI.measure(ctx, msg, 13, 700); const off = (t * 50) % tw;
        for (let x = -off; x < R6.W; x += tw) R6.UI.text(ctx, msg, x, R6.H - 9, { size: 13, color: '#bbb', weight: 700 });
        R6.UI.text(ctx, 'v1.0', R6.W - 12, R6.H - 36, { size: 11, align: 'right', color: '#555' });
      },
    };
    return sc;
  };
})();
