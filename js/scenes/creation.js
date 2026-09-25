/* ROUND 6 — creation.js : player creation — name, number, body, age, skin, hair style & color, height, build, glasses, beard,
   mark, civilian clothes (before the games). Inside the games the green tracksuit with the number is mandatory. */
'use strict';
(function () {
  const U = R6.U;
  const C = () => R6.Char;
  const TOPS = ['#5b6470', '#7a3b3b', '#3b5b7a', '#6b6b3b', '#2f2f35', '#8a6d4b', '#4b6b56', '#c9c2b0', '#6a4a7a'];
  const BOTTOMS = ['#3b4a66', '#2d2d33', '#5a4b3b', '#444444', '#6b6358'];
  const AGE = ['JOVEM', 'ADULTO', 'IDOSO'];
  const HS_PT = { short: 'Curto', buzz: 'Raspado', long: 'Longo', bun: 'Coque', pony: 'Rabo de cavalo', bald: 'Careca', bob: 'Chanel', slick: 'Penteado para trás', curly: 'Cacheado', perm: 'Permanente', spiky: 'Espetado', bowl: 'Tigela', twin: 'Maria-chiquinha' };
  const BEARD = [null, 'stubble', 'beard'], BEARD_PT = ['Nenhuma', 'Por fazer', 'Cheia'];
  const NAMES_M = ['Gi-tae', 'Min-jun', 'Seo-jun', 'Do-yun', 'Ji-ho', 'Hyun-woo', 'Tae-yang', 'Jae-won'];
  const NAMES_F = ['Ji-woo', 'Seo-yeon', 'Ha-eun', 'Min-seo', 'Soo-ah', 'Ye-jin', 'Da-in', 'Na-rae'];

  R6.CreationScene = function (opts = {}) {
    const prev = R6.Save.meta.profile;
    const P = prev ? JSON.parse(JSON.stringify(prev)) : null;
    const st = {
      name: P ? P.name : 'Gi-tae', num: P ? P.num : 456,
      fem: P ? !!P.look.fem : false, age: P ? P.look.age : 1,
      skin: P ? Math.max(0, C().SKINS.indexOf(P.look.skin)) : 2,
      hs: P ? Math.max(0, C().STYLES.indexOf(P.look.hs)) : 0,
      hair: P ? Math.max(0, C().HAIRS.indexOf(P.look.hair)) : 1,
      h: P ? P.look.h : 1.0, build: P ? P.look.build : 1.02,
      glasses: P ? !!P.look.glasses : false, beard: P ? Math.max(0, BEARD.indexOf(P.look.beard)) : 0,
      mark: P ? P.look.mark === 'scar' : false,
      top: P && P.look.civ ? Math.max(0, TOPS.indexOf(P.look.civ.top)) : 0, bottom: P && P.look.civ ? Math.max(0, BOTTOMS.indexOf(P.look.civ.bottom)) : 0,
    };
    const build = () => C().makeLook({ num: st.num, fem: st.fem, age: st.age, skin: C().SKINS[st.skin], hs: C().STYLES[st.hs], hair: C().HAIRS[st.hair], h: st.h, build: st.build, glasses: st.glasses, beard: st.fem ? null : BEARD[st.beard], mark: st.mark ? 'scar' : null, civ: { top: TOPS[st.top], bottom: BOTTOMS[st.bottom] }, seed: 4560 + st.num, eyeSize: 1.02 });
    let look = build();
    const refresh = (anim) => { look = build(); sc.look = look; sc.pop = 0.25; if (anim) sc.anim = { name: anim, t: 0 }; };
    const cyc = (k, n, d) => { st[k] = (st[k] + d + n) % n; };
    const edit = (field) => {
      R6.Audio.sfx('click');
      if (R6.Input.lastDevice === 'touch') {
        sc.prompting = true;
        R6.textPrompt(field === 'name' ? 'SEU NOME' : 'SEU NÚMERO (1–456)', field === 'name' ? st.name : String(st.num), { numeric: field === 'num', max: field === 'name' ? 14 : 3 }, v => {
          sc.prompting = false; if (v == null) return;
          if (field === 'name' && v.trim()) st.name = v.trim().slice(0, 14);
          if (field === 'num' && v) st.num = U.clamp(parseInt(v, 10) || st.num, 1, 456);
          refresh('wave');
        });
        return;
      }
      sc.editing = field; sc.buf = '';
    };
    const randomize = () => {
      st.fem = Math.random() < 0.45; st.age = Math.random() < 0.15 ? 2 : Math.random() < 0.35 ? 0 : 1;
      st.skin = U.randi(0, 6); st.hs = C().STYLES.indexOf(U.pick(st.fem ? ['long', 'bun', 'pony', 'bob', 'curly', 'short', 'perm', 'twin'] : st.age === 2 ? ['bald', 'perm', 'short', 'buzz'] : ['short', 'buzz', 'slick', 'spiky', 'curly', 'bowl']));
      st.hair = st.age === 2 ? U.pick([6, 7]) : U.randi(0, 5); st.h = U.pick([0.93, 0.96, 0.99, 1.02, 1.05]); st.build = U.pick([0.9, 0.94, 0.98, 1.02, 1.06, 1.1, 1.14]);
      st.glasses = Math.random() < 0.15; st.beard = st.fem ? 0 : U.pick([0, 0, 1, 2]); st.mark = Math.random() < 0.1; st.top = U.randi(0, TOPS.length - 1); st.bottom = U.randi(0, BOTTOMS.length - 1);
      st.name = U.pick(st.fem ? NAMES_F : NAMES_M); refresh('wave');
    };
    const start = () => {
      const name = (st.name || '').trim() || 'Jogador';
      const profile = { name, num: st.num, look: build(), seed: (Date.now() % 1000000) };
      R6.Save.meta.profile = { name, num: st.num, look: profile.look }; R6.Save.saveMeta();
      R6.Audio.sfx('stamp');
      sc.leaving = true; sc.leaveT = 0; sc.profile = profile;
    };
    const items = [
      { label: 'NOME', sub: () => st.name || '—', action: () => edit('name') },
      { label: 'NÚMERO', sub: () => '◀ ' + U.pad(st.num) + ' ▶', onLeft: () => { st.num = st.num <= 1 ? 456 : st.num - (R6.Input.act('run') ? Math.min(10, st.num - 1) : 1); refresh(); }, onRight: () => { st.num = st.num >= 456 ? 1 : Math.min(456, st.num + (R6.Input.act('run') ? 10 : 1)); refresh(); }, action: () => edit('num') },
      { label: 'CORPO', sub: () => '◀ ' + (st.fem ? 'FEMININO' : 'MASCULINO') + ' ▶', onLeft: () => { st.fem = !st.fem; refresh(); }, onRight: () => { st.fem = !st.fem; refresh(); }, action: () => { st.fem = !st.fem; refresh(); } },
      { label: 'IDADE', sub: () => '◀ ' + AGE[st.age] + ' ▶', onLeft: () => { cyc('age', 3, -1); refresh(); }, onRight: () => { cyc('age', 3, 1); refresh(); }, action: () => { cyc('age', 3, 1); refresh(); } },
      { label: 'PELE', sub: () => '◀ ' + (st.skin + 1) + '/' + C().SKINS.length + ' ▶', onLeft: () => { cyc('skin', C().SKINS.length, -1); refresh(); }, onRight: () => { cyc('skin', C().SKINS.length, 1); refresh(); }, action: () => { cyc('skin', C().SKINS.length, 1); refresh(); } },
      { label: 'CABELO', sub: () => '◀ ' + HS_PT[C().STYLES[st.hs]] + ' ▶', onLeft: () => { cyc('hs', C().STYLES.length, -1); refresh(); }, onRight: () => { cyc('hs', C().STYLES.length, 1); refresh(); }, action: () => { cyc('hs', C().STYLES.length, 1); refresh(); } },
      { label: 'COR DO CABELO', sub: () => '◀ ' + (st.hair + 1) + '/' + C().HAIRS.length + ' ▶', onLeft: () => { cyc('hair', C().HAIRS.length, -1); refresh(); }, onRight: () => { cyc('hair', C().HAIRS.length, 1); refresh(); }, action: () => { cyc('hair', C().HAIRS.length, 1); refresh(); } },
      { label: 'ALTURA', sub: () => '◀ ' + Math.round(150 + (st.h - 0.9) * 180) + ' cm ▶', onLeft: () => { st.h = Math.max(0.9, +(st.h - 0.03).toFixed(2)); refresh(); }, onRight: () => { st.h = Math.min(1.08, +(st.h + 0.03).toFixed(2)); refresh(); }, action: () => { st.h = st.h >= 1.08 ? 0.9 : +(st.h + 0.03).toFixed(2); refresh(); } },
      { label: 'PORTE FÍSICO', sub: () => '◀ ' + (st.build < 0.95 ? 'MAGRO' : st.build < 1.06 ? 'MÉDIO' : st.build < 1.14 ? 'FORTE' : 'PESADO') + ' ▶', onLeft: () => { st.build = Math.max(0.86, +(st.build - 0.04).toFixed(2)); refresh(); }, onRight: () => { st.build = Math.min(1.22, +(st.build + 0.04).toFixed(2)); refresh(); }, action: () => { st.build = st.build >= 1.22 ? 0.86 : +(st.build + 0.04).toFixed(2); refresh(); } },
      { label: 'ÓCULOS', sub: () => st.glasses ? 'SIM' : 'NÃO', onLeft: () => { st.glasses = !st.glasses; refresh(); }, onRight: () => { st.glasses = !st.glasses; refresh(); }, action: () => { st.glasses = !st.glasses; refresh(); } },
      { label: 'BARBA', sub: () => st.fem ? '—' : '◀ ' + BEARD_PT[st.beard] + ' ▶', onLeft: () => { cyc('beard', 3, -1); refresh(); }, onRight: () => { cyc('beard', 3, 1); refresh(); }, action: () => { cyc('beard', 3, 1); refresh(); } },
      { label: 'MARCA', sub: () => st.mark ? 'CICATRIZ' : 'NENHUMA', onLeft: () => { st.mark = !st.mark; refresh(); }, onRight: () => { st.mark = !st.mark; refresh(); }, action: () => { st.mark = !st.mark; refresh(); } },
      { label: 'ROUPA (LÁ FORA)', sub: () => '◀ ' + (st.top + 1) + ' · ' + (st.bottom + 1) + ' ▶', onLeft: () => { cyc('bottom', BOTTOMS.length, 1); refresh(); }, onRight: () => { cyc('top', TOPS.length, 1); refresh(); }, action: () => { cyc('top', TOPS.length, 1); refresh(); } },
      { sep: true },
      { label: 'ALEATÓRIO', icon: 'triangle', action: randomize },
      { label: 'ASSINAR O CONTRATO', icon: 'circle', color: '#e8336d', action: start },
    ];
    const hook = (e) => {
      if (!sc.editing || R6.Engine.scene !== sc) return;
      if (e.key === 'Escape') { sc.editing = null; sc.skipFrame = true; R6.Audio.sfx('back'); return; }
      if (e.key === 'Enter') { if (sc.editing === 'name' && sc.buf.trim()) st.name = sc.buf.trim().slice(0, 14); if (sc.editing === 'num' && sc.buf) { st.num = U.clamp(parseInt(sc.buf, 10) || st.num, 1, 456); } sc.editing = null; sc.skipFrame = true; refresh('wave'); R6.Audio.sfx('confirm'); return; }
      if (e.key === 'Backspace') { sc.buf = sc.buf.slice(0, -1); R6.Audio.sfx('type', { vol: 0.3 }); return; }
      if (e.key.length === 1) {
        if (sc.editing === 'num') { if (/[0-9]/.test(e.key) && sc.buf.length < 3) sc.buf += e.key; }
        else if (/[\p{L}\p{N} .'-]/u.test(e.key) && sc.buf.length < 14) sc.buf += e.key;
        R6.Audio.sfx('type', { vol: 0.3 });
      }
    };
    const sc = {
      name: 'creation', t: 0, pausable: false, bg: R6.menuBG(), look, pop: 0, view: 0, viewT: 0, editing: null, buf: '',
      menu: new R6.UI.Menu(items, { start: 0 }),
      enter() { R6.Music.play('menu'); R6.Input.onKeyHooks.push(hook); },
      exit() { const i = R6.Input.onKeyHooks.indexOf(hook); if (i >= 0) R6.Input.onKeyHooks.splice(i, 1); },
      update(dt) {
        this.t += dt; this.bg.update(dt); this.pop = Math.max(0, this.pop - dt); if (this.anim) { this.anim.t += dt; if (this.anim.t > 1.6) this.anim = null; }
        this.viewT += dt; if (this.viewT > 3.2) { this.viewT = 0; this.view = (this.view + 1) % 4; }
        if (this.leaving) {
          this.leaveT += dt;
          if (this.leaveT > 1.6 && !this.gone) {
            this.gone = true; const pr = this.profile;
            if ((opts.season || 1) === 1) R6.Campaign.start(pr); else R6.Campaign.startSeason(opts.season, pr);
          }
          return;
        }
        if (this.editing || this.prompting) return;
        if (this.skipFrame) { this.skipFrame = false; return; }
        if (R6.Input.actP('back')) { R6.Audio.sfx('back'); R6.Engine.go(opts.season > 1 ? R6.SeasonSelectScene() : R6.MenuScene(), { t: 'fade', dur: 0.6 }); return; }
        const mm = R6.Input.mouse; if (mm.pressed && U.rectHit(mm.x, mm.y, { x: 200, y: 200, w: 320, h: 380 })) { this.view = (this.view + 1) % 4; this.viewT = 0; R6.Audio.sfx('whoosh', { vol: 0.3 }); }
        if (R6.Input.pressed('KeyQ')) { this.view = (this.view + 3) % 4; this.viewT = 0; }
        if (R6.Input.pressed('KeyE')) { this.view = (this.view + 1) % 4; this.viewT = 0; }
        this.menu.update(dt);
      },
      render(ctx) {
        const t = this.t;
        this.bg.draw(ctx, { dim: 0.72, leftShade: false });
        // spotlight podium
        const cx = 360, gy = 560;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, 60, 10, cx, gy, 420); g.addColorStop(0, 'rgba(255,240,210,.18)'); g.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 40, 0); ctx.lineTo(cx + 40, 0); ctx.lineTo(cx + 230, gy + 30); ctx.lineTo(cx - 230, gy + 30); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#1a1d22'; ctx.beginPath(); ctx.ellipse(cx, gy + 6, 190, 34, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#e8336d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, gy + 2, 180, 30, 0, 0, U.TAU); ctx.stroke();
        const views = ['front', 'side', 'back', 'side'];
        const v = views[this.view], dir = this.view === 3 ? -1 : 1;
        const pop = 1 + Math.sin(Math.min(1, this.pop / 0.25) * Math.PI) * 0.04;
        const anim = this.leaving ? 'walk' : this.anim ? this.anim.name : 'idle';
        const lx = this.leaving ? cx + this.leaveT * 260 : cx;
        C().draw(ctx, look, lx, gy, { view: this.leaving ? 'side' : v, dir, anim, t, scale: 3.1 * pop, shadowA: 0.4 });
        // civilian version (life outside)
        const civ = Object.assign({}, look, { outfit: 'civil' });
        ctx.save(); ctx.globalAlpha = 0.9;
        C().draw(ctx, civ, 110, gy - 10, { view: 'front', anim: 'idle', t: t + 1, scale: 1.3 });
        ctx.restore();
        R6.UI.text(ctx, 'LÁ FORA', 110, gy + 22, { size: 12, align: 'center', color: '#888', weight: 800, spacing: 3 });
        R6.UI.text(ctx, 'NO JOGO', cx, gy + 58, { size: 12, align: 'center', color: '#2ec4b6', weight: 800, spacing: 3 });
        // header
        R6.UI.text(ctx, 'CRIAR JOGADOR', 60, 76, { size: 54, fam: 'title', color: '#fff', spacing: 4, shadow: true });
        R6.UI.text(ctx, (opts.season || 1) > 1 ? 'TEMPORADA ' + opts.season : 'UM CONTRATO. 456 LUGARES. UMA SAÍDA.', 62, 104, { size: 16, color: '#aaa', weight: 600, spacing: 2 });
        ctx.fillStyle = '#e8336d'; ctx.fillRect(60, 116, 140, 3);
        // name/number plate
        R6.UI.panel(ctx, cx - 150, 140, 300, 56, { fill: 'rgba(6,8,12,.8)', accent: true });
        R6.UI.text(ctx, U.pad(st.num), cx - 130, 180, { size: 34, fam: 'mono', color: '#e8336d' });
        R6.UI.text(ctx, this.editing === 'name' ? this.buf + (Math.floor(t * 3) % 2 ? '|' : ' ') : st.name, cx - 50, 178, { size: 24, weight: 800, color: '#fff', maxW: 190 });
        // options
        this.menu.draw(ctx, 790, 110, 440, 30, 3, { size: 16, align: 'left' });
        // edit overlay
        if (this.editing) {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, R6.W, R6.H);
          R6.UI.panel(ctx, 390, 280, 500, 150, { fill: 'rgba(8,10,14,.96)', accent: true });
          R6.UI.text(ctx, this.editing === 'name' ? 'DIGITE SEU NOME' : 'DIGITE SEU NÚMERO (1–456)', 640, 320, { size: 16, align: 'center', color: '#aaa', weight: 800, spacing: 3 });
          R6.UI.text(ctx, (this.buf || '') + (Math.floor(t * 3) % 2 ? '_' : ' '), 640, 375, { size: 38, align: 'center', color: '#fff', fam: this.editing === 'num' ? 'mono' : 'body', weight: 800 });
          R6.UI.text(ctx, 'ENTER confirmar · ESC manter', 640, 412, { size: 13, align: 'center', color: '#777' });
        }
        if (R6.Input.lastDevice === 'touch') R6.UI.text(ctx, 'Toque numa opção para alterar · toque no personagem para girar', 60, R6.H - 22, { size: 14, color: '#aaa', weight: 700 });
        else R6.UI.hints(ctx, [['↑↓', 'opção'], ['←→', 'alterar'], ['Q/E', 'girar'], ['ENTER', 'selecionar'], ['ESC', 'voltar']], 60, R6.H - 26, {});
        R6.UI.text(ctx, 'Dentro dos jogos, todos vestem o mesmo uniforme verde com o número no peito.', 1230, R6.H - 22, { size: 13, align: 'right', color: '#777' });
        if (this.leaving) { const a = U.clamp((this.leaveT - 0.4) / 1.1, 0, 1); ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, R6.W, R6.H); if (this.leaveT < 1.2) R6.UI.text(ctx, 'CONTRATO ASSINADO', 640, 360, { size: 60, fam: 'title', align: 'center', base: 'middle', color: '#e8336d', alpha: Math.min(1, this.leaveT * 3) * (1 - a * 0.5), spacing: 8 }); }
      },
    };
    return sc;
  };
})();
