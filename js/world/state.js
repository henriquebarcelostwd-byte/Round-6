/* ROUND 6 — state.js : campaign state — prize pool, alive count, relationships, memories, flags, decisions, inventory, checkpoints */
'use strict';
(function () {
  const U = R6.U;
  const PER_HEAD = 100000000; // ₩100,000,000 per eliminated participant

  const MEM_PT = {
    helped: 'você o ajudou', saved: 'você salvou a vida dele(a)', shared: 'você dividiu comida', stole: 'você roubou dele(a)', betrayed: 'você o traiu',
    insulted: 'você o provocou', allied: 'fizeram uma aliança', protected: 'você o protegeu', abandoned: 'você o abandonou', fought: 'vocês brigaram',
    spared: 'você poupou a vida dele(a)', comforted: 'você o consolou', lied: 'você mentiu para ele(a)', pushed: 'você o empurrou', teamed: 'jogaram no mesmo time',
    witness_steal: 'viu você roubar', witness_help: 'viu você ajudar alguém', witness_betray: 'viu você trair alguém', witness_fight: 'viu você brigar', gift: 'você deu um presente',
    voted_same: 'votou igual a você', voted_diff: 'votou diferente de você', persuaded: 'você o convenceu', cheated: 'você o enganou',
  };

  const S = {
    s: null,
    get on() { return !!S.s; },

    newGame(profile) {
      const seed = profile.seed || (Date.now() % 1000000);
      S.s = {
        v: 1, seed, season: 1, chapter: 0, diff: R6.Save.diff(),
        player: { name: profile.name || 'Jogador', num: profile.num || 456, look: profile.look, hp: 100, inv: {}, money: 0, karma: 0, gamesWon: 0 },
        prize: 0, flags: {}, decisions: [], log: [], day: 1,
        stats: { eliminated: 0, gamesPlayed: 0, deaths: 0, saved: 0, betrayals: 0, helped: 0 },
        rosterSeason: 1, rosterState: null, keyFates: {},
      };
      S.buildRoster(1);
      return S.s;
    },
    buildRoster(season) {
      const s = S.s;
      s.rosterSeason = season;
      S.roster = R6.Roster.build(s.seed, season, s.player.num, s.player.look);
      S.player = S.roster[s.player.num - 1];
      s.prize = 0;
      S.recount();
    },
    recount() { S.alive = S.roster.filter(p => p.alive).length; },
    get perHead() { return PER_HEAD; },

    // ---------- serialization ----------
    serialize() {
      const s = S.s; if (!s) return null;
      const rs = S.roster.map(p => [p.alive ? 1 : 0, Math.round(p.rel), p.mem.slice(-6), p.group, p.flags || 0, Math.round((p.fear || 0) * 100)]);
      return JSON.parse(JSON.stringify(Object.assign({}, s, { rosterState: rs })));
    },
    restore(data) {
      S.s = JSON.parse(JSON.stringify(data));
      S.roster = R6.Roster.build(S.s.seed, S.s.rosterSeason, S.s.player.num, S.s.player.look);
      if (S.s.rosterState) S.s.rosterState.forEach((a, i) => { const p = S.roster[i]; if (!p) return; p.alive = !!a[0]; p.rel = a[1]; p.mem = a[2] || []; p.group = a[3]; p.flags = a[4]; p.fear = (a[5] || 0) / 100; });
      S.s.rosterState = null;
      S.player = S.roster[S.s.player.num - 1];
      S.recount();
    },
    checkpoint(label) {
      const data = { state: S.serialize(), label: label || '', chapter: S.s.chapter, season: S.s.season };
      S.lastCheckpoint = JSON.parse(JSON.stringify(data));
      R6.Save.writeCampaign(data);
      return data;
    },
    reloadCheckpoint() {
      const d = S.lastCheckpoint || R6.Save.readCampaign();
      if (!d) return false;
      S.restore(d.state);
      return true;
    },

    // ---------- queries ----------
    byKey(k) { return S.roster && S.roster.find(p => p.key === k); },
    byNum(n) { return S.roster && S.roster[n - 1]; },
    aliveBots() { return S.roster.filter(p => p.alive && !p.isPlayer); },
    label(p) { return `#${U.pad(p.num)} ${p.name}`; },
    short(p) { return p.isPlayer ? 'Você' : p.key ? p.name.split(' ').slice(-1)[0] : '#' + U.pad(p.num); },
    tag(p) {
      const r = p.rel;
      if (r >= 55) return { t: 'ALIADO', c: '#2ec4b6' };
      if (r >= 20) return { t: 'AMIGO', c: '#8bd17c' };
      if (r <= -55) return { t: 'INIMIGO', c: '#ff3b5c' };
      if (r <= -20) return { t: 'RIVAL', c: '#f2994a' };
      return { t: 'NEUTRO', c: '#9aa3ad' };
    },
    allies(min = 45) { return S.aliveBots().filter(p => p.rel >= min).sort((a, b) => b.rel - a.rel); },
    enemies(max = -40) { return S.aliveBots().filter(p => p.rel <= max).sort((a, b) => a.rel - b.rel); },
    keyAlive(k) { const p = S.byKey(k); return !!(p && p.alive); },

    // ---------- relationships & memory ----------
    addRel(p, delta, mem, o = {}) {
      if (!p || p.isPlayer) return;
      const before = p.rel;
      // loyalty dampens negative swings for friends; low trust dampens positive ones
      if (delta > 0) delta *= 0.6 + p.tr.trust * 0.8; else delta *= 1.2 - p.tr.loyalty * 0.4;
      p.rel = U.clamp(p.rel + delta, -100, 100);
      if (mem) { p.mem.push(mem); if (p.mem.length > 8) p.mem.shift(); }
      if (!o.silent && (p.key || Math.abs(delta) >= 8)) {
        const up = p.rel > before;
        R6.Toast.show(`${S.short(p) === '#' + U.pad(p.num) ? '#' + U.pad(p.num) : p.name} ${up ? 'confia mais' : 'confia menos'} em você`, { color: up ? '#2ec4b6' : '#ff5a6a', icon: up ? 'circle' : 'x' });
      }
      return p.rel;
    },
    remember(p, mem) { if (!p) return; p.mem.push(mem); if (p.mem.length > 8) p.mem.shift(); },
    memText(code) { return MEM_PT[code] || code; },
    lastMem(p) { return p.mem.length ? MEM_PT[p.mem[p.mem.length - 1]] || p.mem[p.mem.length - 1] : null; },
    // other bots near an act witness it
    witness(list, code, delta) {
      for (const p of list) { if (!p || p.isPlayer || !p.alive) continue; S.addRel(p, delta * (0.5 + p.tr.kindness * 0.6), code, { silent: !p.key }); }
    },

    // ---------- elimination / prize ----------
    eliminate(p, cause) {
      if (!p || !p.alive) return false;
      p.alive = false; p.cause = cause || '';
      if (!p.isPlayer) { S.s.prize += PER_HEAD; S.s.stats.eliminated++; if (p.key) S.s.keyFates[p.key] = cause || 'eliminated'; }
      S.alive--;
      R6.Save.meta.stats.eliminatedSeen++;
      return true;
    },
    revive(p) { if (p && !p.alive) { p.alive = true; S.alive++; if (!p.isPlayer) S.s.prize -= PER_HEAD; } },

    // ---------- flags / decisions / log ----------
    flag(k, v) { if (v === undefined) return S.s ? S.s.flags[k] : undefined; S.s.flags[k] = v; return v; },
    inc(k, n = 1) { S.s.flags[k] = (S.s.flags[k] || 0) + n; return S.s.flags[k]; },
    decide(id, choice, text) { S.s.decisions.push({ id, choice, text: text || '', season: S.s.season }); S.s.flags['d_' + id] = choice; },
    log(text) { S.s.log.push({ d: S.s.day, s: S.s.season, text }); if (S.s.log.length > 80) S.s.log.shift(); },
    karma(n) { S.s.player.karma += n; },

    // ---------- inventory ----------
    give(item, n = 1) { const inv = S.s.player.inv; inv[item] = (inv[item] || 0) + n; const I = ITEMS[item]; if (I) R6.Toast.show(`+ ${I.name}`, { color: '#f2c14e', icon: 'square' }); },
    has(item) { return (S.s.player.inv[item] || 0) > 0; },
    take(item, n = 1) { const inv = S.s.player.inv; if (!inv[item]) return false; inv[item] -= n; if (inv[item] <= 0) delete inv[item]; return true; },

    // ---------- difficulty helper ----------
    D(n, h, x) { return R6.Save.D(n, h, x); },
  };

  const ITEMS = {
    bread: { name: 'Pão', desc: 'Pode ser dividido para ganhar confiança.' },
    egg: { name: 'Ovo cozido', desc: 'Refeição do dormitório.' },
    soda: { name: 'Refrigerante', desc: 'Refeição do dormitório.' },
    lighter: { name: 'Isqueiro', desc: 'Aquecer a agulha facilita a dalgona.' },
    needle: { name: 'Agulha extra', desc: 'Uma agulha mais fina para a dalgona.' },
    hint_dalgona: { name: 'Pista: formas', desc: 'Alguém viu doces de açúcar sendo preparados.' },
    hint_tug: { name: 'Tática: 3 passos', desc: 'O truque dos três passos à frente no cabo de guerra.' },
    hint_glass: { name: 'Pista do vidraceiro', desc: 'Vidro temperado reflete diferente sob luz forte.' },
    marble: { name: 'Bolinha da sorte', desc: 'Presente de alguém que confiava em você.' },
    letter: { name: 'Carta do #218', desc: '"Cuide da minha mãe."' },
    keycard: { name: 'Cartão de acesso', desc: 'Abre portas de serviço e o elevador.' },
    master_key: { name: 'Chave-mestra', desc: 'Presente de uma guarda. Abre a porta de serviço do labirinto.' },
    crowbar: { name: 'Pé de cabra', desc: 'Abre tampas de bueiro e grades.' },
    flashlight: { name: 'Lanterna', desc: 'Ilumina lugares escuros.' },
    photo: { name: 'Foto antiga', desc: 'Uma foto do velho #001 com homens de máscara dourada.' },
    map: { name: 'Planta da ilha', desc: 'Mostra túneis e uma área sem nome.' },
  };

  R6.State = S;
  R6.ITEMS = ITEMS;
})();
