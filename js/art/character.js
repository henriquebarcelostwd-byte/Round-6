/* ROUND 6 — character.js : procedural articulated 2D characters (side / front / back views), poses, expressions, outfits */
'use strict';
(function () {
  const U = R6.U;
  const TAU = U.TAU;

  const SKINS = ['#f3d2b3', '#eac3a0', '#dcae87', '#c99468', '#b07a50', '#8f5c39', '#6e4128'];
  const HAIRS = ['#141110', '#1d1612', '#2e2019', '#4a3222', '#6b4428', '#b89260', '#8f8d8a', '#d8d6d2', '#7d2a24', '#c9567f', '#3456a8'];
  const STYLES = ['short', 'buzz', 'long', 'bun', 'pony', 'bald', 'bob', 'slick', 'curly', 'perm', 'spiky', 'bowl', 'twin'];

  const OUTFITS = {
    green: { main: '#2b7d71', dark: '#1d5a51', light: '#3a9486', trim: '#f0efe8', pants: '#2b7d71', pantsDark: '#1d5a51', shoe: '#f2f1ec', shoeDark: '#c9c8c2', under: '#f0efe8', piping: true, patch: true },
    guard: { main: '#e0386c', dark: '#a8244f', light: '#f25a8a', trim: '#1a1a1a', pants: '#e0386c', pantsDark: '#a8244f', shoe: '#1b1b1d', shoeDark: '#000', under: '#e0386c', hood: true, gloves: '#151515', belt: '#1a1a1a' },
    frontman: { main: '#18181c', dark: '#0c0c0f', light: '#2a2a30', trim: '#2c2c33', pants: '#141418', pantsDark: '#08080a', shoe: '#0e0e10', shoeDark: '#000', under: '#18181c', hood: true, gloves: '#0b0b0d', coat: true },
    vip: { main: '#2b2340', dark: '#1a1528', light: '#3d3358', trim: '#d4a73a', pants: '#1f1a2e', pantsDark: '#141020', shoe: '#1a1414', shoeDark: '#000', under: '#d4a73a', robe: true },
    suit: { main: '#434a5a', dark: '#2e3340', light: '#566074', trim: '#f4f4f4', pants: '#3a4050', pantsDark: '#262a35', shoe: '#1b1716', shoeDark: '#000', under: '#f4f4f4', tie: '#1e2230', lapel: true },
    tux: { main: '#141417', dark: '#08080a', light: '#26262b', trim: '#fafafa', pants: '#141417', pantsDark: '#08080a', shoe: '#0b0b0b', shoeDark: '#000', under: '#fafafa', bow: true, lapel: true },
    civil: { main: '#5b6470', dark: '#434a54', light: '#737d8a', trim: '#e0ddd5', pants: '#3b4a66', pantsDark: '#2a3549', shoe: '#2d2a28', shoeDark: '#171514', under: '#d8d4ca' },
    worker: { main: '#3d4f3a', dark: '#2b3a29', light: '#526a4d', trim: '#c9c2a8', pants: '#394046', pantsDark: '#262b30', shoe: '#2d2a28', shoeDark: '#171514', under: '#b9b3a0' },
    doll: { main: '#f28c28', dark: '#c96a12', light: '#ffa84a', trim: '#f7d346', pants: '#f28c28', pantsDark: '#c96a12', shoe: '#f4f0e8', shoeDark: '#c8c2b6', under: '#f7d346' },
  };

  function makeLook(o = {}, rng) {
    const r = rng || { next: Math.random, pick: a => a[Math.floor(Math.random() * a.length)], range: (a, b) => a + Math.random() * (b - a) };
    const fem = o.fem != null ? o.fem : r.next() < 0.4;
    const age = o.age != null ? o.age : (r.next() < 0.12 ? 2 : r.next() < 0.3 ? 0 : 1);
    let hs = o.hs;
    if (!hs) {
      if (fem) hs = r.pick(['long', 'bun', 'pony', 'bob', 'long', 'curly', 'short', 'perm', 'twin']);
      else hs = age === 2 ? r.pick(['bald', 'perm', 'short', 'buzz']) : r.pick(['short', 'buzz', 'slick', 'spiky', 'curly', 'short', 'bowl', 'buzz']);
    }
    let hair = o.hair;
    if (!hair) {
      if (age === 2) hair = r.pick(['#8f8d8a', '#b5b2ad', '#d8d6d2', '#5a524c']);
      else { const v = r.next(); hair = v < 0.62 ? r.pick(['#141110', '#1d1612', '#2e2019']) : v < 0.85 ? r.pick(['#4a3222', '#6b4428']) : r.pick(['#b89260', '#7d2a24', '#c9567f', '#3456a8', '#d8d6d2']); }
    }
    return {
      skin: o.skin || r.pick(SKINS.slice(0, 6)),
      hair, hs, fem, age,
      build: o.build || (fem ? r.range(0.88, 1.02) : r.range(0.94, 1.18)),
      h: o.h || (fem ? r.range(0.9, 1.0) : r.range(0.95, 1.07)),
      outfit: o.outfit || 'green',
      num: o.num != null ? o.num : 0,
      glasses: o.glasses != null ? o.glasses : r.next() < 0.1,
      beard: o.beard != null ? o.beard : (!fem && r.next() < 0.18 ? (r.next() < 0.5 ? 'stubble' : 'beard') : null),
      mask: o.mask || null, vip: o.vip || null,
      civ: o.civ || { top: r.pick(['#5b6470', '#7a3b3b', '#3b5b7a', '#6b6b3b', '#2f2f35', '#8a6d4b', '#4b6b56']), bottom: r.pick(['#3b4a66', '#2d2d33', '#5a4b3b', '#444']) },
      vest: o.vest || null, vestNum: o.vestNum || 0, badge: o.badge || null,
      seed: o.seed != null ? o.seed : Math.floor(r.next() * 10000),
      eyeSize: o.eyeSize || r.range(0.9, 1.12),
      mark: o.mark || null,
      tint: null,
    };
  }

  // ------------------------------------------------------------------ POSES
  // angles: 0 = limb pointing straight down; + = swings toward facing direction.
  // 'l' = far limb, 'r' = near limb (side view).
  const P = {};
  function base(p) {
    p.bob = 0; p.lean = 0; p.head = 0; p.lHip = 0; p.lKnee = 0; p.rHip = 0; p.rKnee = 0;
    p.lSh = 0.06; p.lEl = 0.12; p.rSh = -0.06; p.rEl = 0.12; p.rot = 0; p.dx = 0; p.dy = 0;
    p.shake = 0; p.expr = null; p.mouth = 0; p.eyes = null; p.crouch = 0; p.armOut = 0; p.lying = 0; p.item = null; p.handsFace = 0; p.sit = 0;
    return p;
  }
  const scratch = base({});

  const ANIMS = {
    idle(p, t, o) {
      p.bob = Math.sin(t * 2.1 + o.seed) * 0.7; p.lSh = 0.08 + Math.sin(t * 2.1) * 0.03; p.rSh = -0.04 - Math.sin(t * 2.1) * 0.03;
      p.head = Math.sin(t * 0.7 + o.seed) * 0.03;
    },
    walk(p, t, o) {
      const ph = t * TAU * 1.7 * (o.speed || 1);
      const s = Math.sin(ph), c = Math.cos(ph);
      p.rHip = s * 0.48; p.lHip = -s * 0.48;
      p.rKnee = Math.max(0, c) * 0.85 + 0.05; p.lKnee = Math.max(0, -c) * 0.85 + 0.05;
      p.rSh = -s * 0.42; p.lSh = s * 0.42; p.rEl = 0.25 + Math.max(0, -s) * 0.3; p.lEl = 0.25 + Math.max(0, s) * 0.3;
      p.bob = -(1 - Math.abs(s)) * 2.2; p.lean = 0.05;
    },
    run(p, t, o) {
      const ph = t * TAU * 2.7 * (o.speed || 1);
      const s = Math.sin(ph), c = Math.cos(ph);
      p.rHip = s * 0.8; p.lHip = -s * 0.8;
      p.rKnee = Math.max(0, c) * 1.7 + 0.2; p.lKnee = Math.max(0, -c) * 1.7 + 0.2;
      p.rSh = -s * 0.85; p.lSh = s * 0.85; p.rEl = 1.4; p.lEl = 1.4;
      p.bob = -Math.abs(c) * 4 + 1; p.lean = 0.26;
    },
    sneak(p, t, o) {
      const ph = t * TAU * 1.2; const s = Math.sin(ph), c = Math.cos(ph);
      p.rHip = s * 0.35 + 0.35; p.lHip = -s * 0.35 + 0.35; p.rKnee = 0.9 + Math.max(0, c) * 0.5; p.lKnee = 0.9 + Math.max(0, -c) * 0.5;
      p.rSh = 0.6; p.lSh = 0.5; p.rEl = 1.2; p.lEl = 1.2; p.bob = 7; p.lean = 0.35; p.crouch = 0.5;
    },
    crouch(p, t) { p.rHip = 0.9; p.lHip = 0.6; p.rKnee = 1.9; p.lKnee = 1.7; p.bob = 14; p.lean = 0.3; p.rSh = 0.7; p.lSh = 0.6; p.rEl = 1; p.lEl = 1; p.crouch = 1; p.bob += Math.sin(t * 2) * 0.4; },
    scared(p, t, o) {
      p.rHip = 0.2; p.lHip = -0.1; p.rKnee = 0.4; p.lKnee = 0.3; p.bob = 3; p.lean = -0.08;
      p.rSh = 2.3; p.rEl = 1.5; p.lSh = 2.0; p.lEl = 1.7; p.shake = 1.1; p.expr = 'scared'; p.armOut = 0.2;
    },
    handsup(p, t) { p.rSh = 2.9; p.lSh = 2.8; p.rEl = 0.4; p.lEl = 0.4; p.armOut = 0.9; p.expr = 'scared'; p.shake = 0.5; p.bob = Math.sin(t * 3) * 0.5; },
    freeze(p, t, o) { // red light: frozen mid-step with tiny tremble
      const f = o.freezePh || 0; const s = Math.sin(f);
      p.rHip = s * 0.4; p.lHip = -s * 0.4; p.rKnee = 0.15; p.lKnee = 0.15; p.rSh = -s * 0.35; p.lSh = s * 0.35; p.rEl = 0.3; p.lEl = 0.3;
      p.shake = 0.35; p.expr = 'tense';
    },
    fall(p, t, o) {
      const k = U.ease.outCubic(U.clamp(t / 0.55, 0, 1));
      const back = o.back ? -1 : 1;
      p.rot = back * k * (Math.PI / 2); p.lying = k;
      p.rHip = 0.3 * k; p.lHip = -0.2 * k; p.rKnee = 0.5 * k; p.lKnee = 0.3 * k;
      p.rSh = 1.2 * k * back + 0.3; p.lSh = 0.8 * k; p.rEl = 0.6; p.lEl = 0.4;
      p.expr = o.dead ? 'dead' : 'pain'; p.dy = 0;
    },
    trip(p, t, o) {
      if (t < 0.28) { const k = t / 0.28; p.lean = 0.7 * k; p.rSh = 1.8 * k; p.lSh = 1.5 * k; p.rHip = -0.4 * k; p.lHip = 0.5 * k; p.rKnee = 0.6; p.expr = 'shock'; }
      else { const k = U.ease.outCubic(U.clamp((t - 0.28) / 0.35, 0, 1)); p.rot = k * Math.PI / 2; p.lying = k; p.rSh = 2.4; p.lSh = 2.2; p.rEl = 0.4; p.lEl = 0.4; p.rHip = 0.1; p.expr = 'pain'; }
    },
    stagger(p, t) { const k = Math.sin(Math.min(1, t / 0.4) * Math.PI); p.lean = -0.45 * k; p.rSh = -0.9 * k; p.lSh = 1.4 * k; p.rEl = 0.4; p.rHip = 0.4 * k; p.lHip = -0.3 * k; p.expr = 'pain'; },
    push(p, t) { const k = U.clamp(t / 0.15, 0, 1); p.lean = 0.32 * k; p.rSh = 1.55 * k; p.lSh = 1.45 * k; p.rEl = 0.5 - 0.5 * k; p.lEl = 0.5 - 0.5 * k; p.rHip = 0.45 * k; p.lHip = -0.45 * k; p.rKnee = 0.2; p.lKnee = 0.1; p.expr = 'angry'; },
    punch(p, t) {
      const k = t < 0.1 ? t / 0.1 : t < 0.22 ? 1 : Math.max(0, 1 - (t - 0.22) / 0.15);
      p.lean = 0.18 * k; p.rSh = 0.9 + 0.7 * k; p.rEl = 1.9 * (1 - k); p.lSh = 1.2; p.lEl = 2.0; p.rHip = 0.3; p.lHip = -0.3; p.rKnee = 0.2; p.expr = 'angry';
    },
    punch2(p, t) {
      const k = t < 0.1 ? t / 0.1 : t < 0.22 ? 1 : Math.max(0, 1 - (t - 0.22) / 0.15);
      p.lean = 0.22 * k; p.lSh = 0.9 + 0.75 * k; p.lEl = 1.9 * (1 - k); p.rSh = 1.1; p.rEl = 2.1; p.rHip = -0.2; p.lHip = 0.35; p.expr = 'angry';
    },
    kick(p, t) {
      const k = t < 0.12 ? t / 0.12 : t < 0.26 ? 1 : Math.max(0, 1 - (t - 0.26) / 0.18);
      p.rHip = 1.5 * k; p.rKnee = 1.2 * (1 - k); p.lean = -0.25 * k; p.rSh = -0.4; p.lSh = 0.9; p.rEl = 0.8; p.lEl = 1.0; p.lKnee = 0.15; p.expr = 'angry';
    },
    block(p, t) { p.rSh = 2.5; p.rEl = 2.4; p.lSh = 2.3; p.lEl = 2.5; p.rHip = 0.25; p.lHip = -0.25; p.rKnee = 0.4; p.lKnee = 0.3; p.bob = 3; p.lean = 0.1; p.expr = 'tense'; },
    grab(p, t) { const k = U.clamp(t / 0.12, 0, 1); p.lean = 0.25; p.rSh = 1.6 * k; p.lSh = 1.5 * k; p.rEl = 0.3; p.lEl = 0.3; p.rHip = 0.3; p.lHip = -0.3; p.rKnee = 0.3; p.expr = 'angry'; },
    grabbed(p, t) { p.lean = -0.2; p.rSh = 0.8 + Math.sin(t * 14) * 0.3; p.lSh = 1.1; p.rEl = 1; p.shake = 1; p.expr = 'pain'; p.rHip = 0.1; },
    dodge(p, t) { const k = Math.sin(Math.min(1, t / 0.35) * Math.PI); p.bob = 16 * k; p.lean = 0.7 * k; p.rHip = 1.2 * k; p.lHip = 0.4; p.rKnee = 2 * k; p.lKnee = 1.8 * k; p.rSh = 1.2; p.lSh = 1; p.rEl = 1.2; p.lEl = 1.2; p.crouch = k; },
    celebrate(p, t, o) {
      const j = Math.abs(Math.sin(t * 6)); p.bob = -j * 8; p.rSh = 2.9 + Math.sin(t * 6) * 0.15; p.lSh = 2.8 - Math.sin(t * 6) * 0.15; p.rEl = 0.3; p.lEl = 0.3; p.armOut = 1;
      p.rKnee = j * 0.6; p.lKnee = j * 0.5; p.rHip = j * 0.3; p.expr = 'happy'; p.mouth = 1;
    },
    fistpump(p, t) { const k = Math.abs(Math.sin(t * 5)); p.rSh = 2.7; p.rEl = 0.5 + k * 1.2; p.lSh = 0.2; p.expr = 'determined'; p.bob = -k * 2; p.mouth = 0.6; },
    cry(p, t) { p.head = 0.35; p.lean = 0.2; p.rSh = 2.2; p.rEl = 2.55; p.lSh = 2.0; p.lEl = 2.6; p.shake = 0.6; p.expr = 'cry'; p.handsFace = 1; p.bob = 2 + Math.sin(t * 5) * 0.8; p.rKnee = 0.2; p.lKnee = 0.2; },
    sad(p, t) { p.head = 0.28; p.lean = 0.08; p.rSh = 0.1; p.lSh = 0.1; p.expr = 'sad'; p.bob = Math.sin(t * 1.5) * 0.5 + 1; },
    talk(p, t, o) {
      ANIMS.idle(p, t, o);
      p.rSh = 0.55 + Math.sin(t * 3.1 + o.seed) * 0.25; p.rEl = 1.2 + Math.sin(t * 4.3) * 0.3;
      p.mouth = (Math.sin(t * 16) * 0.5 + 0.5) * (Math.sin(t * 2.3) > -0.3 ? 1 : 0.2); p.head = Math.sin(t * 2.2) * 0.05;
      p.armOut = 0.25 + Math.sin(t * 3.1) * 0.15;
    },
    argue(p, t, o) { ANIMS.talk(p, t, o); p.rSh = 1.2 + Math.sin(t * 6) * 0.5; p.rEl = 0.6; p.lean = 0.15; p.expr = 'angry'; p.mouth = Math.abs(Math.sin(t * 12)); p.armOut = 0.6; },
    point(p, t) { p.rSh = 1.62; p.rEl = 0; p.lSh = 0.1; p.armOut = 0.9; p.lean = 0.05; },
    wave(p, t) { p.rSh = 2.7; p.rEl = 0.4 + Math.sin(t * 10) * 0.5; p.armOut = 1; p.expr = 'happy'; },
    eat(p, t) { const k = (Math.sin(t * 3) + 1) / 2; p.rSh = 1.2 + k * 0.9; p.rEl = 1.8 + k * 0.7; p.lSh = 0.7; p.lEl = 1.4; p.head = 0.1; p.mouth = k > 0.8 ? 0.6 : 0; p.item = 'food'; p.sit = 1; },
    sit(p, t) { p.rHip = 1.5; p.lHip = 1.45; p.rKnee = 1.5; p.lKnee = 1.45; p.bob = 18; p.rSh = 0.5; p.lSh = 0.45; p.rEl = 0.9; p.lEl = 0.9; p.sit = 1; p.bob += Math.sin(t * 2) * 0.4; },
    sitSad(p, t) { ANIMS.sit(p, t); p.head = 0.4; p.lean = 0.3; p.rSh = 1.2; p.rEl = 1.6; p.lSh = 1.1; p.lEl = 1.7; p.expr = 'sad'; },
    // sitting on the floor: legs stretched forward, hands resting behind
    sitFloor(p, t) { p.rHip = 1.45; p.lHip = 1.4; p.rKnee = 0.12; p.lKnee = 0.2; p.bob = 37 + Math.sin(t * 2) * 0.3; p.lean = -0.18; p.rSh = -0.55; p.lSh = -0.5; p.rEl = 0.1; p.lEl = 0.1; p.sit = 1; },
    // sitting on the floor hugging the knees
    hugKnees(p, t) { p.rHip = 2.2; p.lHip = 2.15; p.rKnee = 2.4; p.lKnee = 2.35; p.bob = 37 + Math.sin(t * 1.6) * 0.4; p.lean = 0.3; p.head = 0.35; p.rSh = 0.8; p.lSh = 0.72; p.rEl = 0.45; p.lEl = 0.5; p.expr = 'sad'; p.sit = 1; },
    sleep(p, t) { p.rot = -Math.PI / 2; p.lying = 1; p.eyes = 'closed'; p.expr = 'sleep'; p.bob = Math.sin(t * 1.3) * 0.5; p.rSh = 0.2; p.lSh = 0.1; p.rKnee = 0.3; p.rHip = 0.2; },
    lie(p, t, o) { p.rot = (o.back ? -1 : 1) * Math.PI / 2; p.lying = 1; p.eyes = 'closed'; p.expr = 'dead'; p.rSh = 0.9; p.lSh = 0.4; p.rHip = 0.3; p.rKnee = 0.5; },
    getup(p, t) { const k = 1 - U.ease.inOutCubic(U.clamp(t / 0.8, 0, 1)); p.rot = -Math.PI / 2 * k; p.lying = k; p.rKnee = 1.2 * k; p.lKnee = 1.0 * k; p.rHip = 0.9 * k; p.rSh = 1.3 * k; p.lSh = 1.0 * k; },
    die(p, t, o) { ANIMS.fall(p, Math.max(0, t - 0.12), Object.assign({}, o, { dead: true })); if (t < 0.12) { p.lean = -0.2; p.rSh = 1.2; p.lSh = 1.0; p.expr = 'shock'; } else p.expr = 'dead'; },
    dead(p, t, o) { ANIMS.lie(p, t, o); },
    jump(p, t) { p.rHip = 0.8; p.lHip = 0.4; p.rKnee = 1.4; p.lKnee = 1.2; p.rSh = 2.2; p.lSh = 1.9; p.rEl = 0.5; p.lEl = 0.5; p.lean = 0.1; p.armOut = 0.7; },
    land(p, t) { const k = Math.max(0, 1 - t / 0.2); p.rHip = 0.6 * k; p.lHip = 0.5 * k; p.rKnee = 1.3 * k; p.lKnee = 1.2 * k; p.bob = 8 * k; p.rSh = 0.9 * k; p.lSh = 0.8 * k; },
    pull(p, t, o) {
      const k = (Math.sin(t * (o.pullRate || 5)) + 1) / 2 * (o.effort || 1);
      p.lean = -0.45 - k * 0.2; p.rSh = 1.05; p.lSh = 1.0; p.rEl = 0.2 + k * 0.3; p.lEl = 0.25 + k * 0.3;
      p.rHip = 0.55; p.rKnee = 0.05; p.lHip = -0.35; p.lKnee = 0.7 + k * 0.2; p.bob = 5 + k * 2; p.expr = 'strain'; p.item = 'rope';
    },
    heave(p, t) { p.lean = -0.9; p.rSh = 0.9; p.lSh = 0.85; p.rEl = 0.2; p.lEl = 0.2; p.rHip = 0.9; p.rKnee = 0; p.lHip = 0.2; p.lKnee = 1.4; p.bob = 14; p.expr = 'strain'; p.item = 'rope'; },
    throw(p, t) {
      if (t < 0.25) { const k = U.ease.outQuad(t / 0.25); p.rSh = 0.2 + 2.8 * k; p.rEl = 0.4; p.lean = -0.15 * k; p.lSh = 0.5; }
      else { const k = U.ease.inCubic(U.clamp((t - 0.25) / 0.12, 0, 1)); p.rSh = 3.0 - 2.3 * k; p.rEl = 0.4 - 0.3 * k; p.lean = -0.15 + 0.55 * k; p.lSh = 0.5; p.rHip = 0.3; p.rKnee = 0.5 * k; }
      p.expr = 'determined';
    },
    windup(p, t) { p.rSh = 2.9 + Math.sin(t * 8) * 0.05; p.rEl = 0.5; p.lean = -0.15; p.lSh = 0.6; p.lEl = 0.5; p.expr = 'determined'; },
    kneel(p, t) { p.rHip = 1.4; p.rKnee = 1.5; p.lHip = -0.1; p.lKnee = 1.55; p.bob = 22; p.rSh = 0.9; p.lSh = 0.7; p.rEl = 1.0; p.lEl = 0.9; p.lean = 0.15; },
    kneelThrow(p, t) { ANIMS.kneel(p, t); ANIMS.throw(scratchB, t, {}); p.rSh = scratchB.rSh; p.rEl = scratchB.rEl; p.lean = 0.15 + scratchB.lean * 0.6; },
    hang(p, t) { p.rSh = Math.PI - 0.1; p.lSh = Math.PI - 0.05; p.rEl = 0; p.lEl = 0; p.rHip = Math.sin(t * 3) * 0.3; p.lHip = -Math.sin(t * 3) * 0.3; p.rKnee = 0.3; p.lKnee = 0.4; p.expr = 'scared'; p.shake = 0.6; },
    flail(p, t) { p.rSh = 2.5 + Math.sin(t * 17) * 0.6; p.lSh = 2.2 + Math.cos(t * 15) * 0.7; p.rEl = 0.5; p.lEl = 0.6; p.rHip = Math.sin(t * 13) * 0.6; p.lHip = Math.cos(t * 12) * 0.6; p.rKnee = 0.8; p.lKnee = 0.6; p.expr = 'scream'; p.mouth = 1; p.armOut = 1; },
    bow(p, t) { const k = Math.sin(Math.min(1, t / 1.2) * Math.PI); p.lean = 0.9 * k; p.head = 0.2 * k; },
    dance(p, t) { const s = Math.sin(t * 7); p.bob = -Math.abs(s) * 4; p.lean = s * 0.12; p.rSh = 2.2 + s * 0.6; p.lSh = 0.4 - s * 0.4; p.rEl = 1; p.lEl = 1.2; p.rHip = s * 0.4; p.lHip = -s * 0.2; p.rKnee = Math.abs(s) * 0.6; p.expr = 'happy'; p.armOut = 0.6; },
    look(p, t, o) { ANIMS.idle(p, t, o); p.head = -0.15; },
    kick_jegi(p, t) { const k = U.clamp(t / 0.18, 0, 1); const b = Math.sin(k * Math.PI); p.lHip = 1.0 * b; p.lKnee = 1.4 * b; p.rSh = 0.9; p.lSh = -0.5; p.rEl = 0.6; p.armOut = 0.6; p.lean = -0.08 * b; },
    spin(p, t) { ANIMS.throw(p, t); },
    hold(p, t) { p.rSh = 1.1; p.rEl = 0.9; p.lSh = 1.0; p.lEl = 1.0; p.bob = Math.sin(t * 2) * 0.5; p.item = 'hold'; },
    carry(p, t, o) { ANIMS.walk(p, t, o); p.rSh = 1.2; p.lSh = 1.1; p.rEl = 0.8; p.lEl = 0.8; },
    sway(p, t) { p.lean = Math.sin(t * 5) * 0.25; p.rSh = 1.6 + Math.sin(t * 5) * 0.6; p.lSh = 1.4 - Math.sin(t * 5) * 0.6; p.armOut = 1; p.expr = 'scared'; p.rHip = 0.15; p.lHip = -0.15; },
    vote(p, t) { const k = Math.sin(Math.min(1, t / 0.5) * Math.PI); p.rSh = 1.2 + k * 0.4; p.rEl = 0.6 - k * 0.4; p.lean = 0.1 * k; },
    salute(p, t) { p.rSh = 2.6; p.rEl = 2.4; p.expr = 'neutral'; },
  };
  const scratchB = base({});

  function getPose(anim, t, o) {
    const p = base(scratch);
    const f = ANIMS[anim] || ANIMS.idle;
    f(p, t || 0, o || {});
    return p;
  }

  // ------------------------------------------------------------------ DRAW HELPERS
  function dirv(a) { return [Math.sin(a), Math.cos(a)]; }
  function limb(ctx, x0, y0, a1, l1, a2, l2, w, col, w2) {
    const d1 = dirv(a1), d2 = dirv(a2);
    const x1 = x0 + d1[0] * l1, y1 = y0 + d1[1] * l1;
    const x2 = x1 + d2[0] * l2, y2 = y1 + d2[1] * l2;
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = w2 || w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    return [x1, y1, x2, y2];
  }
  function ell(ctx, x, y, rx, ry, col, rot = 0) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); ctx.fill(); }
  function circ(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); ctx.fill(); }

  function outfitOf(look) {
    const O = OUTFITS[look.outfit] || OUTFITS.green;
    if (look.outfit === 'civil') return Object.assign({}, O, { main: look.civ.top, dark: U.shade(look.civ.top, -0.25), light: U.shade(look.civ.top, 0.15), pants: look.civ.bottom, pantsDark: U.shade(look.civ.bottom, -0.25) });
    if (look.outfitColors) return Object.assign({}, O, look.outfitColors);
    return O;
  }

  // tint support: 'dead' (desaturate), 'red' flash, 'ghost'
  function tc(col, look) {
    if (!look.tint) return col;
    if (look.tint === 'dead') return U.mix(U.gray(col, 0.85), '#5c5f66', 0.25);
    if (look.tint === 'red') return U.mix(col, '#ff2244', 0.6);
    if (look.tint === 'dark') return U.mix(col, '#0a0c12', 0.55);
    if (look.tint === 'sil') return '#0d0f14';
    return col;
  }

  // ------------------------------------------------------------------ HAIR
  function hairBack(ctx, look, r, view, t) {
    const hs = look.hs, col = tc(look.hair, look);
    if (look.outfit === 'guard' || look.outfit === 'frontman' || look.vip) return;
    ctx.fillStyle = col;
    if (view === 'front') {
      if (hs === 'long') {
        // shadowed hair behind the neck, then two strands falling over the shoulders (reads as long hair, not a beard)
        ctx.fillStyle = U.shade(col, -0.35); ctx.fillRect(-r * 0.62, r * 0.4, r * 1.24, r * 1.0);
        ctx.fillStyle = col;
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * r * 1.08, -r * 0.2); ctx.quadraticCurveTo(sx * r * 1.32, r * 1.6, sx * r * 0.86, r * 2.2); ctx.lineTo(sx * r * 0.42, r * 2.0); ctx.quadraticCurveTo(sx * r * 0.78, r * 1.1, sx * r * 0.62, 0); ctx.closePath(); ctx.fill(); }
      }
      else if (hs === 'bob') { ctx.beginPath(); ctx.moveTo(-r * 1.12, -r * 0.3); ctx.quadraticCurveTo(-r * 1.25, r * 0.9, -r * 0.95, r * 1.05); ctx.lineTo(r * 0.95, r * 1.05); ctx.quadraticCurveTo(r * 1.25, r * 0.9, r * 1.12, -r * 0.3); ctx.closePath(); ctx.fill(); }
      else if (hs === 'twin') { circ(ctx, -r * 1.25, r * 0.1, r * 0.5, col); circ(ctx, r * 1.25, r * 0.1, r * 0.5, col); }
      else if (hs === 'pony') { ell(ctx, r * 0.9, r * 0.2, r * 0.25, r * 0.7, col, -0.3); }
    } else if (view === 'side') {
      if (hs === 'long') { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.9); ctx.quadraticCurveTo(-r * 1.4, 0, -r * 1.05, r * 2.1); ctx.lineTo(-r * 0.2, r * 2.0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); }
      else if (hs === 'pony') { const sw = Math.sin(t * 6) * 0.15; ctx.save(); ctx.translate(-r * 0.9, -r * 0.2); ctx.rotate(0.5 + sw); ell(ctx, 0, r * 0.8, r * 0.28, r * 0.85, col); ctx.restore(); circ(ctx, -r * 0.92, -r * 0.2, r * 0.25, U.shade(col, -0.2)); }
      else if (hs === 'bun') circ(ctx, -r * 0.7, -r * 0.85, r * 0.45, col);
      else if (hs === 'twin') circ(ctx, -r * 0.8, r * 0.1, r * 0.5, col);
    }
  }
  function hairFront(ctx, look, r, view, t) {
    const hs = look.hs, col = tc(look.hair, look), hi = U.shade(col, 0.18);
    if (look.outfit === 'guard' || look.outfit === 'frontman' || look.vip) return;
    ctx.fillStyle = col;
    const cap = (top = 1.12, fringe = 0.15) => {
      ctx.beginPath(); ctx.arc(0, 0, r * 1.06, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(r * 0.5, -r * (0.3 + fringe), 0, -r * 0.45); ctx.quadraticCurveTo(-r * 0.5, -r * (0.3 + fringe), -r * 1.04, -r * 0.05); ctx.closePath(); ctx.fill();
    };
    if (view === 'front') {
      switch (hs) {
        case 'buzz': ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(0, -r * 0.62, -r * 0.99, -r * 0.3); ctx.closePath(); ctx.fill(); ctx.globalAlpha /= 0.8; break;
        case 'bald': ctx.beginPath(); ctx.moveTo(-r * 1.02, -r * 0.1); ctx.quadraticCurveTo(-r * 1.1, -r * 0.6, -r * 0.7, -r * 0.55); ctx.lineTo(-r * 0.85, 0.1); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 1.02, -r * 0.1); ctx.quadraticCurveTo(r * 1.1, -r * 0.6, r * 0.7, -r * 0.55); ctx.lineTo(r * 0.85, 0.1); ctx.fill(); break;
        case 'slick': ctx.beginPath(); ctx.arc(0, 0, r * 1.08, Math.PI * 1.0, Math.PI * 2.0); ctx.quadraticCurveTo(r * 0.6, -r * 0.62, -r * 0.2, -r * 0.62); ctx.quadraticCurveTo(-r * 0.8, -r * 0.5, -r * 1.06, 0); ctx.fill(); ctx.strokeStyle = hi; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.95); ctx.quadraticCurveTo(r * 0.2, -r * 1.05, r * 0.8, -r * 0.7); ctx.stroke(); break;
        case 'spiky': cap(1.1, 0.05); for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.28 - r * 0.16, -r * 0.8); ctx.lineTo(i * r * 0.3, -r * 1.45 + Math.abs(i) * r * 0.1); ctx.lineTo(i * r * 0.28 + r * 0.16, -r * 0.8); ctx.fill(); } break;
        case 'curly': for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; circ(ctx, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.9 - r * 0.05, r * 0.36, i % 2 ? col : hi); } break;
        case 'perm': for (let i = 0; i < 11; i++) { const a = Math.PI * 0.95 + i / 10 * Math.PI * 1.1; circ(ctx, Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.9, r * 0.28, i % 2 ? col : hi); } break;
        case 'bowl': ctx.beginPath(); ctx.arc(0, 0, r * 1.1, Math.PI, 0); ctx.lineTo(r * 1.1, -r * 0.15); ctx.lineTo(-r * 1.1, -r * 0.15); ctx.closePath(); ctx.fill(); break;
        case 'bun': cap(); circ(ctx, 0, -r * 1.15, r * 0.42, col); circ(ctx, -r * 0.1, -r * 1.22, r * 0.14, hi); break;
        case 'long': case 'bob': case 'twin': ctx.beginPath(); ctx.arc(0, 0, r * 1.1, Math.PI * 1.0, Math.PI * 2.0); ctx.quadraticCurveTo(r * 0.9, -r * 0.1, r * 0.3, -r * 0.35); ctx.quadraticCurveTo(0, -r * 0.2, -r * 0.3, -r * 0.4); ctx.quadraticCurveTo(-r * 0.9, -r * 0.1, -r * 1.1, 0); ctx.closePath(); ctx.fill(); break;
        case 'pony': cap(1.1, 0.25); break;
        default: cap(); ctx.strokeStyle = hi; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.85); ctx.quadraticCurveTo(0, -r * 1.05, r * 0.5, -r * 0.8); ctx.stroke();
      }
    } else if (view === 'back') {
      switch (hs) {
        case 'bald': ctx.beginPath(); ctx.arc(0, r * 0.1, r * 1.03, Math.PI * 0.05, Math.PI * 0.95); ctx.lineTo(-r * 0.9, -r * 0.1); ctx.quadraticCurveTo(0, r * 0.1, r * 0.9, -r * 0.1); ctx.fill(); break;
        case 'buzz': ctx.globalAlpha *= 0.8; circ(ctx, 0, 0, r * 1.02, col); ctx.globalAlpha /= 0.8; break;
        case 'long': ctx.beginPath(); ctx.arc(0, 0, r * 1.1, Math.PI, 0); ctx.lineTo(r * 1.1, r * 2.1); ctx.lineTo(-r * 1.1, r * 2.1); ctx.closePath(); ctx.fill(); break;
        case 'bob': ctx.beginPath(); ctx.arc(0, 0, r * 1.12, Math.PI, 0); ctx.lineTo(r * 1.05, r * 1.05); ctx.lineTo(-r * 1.05, r * 1.05); ctx.closePath(); ctx.fill(); break;
        case 'pony': circ(ctx, 0, 0, r * 1.07, col); ell(ctx, 0, r * 1.2, r * 0.3, r * 0.8, col); circ(ctx, 0, r * 0.45, r * 0.22, U.shade(col, -0.3)); break;
        case 'bun': circ(ctx, 0, 0, r * 1.07, col); circ(ctx, 0, -r * 0.9, r * 0.45, col); break;
        case 'twin': circ(ctx, 0, 0, r * 1.07, col); circ(ctx, -r * 1.2, r * 0.2, r * 0.5, col); circ(ctx, r * 1.2, r * 0.2, r * 0.5, col); break;
        case 'curly': case 'perm': for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.36, i % 2 ? col : hi); } circ(ctx, 0, 0, r * 0.8, col); break;
        default: ctx.beginPath(); ctx.arc(0, 0, r * 1.07, Math.PI * 0.9, Math.PI * 2.1); ctx.quadraticCurveTo(0, r * 1.0, -r * 1.02, r * 0.35); ctx.closePath(); ctx.fill();
      }
    } else { // side, facing right
      switch (hs) {
        case 'bald': ctx.beginPath(); ctx.moveTo(-r * 1.02, -r * 0.1); ctx.quadraticCurveTo(-r * 1.05, r * 0.6, -r * 0.4, r * 0.55); ctx.lineTo(-r * 0.2, -r * 0.1); ctx.closePath(); ctx.fill(); break;
        case 'buzz': ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, Math.PI * 0.72, Math.PI * 1.85); ctx.quadraticCurveTo(r * 0.2, -r * 0.5, -r * 0.3, 0); ctx.closePath(); ctx.fill(); ctx.globalAlpha /= 0.8; break;
        case 'slick': ctx.beginPath(); ctx.arc(0, 0, r * 1.08, Math.PI * 0.75, Math.PI * 1.9); ctx.quadraticCurveTo(r * 0.3, -r * 0.55, -r * 0.3, -r * 0.1); ctx.lineTo(-r * 0.45, r * 0.5); ctx.closePath(); ctx.fill(); break;
        case 'spiky': ctx.beginPath(); ctx.arc(0, 0, r * 1.07, Math.PI * 0.75, Math.PI * 1.85); ctx.lineTo(-r * 0.3, 0); ctx.closePath(); ctx.fill(); for (let i = 0; i < 5; i++) { const a = Math.PI * 1.0 + i * 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.1) * r, Math.sin(a - 0.1) * r); ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); ctx.lineTo(Math.cos(a + 0.1) * r, Math.sin(a + 0.1) * r); ctx.fill(); } break;
        case 'curly': case 'perm': for (let i = 0; i < 9; i++) { const a = Math.PI * 0.7 + i / 8 * Math.PI * 1.15; circ(ctx, Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.9, r * (hs === 'perm' ? 0.3 : 0.37), i % 2 ? col : hi); } break;
        case 'bowl': ctx.beginPath(); ctx.arc(0, 0, r * 1.1, Math.PI * 0.8, Math.PI * 2); ctx.lineTo(r * 1.1, -r * 0.1); ctx.lineTo(-r * 0.5, 0); ctx.closePath(); ctx.fill(); break;
        case 'long': case 'bob': case 'twin': ctx.beginPath(); ctx.arc(0, 0, r * 1.1, Math.PI * 0.7, Math.PI * 1.95); ctx.quadraticCurveTo(r * 0.5, -r * 0.3, 0, -r * 0.15); ctx.lineTo(-r * 0.1, hs === 'bob' ? r * 1.0 : r * 0.6); ctx.lineTo(-r * 1.05, r * 1.0); ctx.closePath(); ctx.fill(); break;
        default: ctx.beginPath(); ctx.arc(0, 0, r * 1.07, Math.PI * 0.75, Math.PI * 1.92); ctx.quadraticCurveTo(r * 0.55, -r * 0.45, 0, -r * 0.3); ctx.lineTo(-r * 0.3, r * 0.3); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = hi; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8); ctx.quadraticCurveTo(0, -r * 1.05, r * 0.5, -r * 0.75); ctx.stroke();
      }
    }
  }

  // ------------------------------------------------------------------ FACES
  function blinkAt(look, t) { const ph = (t + look.seed * 0.37) % 4.2; return ph < 0.12; }
  function faceFront(ctx, look, r, pose, t, detail) {
    const expr = pose.expr || look.expr || 'neutral';
    const ink = tc('#1b1512', look);
    const eyesClosed = pose.eyes === 'closed' || expr === 'sleep' || expr === 'dead' || expr === 'cry' || (detail && blinkAt(look, t) && expr !== 'shock' && expr !== 'scared');
    const es = look.eyeSize;
    const ey = r * 0.08, ex = r * 0.38;
    // brows
    ctx.strokeStyle = tc(U.shade(look.hair, -0.1), look); ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
    let bIn = 0, bOut = 0; // + raises
    if (expr === 'angry' || expr === 'strain' || expr === 'determined') { bIn = -0.18; bOut = 0.05; }
    else if (expr === 'sad' || expr === 'cry' || expr === 'scared' || expr === 'tense') { bIn = 0.16; bOut = -0.05; }
    else if (expr === 'shock' || expr === 'scream') { bIn = 0.2; bOut = 0.2; }
    if (!look.mask) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * ex * 0.35, -r * 0.3 - r * bIn); ctx.lineTo(s * ex * 1.45, -r * 0.3 - r * bOut); ctx.stroke(); }
    // eyes
    if (eyesClosed) {
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.1;
      for (const s of [-1, 1]) { ctx.beginPath(); if (expr === 'cry' || expr === 'pain') { ctx.moveTo(s * ex - r * 0.22, ey - r * 0.08); ctx.lineTo(s * ex, ey + r * 0.04); ctx.lineTo(s * ex + r * 0.22, ey - r * 0.08); } else { ctx.moveTo(s * ex - r * 0.2, ey); ctx.quadraticCurveTo(s * ex, ey + r * 0.12, s * ex + r * 0.2, ey); } ctx.stroke(); }
    } else if (expr === 'happy') {
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.11;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex, ey + r * 0.08, r * 0.17, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    } else {
      const wide = expr === 'scared' || expr === 'shock' || expr === 'scream' ? 1.3 : expr === 'determined' || expr === 'angry' ? 0.8 : 1;
      for (const s of [-1, 1]) {
        if (detail) {
          ell(ctx, s * ex, ey, r * 0.2 * es * wide, r * 0.18 * es * wide * (expr === 'angry' ? 0.75 : 1), tc('#fbfaf6', look));
          circ(ctx, s * ex + (pose.lookX || 0) * r * 0.06, ey + r * 0.01, r * 0.12 * es * (wide > 1 ? 0.75 : 1), ink);
          circ(ctx, s * ex + r * 0.04, ey - r * 0.05, r * 0.04, '#fff');
        } else circ(ctx, s * ex, ey, r * 0.13 * es, ink);
      }
    }
    if (!detail) return;
    // nose
    ctx.strokeStyle = tc(U.shade(look.skin, -0.28), look); ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.moveTo(r * 0.02, r * 0.18); ctx.quadraticCurveTo(r * 0.12, r * 0.38, -r * 0.05, r * 0.4); ctx.stroke();
    // mouth
    const my = r * 0.62;
    const mo = Math.max(pose.mouth || 0, expr === 'scream' || expr === 'shock' ? 1 : expr === 'scared' ? 0.5 : 0);
    ctx.lineWidth = r * 0.08; ctx.strokeStyle = tc('#6d2b26', look);
    if (mo > 0.15) { ell(ctx, 0, my + r * 0.04, r * 0.16 + mo * 0.05 * r, r * 0.06 + mo * r * 0.14, tc('#5a1f1c', look)); }
    else if (expr === 'happy') { ctx.beginPath(); ctx.arc(0, my - r * 0.12, r * 0.25, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    else if (expr === 'smirk') { ctx.beginPath(); ctx.moveTo(-r * 0.2, my); ctx.quadraticCurveTo(r * 0.05, my + r * 0.05, r * 0.24, my - r * 0.08); ctx.stroke(); }
    else if (expr === 'sad' || expr === 'cry' || expr === 'pain') { ctx.beginPath(); ctx.arc(0, my + r * 0.16, r * 0.2, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (expr === 'angry' || expr === 'strain') { ctx.beginPath(); ctx.moveTo(-r * 0.22, my); ctx.lineTo(r * 0.22, my); ctx.stroke(); if (expr === 'strain') { ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.2, my - r * 0.04, r * 0.4, r * 0.08); } }
    else { ctx.beginPath(); ctx.moveTo(-r * 0.17, my); ctx.quadraticCurveTo(0, my + r * 0.03, r * 0.17, my); ctx.stroke(); }
    // age / beard / glasses / tears
    if (look.age === 2) { ctx.strokeStyle = tc(U.shade(look.skin, -0.2), look); ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.55); ctx.lineTo(r * 0.4, -r * 0.55); ctx.moveTo(-r * 0.35, -r * 0.45); ctx.lineTo(r * 0.35, -r * 0.45); ctx.moveTo(-r * 0.7, ey + r * 0.05); ctx.lineTo(-r * 0.6, ey + r * 0.15); ctx.moveTo(r * 0.7, ey + r * 0.05); ctx.lineTo(r * 0.6, ey + r * 0.15); ctx.stroke(); }
    if (look.beard) { ctx.fillStyle = tc(U.rgba(look.hair, look.beard === 'beard' ? 0.85 : 0.3), look); ctx.beginPath(); ctx.moveTo(-r * 0.75, r * 0.2); ctx.quadraticCurveTo(-r * 0.6, r * 1.05, 0, r * 1.05); ctx.quadraticCurveTo(r * 0.6, r * 1.05, r * 0.75, r * 0.2); ctx.quadraticCurveTo(0, r * 0.55, -r * 0.75, r * 0.2); ctx.fill(); }
    if (look.glasses) { ctx.strokeStyle = tc('#222', look); ctx.lineWidth = r * 0.07; for (const s of [-1, 1]) { ctx.beginPath(); ctx.rect(s * ex - r * 0.26, ey - r * 0.2, r * 0.52, r * 0.38); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-ex + r * 0.26, ey - r * 0.05); ctx.lineTo(ex - r * 0.26, ey - r * 0.05); ctx.stroke(); }
    if (expr === 'cry' || pose.tears) { ctx.fillStyle = 'rgba(150,210,255,.85)'; for (const s of [-1, 1]) { const k = (t * 1.2 + (s > 0 ? 0.5 : 0)) % 1; ell(ctx, s * ex, ey + r * 0.2 + k * r * 0.6, r * 0.06, r * 0.1, 'rgba(150,210,255,.85)'); } }
    if (look.mark === 'scar') { ctx.strokeStyle = tc('#a0584a', look); ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.3); ctx.stroke(); }
    if (expr === 'happy' || look.fem) { ctx.globalAlpha *= 0.25; circ(ctx, -r * 0.55, r * 0.35, r * 0.15, '#e46a6a'); circ(ctx, r * 0.55, r * 0.35, r * 0.15, '#e46a6a'); ctx.globalAlpha /= 0.25; }
  }
  function faceSide(ctx, look, r, pose, t, detail) {
    const expr = pose.expr || look.expr || 'neutral';
    const ink = tc('#1b1512', look);
    const skinD = tc(U.shade(look.skin, -0.2), look);
    // nose
    ctx.fillStyle = tc(look.skin, look); ctx.beginPath(); ctx.moveTo(r * 0.92, -r * 0.05); ctx.lineTo(r * 1.2, r * 0.3); ctx.lineTo(r * 0.9, r * 0.36); ctx.closePath(); ctx.fill();
    if (!detail) { circ(ctx, r * 0.5, 0, r * 0.12, ink); return; }
    // ear
    ell(ctx, -r * 0.12, r * 0.12, r * 0.18, r * 0.26, skinD);
    const eyesClosed = pose.eyes === 'closed' || expr === 'sleep' || expr === 'dead' || expr === 'cry' || (blinkAt(look, t) && expr !== 'shock' && expr !== 'scared');
    const ex = r * 0.55, ey = r * 0.02;
    if (eyesClosed) { ctx.strokeStyle = ink; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(ex - r * 0.18, ey); ctx.quadraticCurveTo(ex, ey + r * 0.1, ex + r * 0.15, ey); ctx.stroke(); }
    else if (expr === 'happy') { ctx.strokeStyle = ink; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(ex, ey + r * 0.08, r * 0.14, Math.PI * 1.2, Math.PI * 1.9); ctx.stroke(); }
    else {
      const wide = expr === 'scared' || expr === 'shock' || expr === 'scream' ? 1.3 : 1;
      ell(ctx, ex, ey, r * 0.13 * wide, r * 0.17 * wide, tc('#fbfaf6', look)); circ(ctx, ex + r * 0.05, ey + r * 0.01, r * 0.1, ink);
    }
    // brow
    ctx.strokeStyle = tc(U.shade(look.hair, -0.1), look); ctx.lineWidth = r * 0.11; ctx.lineCap = 'round';
    const bi = expr === 'angry' || expr === 'strain' || expr === 'determined' ? 0.12 : expr === 'sad' || expr === 'scared' || expr === 'cry' ? -0.12 : 0;
    ctx.beginPath(); ctx.moveTo(ex - r * 0.2, -r * 0.3 - bi * r * 0.5); ctx.lineTo(ex + r * 0.2, -r * 0.3 + bi * r); ctx.stroke();
    // mouth
    const my = r * 0.6, mx = r * 0.72;
    const mo = Math.max(pose.mouth || 0, expr === 'scream' || expr === 'shock' ? 1 : expr === 'scared' ? 0.5 : 0);
    if (mo > 0.15) ell(ctx, mx + r * 0.05, my, r * 0.1, r * 0.06 + mo * r * 0.12, tc('#5a1f1c', look));
    else { ctx.strokeStyle = tc('#6d2b26', look); ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(mx - r * 0.12, my + (expr === 'sad' ? r * 0.05 : 0)); ctx.lineTo(mx + r * 0.18, my + (expr === 'happy' ? -r * 0.08 : expr === 'sad' || expr === 'cry' ? r * 0.08 : 0)); ctx.stroke(); }
    if (look.beard) { ctx.fillStyle = tc(U.rgba(look.hair, look.beard === 'beard' ? 0.85 : 0.3), look); ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.4); ctx.quadraticCurveTo(r * 0.2, r * 1.1, r * 0.95, r * 0.8); ctx.lineTo(r * 0.95, r * 0.45); ctx.quadraticCurveTo(r * 0.4, r * 0.55, -r * 0.05, r * 0.4); ctx.fill(); }
    if (look.glasses) { ctx.strokeStyle = tc('#222', look); ctx.lineWidth = r * 0.07; ctx.strokeRect(ex - r * 0.2, ey - r * 0.18, r * 0.42, r * 0.34); ctx.beginPath(); ctx.moveTo(ex - r * 0.2, ey - r * 0.05); ctx.lineTo(-r * 0.1, ey - r * 0.05); ctx.stroke(); }
    if (look.age === 2) { ctx.strokeStyle = skinD; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.8, -r * 0.5); ctx.moveTo(ex + r * 0.2, ey + r * 0.15); ctx.lineTo(ex + r * 0.32, ey + r * 0.22); ctx.stroke(); }
    if (expr === 'cry' || pose.tears) { const k = (t * 1.2) % 1; ell(ctx, ex + r * 0.05, ey + r * 0.2 + k * r * 0.6, r * 0.06, r * 0.1, 'rgba(150,210,255,.85)'); }
  }

  // Guard / frontman / VIP masks
  function maskFront(ctx, look, r, view) {
    if (look.outfit === 'guard') {
      const O = OUTFITS.guard;
      // hood
      ctx.fillStyle = tc(O.main, look); ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, TAU); ctx.fill();
      ctx.fillStyle = tc(O.dark, look); ctx.beginPath(); ctx.arc(0, r * 0.05, r * 1.22, Math.PI * 0.1, Math.PI * 0.9); ctx.fill();
      if (view === 'back') { ctx.strokeStyle = tc(O.dark, look); ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(0, -r * 1.1); ctx.lineTo(0, r * 1.0); ctx.stroke(); return; }
      if (view === 'side') {
        ctx.fillStyle = tc('#0e0e10', look); ctx.beginPath(); ctx.ellipse(r * 0.45, r * 0.05, r * 0.7, r * 0.92, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
        R6.UI.shapeIcon(ctx, look.mask || 'circle', r * 0.72, r * 0.02, r * 0.26, tc('#f2f2f2', look), r * 0.1);
        return;
      }
      ctx.fillStyle = tc('#0e0e10', look); ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.86, r * 0.98, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.3, r * 0.5, -0.4, 0, TAU); ctx.fill();
      R6.UI.shapeIcon(ctx, look.mask || 'circle', 0, r * 0.05, r * 0.38, tc('#f2f2f2', look), r * 0.13);
      return;
    }
    if (look.outfit === 'frontman') {
      ctx.fillStyle = tc('#101013', look); ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, TAU); ctx.fill();
      if (view === 'back') return;
      ctx.save(); if (view === 'side') ctx.translate(r * 0.35, 0);
      ctx.fillStyle = tc('#1d1d22', look); ctx.beginPath();
      const pts = [[0, -r * 1.0], [r * 0.72, -r * 0.55], [r * 0.82, r * 0.25], [r * 0.4, r * 0.95], [0, r * 1.05], [-r * 0.4, r * 0.95], [-r * 0.82, r * 0.25], [-r * 0.72, -r * 0.55]];
      pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.moveTo(0, -r * 1.0); ctx.lineTo(0, r * 1.05); ctx.moveTo(-r * 0.72, -r * 0.55); ctx.lineTo(0, -r * 0.1); ctx.lineTo(r * 0.72, -r * 0.55); ctx.moveTo(-r * 0.82, r * 0.25); ctx.lineTo(0, r * 0.35); ctx.lineTo(r * 0.82, r * 0.25); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.fillRect(-r * 0.5, -r * 0.05, r * 0.3, r * 0.1); ctx.fillRect(r * 0.2, -r * 0.05, r * 0.3, r * 0.1);
      ctx.restore();
      return;
    }
    if (look.vip) {
      const gold = tc('#d4a73a', look), gd = tc('#9c7422', look), gl = tc('#ffe08a', look);
      if (view === 'back') { circ(ctx, 0, 0, r * 1.05, tc('#1d1612', look)); return; }
      ctx.save(); if (view === 'side') { ctx.translate(r * 0.3, 0); ctx.scale(0.7, 1); }
      const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, gl); g.addColorStop(0.5, gold); g.addColorStop(1, gd);
      ctx.fillStyle = g;
      const type = look.vip;
      ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 1.0, r * 1.1, 0, 0, TAU); ctx.fill();
      if (type === 'deer') { ctx.strokeStyle = gold; ctx.lineWidth = r * 0.14; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.5, -r * 0.8); ctx.lineTo(s * r * 1.1, -r * 1.8); ctx.moveTo(s * r * 0.8, -r * 1.3); ctx.lineTo(s * r * 1.4, -r * 1.4); ctx.stroke(); } }
      else if (type === 'eagle') { ctx.fillStyle = gd; ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.1); ctx.lineTo(r * 0.25, r * 0.1); ctx.lineTo(0, r * 0.9); ctx.fill(); }
      else if (type === 'bear' || type === 'lion') { for (const s of [-1, 1]) circ(ctx, s * r * 0.8, -r * 0.85, r * 0.35, gold); }
      else { for (const s of [-1, 1]) { ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(s * r * 0.4, -r * 0.8); ctx.lineTo(s * r * 0.95, -r * 1.5); ctx.lineTo(s * r * 1.0, -r * 0.5); ctx.fill(); } ctx.strokeStyle = gd; ctx.lineWidth = r * 0.08; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.7 + i * r * 0.25); ctx.lineTo(r * 0.2, -r * 0.6 + i * r * 0.25); ctx.stroke(); } }
      ctx.fillStyle = '#000'; ell(ctx, -r * 0.38, -r * 0.05, r * 0.2, r * 0.12, '#000', 0.2); ell(ctx, r * 0.38, -r * 0.05, r * 0.2, r * 0.12, '#000', -0.2);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ BODY: SIDE VIEW
  function drawSide(ctx, look, pose, t, detail) {
    const O = outfitOf(look);
    const skin = tc(look.skin, look), skinD = tc(U.shade(look.skin, -0.18), look);
    const main = tc(O.main, look), dark = tc(O.dark, look), light = tc(O.light, look);
    const pants = tc(O.pants, look), pantsD = tc(O.pantsDark, look);
    const shoe = tc(O.shoe, look), shoeD = tc(O.shoeDark, look);
    const bw = look.build;
    const thigh = 23, shin = 22, upper = 16, fore = 15;
    const hipY = -46 + pose.bob;
    const legW = 8.5 * bw, armW = 6.4 * bw;
    const sx = pose.shake ? (Math.random() - 0.5) * pose.shake : 0;
    ctx.translate(sx, 0);
    // FAR LEG
    const legF = limb(ctx, -1, hipY, pose.lHip, thigh, pose.lHip - pose.lKnee, shin, legW, pantsD, legW * 0.9);
    shoeSide(ctx, legF[2], legF[3], pose.lHip - pose.lKnee, shoeD, look);
    // FAR ARM (behind torso)
    const leanDX = Math.sin(pose.lean), leanDY = -Math.cos(pose.lean);
    const shX = -1 + leanDX * 31, shY = hipY + leanDY * 31;
    const armF = limb(ctx, shX, shY, pose.lSh, upper, pose.lSh + pose.lEl, fore, armW, dark, armW * 0.92);
    circ(ctx, armF[2], armF[3], 3.3 * bw, skinD);
    // NEAR LEG
    const legN = limb(ctx, 1, hipY, pose.rHip, thigh, pose.rHip - pose.rKnee, shin, legW, pants, legW * 0.9);
    if (O.piping && detail) { ctx.strokeStyle = tc(O.trim, look); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(1, hipY + 2); ctx.lineTo(legN[0], legN[1]); ctx.lineTo(legN[2] - Math.sin(pose.rHip - pose.rKnee) * 3, legN[3] - 3); ctx.stroke(); }
    shoeSide(ctx, legN[2], legN[3], pose.rHip - pose.rKnee, shoe, look);
    // TORSO (rotated by lean around hip)
    ctx.save(); ctx.translate(0, hipY); ctx.rotate(pose.lean);
    const tw = 8 * bw;
    if (O.robe) { ctx.fillStyle = main; ctx.beginPath(); ctx.moveTo(-tw - 1, -33); ctx.lineTo(tw + 2, -33); ctx.lineTo(tw + 6, 30); ctx.lineTo(-tw - 6, 30); ctx.closePath(); ctx.fill(); ctx.fillStyle = tc(O.trim, look); ctx.fillRect(tw + 1, -30, 2.5, 58); }
    if (O.coat) { ctx.fillStyle = main; ctx.beginPath(); ctx.moveTo(-tw - 1, -33); ctx.lineTo(tw + 2, -33); ctx.lineTo(tw + 5, 22); ctx.lineTo(-tw - 5, 22); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.moveTo(-tw, 2); ctx.quadraticCurveTo(-tw - 2, -18, -tw + 1, -32); ctx.quadraticCurveTo(0, -36, tw, -32); ctx.quadraticCurveTo(tw + 3 + (look.fem ? 1.5 : 0), -18, tw + 1, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-tw, 2); ctx.quadraticCurveTo(-tw - 2, -18, -tw + 1, -32); ctx.lineTo(-tw + 4, -32); ctx.quadraticCurveTo(-tw + 2, -16, -tw + 3, 2); ctx.closePath(); ctx.fill();
    if (detail) {
      // hem band
      ctx.fillStyle = dark; ctx.fillRect(-tw, -2, tw * 2 + 1, 4);
      if (O.lapel) { ctx.fillStyle = tc(O.under, look); ctx.beginPath(); ctx.moveTo(tw - 1, -32); ctx.lineTo(tw + 1.5, -32); ctx.lineTo(tw + 1, -14); ctx.closePath(); ctx.fill(); if (O.bow) { ctx.fillStyle = '#000'; ctx.fillRect(tw - 1, -32, 3.5, 3); } if (O.tie) { ctx.fillStyle = tc(O.tie, look); ctx.fillRect(tw - 0.5, -31, 2.5, 14); } }
      if (look.outfit === 'green') {
        ctx.fillStyle = tc(O.trim, look); ctx.fillRect(tw - 2.5, -33, 3.5, 3); // collar
        ctx.strokeStyle = tc('#d9d9d2', look); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(tw + 0.5, -30); ctx.lineTo(tw + 1, 0); ctx.stroke();
        if (look.num) { ctx.fillStyle = tc('#f4f4ef', look); ctx.fillRect(tw - 7, -27, 7.5, 5); }
      }
      if (O.belt) { ctx.fillStyle = tc(O.belt, look); ctx.fillRect(-tw, -4, tw * 2 + 1, 3); }
      if (look.vest) vestSide(ctx, look, tw);
    }
    // HEAD
    const nY = -34;
    ctx.fillStyle = skinD; ctx.fillRect(-2.5, nY - 5, 6, 6);
    ctx.save(); ctx.translate(1.5, nY - 11.5); ctx.rotate(pose.head);
    const r = 10.8;
    hairBack(ctx, look, r, 'side', t);
    if (look.outfit === 'guard' || look.outfit === 'frontman') maskFront(ctx, look, r, 'side');
    else {
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.98, r * 1.04, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = skinD; ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.3, r * 0.75, r * 0.7, 0, Math.PI * 0.2, Math.PI * 1.0); ctx.fill();
      if (look.vip) maskFront(ctx, look, r, 'side'); else faceSide(ctx, look, r, pose, t, detail);
      hairFront(ctx, look, r, 'side', t);
    }
    ctx.restore();
    // NEAR ARM
    const shx = 1, shy = -30;
    const armN = limb(ctx, shx, shy, pose.rSh - pose.lean, upper, pose.rSh + pose.rEl - pose.lean, fore, armW, main, armW * 0.92);
    if (O.piping && detail) { ctx.strokeStyle = tc(O.trim, look); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(shx, shy - 2); ctx.lineTo(armN[0], armN[1]); ctx.lineTo(armN[2], armN[3]); ctx.stroke(); }
    const handC = O.gloves ? tc(O.gloves, look) : skin;
    circ(ctx, armN[2], armN[3], 3.4 * bw, handC);
    if (pose.item) drawItem(ctx, pose.item, armN[2], armN[3], look);
    ctx.restore();
  }
  function shoeSide(ctx, x, y, a, col, look) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-a * 0.35);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(6, -3); ctx.quadraticCurveTo(10, -2, 10, 1.5); ctx.lineTo(-4.5, 1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-4.5, 0.5, 14.5, 1.3);
    ctx.restore();
  }
  function vestSide(ctx, look, tw) {
    const c = look.vest === 'blue' ? '#2f6fd1' : look.vest === 'red' ? '#d13a3a' : '#1a1a1c';
    ctx.fillStyle = tc(c, look); ctx.beginPath(); ctx.moveTo(-tw + 1, -30); ctx.lineTo(tw, -30); ctx.lineTo(tw + 1, -2); ctx.lineTo(-tw, -2); ctx.closePath(); ctx.fill();
    if (look.vestNum) R6.UI.text(ctx, String(look.vestNum), 0, -14, { size: 10, align: 'center', base: 'middle', color: '#fff', weight: 800 });
  }
  function drawItem(ctx, item, x, y, look) {
    if (item === 'food') { ell(ctx, x + 2, y - 2, 3.5, 4, '#f3efe2'); }
    else if (item === 'ddakji') { ctx.fillStyle = '#2458c9'; ctx.save(); ctx.translate(x, y - 3); ctx.rotate(0.3); ctx.fillRect(-5, -5, 10, 10); ctx.fillStyle = '#c83434'; ctx.fillRect(-5, -5, 5, 10); ctx.restore(); }
    else if (item === 'knife') { ctx.save(); ctx.translate(x, y); ctx.rotate(0.9); ctx.fillStyle = '#c9ccd2'; ctx.fillRect(-1, -14, 2.5, 12); ctx.fillStyle = '#3a2a22'; ctx.fillRect(-1.5, -3, 3.5, 6); ctx.restore(); }
    else if (item === 'key') { ctx.strokeStyle = '#e8c24a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x + 2, y - 3, 2.5, 0, TAU); ctx.moveTo(x + 4, y - 3); ctx.lineTo(x + 10, y - 3); ctx.stroke(); }
    else if (item === 'rifle') { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.15); ctx.fillStyle = '#1c1c1f'; ctx.fillRect(-16, -3, 34, 4.5); ctx.fillRect(-14, 0, 6, 7); ctx.fillStyle = '#2b2b30'; ctx.fillRect(4, -5, 5, 3); ctx.restore(); }
    else if (item === 'flashlight') { ctx.fillStyle = '#333'; ctx.fillRect(x - 2, y - 2, 9, 4); ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 7, y - 2.5, 2, 5); }
    else if (item === 'card') { ctx.fillStyle = '#c9a36b'; ctx.fillRect(x - 3, y - 6, 8, 5); }
    else if (item === 'baby') { ell(ctx, x - 3, y - 4, 7, 5, '#f2efe6'); circ(ctx, x + 2, y - 7, 3.2, '#f0cdb0'); }
    else if (item === 'marble') { circ(ctx, x + 1, y - 1, 2.5, '#7fc4ff'); }
    else if (item === 'rope') { }
  }

  // ------------------------------------------------------------------ BODY: FRONT / BACK VIEW
  function drawFront(ctx, look, pose, t, detail, back) {
    const O = outfitOf(look);
    const skin = tc(look.skin, look), skinD = tc(U.shade(look.skin, -0.18), look);
    const main = tc(O.main, look), dark = tc(O.dark, look), light = tc(O.light, look);
    const pants = tc(O.pants, look), pantsD = tc(O.pantsDark, look);
    const shoe = tc(O.shoe, look);
    const bw = look.build;
    const hipY = -46 + pose.bob + pose.crouch * 6;
    const sx = pose.shake ? (Math.random() - 0.5) * pose.shake : 0;
    ctx.translate(sx, 0);
    const legW = 9 * bw;
    // legs: lift derived from knee bends; sway from hips
    const legs = [[-1, pose.lKnee, pose.lHip], [1, pose.rKnee, pose.rHip]];
    if (back) legs.reverse();
    for (const [s, knee, hip] of legs) {
      const lift = Math.min(12, knee * 7);
      const hx = s * 4.8 * bw, fx = s * 5.5 * bw + s * pose.crouch * 3;
      const fy = -lift * 0.9 - (pose.sit ? 0 : 0);
      const kx = (hx + fx) / 2 + s * knee * 1.6, ky = (hipY + fy) / 2 - lift * 0.1;
      ctx.strokeStyle = s < 0 ? pantsD : pants; ctx.lineWidth = legW; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy - 2); ctx.stroke();
      if (O.piping && detail) { ctx.strokeStyle = tc(O.trim, look); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(hx + s * legW * 0.45, hipY + 2); ctx.lineTo(kx + s * legW * 0.45, ky); ctx.lineTo(fx + s * legW * 0.42, fy - 4); ctx.stroke(); }
      ell(ctx, fx + s * 0.8, fy, 5.2 * bw, 3.2, shoe);
    }
    // torso
    const sw = 12.5 * bw * (look.fem ? 0.9 : 1), ww = 9.2 * bw;
    const topY = hipY - 32;
    ctx.save(); ctx.translate(0, hipY); ctx.rotate(pose.lean * 0.15); ctx.translate(0, -hipY);
    if (O.robe) { ctx.fillStyle = main; ctx.beginPath(); ctx.moveTo(-sw, topY + 2); ctx.lineTo(sw, topY + 2); ctx.lineTo(sw + 5, hipY + 30); ctx.lineTo(-sw - 5, hipY + 30); ctx.closePath(); ctx.fill(); }
    if (O.coat) { ctx.fillStyle = main; ctx.beginPath(); ctx.moveTo(-sw, topY + 2); ctx.lineTo(sw, topY + 2); ctx.lineTo(sw + 4, hipY + 22); ctx.lineTo(-sw - 4, hipY + 22); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.moveTo(-ww, hipY + 2); ctx.quadraticCurveTo(-sw - 1, hipY - 16, -sw, topY + 3); ctx.quadraticCurveTo(-sw + 1, topY - 1, -4, topY - 1); ctx.lineTo(4, topY - 1); ctx.quadraticCurveTo(sw - 1, topY - 1, sw, topY + 3); ctx.quadraticCurveTo(sw + 1, hipY - 16, ww, hipY + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark; ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.moveTo(ww, hipY + 2); ctx.quadraticCurveTo(sw + 1, hipY - 16, sw, topY + 3); ctx.lineTo(sw - 4, topY + 5); ctx.quadraticCurveTo(sw - 3, hipY - 14, ww - 3, hipY + 2); ctx.fill(); ctx.globalAlpha /= 0.55;
    if (detail) {
      ctx.fillStyle = dark; ctx.fillRect(-ww, hipY - 1, ww * 2, 3.5);
      if (!back) {
        if (look.outfit === 'green') {
          ctx.fillStyle = tc(O.trim, look); ctx.beginPath(); ctx.moveTo(-5, topY - 1); ctx.lineTo(0, topY + 5); ctx.lineTo(5, topY - 1); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = tc(U.shade(O.main, -0.35), look); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, topY + 5); ctx.lineTo(0, hipY + 1); ctx.stroke();
          if (look.num) {
            const pw = Math.min(10, sw - 4.2); ctx.fillStyle = tc('#f4f4ef', look); ctx.fillRect(1.3, topY + 7, pw, 6);
            if (detail > 1) R6.UI.text(ctx, U.pad(look.num), 1.3 + pw / 2, topY + 10.3, { size: 5, align: 'center', base: 'middle', color: '#111', weight: 800, fam: 'mono', maxW: pw - 1 });
          }
          if (look.badge) { R6.UI.shapeIcon(ctx, look.badge === 'O' ? 'o' : 'x', -sw * 0.5, topY + 10, 2.4, look.badge === 'O' ? '#3a86ff' : '#ff3b5c', 1.4); }
        }
        if (O.lapel) { ctx.fillStyle = tc(O.under, look); ctx.beginPath(); ctx.moveTo(-4.5, topY - 1); ctx.lineTo(0, topY + 13); ctx.lineTo(4.5, topY - 1); ctx.closePath(); ctx.fill(); if (O.bow) { ctx.fillStyle = '#060606'; ctx.beginPath(); ctx.moveTo(-4, topY + 1); ctx.lineTo(0, topY + 3); ctx.lineTo(-4, topY + 5); ctx.moveTo(4, topY + 1); ctx.lineTo(0, topY + 3); ctx.lineTo(4, topY + 5); ctx.fill(); } if (O.tie) { ctx.fillStyle = tc(O.tie, look); ctx.fillRect(-1.3, topY + 2, 2.6, 13); } ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, topY); ctx.lineTo(-1, topY + 18); ctx.moveTo(5, topY); ctx.lineTo(1, topY + 18); ctx.stroke(); }
        if (O.belt) { ctx.fillStyle = tc(O.belt, look); ctx.fillRect(-ww, hipY - 3, ww * 2, 3); ctx.fillStyle = '#777'; ctx.fillRect(-2, hipY - 3, 4, 3); }
        if (O.robe) { ctx.fillStyle = tc(O.trim, look); ctx.fillRect(-1.2, topY, 2.4, 60); }
      } else {
        if (look.outfit === 'green' && look.num && detail > 1) { ctx.fillStyle = tc('#f4f4ef', look); ctx.fillRect(-8, topY + 7, 16, 9); R6.UI.text(ctx, U.pad(look.num), 0, topY + 11.8, { size: 7.5, align: 'center', base: 'middle', color: '#111', weight: 800, fam: 'mono' , maxW: 14.5 }); }
      }
      if (look.vest) {
        const c = look.vest === 'blue' ? '#2f6fd1' : look.vest === 'red' ? '#d13a3a' : '#1a1a1c';
        ctx.fillStyle = tc(c, look); ctx.beginPath(); ctx.moveTo(-sw + 2, topY + 3); ctx.lineTo(-4, topY + 3); ctx.lineTo(0, topY + 10); ctx.lineTo(4, topY + 3); ctx.lineTo(sw - 2, topY + 3); ctx.lineTo(ww, hipY); ctx.lineTo(-ww, hipY); ctx.closePath(); ctx.fill();
        if (look.vestNum && detail > 1) R6.UI.text(ctx, String(look.vestNum), 0, topY + 18, { size: 12, align: 'center', base: 'middle', color: '#fff', weight: 800 });
      }
    }
    // arms
    const arms = [[-1, pose.lSh, pose.lEl], [1, pose.rSh, pose.rEl]];
    for (const [s, sh, el] of arms) {
      const raise = U.clamp((Math.abs(sh) - 0.9) / 2.0, 0, 1) + (pose.armOut || 0) * 0.15;
      const angOut = raise * 2.6 + 0.1; // outward from straight down
      const swing = Math.sin(sh) * (1 - raise);
      const ax = s * (sw - 1.5), ay = topY + 4;
      const up = 16 - Math.abs(swing) * 3.5;
      const ex = ax + s * Math.sin(angOut) * up, ey = ay + Math.cos(angOut) * up;
      let fa = angOut + (pose.handsFace ? 1.9 : el * 0.55 * (raise > 0.5 ? -0.3 : 1));
      const fo = 15 - Math.abs(swing) * 4 - (pose.handsFace ? 3 : 0);
      let hx = ex + s * Math.sin(fa) * fo * (pose.handsFace ? -1 : 1), hy = ey + Math.cos(fa) * fo;
      if (pose.handsFace && !back) { hx = s * 5; hy = topY - 9; }
      const armCol = back ? (s < 0 ? main : dark) : (s < 0 ? dark : main);
      ctx.strokeStyle = armCol; ctx.lineWidth = 6.4 * bw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      if (O.piping && detail) { ctx.strokeStyle = tc(O.trim, look); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax + s * 3, ay); ctx.lineTo(ex + s * 3, ey); ctx.lineTo(hx + s * 2.5, hy - 2); ctx.stroke(); }
      circ(ctx, hx, hy + 1, 3.4 * bw, O.gloves ? tc(O.gloves, look) : skin);
      if (pose.item && s > 0 && !back) drawItem(ctx, pose.item, hx, hy, look);
    }
    ctx.restore();
    // head
    const r = 10.8;
    ctx.fillStyle = skinD; ctx.fillRect(-3, topY - 6, 6, 7);
    ctx.save(); ctx.translate(0, topY - 12.5); ctx.rotate(pose.head * 0.3);
    if (!back) hairBack(ctx, look, r, 'front', t);
    if (look.outfit === 'guard' || look.outfit === 'frontman') { maskFront(ctx, look, r, back ? 'back' : 'front'); }
    else {
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.05, 0, 0, TAU); ctx.fill();
      if (!back) {
        ell(ctx, -r, r * 0.1, r * 0.18, r * 0.28, skinD); ell(ctx, r, r * 0.1, r * 0.18, r * 0.28, skinD);
        ctx.fillStyle = skinD; ctx.globalAlpha *= 0.4; ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.8, r * 0.45, 0, 0, Math.PI); ctx.fill(); ctx.globalAlpha /= 0.4;
        if (look.vip) maskFront(ctx, look, r, 'front'); else faceFront(ctx, look, r, pose, t, detail);
        hairFront(ctx, look, r, 'front', t);
      } else { if (look.vip) maskFront(ctx, look, r, 'back'); hairFront(ctx, look, r, 'back', t); }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ LOD (tiny) draw
  function drawTiny(ctx, look, pose, view, facing) {
    const O = outfitOf(look);
    const main = tc(O.main, look), pants = tc(O.pants, look), skin = tc(look.skin, look);
    const hipY = -46 + pose.bob;
    const s1 = Math.sin(pose.rHip) * 10, s2 = Math.sin(pose.lHip) * 10;
    ctx.strokeStyle = pants; ctx.lineCap = 'round'; ctx.lineWidth = 10 * look.build;
    ctx.beginPath();
    if (view === 'side') { ctx.moveTo(0, hipY); ctx.lineTo(s1, -3); ctx.moveTo(0, hipY); ctx.lineTo(s2, -3); }
    else { ctx.moveTo(-5, hipY); ctx.lineTo(-5, -3 - Math.max(0, pose.lKnee) * 6); ctx.moveTo(5, hipY); ctx.lineTo(5, -3 - Math.max(0, pose.rKnee) * 6); }
    ctx.stroke();
    ctx.fillStyle = main; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11 * look.build, hipY - 33, 22 * look.build, 36, 6) : ctx.rect(-11, hipY - 33, 22, 36); ctx.fill();
    if (look.outfit === 'guard' || look.outfit === 'frontman') { circ(ctx, 0, hipY - 45, 12.5, main); circ(ctx, view === 'side' ? 4 : 0, hipY - 44, 8.5, view === 'back' ? main : '#0e0e10'); }
    else { circ(ctx, 0, hipY - 45, 11, skin); ctx.fillStyle = tc(look.hair, look); ctx.beginPath(); ctx.arc(0, hipY - 45, 11.5, view === 'back' ? 0 : Math.PI * 1.05, view === 'back' ? TAU : Math.PI * 1.95); ctx.fill(); }
  }

  // ------------------------------------------------------------------ PUBLIC DRAW
  // x,y = feet position. o: {view:'side'|'front'|'back', dir:1|-1, anim, t, scale, shadow, alpha, pose, zoom(for LOD), lod, highlight}
  function draw(ctx, look, x, y, o = {}) {
    const scale = (o.scale || 1) * (look.h || 1);
    const view = o.view || 'front';
    const anim = o.anim || 'idle';
    const pose = o.pose || getPose(anim, o.t || 0, { seed: look.seed || 0, back: o.back, speed: o.speed, effort: o.effort, pullRate: o.pullRate, freezePh: o.freezePh, dead: o.dead });
    if (o.expr && !pose.expr) pose.expr = o.expr;
    if (o.expr && (anim === 'talk' || anim === 'idle' || anim === 'walk' || anim === 'look' || anim === 'sit' || anim === 'point' || anim === 'hold')) pose.expr = o.expr;
    if (o.mouth != null) pose.mouth = Math.max(pose.mouth, o.mouth);
    if (o.item) pose.item = o.item;
    // keep the legs seated while the upper body plays another animation (talking, holding, crying on a chair)
    if (o.seated === 'chair' && !pose.lying && !pose.rot) { pose.rHip = 1.5; pose.lHip = 1.45; pose.rKnee = 1.5; pose.lKnee = 1.45; pose.bob = 18 + (anim === 'sit' || anim === 'sitSad' ? pose.bob - 18 : pose.bob * 0.3); pose.sit = 1; pose.lean = Math.max(-0.1, Math.min(pose.lean || 0, 0.4)); }
    else if (o.seated === 'floor' && !pose.lying && !pose.rot && anim !== 'hugKnees' && anim !== 'sitFloor') { pose.rHip = 1.45; pose.lHip = 1.4; pose.rKnee = 0.12; pose.lKnee = 0.2; pose.bob = 37; pose.sit = 1; }
    const eff = scale * (o.zoom || 1);
    const lb = R6.Engine ? R6.Engine.lodBias : 0;
    const lod = o.lod != null ? o.lod : eff < 0.32 + lb ? 0 : eff < 0.75 ? 1 : 2;
    ctx.save();
    ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    // shadow
    if (o.shadow !== false) {
      const sw = 15 * scale * (1 + (pose.lying || 0) * 1.6);
      ctx.fillStyle = 'rgba(0,0,0,' + (o.shadowA || 0.28) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, sw, 4.5 * scale, 0, 0, TAU); ctx.fill();
    }
    ctx.scale(scale, scale);
    const facing = o.dir || 1;
    if (view === 'side' && facing < 0) ctx.scale(-1, 1);
    // whole-body rotation for falls / lying (pivot at feet, then lowered so the body rests on ground)
    if (pose.rot) {
      const k = Math.min(1, Math.abs(pose.rot) / (Math.PI / 2));
      ctx.translate(0, -k * 8);
      if (view === 'front' || view === 'back') { ctx.translate(0, -46 * k * 0.5); ctx.rotate(pose.rot); ctx.translate(0, 46 * k * 0.5); }
      else { ctx.translate(-Math.sign(pose.rot) * 0 , 0); ctx.rotate(pose.rot); }
    }
    if (o.highlight) { ctx.shadowColor = o.highlight; ctx.shadowBlur = 12; }
    if (lod === 0) drawTiny(ctx, look, pose, view, facing);
    else if (view === 'side') drawSide(ctx, look, pose, o.t || 0, lod);
    else drawFront(ctx, look, pose, o.t || 0, lod, view === 'back');
    ctx.restore();
  }

  // Top-down (3/4) convenience: dir in 'down','up','left','right'
  function drawTD(ctx, look, x, y, dir, anim, t, o = {}) {
    const view = dir === 'up' ? 'back' : dir === 'down' ? 'front' : 'side';
    return draw(ctx, look, x, y, Object.assign({ view, dir: dir === 'left' ? -1 : 1, anim, t, scale: o.scale || 0.46 }, o));
  }

  // Portrait: head & shoulders, framed, for dialogue boxes
  function portrait(ctx, look, x, y, size, expr, t, talking) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x - size / 2, y - size / 2, size, size); ctx.clip();
    const g = ctx.createLinearGradient(x, y - size / 2, x, y + size / 2);
    const bg = look.outfit === 'guard' ? '#3a1020' : look.outfit === 'frontman' ? '#101014' : look.vip ? '#2a2210' : '#132522';
    g.addColorStop(0, U.shade(bg, 0.15)); g.addColorStop(1, U.shade(bg, -0.4));
    ctx.fillStyle = g; ctx.fillRect(x - size / 2, y - size / 2, size, size);
    const sc = size / 44;
    const pose = getPose(talking ? 'talk' : 'idle', t, { seed: look.seed });
    pose.expr = expr || pose.expr || 'neutral';
    if (!talking) pose.mouth = 0;
    pose.rSh = 0.05; pose.lSh = 0.05; pose.handsFace = 0; pose.armOut = 0; pose.bob = 0; pose.lean = 0;
    draw(ctx, look, x, y + 90 * sc * (look.h || 1) + size * 0.12, { view: 'front', pose, scale: sc, shadow: false, lod: 2 });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - size / 2 + 0.5, y - size / 2 + 0.5, size - 1, size - 1); ctx.restore();
  }

  R6.Char = { draw, drawTD, portrait, makeLook, getPose, ANIMS, OUTFITS, SKINS, HAIRS, STYLES };
})();
