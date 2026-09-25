/* ROUND 6 — meta.js : shop (cosmetics bought with chips), pause menu, settings, season select, game select (practice),
   extra challenges, shop screen, gallery (characters, endings, scenes, statistics), victory effects */
'use strict';
(function () {
  const U = R6.U;
  const go = (sc, d) => R6.Engine.go(sc, { t: 'fade', dur: d || 0.6 });
  const back = () => go(R6.MenuScene());

  // ================================================================ SHOP DATA
  const SHOP = [
    // outfits — EXTRA modes only (the campaign always uses the green tracksuit)
    { id: 'outfit_default', cat: 'outfit', name: 'Uniforme verde', desc: 'O clássico. Obrigatório na campanha.', price: 0 },
    { id: 'outfit_red', cat: 'outfit', name: 'Agasalho vermelho', desc: 'Para os modos extras.', price: 120, colors: { main: '#b8323f', dark: '#86222d', light: '#d0495a', pants: '#b8323f', pantsDark: '#86222d' } },
    { id: 'outfit_black', cat: 'outfit', name: 'Agasalho preto', desc: 'Discreto. Quase um funcionário.', price: 180, colors: { main: '#25262b', dark: '#141518', light: '#3a3b42', pants: '#25262b', pantsDark: '#141518' } },
    { id: 'outfit_white', cat: 'outfit', name: 'Agasalho branco', desc: 'Fácil de ver. Difícil de manter limpo.', price: 180, colors: { main: '#e7e5df', dark: '#bcbab3', light: '#ffffff', pants: '#e7e5df', pantsDark: '#bcbab3' } },
    { id: 'outfit_blue', cat: 'outfit', name: 'Colete azul', desc: 'Lembrança do esconde-esconde.', price: 220, colors: { main: '#2f5fb8', dark: '#1f4386', light: '#4677d4', pants: '#2b7d71', pantsDark: '#1d5a51' } },
    { id: 'outfit_pink', cat: 'outfit', name: 'Rosa funcionário', desc: 'Sem a máscara. Ninguém vai notar?', price: 350, colors: { main: '#e0386c', dark: '#a8244f', light: '#f25a8a', pants: '#e0386c', pantsDark: '#a8244f' } },
    { id: 'outfit_gold', cat: 'outfit', name: 'Agasalho dourado', desc: 'Para quem já venceu tudo.', price: 650, colors: { main: '#c9a13b', dark: '#9a7824', light: '#e6c15a', pants: '#c9a13b', pantsDark: '#9a7824' } },
    // victory animations (results screens)
    { id: 'anim_default', cat: 'anim', name: 'Comemorar', desc: 'Braços para cima.', price: 0, anim: 'celebrate' },
    { id: 'anim_fist', cat: 'anim', name: 'Punho erguido', desc: 'Vitória contida.', price: 100, anim: 'fistpump' },
    { id: 'anim_bow', cat: 'anim', name: 'Reverência', desc: 'Respeito aos que ficaram.', price: 120, anim: 'bow' },
    { id: 'anim_salute', cat: 'anim', name: 'Continência', desc: 'Disciplina até o fim.', price: 120, anim: 'salute' },
    { id: 'anim_dance', cat: 'anim', name: 'Dança', desc: 'Nada de mais. Só sobreviveu.', price: 160, anim: 'dance' },
    { id: 'anim_spin', cat: 'anim', name: 'Giro', desc: 'Uma pirueta de alívio.', price: 200, anim: 'spin' },
    // effects (trail in extra games)
    { id: 'fx_default', cat: 'fx', name: 'Nenhum', desc: 'Sem rastro.', price: 0 },
    { id: 'fx_dust', cat: 'fx', name: 'Poeira', desc: 'Rastro de poeira ao correr.', price: 60, p: 'dust' },
    { id: 'fx_star', cat: 'fx', name: 'Estrelas', desc: 'Faíscas brilhantes.', price: 180, p: 'star' },
    { id: 'fx_feather', cat: 'fx', name: 'Plumas', desc: 'Leve como o vento.', price: 180, p: 'feather' },
    { id: 'fx_ember', cat: 'fx', name: 'Brasas', desc: 'Queimando a pista.', price: 240, p: 'ember' },
    { id: 'fx_money', cat: 'fx', name: 'Dinheiro', desc: 'Deixando o prêmio para trás.', price: 400, p: 'money' },
    // special numbers (extra modes)
    { id: 'num_none', cat: 'number', name: 'Seu número', desc: 'O número da sua campanha.', price: 0, num: null },
    { id: 'num_777', cat: 'number', name: 'Número 777', desc: 'Sorte tripla.', price: 150, num: 777 },
    { id: 'num_999', cat: 'number', name: 'Número 999', desc: 'O último da fila.', price: 150, num: 999 },
    { id: 'num_100', cat: 'number', name: 'Número 100', desc: 'Redondo.', price: 90, num: 100 },
    { id: 'num_000', cat: 'number', name: 'Número 000', desc: 'Nenhum. Um fantasma.', price: 500, num: 1000 },
    // emotes (dorm: keys 5-8)
    { id: 'emote_wave', cat: 'emote', name: 'Acenar', desc: 'Tecla 5 no dormitório.', price: 0 },
    { id: 'emote_cheer', cat: 'emote', name: 'Comemorar', desc: 'Emote de dormitório.', price: 80 },
    { id: 'emote_bow', cat: 'emote', name: 'Reverência', desc: 'Emote de dormitório.', price: 80 },
    { id: 'emote_dance', cat: 'emote', name: 'Dançar', desc: 'Emote de dormitório.', price: 140 },
    { id: 'emote_point', cat: 'emote', name: 'Apontar', desc: 'Emote de dormitório.', price: 60 },
    { id: 'emote_cry', cat: 'emote', name: 'Chorar', desc: 'Emote de dormitório.', price: 60 },
    // titles (HUD)
    { id: 'title_none', cat: 'title', name: 'Sem título', desc: '—', price: 0 },
    { id: 'title_rookie', cat: 'title', name: 'NOVATO', desc: 'Todo mundo começa em algum lugar.', price: 50 },
    { id: 'title_survivor', cat: 'title', name: 'SOBREVIVENTE', desc: 'Requer: vencer 5 jogos.', price: 150, req: () => R6.Save.meta.stats.gamesWon >= 5 },
    { id: 'title_glass', cat: 'title', name: 'VIDRACEIRO', desc: 'Requer: recorde na Ponte de Vidro infinita.', price: 200, req: () => (R6.Save.meta.best.glass_endless || 0) >= 10 },
    { id: 'title_winner', cat: 'title', name: 'VENCEDOR', desc: 'Requer: final Vitória.', price: 300, req: () => !!R6.Save.meta.endings.vitoria },
    { id: 'title_ghost', cat: 'title', name: 'FANTASMA', desc: 'Requer: final Fuga.', price: 300, req: () => !!R6.Save.meta.endings.fuga },
    { id: 'title_frontman', cat: 'title', name: 'FRONT MAN', desc: 'Requer: final Dark.', price: 500, req: () => !!R6.Save.meta.endings.dark },
    // UI skins
    { id: 'ui_default', cat: 'ui', name: 'Rosa (padrão)', desc: 'A interface original.', price: 0 },
    { id: 'ui_teal', cat: 'ui', name: 'Verde-água', desc: 'Cor do uniforme.', price: 150 },
    { id: 'ui_noir', cat: 'ui', name: 'Noir', desc: 'Preto e branco.', price: 220 },
    { id: 'ui_neon', cat: 'ui', name: 'Neon', desc: 'Rosa e ciano elétricos.', price: 300 },
    { id: 'ui_gold', cat: 'ui', name: 'VIP Dourado', desc: 'Como os convidados de máscara.', price: 450 },
    // victory effects (results / winner)
    { id: 'victory_default', cat: 'victory', name: 'Confete', desc: 'Papel colorido.', price: 0, p: 'confetti' },
    { id: 'victory_money', cat: 'victory', name: 'Chuva de dinheiro', desc: 'O porquinho explodiu.', price: 250, p: 'money' },
    { id: 'victory_stars', cat: 'victory', name: 'Estrelas', desc: 'Brilho de campeão.', price: 200, p: 'star' },
    { id: 'victory_shapes', cat: 'victory', name: 'Formas ○△□', desc: 'Círculos, triângulos e quadrados.', price: 280, shapes: true },
    // soundtracks (main menu)
    { id: 'track_menu', cat: 'track', name: 'Tema principal', desc: 'Trilha do menu.', price: 0, track: 'menu' },
    { id: 'track_dorm', cat: 'track', name: 'Dormitório', desc: 'Silêncio antes do próximo jogo.', price: 80, track: 'dorm' },
    { id: 'track_waltz', cat: 'track', name: 'Valsa', desc: 'Música clássica na escada colorida.', price: 150, track: 'waltz' },
    { id: 'track_victory', cat: 'track', name: 'Vitória', desc: 'Tema do vencedor.', price: 200, track: 'victory' },
    { id: 'track_credits', cat: 'track', name: 'Créditos', desc: 'Tema final.', price: 200, track: 'credits' },
    { id: 'track_tension', cat: 'track', name: 'Tensão', desc: 'Para quem gosta de sofrer.', price: 120, track: 'tension' },
  ];
  const CATS = [
    { id: 'outfit', name: 'ROUPAS (EXTRA)', slot: 'outfit' }, { id: 'anim', name: 'ANIMAÇÕES', slot: 'anim' }, { id: 'fx', name: 'EFEITOS', slot: 'fx' },
    { id: 'number', name: 'NÚMEROS ESPECIAIS', slot: 'number' }, { id: 'emote', name: 'EMOTES', slot: null }, { id: 'title', name: 'TÍTULOS', slot: 'title' },
    { id: 'ui', name: 'SKINS DE INTERFACE', slot: 'ui' }, { id: 'victory', name: 'EFEITOS DE VITÓRIA', slot: 'victory' }, { id: 'track', name: 'TRILHAS SONORAS', slot: 'track' },
  ];
  R6.SHOP = SHOP; R6.SHOP_CATS = CATS;
  R6.SHOP_OUTFITS = {}; for (const it of SHOP) if (it.cat === 'outfit' && it.colors) R6.SHOP_OUTFITS[it.id] = it.colors;
  R6.EMOTES = { emote_wave: { anim: 'wave', icon: '♥' }, emote_cheer: { anim: 'celebrate', icon: '!' }, emote_bow: { anim: 'bow', icon: '…' }, emote_dance: { anim: 'dance', icon: '♪' }, emote_point: { anim: 'point', icon: '?' }, emote_cry: { anim: 'cry', icon: '…' } };
  R6.shopItem = id => SHOP.find(i => i.id === id);
  const eqOf = slot => R6.Save.meta.equipped[slot];
  R6.equipped = slot => R6.shopItem(eqOf(slot));
  (function ensureDefaults() { const m = R6.Save.meta; if (!m.equipped.victory) m.equipped.victory = 'victory_default'; if (!m.equipped.fx) m.equipped.fx = 'fx_default'; if (!m.equipped.number) m.equipped.number = 'num_none'; for (const k of ['victory_default', 'num_none', 'fx_default', 'emote_wave']) m.owned[k] = true; })();

  // victory celebration: particles + animation shared by result/winner screens
  R6.VictoryFX = {
    emit(fx, dt) {
      const it = R6.equipped('victory') || {};
      if (it.shapes) { if (Math.random() < dt * 14) fx.emit('confetti', U.rand(0, R6.W), -10, 1, { color: U.pick(['#e8336d', '#2ec4b6', '#f2c14e']) }); return; }
      if (Math.random() < dt * (it.p === 'money' ? 10 : 16)) fx.emit(it.p || 'confetti', U.rand(0, R6.W), -10, 1);
    },
    anim() { const it = R6.equipped('anim'); return (it && it.anim) || 'celebrate'; },
    trail(fx, x, y, moving, dt) { const it = R6.equipped('fx'); if (!it || !it.p || !moving) return; if (Math.random() < dt * 14) fx.emit(it.p, x + U.rand(-6, 6), y - 4, 1, { vy: -20 }); },
    number() { const it = R6.equipped('number'); return it && it.num ? (it.num === 1000 ? 0.0001 : it.num) : null; },
  };

  // player profile used outside the campaign (practice / extras / gallery)
  R6.practiceState = function () {
    const pr = R6.Save.meta.profile;
    if (R6.Campaign && R6.Campaign.active && R6.State.s) return R6.State.s;
    const look = pr ? JSON.parse(JSON.stringify(pr.look)) : null;
    if (look) { R6.State.newGame({ name: pr.name, num: pr.num, look, seed: 777 }); R6.Elim.reset(); return R6.State.s; }
    return R6.debug.newState();
  };

  // ================================================================ SETTINGS PANEL (menu + pause)
  class SettingsPanel {
    constructor(o = {}) {
      this.o = o; const S = R6.Save.settings; const save = () => R6.Save.saveSettings();
      const vol = (k, label) => ({ label, sub: () => bar(S[k]), onLeft: () => { S[k] = Math.max(0, +(S[k] - 0.1).toFixed(1)); save(); R6.Audio.sfx('tick'); }, onRight: () => { S[k] = Math.min(1, +(S[k] + 0.1).toFixed(1)); save(); R6.Audio.sfx('tick'); }, action: () => { S[k] = S[k] >= 1 ? 0 : Math.min(1, +(S[k] + 0.1).toFixed(1)); save(); } });
      const tog = (k, label, fn) => ({ label, sub: () => S[k] ? 'SIM' : 'NÃO', onLeft: () => { S[k] = !S[k]; save(); fn && fn(); }, onRight: () => { S[k] = !S[k]; save(); fn && fn(); }, action: () => { S[k] = !S[k]; save(); fn && fn(); } });
      const DIFF = ['normal', 'hard', 'extreme'], DIFF_PT = { normal: 'NORMAL', hard: 'DIFÍCIL', extreme: 'EXTREMO' };
      const SPD = [0.6, 1, 1.6, 50], SPD_PT = ['LENTA', 'NORMAL', 'RÁPIDA', 'INSTANTÂNEA'];
      const cyc = (arr, cur, d) => arr[(arr.indexOf(cur) + d + arr.length) % arr.length];
      const items = [
        vol('master', 'VOLUME GERAL'), vol('music', 'MÚSICA'), vol('sfx', 'EFEITOS SONOROS'),
        { label: 'DIFICULDADE', sub: () => '◀ ' + DIFF_PT[S.difficulty] + ' ▶', onLeft: () => { S.difficulty = cyc(DIFF, S.difficulty, -1); save(); }, onRight: () => { S.difficulty = cyc(DIFF, S.difficulty, 1); save(); }, action: () => { S.difficulty = cyc(DIFF, S.difficulty, 1); save(); } },
        { label: 'VELOCIDADE DO TEXTO', sub: () => '◀ ' + SPD_PT[Math.max(0, SPD.indexOf(S.textSpeed))] + ' ▶', onLeft: () => { S.textSpeed = cyc(SPD, SPD.includes(S.textSpeed) ? S.textSpeed : 1, -1); save(); }, onRight: () => { S.textSpeed = cyc(SPD, SPD.includes(S.textSpeed) ? S.textSpeed : 1, 1); save(); }, action: () => { S.textSpeed = cyc(SPD, SPD.includes(S.textSpeed) ? S.textSpeed : 1, 1); save(); } },
        tog('shake', 'TREMOR DE TELA'), tog('hints', 'DICAS DE CONTROLE NA TELA'),
        { label: 'TELA CHEIA', sub: () => document.fullscreenElement ? 'SIM' : 'NÃO', action: () => { try { const r = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => R6.Toast.show('Tela cheia indisponível aqui.', { color: '#ff5a6a' })); } catch (e) { } } },
        { label: 'MOSTRAR FPS', sub: () => R6.Engine.showFps ? 'SIM' : 'NÃO', action: () => { R6.Engine.showFps = !R6.Engine.showFps; } },
      ];
      if (o.reset) items.push({ label: 'APAGAR TODO O PROGRESSO', color: '#ff3b5c', action: () => o.reset() });
      items.push({ sep: true }, { label: 'VOLTAR', icon: 'square', action: () => o.onBack && o.onBack() });
      this.menu = new R6.UI.Menu(items, { onBack: () => o.onBack && o.onBack() });
    }
    update(dt) { this.menu.update(dt); }
    draw(ctx, x, y, w) {
      R6.UI.panel(ctx, x - 20, y - 20, w + 40, 470, { fill: 'rgba(6,8,12,.9)', accent: true });
      this.menu.draw(ctx, x, y, w, 34, 4, { size: 17, align: 'left' });
      const S = R6.Save.settings;
      R6.UI.text(ctx, S.difficulty === 'extreme' ? 'EXTREMO: bots agressivos, tempos curtos, erros fatais.' : S.difficulty === 'hard' ? 'DIFÍCIL: menos tempo, IA mais esperta.' : 'NORMAL: a experiência recomendada.', x, y + 430, { size: 13, color: '#888', maxW: w });
    }
  }
  function bar(v) { const n = Math.round(v * 10); return '◀ ' + '■'.repeat(n) + '□'.repeat(10 - n) + ' ▶'; }
  R6.SettingsPanel = SettingsPanel;

  R6.SettingsScene = function () {
    let panel;
    const sc = R6.metaScene({
      name: 'settings', title: 'CONFIGURAÇÕES', sub: 'ÁUDIO · DIFICULDADE · TEXTO · TELA',
      enter() { panel = new SettingsPanel({ onBack: back, reset: () => R6.confirm('Apagar TODO o progresso? Fichas, compras, finais, galeria e o jogo salvo serão perdidos.', () => { R6.Save.resetAll(); R6.Toast.show('Progresso apagado.', { color: '#ff3b5c' }); go(R6.MenuScene()); }) }); },
      update(dt) { panel.update(dt); return 'stop'; },
      render(ctx) { panel.draw(ctx, 80, 160, 560); R6.UI.text(ctx, 'CONTROLES', 760, 180, { size: 22, fam: 'title', color: '#fff', spacing: 3 }); const K = [['WASD / SETAS', 'mover'], ['SHIFT', 'correr'], ['E', 'interagir / falar'], ['ESPAÇO', 'ação / pular'], ['J K L', 'soco · chute · agarrar'], ['I', 'bloquear'], ['C', 'agachar / furtivo'], ['TAB', 'relações (dormitório)'], ['5–8', 'emotes (dormitório)'], ['ESC / P', 'pausar'], ['F3', 'FPS']]; K.forEach(([k, l], i) => R6.UI.keyHint(ctx, k, l, 760, 220 + i * 34)); },
    });
    return sc;
  };

  // ================================================================ PAUSE MENU
  const Pause = {
    t: 0, sub: null, confirm: null,
    open() {
      Pause.t = 0; Pause.sub = null; Pause.confirm = null;
      const sc = R6.Engine.scene; const inCamp = R6.Campaign && R6.Campaign.active;
      const def = sc && ((sc.extraId && R6.EXTRAS && R6.EXTRAS.find(e => e.id === sc.extraId)) || (sc.gameId && R6.Games[sc.gameId]));
      const items = [{ label: 'CONTINUAR', icon: 'circle', action: () => R6.Engine.pause(false) }, { label: 'CONFIGURAÇÕES', icon: 'triangle', action: () => { Pause.sub = new SettingsPanel({ onBack: () => { Pause.sub = null; } }); } }];
      if (inCamp) {
        items.push({ label: 'SALVAR JOGO', icon: 'square', sub: 'checkpoint', action: () => { const d = R6.State.lastCheckpoint; if (d) { R6.Save.writeCampaign(JSON.parse(JSON.stringify(d))); R6.Toast.show('Jogo salvo · ' + R6.chapterLabel(d.label), { color: '#2ec4b6' }); } else R6.Toast.show('Nada para salvar ainda.', { color: '#ff5a6a' }); } });
        items.push({ label: 'REINICIAR DO CHECKPOINT', icon: 'circle', action: () => { Pause.confirm = { text: 'Voltar ao último checkpoint? O progresso deste capítulo será perdido.', yes: () => { R6.Engine.pause(false); R6.Campaign.retry(); } }; } });
      } else if (def) items.push({ label: 'REINICIAR', icon: 'circle', action: () => { R6.Engine.pause(false); R6.Engine.go(def.create(Object.assign({}, sc.opts)), { t: 'fade' }); } });
      items.push({ label: 'SAIR PARA O MENU', icon: 'square', color: '#ff3b5c', action: () => { Pause.confirm = { text: inCamp ? 'Sair para o menu? Você continuará do último checkpoint (salvo automaticamente).' : 'Sair para o menu?', yes: () => { R6.Engine.pause(false); R6.Engine.go(inCamp ? R6.MenuScene() : def && def.official != null ? R6.ExtrasScene() : def ? R6.GameSelectScene() : R6.MenuScene(), { t: 'fade' }); } }; } });
      Pause.menu = new R6.UI.Menu(items, { onBack: () => R6.Engine.pause(false) });
    },
    update(dt) {
      Pause.t += dt;
      if (Pause.t < 0.12) return;
      if (Pause.confirm) {
        const I = R6.Input; const c = Pause.confirm;
        if (I.actP('left') || I.actP('right') || I.actP('up') || I.actP('down')) { c.i = c.i ? 0 : 1; R6.Audio.sfx('hover'); }
        const m = I.mouse;
        if (m.pressed && U.rectHit(m.x, m.y, { x: 400, y: 386, w: 220, h: 44 })) { Pause.confirm = null; R6.Audio.sfx('back'); return; }
        if (m.pressed && U.rectHit(m.x, m.y, { x: 660, y: 386, w: 220, h: 44 })) { R6.Audio.sfx('confirm'); Pause.confirm = null; c.yes(); return; }
        if (I.actP('confirm')) { R6.Audio.sfx('confirm'); Pause.confirm = null; if (c.i) c.yes(); }
        else if (I.actP('back')) { Pause.confirm = null; R6.Audio.sfx('back'); }
        return;
      }
      if (Pause.sub) { Pause.sub.update(dt); return; }
      Pause.menu.update(dt);
    },
    render(ctx) {
      const k = U.ease.outCubic(Math.min(1, Pause.t * 5));
      ctx.save(); ctx.fillStyle = 'rgba(3,4,7,' + 0.86 * k + ')'; ctx.fillRect(0, 0, R6.W, R6.H); ctx.restore();
      R6.UI.text(ctx, 'PAUSA', 90 - (1 - k) * 40, 110, { size: 72, fam: 'title', color: '#fff', spacing: 8, alpha: k });
      ctx.fillStyle = R6.UI.T.accent; ctx.fillRect(90, 124, 160 * k, 3);
      if (Pause.sub) { Pause.sub.draw(ctx, 110, 170, 540); }
      else Pause.menu.draw(ctx, 90, 170, 380, 46, 8, { size: 19 });
      // campaign status panel
      const S = R6.State;
      if (S.s && !Pause.sub) {
        const x = 720, y = 150;
        R6.UI.panel(ctx, x, y, 500, 420, { fill: 'rgba(6,8,12,.9)', alpha: k });
        R6.Char.portrait(ctx, S.s.player.look, x + 60, y + 60, 90, 'neutral', R6.Engine.rt, false);
        R6.UI.text(ctx, '#' + U.pad(S.s.player.num) + '  ' + S.s.player.name, x + 118, y + 44, { size: 22, weight: 800, color: '#fff', maxW: 360 });
        const sc = R6.Engine.scene;
        const where = R6.Campaign && R6.Campaign.active ? 'TEMPORADA ' + S.s.season + ' · ' + R6.chapterLabel(R6.Campaign.CH[R6.Campaign.idx] && R6.Campaign.CH[R6.Campaign.idx].id) : (sc && (sc.title || (sc.rules && (() => { try { const r = sc.rules(); return r && r.title; } catch (e) { return null; } })()))) || 'TREINO';
        R6.UI.text(ctx, where, x + 118, y + 70, { size: 14, color: R6.UI.T.accent, weight: 800, maxW: 360 });
        R6.UI.text(ctx, 'PRÊMIO ' + U.money(S.s.prize) + '   ·   VIVOS ' + S.alive, x + 118, y + 94, { size: 14, fam: 'mono', color: '#f2c14e', maxW: 370 });
        R6.UI.text(ctx, 'ALIADOS', x + 24, y + 150, { size: 13, color: '#999', weight: 800, spacing: 3 });
        const al = S.allies(40).slice(0, 5);
        if (!al.length) R6.UI.text(ctx, 'Ninguém. Por enquanto.', x + 24, y + 176, { size: 15, color: '#777' });
        al.forEach((p, i) => { R6.Char.portrait(ctx, p.look, x + 42, y + 180 + i * 40, 32, 'neutral', R6.Engine.rt, false); R6.UI.text(ctx, '#' + U.pad(p.num) + ' ' + (p.key ? p.name : ''), x + 66, y + 186 + i * 40, { size: 15, weight: 700, color: p.key ? '#ffd166' : '#ddd', maxW: 170 }); R6.UI.bar(ctx, x + 66, y + 192 + i * 40, 140, 4, (p.rel + 100) / 200, { color: '#2ec4b6' }); });
        R6.UI.text(ctx, 'INVENTÁRIO', x + 270, y + 150, { size: 13, color: '#999', weight: 800, spacing: 3 });
        const inv = Object.keys(S.s.player.inv);
        if (!inv.length) R6.UI.text(ctx, 'Vazio.', x + 270, y + 176, { size: 15, color: '#777' });
        inv.slice(0, 8).forEach((id, i) => { const I = R6.ITEMS[id] || { name: id }; R6.UI.text(ctx, '▪ ' + I.name + (S.s.player.inv[id] > 1 ? ' ×' + S.s.player.inv[id] : ''), x + 270, y + 176 + i * 24, { size: 15, color: '#eee', maxW: 210 }); });
        R6.UI.text(ctx, 'Salvamento automático a cada capítulo. Dificuldade: ' + ({ normal: 'Normal', hard: 'Difícil', extreme: 'Extremo' })[R6.Save.diff()], x + 24, y + 400, { size: 12, color: '#777' });
      }
      if (Pause.confirm) {
        const c = Pause.confirm; c.i = c.i || 0;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, R6.W, R6.H);
        R6.UI.panel(ctx, 340, 270, 600, 180, { fill: 'rgba(8,10,14,.97)', accent: true });
        R6.UI.para(ctx, c.text, 370, 296, 540, { size: 18 });
        R6.UI.button(ctx, 400, 386, 220, 44, 'NÃO', { hover: !c.i });
        R6.UI.button(ctx, 660, 386, 220, 44, 'SIM', { hover: !!c.i, color: '#ff3b5c' });
      }
    },
  };
  R6.PauseMenu = Pause;

  // ================================================================ SEASON SELECT
  R6.SeasonSelectScene = function () {
    const SEAS = [
      { n: 1, name: 'TEMPORADA 1', sub: 'O PRIMEIRO JOGO', desc: '456 endividados. Seis jogos de infância. Um porquinho que enche a cada morte.', games: 'Ddakji · Batatinha Frita · Dalgona · Cabo de Guerra · Bolinhas · Ponte de Vidro · Squid Game', icon: 'circle', col: '#e8336d' },
      { n: 2, name: 'TEMPORADA 2', sub: 'O RETORNO', desc: 'Você voltou para acabar com isso. Votações a cada rodada. Um infiltrado entre os jogadores.', games: 'Pão ou Loteria · Pedra-Papel-Tesoura · Batatinha · Seis Pernas · Mingle · A Revolta', icon: 'triangle', col: '#3a86ff' },
      { n: 3, name: 'TEMPORADA 3', sub: 'O ÚLTIMO JOGO', desc: 'Depois da revolta. Chaves, facas, uma corda e três torres no céu.', games: 'Esconde-Esconde · Pular Corda · Sky Squid Game · A Fuga', icon: 'square', col: '#f2c14e' },
    ];
    let i = 0;
    return R6.metaScene({
      name: 'seasons', title: 'SELEÇÃO DE TEMPORADA', sub: 'COMECE A CAMPANHA A PARTIR DE UMA TEMPORADA DESBLOQUEADA',
      update(dt, sc) {
        const I = R6.Input;
        if (I.actP('left')) { i = (i + 2) % 3; R6.Audio.sfx('hover'); } if (I.actP('right')) { i = (i + 1) % 3; R6.Audio.sfx('hover'); }
        const m = I.mouse; for (let k = 0; k < 3; k++) { const r = { x: 80 + k * 380, y: 170, w: 350, h: 440 }; if ((m.moved || m.pressed) && U.rectHit(m.x, m.y, r)) { if (i !== k) { i = k; R6.Audio.sfx('hover'); } if (m.pressed) sel(); } }
        if (I.actP('confirm')) sel();
        function sel() { const s = SEAS[i]; if (s.n > R6.Save.meta.seasonsUnlocked) { R6.Audio.sfx('error'); R6.Toast.show('Chegue à ' + s.name + ' na campanha para desbloquear.', { color: '#ff5a6a' }); return; } R6.Audio.sfx('confirm'); const start = () => go(R6.CreationScene({ season: s.n })); if (R6.Save.hasCampaign()) R6.confirm('Começar pela ' + s.name + ' substitui o jogo salvo atual. Continuar?', start); else start(); }
      },
      render(ctx, sc) {
        SEAS.forEach((s, k) => {
          const x = 80 + k * 380, y = 170, hov = k === i, locked = s.n > R6.Save.meta.seasonsUnlocked;
          const lift = hov ? -8 : 0;
          R6.UI.panel(ctx, x, y + lift, 350, 440, { fill: hov ? 'rgba(14,16,22,.95)' : 'rgba(8,10,14,.85)', stroke: hov ? s.col : undefined, lw: hov ? 2 : 1 });
          ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + lift + 1, 348, 200); ctx.clip();
          const g = ctx.createLinearGradient(x, y, x, y + 200); g.addColorStop(0, U.rgba(s.col, 0.35)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y + lift, 350, 200);
          const t = sc.t;
          if (s.n === 1) { R6.Props.doll(ctx, x + 175, y + lift + 200, 0.55, { t, face: (Math.sin(t * 0.8) + 1) / 2 }); }
          else if (s.n === 2) { R6.UI.shapeIcon(ctx, 'o', x + 120, y + lift + 100, 44, '#3a86ff', 10); R6.UI.shapeIcon(ctx, 'x', x + 235, y + lift + 100, 36, '#ff3b5c', 10); }
          else { for (let q = 0; q < 3; q++) { ctx.fillStyle = '#8a93a0'; ctx.fillRect(x + 70 + q * 80, y + lift + 60 + q * 20, 50, 160); R6.UI.shapeIcon(ctx, ['square', 'triangle', 'circle'][q], x + 95 + q * 80, y + lift + 90 + q * 20, 12, '#fff', 3); } }
          ctx.restore();
          if (locked) { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x, y + lift, 350, 440); R6.UI.text(ctx, 'BLOQUEADA', x + 175, y + lift + 230, { size: 34, fam: 'title', align: 'center', color: '#888', spacing: 5 }); R6.UI.text(ctx, 'Alcance esta temporada na campanha.', x + 175, y + lift + 260, { size: 14, align: 'center', color: '#777' }); return; }
          R6.UI.text(ctx, s.name, x + 24, y + lift + 240, { size: 40, fam: 'title', color: '#fff', spacing: 3 });
          R6.UI.text(ctx, s.sub, x + 24, y + lift + 266, { size: 14, color: s.col, weight: 800, spacing: 3 });
          R6.UI.para(ctx, s.desc, x + 24, y + lift + 284, 300, { size: 15, color: '#ccc' });
          R6.UI.para(ctx, s.games, x + 24, y + lift + 360, 300, { size: 13, color: '#888' });
        });
      },
    });
  };

  // ================================================================ GAME SELECT (practice)
  R6.GameSelectScene = function () {
    const order = { 1: ['ddakji', 'redlight', 'dalgona', 'tugofwar', 'marbles', 'glassbridge', 'squidfinal'], 2: ['breadlottery', 'rps', 'redlight2', 'sixlegs', 'stone', 'gonggi', 'top', 'jegi', 'mingle', 'revolt'], 3: ['hideseek', 'jumprope', 'skysquid', 'escape'] };
    let tab = 1, i = 0, code = '';
    const list = () => order[tab].filter(id => R6.Games[id]);
    const unlocked = id => { const g = R6.Games[id]; const m = R6.Save.meta; if (m.gamesUnlocked[id] || m.allUnlocked) return true; if (['stone', 'gonggi', 'top', 'jegi'].includes(id)) return !!m.gamesUnlocked.sixlegs; return g.season === 1 && m.seasonsUnlocked > 1; };
    const play = () => { const id = list()[i]; if (!unlocked(id)) { R6.Audio.sfx('error'); R6.Toast.show('Jogue a campanha até este jogo para desbloquear.', { color: '#ff5a6a' }); return; } R6.Audio.sfx('confirm'); R6.practiceState(); go(R6.Games[id].create({ mode: 'practice' })); };
    const hook = e => { if (R6.Engine.scene && R6.Engine.scene.name === 'gameselect' && /^[0-9]$/.test(e.key)) { code = (code + e.key).slice(-3); if (code === '456' && !R6.Save.meta.allUnlocked) { R6.Save.meta.allUnlocked = true; R6.Save.meta.seasonsUnlocked = 3; R6.Save.saveMeta(); R6.Audio.sfx('win'); R6.Banner.show('MODO LIBERADO', 'Todos os jogos e temporadas desbloqueados', { color: '#f2c14e' }); } } };
    return R6.metaScene({
      name: 'gameselect', title: 'SELEÇÃO DE JOGO', sub: 'MODO TREINO · SEM CONSEQUÊNCIAS NA CAMPANHA',
      enter() { R6.Input.onKeyHooks.push(hook); }, exit() { const k = R6.Input.onKeyHooks.indexOf(hook); if (k >= 0) R6.Input.onKeyHooks.splice(k, 1); },
      update(dt, sc) {
        const I = R6.Input, L = list(), cols = 4;
        if (I.pressed('KeyQ') || I.pressed('PageUp')) { tab = tab === 1 ? 3 : tab - 1; i = 0; R6.Audio.sfx('hover'); }
        if (I.pressed('KeyE') || I.pressed('PageDown') || I.actP('tab')) { tab = tab === 3 ? 1 : tab + 1; i = 0; R6.Audio.sfx('hover'); }
        if (I.actP('left')) { i = Math.max(0, i - 1); R6.Audio.sfx('hover'); } if (I.actP('right')) { i = Math.min(L.length - 1, i + 1); R6.Audio.sfx('hover'); }
        if (I.actP('up')) { if (i - cols >= 0) i -= cols; R6.Audio.sfx('hover'); } if (I.actP('down')) { if (i + cols < L.length) i += cols; R6.Audio.sfx('hover'); }
        const m = I.mouse;
        if (I.pressed('KeyZ') || (m.pressed && U.rectHit(m.x, m.y, { x: 900, y: 136, w: 330, h: 34 }))) { const D = ['normal', 'hard', 'extreme']; const S = R6.Save.settings; S.difficulty = D[(D.indexOf(S.difficulty) + 1) % 3]; R6.Save.saveSettings(); R6.Audio.sfx('tick'); }
        for (let t = 1; t <= 3; t++) { const r = { x: 60 + (t - 1) * 170, y: 134, w: 160, h: 34 }; if (m.pressed && U.rectHit(m.x, m.y, r)) { tab = t; i = 0; R6.Audio.sfx('hover'); } }
        L.forEach((id, k) => { const r = { x: 60 + (k % cols) * 292, y: 186 + Math.floor(k / cols) * 150, w: 276, h: 136 }; if ((m.moved || m.pressed) && U.rectHit(m.x, m.y, r)) { if (i !== k) { i = k; R6.Audio.sfx('hover'); } if (m.pressed) play(); } });
        if (I.actP('confirm')) play();
      },
      hints: [['←→↑↓', 'jogo'], ['Q/E', 'temporada'], ['Z', 'dificuldade'], ['ENTER', 'jogar'], ['ESC', 'voltar']],
      render(ctx, sc) {
        for (let t = 1; t <= 3; t++) R6.UI.button(ctx, 60 + (t - 1) * 170, 134, 160, 34, 'TEMPORADA ' + t, { hover: t === tab, size: 16 });
        R6.UI.text(ctx, 'DIFICULDADE: ' + ({ normal: 'NORMAL', hard: 'DIFÍCIL', extreme: 'EXTREMO' })[R6.Save.diff()] + (R6.Input.lastDevice === 'touch' ? '  (tocar)' : '  (Z)'), 1220, 160, { size: 15, align: 'right', color: '#f2c14e', weight: 800 });
        list().forEach((id, k) => {
          const g = R6.Games[id], x = 60 + (k % 4) * 292, y = 186 + Math.floor(k / 4) * 150, hov = k === i, un = unlocked(id);
          R6.UI.panel(ctx, x, y, 276, 136, { fill: hov ? 'rgba(18,20,28,.96)' : 'rgba(8,10,14,.86)', stroke: hov ? R6.UI.T.accent : undefined, lw: hov ? 2 : 1 });
          R6.UI.shapeIcon(ctx, g.icon || 'circle', x + 36, y + 40, 18, un ? (hov ? R6.UI.T.accent : '#ddd') : '#555', 3.5);
          R6.UI.text(ctx, un ? g.name : '???', x + 66, y + 46, { size: 19, weight: 800, color: un ? '#fff' : '#666', maxW: 196 });
          R6.UI.para(ctx, un ? g.desc || '' : 'Bloqueado — avance na campanha.', x + 20, y + 70, 240, { size: 13, color: un ? '#aaa' : '#555', maxLines: 2 });
          const b = R6.Save.meta.best[id] || R6.Save.meta.best['practice_' + id];
          if (un && b != null) R6.UI.text(ctx, 'RECORDE ' + b, x + 256, y + 124, { size: 12, align: 'right', color: '#f2c14e', fam: 'mono' });
          if (!un) R6.UI.text(ctx, '🔒', x + 250, y + 30, { size: 16, align: 'right', color: '#666' });
        });
      },
    });
  };

  // ================================================================ EXTRAS
  R6.ExtrasScene = function () {
    let i = 0;
    const L = () => R6.EXTRAS || [];
    const play = () => { const e = L()[i]; if (!e) return; R6.Audio.sfx('confirm'); R6.practiceState(); go(e.create({ mode: 'extra' })); };
    return R6.metaScene({
      name: 'extras', title: 'DESAFIOS EXTRAS', sub: 'VARIANTES DOS JOGOS OFICIAIS + JOGOS ORIGINAIS · GANHE FICHAS PARA A LOJA',
      update(dt) {
        const I = R6.Input, n = L().length;
        if (I.actP('up')) { i = (i + n - 1) % n; R6.Audio.sfx('hover'); } if (I.actP('down')) { i = (i + 1) % n; R6.Audio.sfx('hover'); }
        if (I.actP('left') || I.actP('right')) { const off = L().filter(e => e.official).length; i = i < off ? Math.min(n - 1, off + (i % Math.max(1, n - off))) : Math.min(off - 1, i - off); R6.Audio.sfx('hover'); }
        if (I.pressed('KeyL') || (I.mouse.pressed && U.rectHit(I.mouse.x, I.mouse.y, { x: 960, y: 670, w: 280, h: 30 }))) { go(R6.ShopScene(() => go(R6.ExtrasScene()))); return 'stop'; }
        const m = I.mouse;
        L().forEach((e, k) => { const r = rect(k); if ((m.moved || m.pressed) && U.rectHit(m.x, m.y, r)) { if (i !== k) { i = k; R6.Audio.sfx('hover'); } if (m.pressed) play(); } });
        if (I.actP('confirm')) play();
      },
      hints: [['↑↓←→', 'escolher'], ['ENTER', 'jogar'], ['L', 'loja'], ['ESC', 'voltar']],
      render(ctx, sc) {
        const off = L().filter(e => e.official).length;
        R6.UI.text(ctx, 'VARIANTES OFICIAIS', 60, 158, { size: 15, color: '#2ec4b6', weight: 800, spacing: 3 });
        R6.UI.text(ctx, 'JOGOS ORIGINAIS — EXTRA (NÃO OFICIAIS DA SÉRIE)', 660, 158, { size: 15, color: '#e8336d', weight: 800, spacing: 3 });
        L().forEach((e, k) => {
          const r = rect(k), hov = k === i;
          R6.UI.panel(ctx, r.x, r.y, r.w, r.h, { fill: hov ? 'rgba(18,20,28,.96)' : 'rgba(8,10,14,.84)', stroke: hov ? (e.official ? '#2ec4b6' : '#e8336d') : undefined, lw: hov ? 2 : 1, r: 4 });
          R6.UI.shapeIcon(ctx, e.icon || 'circle', r.x + 22, r.y + r.h / 2, 10, hov ? '#fff' : '#999', 2.5);
          R6.UI.text(ctx, e.name, r.x + 44, r.y + 22, { size: 16, weight: 800, color: '#fff', maxW: r.w - 150 });
          R6.UI.text(ctx, e.desc || '', r.x + 44, r.y + 40, { size: 12, color: '#999', maxW: r.w - 60 });
          const best = R6.Save.meta.best['extra_' + e.id] != null ? R6.Save.meta.best['extra_' + e.id] : R6.Save.meta.best[{ redlight_endless: 'rl_endless', glass_endless: 'glass_endless', jumprope_survival: 'jr_survival' }[e.id]];
          if (best != null) R6.UI.text(ctx, '★ ' + best, r.x + r.w - 14, r.y + 22, { size: 14, align: 'right', color: '#f2c14e', fam: 'mono' });
        });
        // right-bottom: shop teaser
        R6.UI.text(ctx, 'L — LOJA DE COSMÉTICOS', 1220, 690, { size: 14, align: 'right', color: '#f2c14e', weight: 800 });
        function _() { } _(off);
      },
    });
    function rect(k) { const off = (R6.EXTRAS || []).filter(e => e.official).length; const col = k < off ? 0 : 1; const row = k < off ? k : k - off; return { x: 60 + col * 600, y: 172 + row * 50, w: 560, h: 46 }; }
  };

  // ================================================================ SHOP
  R6.ShopScene = function (onBack) {
    let cat = 0, i = 0, focus = 'cat';
    const items = () => SHOP.filter(it => it.cat === CATS[cat].id);
    const owned = id => !!R6.Save.meta.owned[id];
    const isEq = it => { const s = CATS.find(c => c.id === it.cat).slot; return s ? R6.Save.meta.equipped[s] === it.id : owned(it.id); };
    const fx = new R6.Particles(300);
    const buy = () => {
      const it = items()[i]; if (!it) return; const m = R6.Save.meta; const slot = CATS[cat].slot;
      if (owned(it.id)) { if (slot) { m.equipped[slot] = it.id; R6.Save.saveMeta(); R6.Audio.sfx('confirm'); if (it.track) R6.Music.play(it.track); R6.Toast.show('Equipado: ' + it.name, { color: '#2ec4b6' }); } return; }
      if (it.req && !it.req()) { R6.Audio.sfx('error'); R6.Toast.show('Requisito não cumprido: ' + it.desc.replace('Requer: ', ''), { color: '#ff5a6a' }); return; }
      if (m.chips < it.price) { R6.Audio.sfx('error'); R6.Toast.show('Fichas insuficientes. Jogue os DESAFIOS EXTRAS para ganhar mais.', { color: '#ff5a6a' }); return; }
      m.chips -= it.price; m.owned[it.id] = true; if (slot) m.equipped[slot] = it.id; R6.Save.saveMeta();
      R6.Audio.sfx('money'); R6.Audio.sfx('win', { vol: 0.4 }); for (let k = 0; k < 30; k++) fx.emit('confetti', 900, 360, 1);
      if (it.track) R6.Music.play(it.track);
      R6.Toast.show('Comprado: ' + it.name, { color: '#f2c14e' });
    };
    const pl = () => { const pr = R6.Save.meta.profile; return pr ? JSON.parse(JSON.stringify(pr.look)) : R6.Char.makeLook({ num: 456, seed: 4560, hs: 'short', hair: '#1d1612', skin: '#dcae87', fem: false, age: 1, glasses: false, beard: null }); };
    const look = pl();
    return R6.metaScene({
      name: 'shop', title: 'LOJA', sub: 'COSMÉTICOS · SEM VANTAGEM NOS JOGOS · COMPRE COM FICHAS',
      back: onBack || back,
      update(dt, sc) {
        fx.update(dt);
        const I = R6.Input;
        if (focus === 'cat') {
          if (I.actP('up')) { cat = (cat + CATS.length - 1) % CATS.length; i = 0; R6.Audio.sfx('hover'); }
          if (I.actP('down')) { cat = (cat + 1) % CATS.length; i = 0; R6.Audio.sfx('hover'); }
          if (I.actP('right') || I.actP('confirm')) { focus = 'item'; R6.Audio.sfx('hover'); }
        } else {
          const n = items().length;
          if (I.actP('up')) { i = (i + n - 1) % n; R6.Audio.sfx('hover'); } if (I.actP('down')) { i = (i + 1) % n; R6.Audio.sfx('hover'); }
          if (I.actP('left')) { focus = 'cat'; R6.Audio.sfx('hover'); }
          if (I.actP('confirm')) buy();
        }
        const m = I.mouse;
        CATS.forEach((c, k) => { const r = { x: 60, y: 150 + k * 44, w: 250, h: 38 }; if (m.pressed && U.rectHit(m.x, m.y, r)) { cat = k; i = 0; focus = 'item'; R6.Audio.sfx('hover'); } });
        items().forEach((it, k) => { const r = { x: 330, y: 150 + k * 60, w: 440, h: 54 }; if ((m.moved || m.pressed) && U.rectHit(m.x, m.y, r)) { focus = 'item'; if (i !== k) { i = k; R6.Audio.sfx('hover'); } if (m.pressed) buy(); } });
      },
      render(ctx, sc) {
        const t = sc.t;
        CATS.forEach((c, k) => R6.UI.button(ctx, 60, 150 + k * 44, 250, 38, c.name, { hover: k === cat, size: 15, align: 'left', color: focus === 'cat' ? undefined : '#666' }));
        items().forEach((it, k) => {
          const x = 330, y = 150 + k * 60, hov = k === i && focus === 'item', ow = owned(it.id), eq = isEq(it), lockedReq = it.req && !it.req() && !ow;
          R6.UI.panel(ctx, x, y, 440, 54, { fill: hov ? 'rgba(20,22,30,.96)' : 'rgba(8,10,14,.86)', stroke: hov ? R6.UI.T.accent : eq ? '#2ec4b6' : undefined, lw: hov || eq ? 2 : 1, r: 4 });
          R6.UI.text(ctx, it.name, x + 16, y + 24, { size: 17, weight: 800, color: lockedReq ? '#777' : '#fff', maxW: 280 });
          R6.UI.text(ctx, it.desc, x + 16, y + 43, { size: 12, color: '#999', maxW: 300 });
          R6.UI.text(ctx, eq ? 'EQUIPADO' : ow ? 'EQUIPAR' : it.price === 0 ? 'GRÁTIS' : '◉ ' + it.price, x + 426, y + 33, { size: 15, align: 'right', weight: 800, fam: ow ? 'body' : 'mono', color: eq ? '#2ec4b6' : ow ? '#ddd' : R6.Save.meta.chips >= it.price ? '#f2c14e' : '#a55' });
        });
        // preview
        const it = items()[i] || items()[0]; const px = 1010, py = 520;
        R6.UI.panel(ctx, 800, 150, 420, 460, { fill: 'rgba(8,10,14,.8)' });
        R6.UI.text(ctx, 'PRÉVIA', 1010, 180, { size: 13, align: 'center', color: '#888', weight: 800, spacing: 4 });
        const L2 = Object.assign({}, look);
        let anim = 'idle';
        if (it) {
          if (it.cat === 'outfit' && it.colors) L2.outfitColors = it.colors;
          else if (it.cat === 'outfit') { /* default */ } else { const oc = R6.SHOP_OUTFITS[R6.Save.meta.equipped.outfit]; if (oc) L2.outfitColors = oc; }
          if (it.cat === 'anim') anim = it.anim;
          if (it.cat === 'emote') anim = R6.EMOTES[it.id] ? R6.EMOTES[it.id].anim : 'wave';
          if (it.cat === 'number' && it.num) L2.num = it.num === 1000 ? 0.0001 : it.num;
          if (it.cat === 'fx' && it.p && Math.random() < 0.4) fx.emit(it.p, px + U.rand(-30, 30), py - 10, 1, { vy: -30 });
          if (it.cat === 'victory') { if (it.shapes) { if (Math.random() < 0.3) fx.emit('confetti', U.rand(820, 1200), 190, 1); } else if (Math.random() < 0.3) fx.emit(it.p, U.rand(820, 1200), 190, 1); anim = R6.VictoryFX.anim(); }
        }
        ctx.save(); ctx.beginPath(); ctx.rect(800, 150, 420, 460); ctx.clip();
        fx.draw(ctx);
        if (it && it.cat === 'ui') {
          const T = R6.UI.THEMES[it.id];
          R6.UI.panel(ctx, 850, 240, 320, 200, { fill: T.panel, stroke: T.line, accent: T.accent });
          R6.UI.text(ctx, 'PRIZE MONEY', 880, 280, { size: 13, color: T.dim, weight: 800, spacing: 2 }); R6.UI.text(ctx, '₩45,600,000,000', 880, 312, { size: 26, fam: 'mono', color: T.gold });
          R6.UI.button(ctx, 880, 350, 260, 40, 'CONTINUAR', { hover: true, color: T.accent }); R6.UI.text(ctx, 'Texto de exemplo', 880, 420, { size: 15, color: T.text });
        } else if (it && it.cat === 'title') {
          R6.UI.panel(ctx, 850, 280, 320, 70, { fill: 'rgba(6,8,12,.9)' }); R6.Char.portrait(ctx, look, 885, 315, 54, 'neutral', t, false);
          R6.UI.text(ctx, '#' + U.pad(look.num || 456) + '  ' + (R6.Save.meta.profile ? R6.Save.meta.profile.name : 'Jogador'), 922, 308, { size: 17, weight: 800, color: '#fff' });
          R6.UI.text(ctx, (it.id !== 'title_none' ? it.name + ' · ' : '') + 'STATUS: OK', 922, 330, { size: 12, weight: 700, color: '#8bd17c' });
        } else if (it && it.cat === 'track') {
          for (let k = 0; k < 24; k++) { const h = 20 + Math.abs(Math.sin(t * 3 + k * 0.7)) * 90 * (R6.Music.curName === it.track ? 1 : 0.2); ctx.fillStyle = R6.UI.T.accent; ctx.fillRect(840 + k * 14, 420 - h, 9, h); }
          R6.UI.text(ctx, R6.Music.curName === it.track ? '♪ TOCANDO' : 'ENTER para ouvir/equipar', 1010, 470, { size: 14, align: 'center', color: '#ccc' });
        } else {
          R6.Char.draw(ctx, L2, px, py, { view: it && (it.cat === 'anim' || it.cat === 'emote') && ['bow', 'spin'].includes(anim) ? 'side' : 'front', anim, t, scale: 2.6 });
        }
        ctx.restore();
        if (it && it.cat === 'outfit') R6.UI.text(ctx, 'Usado apenas nos DESAFIOS EXTRAS. Na campanha o uniforme verde é obrigatório.', 1010, 596, { size: 12, align: 'center', color: '#888', maxW: 400 });
        if (it && it.cat === 'emote') R6.UI.text(ctx, 'Use com as teclas 5–8 no dormitório.', 1010, 596, { size: 12, align: 'center', color: '#888' });
      },
      hints: [['↑↓', 'navegar'], ['←→', 'categoria/itens'], ['ENTER', 'comprar/equipar'], ['ESC', 'voltar']],
    });
  };

  // ================================================================ GALLERY
  R6.GalleryScene = function () {
    const TABS = ['PERSONAGENS', 'FINAIS', 'CENAS', 'ESTATÍSTICAS'];
    let tab = 0, i = 0;
    const chars = [];
    for (const s of [1, 2]) { const K = R6.Roster.KEYS[s] || {}; for (const k in K) chars.push({ key: k, season: s, d: K[k], look: R6.Char.makeLook(Object.assign({ num: K[k].num, seed: K[k].num * 13 + s, beard: null, glasses: false }, K[k].look), new U.RNG(K[k].num * 13 + s)) }); }
    chars.push({ key: 'guard', season: 1, d: { name: 'Guarda', num: 0, arch: '—', bio: 'Macacão rosa, máscara com uma forma. Círculos trabalham, triângulos armam, quadrados mandam.' }, look: R6.Char.makeLook({ outfit: 'guard', mask: 'square', seed: 3 }) });
    chars.push({ key: 'frontman', season: 1, d: { name: 'Front Man', num: 0, arch: '—', bio: 'Máscara negra angulosa. Observa tudo das telas. Diz que o jogo é igualdade.' }, look: R6.Char.makeLook({ outfit: 'frontman', seed: 4 }) });
    chars.push({ key: 'recruiter', season: 1, d: { name: 'O Recrutador', num: 0, arch: '—', bio: 'Terno impecável, maleta com dois ddakji. Um tapa para cada derrota.' }, look: R6.Char.makeLook({ outfit: 'suit', hs: 'slick', hair: '#1a1411', skin: '#e9c3a0', seed: 77, glasses: false, beard: null }) });
    const seen = c => R6.Save.meta.allUnlocked || R6.Save.meta.seasonsUnlocked >= c.season && (c.season === 1 ? true : R6.Save.meta.seasonsUnlocked >= 2) || R6.Save.meta.gallery['char_' + c.key];
    const endIds = Object.keys(R6.ENDINGS || {});
    const scenes = () => Object.entries(R6.Save.meta.scenes || {});
    const count = () => [chars.length, endIds.length, Math.max(1, scenes().length), 1][tab];
    const replayEnding = id => { R6.practiceState(); R6.Endings.play(id, () => go(R6.GalleryScene())); };
    const TR = [['courage', 'CORAGEM'], ['intel', 'INTELIGÊNCIA'], ['str', 'FORÇA'], ['spd', 'VELOCIDADE'], ['trust', 'CONFIANÇA'], ['fear', 'MEDO'], ['loyalty', 'LEALDADE'], ['betray', 'TRAIÇÃO']];
    return R6.metaScene({
      name: 'gallery', title: 'GALERIA', sub: 'PERSONAGENS · FINAIS · CENAS · ESTATÍSTICAS',
      update(dt) {
        const I = R6.Input;
        if (I.pressed('KeyQ') || I.actP('left') && tab !== 0) { tab = (tab + 3) % 4; i = 0; R6.Audio.sfx('hover'); }
        else if (I.pressed('KeyE') || I.actP('right') && tab !== 0 || I.actP('tab')) { tab = (tab + 1) % 4; i = 0; R6.Audio.sfx('hover'); }
        else if (tab === 0 && (I.actP('left') || I.actP('right'))) { const c = 2; i = U.clamp(i + (I.actP('left') ? -9 : 9), 0, chars.length - 1); void c; R6.Audio.sfx('hover'); }
        if (I.actP('up')) { i = Math.max(0, i - 1); R6.Audio.sfx('hover'); } if (I.actP('down')) { i = Math.min(count() - 1, i + 1); R6.Audio.sfx('hover'); }
        const m = I.mouse; TABS.forEach((_, k) => { if (m.pressed && U.rectHit(m.x, m.y, { x: 60 + k * 190, y: 134, w: 180, h: 34 })) { tab = k; i = 0; R6.Audio.sfx('hover'); } });
        // tap a row: select it; tap the selected row again: open/replay it
        if (m.pressed && tab < 3) {
          const n = count(), rowH = tab === 1 ? 64 : 42, top = tab === 1 ? 0 : Math.max(0, Math.min(i - 5, n - 11)), w = tab === 0 ? 380 : tab === 1 ? 1160 : 760;
          const k = Math.floor((m.y - 186) / rowH);
          if (m.x >= 60 && m.x <= 60 + w && k >= 0 && top + k < n) { const idx = top + k; if (idx === i && tab > 0) R6.Input.simTap('Enter'); else { i = idx; R6.Audio.sfx('hover'); } }
        }
        if (I.actP('confirm')) {
          if (tab === 1) { const id = endIds[i]; if (R6.Save.meta.endings[id]) { R6.Audio.sfx('confirm'); replayEnding(id); } else R6.Audio.sfx('error'); }
          if (tab === 2) { const s = scenes()[i]; if (s) { const id = s[0]; if (id.startsWith('ending_')) replayEnding(id.slice(7)); else if (id === 'credits') go(R6.CreditsScene(() => go(R6.GalleryScene()))); else R6.Audio.sfx('error'); } }
        }
      },
      hints: [['Q/E', 'aba'], ['↑↓', 'navegar'], ['ENTER', 'rever'], ['ESC', 'voltar']],
      render(ctx, sc) {
        const t = sc.t;
        TABS.forEach((n, k) => R6.UI.button(ctx, 60 + k * 190, 134, 180, 34, n, { hover: k === tab, size: 15 }));
        if (tab === 0) {
          const top = Math.max(0, Math.min(i - 5, chars.length - 11));
          chars.slice(top, top + 11).forEach((c, k) => {
            const idx = top + k, hov = idx === i, ok = seen(c);
            R6.UI.panel(ctx, 60, 186 + k * 42, 380, 38, { fill: hov ? 'rgba(20,22,30,.96)' : 'rgba(8,10,14,.85)', stroke: hov ? R6.UI.T.accent : undefined, r: 4, shadow: false });
            if (ok) R6.Char.portrait(ctx, c.look, 80, 205 + k * 42, 30, 'neutral', t, false); else { ctx.fillStyle = '#222'; ctx.fillRect(65, 190 + k * 42, 30, 30); }
            R6.UI.text(ctx, ok ? (c.d.num ? '#' + U.pad(c.d.num) + '  ' : '') + c.d.name : '???', 106, 211 + k * 42, { size: 16, weight: 800, color: ok ? '#fff' : '#555' });
            R6.UI.text(ctx, 'T' + c.season, 426, 211 + k * 42, { size: 12, align: 'right', color: '#777' });
          });
          const c = chars[i]; const ok = seen(c);
          R6.UI.panel(ctx, 470, 186, 750, 460, { fill: 'rgba(8,10,14,.86)' });
          if (!ok) { R6.UI.text(ctx, 'AINDA NÃO ENCONTRADO', 845, 420, { size: 30, fam: 'title', align: 'center', color: '#555', spacing: 4 }); return; }
          ctx.save(); ctx.beginPath(); ctx.rect(470, 186, 300, 460); ctx.clip();
          const g = ctx.createRadialGradient(620, 420, 20, 620, 420, 260); g.addColorStop(0, 'rgba(232,51,109,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(470, 186, 300, 460);
          R6.Char.draw(ctx, c.look, 620, 610, { view: 'front', anim: 'idle', t, scale: 3.3 });
          ctx.restore();
          R6.UI.text(ctx, c.d.name, 790, 236, { size: 36, fam: 'title', color: '#fff', spacing: 2 });
          R6.UI.text(ctx, (c.d.num ? 'JOGADOR #' + U.pad(c.d.num) + ' · ' : '') + 'TEMPORADA ' + c.season + (c.d.arch && c.d.arch !== '—' ? ' · ' + (R6.Roster.ARCH_PT[c.d.arch] || c.d.arch).toUpperCase() : ''), 790, 262, { size: 14, color: R6.UI.T.accent, weight: 800, spacing: 2 });
          R6.UI.para(ctx, c.d.bio || '', 790, 280, 400, { size: 16, color: '#ccc' });
          if (c.d.t) TR.forEach(([k, l], j) => { const y = 400 + j * 28; R6.UI.text(ctx, l, 790, y + 9, { size: 12, color: '#999', weight: 800, spacing: 1 }); R6.UI.bar(ctx, 920, y, 270, 9, c.d.t[k] != null ? c.d.t[k] : 0.5, { color: k === 'betray' || k === 'fear' ? '#ff5a6a' : '#2ec4b6' }); });
        } else if (tab === 1) {
          endIds.forEach((id, k) => {
            const E = R6.ENDINGS[id], got = R6.Save.meta.endings[id], hov = k === i;
            R6.UI.panel(ctx, 60, 186 + k * 64, 1160, 58, { fill: hov ? 'rgba(20,22,30,.96)' : 'rgba(8,10,14,.85)', stroke: hov ? R6.UI.T.accent : undefined, r: 4, shadow: false });
            R6.UI.text(ctx, got ? E.title : '??? — FINAL ' + E.n, 84, 212 + k * 64, { size: 20, weight: 800, color: got ? '#fff' : '#555' });
            R6.UI.text(ctx, got ? E.desc : 'Ainda não descoberto.', 84, 234 + k * 64, { size: 14, color: '#999' });
            R6.UI.text(ctx, got ? 'VISTO ' + got + '× · ENTER REVER' : '🔒', 1200, 222 + k * 64, { size: 13, align: 'right', color: got ? '#2ec4b6' : '#555', weight: 800 });
          });
          R6.UI.text(ctx, Object.keys(R6.Save.meta.endings).length + ' / ' + endIds.length + ' FINAIS', 1220, 160, { size: 16, align: 'right', color: '#f2c14e', weight: 800 });
        } else if (tab === 2) {
          const L = scenes();
          if (!L.length) R6.UI.text(ctx, 'Nenhuma cena desbloqueada ainda. Jogue a campanha.', 640, 380, { size: 20, align: 'center', color: '#777' });
          const top = Math.max(0, Math.min(i - 5, L.length - 11));
          L.slice(top, top + 11).forEach(([id, title], k) => {
            const hov = top + k === i, rep = id.startsWith('ending_') || id === 'credits';
            R6.UI.panel(ctx, 60, 186 + k * 42, 760, 38, { fill: hov ? 'rgba(20,22,30,.96)' : 'rgba(8,10,14,.85)', stroke: hov ? R6.UI.T.accent : undefined, r: 4, shadow: false });
            R6.UI.text(ctx, String(title), 80, 211 + k * 42, { size: 16, weight: 700, color: '#eee', maxW: 600 });
            if (rep) R6.UI.text(ctx, 'ENTER REVER', 806, 211 + k * 42, { size: 12, align: 'right', color: '#2ec4b6', weight: 800 });
          });
          R6.UI.text(ctx, L.length + ' CENAS', 1220, 160, { size: 16, align: 'right', color: '#f2c14e', weight: 800 });
        } else {
          const m = R6.Save.meta, st = m.stats;
          const rows = [['TEMPO DE JOGO', U.time ? U.time(st.playTime) : Math.round(st.playTime) + 's'], ['ELIMINAÇÕES TESTEMUNHADAS', st.eliminatedSeen], ['JOGOS VENCIDOS', st.gamesWon], ['MORTES', st.deaths], ['CAMPANHAS CONCLUÍDAS', m.campaignDone || 0], ['FINAIS DESCOBERTOS', Object.keys(m.endings).length + ' / ' + endIds.length], ['FICHAS GANHAS NO TOTAL', m.totalEarned], ['ITENS NA COLEÇÃO', Object.keys(m.owned).length + ' / ' + SHOP.length], ['TEMPORADAS DESBLOQUEADAS', m.seasonsUnlocked + ' / 3']];
          rows.forEach(([a, b], k) => { R6.UI.text(ctx, a, 100, 220 + k * 40, { size: 17, color: '#999', weight: 800, spacing: 2 }); R6.UI.text(ctx, String(b), 640, 220 + k * 40, { size: 22, fam: 'mono', color: '#fff', align: 'right' }); });
          R6.UI.text(ctx, 'RECORDES', 760, 220, { size: 17, color: '#f2c14e', weight: 800, spacing: 3 });
          Object.entries(m.best).slice(0, 10).forEach(([k, v], j) => { R6.UI.text(ctx, k.replace(/^extra_/, '').replace(/_/g, ' ').toUpperCase(), 760, 256 + j * 30, { size: 14, color: '#bbb', weight: 700 }); R6.UI.text(ctx, String(v), 1200, 256 + j * 30, { size: 17, fam: 'mono', color: '#fff', align: 'right' }); });
          if (!Object.keys(m.best).length) R6.UI.text(ctx, 'Nenhum ainda.', 760, 256, { size: 15, color: '#777' });
        }
      },
    });
  };
})();
