/* ROUND 6 — roster.js : 456 unique participants per season (seeded), personalities, skills, key story characters */
'use strict';
(function () {
  const U = R6.U;
  const SUR = ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong', 'Jeon', 'Ko', 'Moon', 'Yang', 'Son', 'Bae', 'Baek', 'Heo', 'Nam', 'Noh', 'Ha', 'Kwak', 'Sung', 'Cha', 'Joo', 'Woo', 'Min', 'Ryu', 'Na', 'Jin', 'Ji', 'Um', 'Chae', 'Byun', 'Pyo', 'Gil', 'Do', 'Tak'];
  const SYL = ['Min', 'Ji', 'Seo', 'Hyun', 'Jun', 'Woo', 'Young', 'Soo', 'Hee', 'Eun', 'Jae', 'Sung', 'Dong', 'Ho', 'Yeon', 'Jin', 'Hye', 'Kyung', 'Sang', 'Tae', 'Chul', 'Mi', 'Na', 'Ra', 'Bin', 'Hoon', 'Won', 'Yong', 'Joon', 'Il', 'Gi', 'Deok', 'Man', 'Gu', 'Hwan', 'Seok', 'Kyu', 'Rim', 'Ah', 'Da', 'Sol', 'Ha', 'Yu', 'Bo', 'Gyeong', 'Nam', 'Su', 'In'];
  const FOREIGN = ['Rafiq Hossain', 'Nguyen Van Minh', 'Arjun Mehta', 'Dmitri Volkov', 'Tran Thi Lan', 'Samuel Okafor', 'Ana Ribeiro', 'Tenzin Norbu', 'Farhan Ali', 'Maria Santos', 'Bilal Karim', 'Chen Wei', 'Luca Moretti', 'Aigerim Nurlan'];

  const ARCH = {
    common: { w: 34, t: {} },
    kind: { w: 10, t: { kindness: 0.85, trust: 0.7, loyalty: 0.75, betray: 0.1, fear: 0.45 } },
    coward: { w: 12, t: { courage: 0.15, fear: 0.85, betray: 0.45, loyalty: 0.35 } },
    bully: { w: 7, t: { str: 0.85, courage: 0.75, kindness: 0.1, betray: 0.75, trust: 0.15, fear: 0.2 } },
    schemer: { w: 7, t: { intel: 0.9, betray: 0.7, trust: 0.2, kindness: 0.25 } },
    athlete: { w: 8, t: { str: 0.75, spd: 0.85, courage: 0.65 } },
    elder: { w: 6, t: { spd: 0.2, str: 0.25, intel: 0.65, fear: 0.4 } },
    wild: { w: 5, t: { chaos: 0.9, courage: 0.7, betray: 0.5 } },
    leader: { w: 5, t: { courage: 0.85, intel: 0.7, loyalty: 0.75, kindness: 0.6 } },
    nerd: { w: 6, t: { intel: 0.85, str: 0.3, spd: 0.35, fear: 0.55 } },
  };
  const ARCH_PT = { common: 'comum', kind: 'gentil', coward: 'medroso', bully: 'valentão', schemer: 'calculista', athlete: 'atleta', elder: 'idoso', wild: 'imprevisível', leader: 'líder', nerd: 'estrategista' };

  const DEBTS = ['dívidas de jogo', 'um negócio falido', 'empréstimos para o tratamento da mãe', 'agiotas', 'criptomoedas', 'o aluguel atrasado', 'fiança de um irmão', 'a faculdade dos filhos', 'uma aposta em corridas', 'um acidente de trabalho', 'um golpe que sofreu'];

  // ---- key characters ----
  const KEYS = {
    1: {
      oldman: { num: 1, name: 'Yoo Il-hwan', arch: 'elder', look: { fem: false, age: 2, hs: 'perm', hair: '#a9a6a0', skin: '#e2b894', build: 0.9, h: 0.92, beard: null, glasses: false }, t: { courage: 0.6, intel: 0.85, str: 0.15, spd: 0.2, trust: 0.95, fear: 0.05, loyalty: 0.9, betray: 0.05, chaos: 0.6, kindness: 0.9, greed: 0.1 }, bio: 'Um senhor gentil com um tumor no cérebro. Diz que prefere jogar a esperar a morte em casa.' },
      schemer: { num: 218, name: 'Seo Tae-min', arch: 'schemer', look: { fem: false, age: 1, hs: 'slick', hair: '#15110f', skin: '#e6bf9a', build: 1.0, h: 1.03 }, t: { courage: 0.6, intel: 0.97, str: 0.55, spd: 0.6, trust: 0.2, fear: 0.4, loyalty: 0.3, betray: 0.88, chaos: 0.2, kindness: 0.25, greed: 0.9 }, bio: 'Formado na melhor universidade do país, orgulho do bairro. Desviou dinheiro de clientes. Cresceu na mesma rua que você.' },
      thief: { num: 67, name: 'Kang Ha-eun', arch: 'athlete', look: { fem: true, age: 0, hs: 'short', hair: '#0f0c0b', skin: '#ecc7a4', build: 0.9, h: 0.97 }, t: { courage: 0.85, intel: 0.75, str: 0.5, spd: 0.92, trust: 0.15, fear: 0.3, loyalty: 0.85, betray: 0.1, chaos: 0.3, kindness: 0.55, greed: 0.6 }, bio: 'Desertora do Norte e batedora de carteiras. Quer juntar dinheiro para tirar a mãe de lá e cuidar do irmão caçula.' },
      worker: { num: 199, name: 'Rafiq Hossain', arch: 'kind', look: { fem: false, age: 1, hs: 'short', hair: '#0d0a09', skin: '#9a6440', build: 1.12, h: 1.04, beard: 'stubble' }, t: { courage: 0.7, intel: 0.5, str: 0.92, spd: 0.6, trust: 0.9, fear: 0.3, loyalty: 0.95, betray: 0.03, chaos: 0.1, kindness: 0.95, greed: 0.3 }, bio: 'Trabalhador imigrante. O patrão não paga há meses. Tem mulher e um filho pequeno esperando por ele.' },
      gangster: { num: 101, name: 'Jang Deok-man', arch: 'bully', look: { fem: false, age: 1, hs: 'buzz', hair: '#181210', skin: '#d8a882', build: 1.22, h: 1.06, mark: 'scar' }, t: { courage: 0.85, intel: 0.4, str: 0.95, spd: 0.55, trust: 0.1, fear: 0.2, loyalty: 0.2, betray: 0.9, chaos: 0.5, kindness: 0.05, greed: 0.95 }, bio: 'Gângster que perdeu o dinheiro da própria gangue. Resolve tudo na força.' },
      wild: { num: 212, name: 'Oh Mi-ja', arch: 'wild', look: { fem: true, age: 1, hs: 'curly', hair: '#3a2418', skin: '#e8c19c', build: 0.95, h: 0.94 }, t: { courage: 0.7, intel: 0.55, str: 0.4, spd: 0.5, trust: 0.4, fear: 0.4, loyalty: 0.6, betray: 0.6, chaos: 0.95, kindness: 0.4, greed: 0.7 }, bio: 'Barulhenta, esperta e imprevisível. Muda de lado conforme o vento.' },
      glass: { num: 17, name: 'Choi Dong-gu', arch: 'nerd', look: { fem: false, age: 1, hs: 'bowl', hair: '#2a1f18', skin: '#dcae87', build: 0.98, h: 0.98, glasses: true }, t: { courage: 0.4, intel: 0.75, str: 0.45, spd: 0.45, trust: 0.35, fear: 0.6, loyalty: 0.4, betray: 0.5, chaos: 0.2, kindness: 0.4, greed: 0.6, precision: 0.95 }, bio: 'Trabalhou 30 anos numa fábrica de vidro. Reconhece vidro temperado de longe — se a luz ajudar.' },
      girl: { num: 240, name: 'Yoon Ji-yeong', arch: 'kind', look: { fem: true, age: 0, hs: 'bob', hair: '#1a1411', skin: '#efcdb0', build: 0.88, h: 0.92 }, t: { courage: 0.6, intel: 0.6, str: 0.35, spd: 0.6, trust: 0.55, fear: 0.3, loyalty: 0.8, betray: 0.05, chaos: 0.3, kindness: 0.85, greed: 0.2 }, bio: 'Acabou de sair da prisão. Não tem ninguém esperando por ela lá fora.' },
    },
    2: {
      fm001: { num: 1, name: 'Baek Jin-woo', arch: 'leader', look: { fem: false, age: 1, hs: 'short', hair: '#15100d', skin: '#dcae87', build: 1.08, h: 1.04, beard: 'stubble' }, t: { courage: 0.95, intel: 0.95, str: 0.88, spd: 0.7, trust: 0.55, fear: 0.05, loyalty: 0.75, betray: 1.0, chaos: 0.1, kindness: 0.6, greed: 0.1 }, bio: 'Calmo, educado, sempre no lugar certo. Diz que entrou para pagar o tratamento da filha. Há algo nele que não fecha.', secret: true },
      buddy: { num: 390, name: 'Tak Man-su', arch: 'kind', look: { fem: false, age: 1, hs: 'curly', hair: '#2a1f18', skin: '#dba882', build: 1.14, h: 0.97 }, t: { courage: 0.5, intel: 0.45, str: 0.6, spd: 0.4, trust: 0.95, fear: 0.5, loyalty: 0.98, betray: 0.02, chaos: 0.4, kindness: 0.9, greed: 0.3 }, bio: 'Seu amigo de infância. Divorciado, sem emprego, perdeu tudo. Entrou no jogo sem saber que você estaria aqui.', startRel: 70 },
      soldier: { num: 120, name: 'Yoon Ha-ri', arch: 'leader', look: { fem: true, age: 1, hs: 'long', hair: '#1b1512', skin: '#e9c3a0', build: 1.02, h: 1.02 }, t: { courage: 0.95, intel: 0.75, str: 0.82, spd: 0.75, trust: 0.5, fear: 0.1, loyalty: 0.92, betray: 0.05, chaos: 0.2, kindness: 0.7, greed: 0.3 }, bio: 'Ex-forças especiais. Quer recomeçar a vida longe de quem a humilhou. Luta melhor que qualquer um aqui.' },
      mother: { num: 222, name: 'Min Ji-a', arch: 'kind', look: { fem: true, age: 0, hs: 'pony', hair: '#241a14', skin: '#f0cfb2', build: 1.0, h: 0.93 }, t: { courage: 0.55, intel: 0.6, str: 0.3, spd: 0.35, trust: 0.45, fear: 0.5, loyalty: 0.8, betray: 0.05, chaos: 0.1, kindness: 0.9, greed: 0.2 }, bio: 'Está grávida. O pai da criança perdeu o dinheiro dela em criptomoedas — e ele também está aqui.', pregnant: true },
      crypto: { num: 333, name: 'Choi Dae-han', arch: 'coward', look: { fem: false, age: 0, hs: 'slick', hair: '#3b2a1e', skin: '#ecc7a4', build: 0.95, h: 1.0 }, t: { courage: 0.2, intel: 0.65, str: 0.4, spd: 0.55, trust: 0.3, fear: 0.8, loyalty: 0.25, betray: 0.8, chaos: 0.3, kindness: 0.3, greed: 0.8 }, bio: 'Streamer de cripto que arruinou os próprios seguidores. Covarde, mas esperto quando o assunto é salvar a pele.' },
      marine: { num: 388, name: 'Bang Jae-sung', arch: 'athlete', look: { fem: false, age: 1, hs: 'buzz', hair: '#120e0c', skin: '#d8a882', build: 1.12, h: 1.05 }, t: { courage: 0.45, intel: 0.55, str: 0.8, spd: 0.7, trust: 0.5, fear: 0.6, loyalty: 0.45, betray: 0.7, chaos: 0.3, kindness: 0.5, greed: 0.5 }, bio: 'Ex-fuzileiro. Parece corajoso — até a hora em que realmente importa.' },
      rapper: { num: 230, name: '"Neon" Park', arch: 'wild', look: { fem: false, age: 0, hs: 'spiky', hair: '#c9567f', skin: '#e9c3a0', build: 1.0, h: 1.0 }, t: { courage: 0.8, intel: 0.3, str: 0.65, spd: 0.7, trust: 0.3, fear: 0.2, loyalty: 0.3, betray: 0.7, chaos: 0.98, kindness: 0.2, greed: 0.8 }, bio: 'Rapper falido, viciado em confusão. Ninguém sabe o que ele vai fazer em seguida — nem ele.' },
      elder: { num: 100, name: 'Nam Gyu-cheol', arch: 'bully', look: { fem: false, age: 2, hs: 'bald', hair: '#8f8d8a', skin: '#d9ad86', build: 1.02, h: 0.96 }, t: { courage: 0.65, intel: 0.55, str: 0.5, spd: 0.35, trust: 0.15, fear: 0.35, loyalty: 0.3, betray: 0.75, chaos: 0.3, kindness: 0.1, greed: 0.8 }, bio: 'Velho rabugento que lidera o grupo do X. Não esquece uma ofensa.' },
      mom: { num: 149, name: 'Geum-ja', arch: 'elder', look: { fem: true, age: 2, hs: 'perm', hair: '#6d6a66', skin: '#dcae87', build: 0.95, h: 0.9 }, t: { courage: 0.7, intel: 0.6, str: 0.3, spd: 0.25, trust: 0.7, fear: 0.3, loyalty: 0.95, betray: 0.05, chaos: 0.1, kindness: 0.95, greed: 0.1 }, bio: 'Veio atrás do filho endividado. Faria qualquer coisa por ele.' },
      son: { num: 7, name: 'Yong-sik', arch: 'coward', look: { fem: false, age: 0, hs: 'short', hair: '#1d1612', skin: '#e2b894', build: 0.95, h: 1.0 }, t: { courage: 0.2, intel: 0.45, str: 0.5, spd: 0.6, trust: 0.4, fear: 0.85, loyalty: 0.5, betray: 0.4, chaos: 0.3, kindness: 0.5, greed: 0.6 }, bio: 'Viciado em apostas. Mente para a mãe sobre tudo.' },
    },
  };
  const KEY_ROLE_PT = { oldman: 'o velho gentil', schemer: 'o estrategista', thief: 'a desertora', worker: 'o trabalhador', gangster: 'o gângster', wild: 'a imprevisível', glass: 'o vidraceiro', girl: 'a solitária', fm001: 'o homem calmo', buddy: 'seu velho amigo', soldier: 'a ex-militar', mother: 'a grávida', crypto: 'o streamer', marine: 'o ex-fuzileiro', rapper: 'o rapper', elder: 'o velho do X', mom: 'a mãe', son: 'o filho' };

  function genName(r, fem) {
    if (r.chance(0.03)) return r.pick(FOREIGN);
    const s = r.pick(SUR); let a = r.pick(SYL), b = r.pick(SYL);
    if (a === b) b = r.pick(SYL);
    return s + ' ' + a + '-' + b.toLowerCase();
  }

  function makeTraits(r, arch) {
    const base = { courage: 0.5, intel: 0.5, str: 0.5, spd: 0.5, trust: 0.5, fear: 0.45, loyalty: 0.5, betray: 0.35, chaos: 0.3, kindness: 0.5, greed: 0.55, precision: 0.5 };
    const A = ARCH[arch].t;
    const t = {};
    for (const k in base) t[k] = U.clamp((A[k] != null ? A[k] : base[k]) + r.gauss(0, 0.14), 0.02, 0.98);
    return t;
  }

  function skillsOf(t) {
    return {
      physical: U.clamp((t.str * 0.55 + t.spd * 0.45), 0, 1),
      precision: U.clamp(t.precision * 0.5 + (1 - t.fear) * 0.3 + t.intel * 0.2, 0, 1),
      strategy: U.clamp(t.intel * 0.8 + (1 - t.chaos) * 0.2, 0, 1),
      nerve: U.clamp(t.courage * 0.6 + (1 - t.fear) * 0.4, 0, 1),
      social: U.clamp(t.kindness * 0.4 + t.trust * 0.3 + t.loyalty * 0.3, 0, 1),
    };
  }

  // Build the 456 participants of a season. playerNum reserves that number for the player.
  function build(seed, season, playerNum, playerLook) {
    const r = new U.RNG(seed * 7 + season * 1013);
    const keys = KEYS[season] || {};
    const reserved = new Map();
    for (const k in keys) reserved.set(keys[k].num, k);
    const list = [];
    // resolve conflict: if player took a key number, move key char to a free number
    if (reserved.has(playerNum)) {
      const k = reserved.get(playerNum); reserved.delete(playerNum);
      let n = 456; while (reserved.has(n) || n === playerNum) n--;
      reserved.set(n, k);
    }
    for (let num = 1; num <= 456; num++) {
      if (num === playerNum) {
        list.push({ id: num - 1, num, name: 'VOCÊ', isPlayer: true, look: playerLook, alive: true, rel: 100, mem: [], arch: 'player', tr: makeTraits(r, 'common'), sk: skillsOf(makeTraits(r, 'common')), friends: [], rivals: [], group: -1, key: null });
        continue;
      }
      const keyId = reserved.get(num);
      let p;
      if (keyId) {
        const K = keys[keyId];
        const look = R6.Char.makeLook(Object.assign({ num, seed: num * 13 + season }, K.look), r);
        const tr = Object.assign(makeTraits(r, K.arch), K.t);
        p = { id: num - 1, num, name: K.name, look, arch: K.arch, tr, sk: skillsOf(tr), key: keyId, bio: K.bio, secret: !!K.secret, pregnant: !!K.pregnant, rel: K.startRel || 0 };
      } else {
        const arch = U.weighted(Object.keys(ARCH), a => ARCH[a].w, () => r.next());
        let look;
        if (arch === 'elder') look = R6.Char.makeLook({ age: 2, num, seed: num * 13 + season }, r);
        else look = R6.Char.makeLook({ num, seed: num * 13 + season, age: r.chance(0.25) ? 0 : 1 }, r);
        if (arch === 'bully') look.build = Math.max(look.build, 1.1);
        const tr = makeTraits(r, arch);
        if (look.age === 2) { tr.spd *= 0.6; tr.str *= 0.7; }
        const name = genName(r, look.fem);
        p = { id: num - 1, num, name, look, arch, tr, sk: skillsOf(tr), key: null, bio: `Entrou por causa de ${r.pick(DEBTS)}.`, rel: 0 };
      }
      p.alive = true; p.mem = []; p.friends = []; p.rivals = []; p.group = -1; p.fear = p.tr.fear; p.debt = Math.floor(r.range(0.2, 8) * 1e8);
      p.voteLean = U.clamp(0.5 + (p.tr.greed - 0.5) * 0.6 + (p.tr.courage - 0.5) * 0.4 - (p.tr.fear - 0.5) * 0.6 + r.gauss(0, 0.15), 0, 1); // chance of voting O (continue)
      list.push(p);
    }
    // bot-bot social graph: small friend groups & rivalries
    const idx = list.filter(p => !p.isPlayer).map(p => p.id);
    r.shuffle(idx);
    let g = 0;
    for (let i = 0; i < idx.length;) {
      const size = r.int(2, 5);
      const grp = idx.slice(i, i + size);
      grp.forEach(a => { list[a].group = g; grp.forEach(b => { if (a !== b) list[a].friends.push(b); }); });
      g++; i += size;
    }
    for (let i = 0; i < 180; i++) {
      const a = r.pick(idx), b = r.pick(idx);
      if (a !== b && !list[a].friends.includes(b)) { list[a].rivals.push(b); list[b].rivals.push(a); }
    }
    // story ties
    const byKey = {}; list.forEach(p => { if (p.key) byKey[p.key] = p; });
    const tie = (a, b) => { if (byKey[a] && byKey[b]) { byKey[a].friends.push(byKey[b].id); byKey[b].friends.push(byKey[a].id); } };
    const feud = (a, b) => { if (byKey[a] && byKey[b]) { byKey[a].rivals.push(byKey[b].id); byKey[b].rivals.push(byKey[a].id); } };
    if (season === 1) { tie('thief', 'girl'); feud('gangster', 'thief'); feud('gangster', 'worker'); tie('schemer', 'worker'); tie('wild', 'gangster'); }
    if (season === 2) { tie('mom', 'son'); tie('soldier', 'mother'); feud('crypto', 'mother'); feud('rapper', 'crypto'); feud('elder', 'buddy'); tie('fm001', 'buddy'); }
    return list;
  }

  R6.Roster = { build, KEYS, ARCH, ARCH_PT, KEY_ROLE_PT, skillsOf, genName };
})();
