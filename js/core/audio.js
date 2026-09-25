/* ROUND 6 — audio.js : procedural WebAudio SFX, ambience loops and a small dynamic music sequencer (all original) */
'use strict';
(function () {
  const A = {
    ctx: null, ok: false, master: null, music: null, sfxBus: null, amb: null, rev: null, comp: null,
    noiseBuf: null, vol: { master: 0.8, music: 0.55, sfx: 0.8 },
    loops: new Map(), lastPlay: new Map(), muted: false,
  };

  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      A.ctx = ctx;
      A.comp = ctx.createDynamicsCompressor();
      A.comp.threshold.value = -14; A.comp.ratio.value = 4; A.comp.attack.value = 0.005; A.comp.release.value = 0.2;
      A.master = ctx.createGain(); A.master.gain.value = A.vol.master;
      A.master.connect(A.comp); A.comp.connect(ctx.destination);
      A.music = ctx.createGain(); A.music.gain.value = A.vol.music; A.music.connect(A.master);
      A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = A.vol.sfx; A.sfxBus.connect(A.master);
      A.amb = ctx.createGain(); A.amb.gain.value = A.vol.sfx * 0.8; A.amb.connect(A.master);
      // noise buffer
      const len = ctx.sampleRate * 2;
      const nb = ctx.createBuffer(1, len, ctx.sampleRate); const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noiseBuf = nb;
      // reverb impulse
      const rl = Math.floor(ctx.sampleRate * 2.4);
      const ir = ctx.createBuffer(2, rl, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < rl; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
      A.rev = ctx.createConvolver(); A.rev.buffer = ir;
      A.revGain = ctx.createGain(); A.revGain.gain.value = 0.35;
      A.rev.connect(A.revGain); A.revGain.connect(A.master);
      A.ok = true;
      A.applyVolumes();
      if (A._pendingMusic) { const p = A._pendingMusic; A._pendingMusic = null; Music.play(p.name, p.fade); }
      for (const [name, l] of A._pendingLoops) A.loop(name, l);
      A._pendingLoops.clear();
    } catch (e) { console.warn('Audio init failed', e); }
  };
  A._pendingLoops = new Map();

  A.applyVolumes = function () {
    if (!A.ok) return;
    const t = A.ctx.currentTime;
    A.master.gain.setTargetAtTime(A.muted ? 0 : A.vol.master, t, 0.05);
    A.music.gain.setTargetAtTime(A.vol.music * (Music.duckV || 1), t, 0.1);
    A.sfxBus.gain.setTargetAtTime(A.vol.sfx, t, 0.05);
    A.amb.gain.setTargetAtTime(A.vol.sfx * 0.8, t, 0.05);
  };
  A.setVolumes = function (v) { Object.assign(A.vol, v); A.applyVolumes(); };

  // ---------- low level helpers ----------
  function env(g, t, a, d, s, r, peak = 1, hold = 0) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
    if (r > 0) {
      g.gain.setValueAtTime(Math.max(0.0001, peak * s), t + a + d + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + hold + r);
    }
  }
  function osc(type, f, t, dur, dest, vol = 0.3, a = 0.005, r = 0.1, detune = 0) {
    const ctx = A.ctx; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }
  function noise(t, dur, dest, vol = 0.3, ftype = 'highpass', freq = 1000, q = 0.7, a = 0.002, decayShape = 'exp') {
    const ctx = A.ctx; const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
    s.playbackRate.value = 1; const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    if (decayShape === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + dur); else { g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    s.connect(f); f.connect(g); g.connect(dest);
    const off = Math.random() * 1.5; s.start(t, off, dur + 0.1); s.stop(t + dur + 0.1);
    return { s, f, g };
  }
  function sweep(type, f0, f1, t, dur, dest, vol = 0.3, a = 0.005) {
    const ctx = A.ctx; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return { o, g };
  }
  function panner(p, dest) {
    if (!A.ctx.createStereoPanner) return dest;
    const pn = A.ctx.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, p)); pn.connect(dest); return pn;
  }
  function sendRev(node, amt) { const g = A.ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(A.rev); }

  // ---------- SFX bank ----------
  const SFX = {
    click(t, d) { osc('sine', 880, t, 0.06, d, 0.18); osc('sine', 1760, t, 0.03, d, 0.05); },
    hover(t, d) { osc('sine', 1320, t, 0.035, d, 0.06); },
    confirm(t, d) { osc('triangle', 660, t, 0.09, d, 0.2); osc('triangle', 990, t + 0.07, 0.14, d, 0.2); },
    back(t, d) { osc('triangle', 700, t, 0.08, d, 0.16); osc('triangle', 470, t + 0.06, 0.12, d, 0.16); },
    error(t, d) { osc('square', 180, t, 0.12, d, 0.08); osc('square', 140, t + 0.1, 0.18, d, 0.08); },
    type(t, d) { osc('square', 1800 + Math.random() * 400, t, 0.015, d, 0.025); },
    step(t, d) { noise(t, 0.06, d, 0.12, 'lowpass', 500 + Math.random() * 400, 1); },
    stepHard(t, d) { noise(t, 0.08, d, 0.2, 'bandpass', 1200 + Math.random() * 300, 1.2); },
    door(t, d) { noise(t, 0.25, d, 0.25, 'lowpass', 400, 1); sweep('sawtooth', 220, 120, t, 0.35, d, 0.05); },
    doorSlam(t, d) { noise(t, 0.35, d, 0.55, 'lowpass', 300, 1); osc('sine', 58, t, 0.4, d, 0.5); sendRev(noise(t, 0.2, d, 0.2, 'lowpass', 800).g, 0.5); },
    metal(t, d) { [1, 2.76, 5.4, 8.9].forEach((m, i) => osc('sine', 320 * m, t, 1.2 / (i + 1), d, 0.12 / (i + 1))); noise(t, 0.05, d, 0.2, 'highpass', 3000); },
    gun(t, d) {
      const n = noise(t, 0.18, d, 0.9, 'highpass', 900, 0.5); sendRev(n.g, 0.9);
      sweep('sine', 180, 40, t, 0.25, d, 0.8); noise(t + 0.02, 0.6, d, 0.12, 'lowpass', 600, 0.5);
    },
    gunFar(t, d) { const n = noise(t, 0.12, d, 0.35, 'bandpass', 1400, 0.6); sendRev(n.g, 1.2); sweep('sine', 140, 40, t, 0.2, d, 0.25); },
    glass(t, d) {
      const n = noise(t, 0.6, d, 0.45, 'highpass', 2500, 0.8); sendRev(n.g, 0.8);
      for (let i = 0; i < 14; i++) { const tt = t + Math.random() * 0.35; osc('sine', 2200 + Math.random() * 5200, tt, 0.08 + Math.random() * 0.2, d, 0.06); }
      sweep('sine', 300, 60, t, 0.3, d, 0.3);
    },
    glassTapHi(t, d) { osc('sine', 2600, t, 0.5, d, 0.18); osc('sine', 5200, t, 0.3, d, 0.06); },
    glassTapLo(t, d) { osc('sine', 1650, t, 0.2, d, 0.18); noise(t, 0.08, d, 0.1, 'bandpass', 1800, 2); },
    rope(t, d) { const o = sweep('sawtooth', 90, 70, t, 0.5, d, 0.08); noise(t, 0.4, d, 0.1, 'bandpass', 500, 4); },
    ropeWhoosh(t, d) { const n = noise(t, 0.45, d, 0.5, 'bandpass', 300, 1.2); n.f.frequency.exponentialRampToValueAtTime(1800, t + 0.2); n.f.frequency.exponentialRampToValueAtTime(250, t + 0.45); },
    whoosh(t, d) { const n = noise(t, 0.3, d, 0.35, 'bandpass', 600, 1.5); n.f.frequency.exponentialRampToValueAtTime(2400, t + 0.25); },
    hit(t, d) { sweep('sine', 160, 50, t, 0.14, d, 0.7); noise(t, 0.05, d, 0.4, 'bandpass', 2500, 1); },
    hitHeavy(t, d) { sweep('sine', 120, 35, t, 0.25, d, 0.9); noise(t, 0.1, d, 0.5, 'lowpass', 1500, 1); },
    block(t, d) { noise(t, 0.07, d, 0.35, 'bandpass', 900, 2); osc('square', 220, t, 0.05, d, 0.05); },
    thud(t, d) { noise(t, 0.25, d, 0.5, 'lowpass', 250, 1); osc('sine', 55, t, 0.3, d, 0.5); },
    fall(t, d) { sweep('sine', 900, 180, t, 1.2, d, 0.12); noise(t, 1.2, d, 0.1, 'bandpass', 700, 0.8, 0.3, 'lin'); },
    money(t, d) {
      const n = [1318.5, 1760, 2637]; n.forEach((f, i) => { osc('sine', f, t + i * 0.055, 0.5, d, 0.14); osc('triangle', f * 2, t + i * 0.055, 0.2, d, 0.03); });
      noise(t, 0.08, d, 0.15, 'highpass', 6000);
    },
    coin(t, d) { osc('square', 988, t, 0.06, d, 0.08); osc('square', 1319, t + 0.06, 0.25, d, 0.08); },
    siren(t, d) { for (let i = 0; i < 4; i++) { osc('square', 740, t + i * 0.5, 0.25, d, 0.07); osc('square', 880, t + i * 0.5 + 0.25, 0.25, d, 0.07); } },
    buzzer(t, d) { osc('square', 110, t, 0.9, d, 0.14); osc('sawtooth', 116, t, 0.9, d, 0.1); },
    bell(t, d) { [1, 2.4, 3.8].forEach((m, i) => { const r = osc('sine', 880 * m, t, 1.6 / (i + 1), d, 0.15 / (i + 1)); sendRev(r.g, 0.4); }); },
    dollTurn(t, d) { const o = sweep('sawtooth', 70, 45, t, 0.9, d, 0.12); const n = noise(t, 0.9, d, 0.12, 'bandpass', 300, 3, 0.1, 'lin'); for (let i = 0; i < 6; i++) noise(t + i * 0.13, 0.03, d, 0.2, 'highpass', 2000); },
    scan(t, d) { osc('sine', 1400, t, 0.12, d, 0.06); osc('sine', 1900, t + 0.14, 0.12, d, 0.06); },
    heartbeat(t, d) { osc('sine', 60, t, 0.14, d, 0.6); osc('sine', 52, t + 0.2, 0.18, d, 0.45); },
    breath(t, d) { const n = noise(t, 0.9, d, 0.12, 'bandpass', 700, 0.8, 0.35, 'lin'); },
    scream(t, d) {
      const ctx = A.ctx; const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f0 = 520 + Math.random() * 300; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.25, t + 0.15); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.8);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3;
      const g = ctx.createGain(); env(g, t, 0.03, 0.2, 0.6, 0.5, 0.12, 0.1);
      o.connect(bp); bp.connect(g); g.connect(d); sendRev(g, 0.5);
      o.start(t); lfo.start(t); o.stop(t + 1); lfo.stop(t + 1);
    },
    gasp(t, d) { noise(t, 0.25, d, 0.12, 'bandpass', 1500, 1.5, 0.05); },
    crowdGasp(t, d) { for (let i = 0; i < 8; i++) noise(t + Math.random() * 0.15, 0.4, d, 0.05, 'bandpass', 900 + Math.random() * 1200, 2, 0.08); },
    slap(t, d) { noise(t, 0.07, d, 0.7, 'highpass', 1800, 0.7); sweep('sine', 300, 120, t, 0.06, d, 0.3); },
    paper(t, d) { noise(t, 0.12, d, 0.6, 'bandpass', 1800, 0.8); sweep('sine', 140, 50, t, 0.12, d, 0.5); },
    flip(t, d) { const n = noise(t, 0.2, d, 0.3, 'bandpass', 900, 2); n.f.frequency.exponentialRampToValueAtTime(3000, t + 0.18); },
    crack(t, d) { for (let i = 0; i < 5; i++) noise(t + i * 0.02 + Math.random() * 0.02, 0.025, d, 0.35, 'highpass', 2500 + Math.random() * 3000); },
    scrape(t, d) { noise(t, 0.05, d, 0.08, 'bandpass', 3500 + Math.random() * 1500, 4); },
    marble(t, d) { osc('sine', 3100 + Math.random() * 700, t, 0.08, d, 0.2); osc('sine', 4700 + Math.random() * 500, t + 0.04, 0.06, d, 0.1); },
    whistle(t, d) { const r = osc('sine', 2800, t, 0.7, d, 0.15); const ctx = A.ctx; const l = ctx.createOscillator(); l.frequency.value = 28; const lg = ctx.createGain(); lg.gain.value = 60; l.connect(lg); lg.connect(r.o.frequency); l.start(t); l.stop(t + 0.75); },
    announce(t, d) { [784, 659, 523].forEach((f, i) => { const r = osc('sine', f, t + i * 0.32, 0.9, d, 0.16); sendRev(r.g, 0.6); osc('sine', f * 2, t + i * 0.32, 0.4, d, 0.03); }); },
    chime(t, d) { [523, 659, 784, 1046].forEach((f, i) => { const r = osc('sine', f, t + i * 0.12, 0.8, d, 0.12); sendRev(r.g, 0.5); }); },
    jump(t, d) { sweep('square', 260, 520, t, 0.12, d, 0.05); },
    land(t, d) { noise(t, 0.1, d, 0.3, 'lowpass', 400, 1); },
    elevator(t, d) { osc('sine', 1046, t, 1.2, d, 0.15); osc('sine', 1318, t + 0.25, 1.2, d, 0.12); },
    thunder(t, d) { const n = noise(t, 2.5, d, 0.6, 'lowpass', 180, 0.8, 0.05); sendRev(n.g, 0.8); noise(t, 0.3, d, 0.25, 'lowpass', 1200, 0.8); },
    kick(t, d) { sweep('sine', 150, 42, t, 0.3, d, 0.8); },
    vote(t, d) { noise(t, 0.08, d, 0.4, 'lowpass', 900, 1); osc('square', 330, t, 0.06, d, 0.05); },
    win(t, d) { [523, 659, 784, 1046, 1318].forEach((f, i) => { osc('triangle', f, t + i * 0.09, 0.4, d, 0.14); osc('sine', f * 2, t + i * 0.09, 0.2, d, 0.04); }); },
    lose(t, d) { [392, 370, 349, 262].forEach((f, i) => osc('triangle', f, t + i * 0.22, 0.5, d, 0.14)); },
    pass(t, d) { SFX.bell(t, d); [659, 880, 1318].forEach((f, i) => osc('triangle', f, t + i * 0.12, 0.6, d, 0.12)); },
    tick(t, d) { osc('square', 2200, t, 0.02, d, 0.05); },
    tock(t, d) { osc('square', 1500, t, 0.02, d, 0.05); },
    beep(t, d) { osc('square', 1000, t, 0.08, d, 0.07); },
    lockOn(t, d) { osc('sawtooth', 1800, t, 0.25, d, 0.05); osc('sawtooth', 1810, t, 0.25, d, 0.05); },
    punchAir(t, d) { const n = noise(t, 0.12, d, 0.25, 'bandpass', 1400, 1.2); },
    grab(t, d) { noise(t, 0.1, d, 0.3, 'lowpass', 900, 1); },
    wind(t, d) { const n = noise(t, 1.6, d, 0.25, 'bandpass', 500, 0.6, 0.5, 'lin'); n.f.frequency.linearRampToValueAtTime(900, t + 1); },
    squeak(t, d) { sweep('square', 1300, 1700, t, 0.07, d, 0.05); },
    pop(t, d) { sweep('sine', 400, 900, t, 0.08, d, 0.3); },
    zip(t, d) { noise(t, 0.2, d, 0.2, 'bandpass', 4000, 1); },
    stamp(t, d) { noise(t, 0.12, d, 0.5, 'lowpass', 600, 1); osc('sine', 90, t, 0.15, d, 0.4); },
    alarmBlip(t, d) { osc('square', 1200, t, 0.18, d, 0.07); osc('square', 900, t + 0.2, 0.18, d, 0.07); },
    splashDown(t, d) { noise(t, 0.6, d, 0.4, 'lowpass', 1400, 0.8); },
    cheer(t, d) { for (let i = 0; i < 10; i++) noise(t + Math.random() * 0.4, 0.6, d, 0.05, 'bandpass', 700 + Math.random() * 1600, 1.5, 0.1); },
    ding(t, d) { const r = osc('sine', 1568, t, 1.2, d, 0.14); sendRev(r.g, 0.5); },
  };

  A.sfx = function (name, o = {}) {
    if (!A.ok || !SFX[name]) return;
    const now = A.ctx.currentTime;
    // throttle identical sounds (prevents stacking noise)
    const minGap = o.gap != null ? o.gap : 0.03;
    const last = A.lastPlay.get(name) || 0;
    if (now - last < minGap) return;
    A.lastPlay.set(name, now);
    const g = A.ctx.createGain(); g.gain.value = o.vol != null ? o.vol : 1;
    let dest = A.sfxBus;
    if (o.pan) dest = panner(o.pan, A.sfxBus);
    g.connect(dest);
    try { SFX[name](now + (o.delay || 0), g); } catch (e) { /* ignore */ }
    setTimeout(() => { try { g.disconnect(); } catch (e) { } }, 4000 + (o.delay || 0) * 1000);
  };

  // ---------- doll song (original sing-song chant) ----------
  A.dollSong = function (duration) {
    if (!A.ok) return;
    const ctx = A.ctx; const t0 = ctx.currentTime + 0.02;
    const notes = [67, 67, 64, 67, 67, 64, 62, 64, 67, 69, 67];
    const step = duration / notes.length;
    notes.forEach((m, i) => {
      const t = t0 + i * step; const f = 440 * Math.pow(2, (m - 69) / 12);
      const dur = Math.min(0.5, step * 0.92);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.98, t); o.frequency.linearRampToValueAtTime(f, t + 0.05);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 850 + (i % 3) * 180; f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2400; f2.Q.value = 8;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + 0.03); g.gain.setValueAtTime(0.28, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o.connect(f1); f1.connect(g); o.connect(f2); f2.connect(g2); g2.connect(g);
      g.connect(A.sfxBus); sendRev(g, 0.5);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    });
  };

  // ---------- ambience loops ----------
  const LOOPS = {
    rain() { const n = loopNoise('lowpass', 2600, 0.6, 0.35); const n2 = loopNoise('highpass', 5000, 0.5, 0.08); return [n, n2]; },
    crowd() { const a = loopNoise('bandpass', 700, 1.4, 0.14); const b = loopNoise('bandpass', 1300, 2, 0.06); modulate(a.g.gain, 0.3, 0.05, 0.14); return [a, b]; },
    wind() { const a = loopNoise('bandpass', 420, 0.8, 0.22); modulate(a.f.frequency, 0.15, 180, 420); return [a]; },
    hum() { const o = loopOsc('sawtooth', 60, 0.018); const o2 = loopOsc('sine', 120, 0.02); const n = loopNoise('bandpass', 180, 2, 0.02); return [o, o2, n]; },
    machine() { const o = loopOsc('sawtooth', 48, 0.03); const n = loopNoise('bandpass', 260, 3, 0.05); modulate(n.g.gain, 2.2, 0.03, 0.05); return [o, n]; },
    alarm() { const o = loopOsc('square', 700, 0.05); modulate(o.o.frequency, 1.6, 180, 820); return [o]; },
    heartbeat() { const iv = setInterval(() => A.sfx('heartbeat', { gap: 0.1, vol: 0.9 }), 850); return [{ stop() { clearInterval(iv); } }]; },
    sea() { const a = loopNoise('lowpass', 700, 0.7, 0.2); modulate(a.g.gain, 0.12, 0.08, 0.2); return [a]; },
    tension() { const o = loopOsc('sawtooth', 55, 0.03); const o2 = loopOsc('sawtooth', 55.6, 0.03); const f = A.ctx.createBiquadFilter(); return [o, o2]; },
    carousel() { const iv = setInterval(() => { const m = [72, 76, 79, 76, 74, 77, 81, 77][Math.floor(A.ctx.currentTime * 3) % 8]; Music._inst.bell(A.ctx.currentTime, 440 * Math.pow(2, (m - 69) / 12), 0.4, 0.4, A.amb); }, 333); return [{ stop() { clearInterval(iv); } }]; },
  };
  function loopNoise(type, freq, q, vol) {
    const ctx = A.ctx; const s = ctx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g);
    s.start();
    return { s, f, g, out: g, stop() { try { s.stop(); } catch (e) { } } };
  }
  function loopOsc(type, freq, vol) {
    const ctx = A.ctx; const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol; o.connect(g); o.start();
    return { o, g, out: g, stop() { try { o.stop(); } catch (e) { } } };
  }
  function modulate(param, rate, lo, hi) {
    const ctx = A.ctx; const l = ctx.createOscillator(); l.frequency.value = rate;
    const lg = ctx.createGain(); lg.gain.value = (hi - lo) / 2; param.value = (hi + lo) / 2;
    l.connect(lg); lg.connect(param); l.start();
    return l;
  }

  A.loop = function (name, vol = 1) {
    if (!A.ok) { A._pendingLoops.set(name, vol); return; }
    let L = A.loops.get(name);
    if (L) { L.gain.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.3); L.vol = vol; return L; }
    if (!LOOPS[name]) return;
    const gain = A.ctx.createGain(); gain.gain.value = 0.0001; gain.connect(A.amb);
    gain.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.4);
    const parts = LOOPS[name]();
    parts.forEach(p => p.out && p.out.connect(gain));
    L = { gain, parts, vol };
    A.loops.set(name, L);
    return L;
  };
  A.loopVol = function (name, vol) { const L = A.loops.get(name); if (L && A.ok) L.gain.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.2); else if (!A.ok && A._pendingLoops.has(name)) A._pendingLoops.set(name, vol); };
  A.stopLoop = function (name, fade = 0.6) {
    A._pendingLoops.delete(name);
    const L = A.loops.get(name); if (!L) return;
    A.loops.delete(name);
    if (!A.ok) return;
    L.gain.gain.setTargetAtTime(0.0001, A.ctx.currentTime, fade / 4);
    setTimeout(() => { L.parts.forEach(p => p.stop && p.stop()); try { L.gain.disconnect(); } catch (e) { } }, fade * 1000 + 200);
  };
  A.stopAllLoops = function (fade = 0.6) { for (const k of [...A.loops.keys()]) A.stopLoop(k, fade); A._pendingLoops.clear(); };

  // ---------- music sequencer ----------
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(tok) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok); if (!m) return null;
    let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 12 * (parseInt(m[3]) + 1) + n;
  }
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  // pattern string: tokens per step; chords with '+', '.' rest, '-' hold
  function parse(pat) {
    const toks = pat.trim().split(/\s+/); const ev = [];
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i]; if (tk === '.' || tk === '-') continue;
      let len = 1; while (toks[i + len] === '-') len++;
      const notes = tk.split('+').map(midi).filter(v => v != null);
      ev.push({ s: i, len, notes });
    }
    return { steps: toks.length, ev };
  }

  const Inst = {
    bell(t, f, dur, v, d) { const r = osc('sine', f, t, 1.6, d, 0.16 * v, 0.003, 1.2); osc('sine', f * 2.76, t, 0.4, d, 0.05 * v, 0.002, 0.3); sendRev(r.g, 0.6); },
    recorder(t, f, dur, v, d) {
      const ctx = A.ctx; const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const l = ctx.createOscillator(); l.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.01, t + 0.25); l.connect(lg); lg.connect(o.frequency);
      const g = ctx.createGain(); const D = Math.max(0.1, dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.04); g.gain.setValueAtTime(0.14 * v, t + D * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.08);
      o.connect(g); g.connect(d); sendRev(g, 0.35); o.start(t); l.start(t); o.stop(t + D + 0.1); l.stop(t + D + 0.1);
      noise(t, 0.05, d, 0.02 * v, 'bandpass', f * 3, 2);
    },
    pad(t, f, dur, v, d) {
      const ctx = A.ctx; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; fl.Q.value = 0.5;
      const g = ctx.createGain(); const D = Math.max(0.3, dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07 * v, t + Math.min(0.6, D * 0.4)); g.gain.setValueAtTime(0.07 * v, t + D * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.7);
      fl.connect(g); g.connect(d); sendRev(g, 0.7);
      [-8, 7].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + D + 0.8); });
    },
    strings(t, f, dur, v, d) {
      const ctx = A.ctx; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1700;
      const g = ctx.createGain(); const D = Math.max(0.2, dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.18); g.gain.setValueAtTime(0.06 * v, t + D * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.4);
      fl.connect(g); g.connect(d); sendRev(g, 0.6);
      [-10, 0, 9].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + D + 0.5); });
    },
    piano(t, f, dur, v, d) {
      const r = osc('sine', f, t, 1.8, d, 0.2 * v, 0.004, 1.5); osc('sine', f * 2, t, 0.8, d, 0.06 * v, 0.004, 0.7); osc('triangle', f * 3, t, 0.25, d, 0.02 * v, 0.002, 0.2);
      sendRev(r.g, 0.5);
    },
    pluck(t, f, dur, v, d) {
      const ctx = A.ctx; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(3000, t); fl.frequency.exponentialRampToValueAtTime(300, t + 0.25);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(fl); fl.connect(g); g.connect(d); o.start(t); o.stop(t + 0.5);
    },
    bass(t, f, dur, v, d) {
      const ctx = A.ctx; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(420, t); fl.frequency.exponentialRampToValueAtTime(160, t + dur);
      const g = ctx.createGain(); const D = Math.max(0.1, dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.01); g.gain.setValueAtTime(0.18 * v, t + D * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.05);
      o.connect(fl); fl.connect(g); g.connect(d); o.start(t); o.stop(t + D + 0.1);
      osc('sine', f, t, D, d, 0.15 * v, 0.01, 0.05);
    },
    brass(t, f, dur, v, d) {
      const ctx = A.ctx; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(300, t); fl.frequency.linearRampToValueAtTime(1600, t + 0.2);
      const g = ctx.createGain(); const D = Math.max(0.15, dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09 * v, t + 0.08); g.gain.setValueAtTime(0.08 * v, t + D * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.2);
      fl.connect(g); g.connect(d); sendRev(g, 0.4);
      [0, 6].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + D + 0.3); });
    },
    kick(t, f, dur, v, d) { sweep('sine', 150, 42, t, 0.32, d, 0.7 * v); },
    snare(t, f, dur, v, d) { noise(t, 0.16, d, 0.28 * v, 'highpass', 1400, 0.7); osc('triangle', 190, t, 0.08, d, 0.12 * v); },
    hat(t, f, dur, v, d) { noise(t, 0.04, d, 0.09 * v, 'highpass', 7500, 0.7); },
    tick(t, f, dur, v, d) { osc('square', 2400, t, 0.015, d, 0.04 * v); },
    timp(t, f, dur, v, d) { sweep('sine', f * 1.1, f, t, 1.2, d, 0.4 * v); noise(t, 0.2, d, 0.1 * v, 'lowpass', 400); },
    glock(t, f, dur, v, d) { osc('sine', f * 2, t, 0.7, d, 0.1 * v, 0.002, 0.6); osc('sine', f * 6, t, 0.2, d, 0.02 * v); },
    drone(t, f, dur, v, d) {
      const ctx = A.ctx; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 400;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09 * v, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
      fl.connect(g); g.connect(d);
      [0, 5, -7].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + dur + 0.4); });
    },
  };

  // Tracks — all original motifs. step = 16th note unless div given.
  const TRACKS = {
    menu: {
      bpm: 84, div: 3, // triplet feel waltz: 3 steps per beat (8th triplets) → 9 per bar in 3/4
      parts: [
        { i: 'bell', p: 'D5 . A4 . F5 . E5 . D5 . C#5 . D5 . . . A4 . Bb4 . A4 . G4 . F4 . E4 . F4 . G4 . A4 . . . . . D5 . A4 . F5 . E5 . D5 . C#5 . D5 . F5 . A5 . G5 . F5 . E5 . D5 . C#5 . D5 . . . . .', v: 0.9 },
        { i: 'pad', p: 'D3+F3+A3 - - - - - - - - - - - - - - - - - Bb2+D3+F3 - - - - - - - - - - - - - - - - - D3+F3+A3 - - - - - - - - - - - - - - - - - A2+C#3+E3 - - - - - - - - - - - - - - - - -', v: 0.8 },
        { i: 'bass', p: 'D2 . . . . . A2 . . . . . D2 . . . . . Bb1 . . . . . F2 . . . . . Bb1 . . . . . D2 . . . . . A2 . . . . . D2 . . . . . A1 . . . . . E2 . . . . . A1 . . . . .', v: 0.5, min: 0.3 },
        { i: 'strings', p: 'A4 - - - - - - - - - - - F4 - - - - - D4 - - - - - - - - - - - F4 - - - - - A4 - - - - - - - - - - - D5 - - - - - C#5 - - - - - - - - - - - E5 - - - - -', v: 0.5, min: 0.5 },
      ],
    },
    dorm: {
      bpm: 70, div: 2,
      parts: [
        { i: 'pad', p: 'A2+E3+C4 - - - - - - - - - - - - - - - F2+C3+A3 - - - - - - - - - - - - - - - C3+G3+E4 - - - - - - - - - - - - - - - G2+D3+B3 - - - - - - - - - - - - - - -', v: 0.8 },
        { i: 'piano', p: 'E5 . . . C5 . . . B4 . . . . . . . A4 . . . C5 . . . F5 . . . E5 . . . G4 . . . . . . . C5 . . . E5 . . . D5 . . . . . . . B4 . . . . . . .', v: 0.6 },
        { i: 'glock', p: '. . . . . . . . . . . . A5 . . . . . . . . . . . . . . . F5 . . . . . . . . . . . . . . . G5 . . . . . . . . . . . . . . . . B5 . . .', v: 0.5, min: 0.2 },
        { i: 'tick', p: 'x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x .', v: 0.6, min: 0.55 },
      ],
    },
    tension: {
      bpm: 96, div: 4,
      parts: [
        { i: 'drone', p: 'A1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Bb1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', v: 1 },
        { i: 'bass', p: 'A1 . . . . . . . A1 . . . . . A1 . A1 . . . . . . . A1 . . . . . . . Bb1 . . . . . . . Bb1 . . . . . Bb1 . Bb1 . . . . . . . Bb1 . . . . . . .', v: 0.8 },
        { i: 'tick', p: 'x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . .', v: 0.8 },
        { i: 'kick', p: 'x . . . . . . . x . . . . . . . x . . . . . . . x . . . . . . . x . . . . . . . x . . . . . . . x . . . . . . . x . . . x . . .', v: 0.8, min: 0.4 },
        { i: 'strings', p: 'E4 - - - - - - - F4 - - - - - - - E4 - - - - - - - D#4 - - - - - - - F4 - - - - - - - E4 - - - - - - - F4 - - - - - - - F#4 - - - - - - -', v: 0.7, min: 0.55 },
        { i: 'hat', p: '. . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x x . . x . . . x . . . x . . . x . . . x . . . x . . . x . x x x x', v: 0.8, min: 0.7 },
      ],
    },
    game: {
      bpm: 112, div: 2,
      parts: [
        { i: 'recorder', p: 'G5 . E5 . G5 . E5 . D5 . C5 . D5 - - . E5 . G5 . A5 . G5 . E5 . D5 . C5 - - . G5 . E5 . G5 . E5 . D5 . C5 . D5 - - . E5 . D5 . C5 . A4 . C5 - - - - - - .', v: 0.9 },
        { i: 'pluck', p: 'C4 . G3 . C4 . G3 . A3 . E3 . A3 . E3 . F3 . C4 . F3 . C4 . G3 . D4 . G3 . D4 . C4 . G3 . C4 . G3 . A3 . E3 . A3 . E3 . F3 . C4 . G3 . D4 . C4 . G3 . C4 . .', v: 0.6 },
        { i: 'snare', p: 'x . . x x . . . x . . x x . . . x . . x x . . . x . x . x x x . x . . x x . . . x . . x x . . . x . . x x . . . x . x x x x x x', v: 0.55, min: 0.25 },
        { i: 'kick', p: 'x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . x .', v: 0.7, min: 0.45 },
        { i: 'brass', p: 'C3 - - - - - - - A2 - - - - - - - F2 - - - - - - - G2 - - - - - - - C3 - - - - - - - A2 - - - - - - - F2 - - - G2 - - - C3 - - - - - - -', v: 0.7, min: 0.65 },
        { i: 'drone', p: 'C#2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - C#2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', v: 0.8, min: 0.8 },
      ],
    },
    action: {
      bpm: 142, div: 4,
      parts: [
        { i: 'kick', p: 'x . . . . . x . x . . . . . . . x . . . . . x . x . . . . . x .', v: 0.9 },
        { i: 'snare', p: '. . . . x . . . . . . . x . . . . . . . x . . . . . . . x . x x', v: 0.8 },
        { i: 'hat', p: 'x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x', v: 0.6 },
        { i: 'bass', p: 'E2 . E2 . E3 . E2 . G2 . E2 . D2 . E2 . E2 . E2 . E3 . E2 . Bb2 . A2 . G2 . D2 .', v: 0.8 },
        { i: 'strings', p: 'E4 - - - - - - - G4 - - - F#4 - - - E4 - - - - - - - Bb4 - - - A4 - - -', v: 0.7, min: 0.4 },
        { i: 'brass', p: 'E3 - - . . . E3 . G3 - - . F#3 - - . E3 - - . . . E3 . Bb3 - - . A3 - - .', v: 0.7, min: 0.7 },
      ],
    },
    sad: {
      bpm: 64, div: 2,
      parts: [
        { i: 'piano', p: 'A4 . C5 . E5 . . . D5 . C5 . B4 . . . C5 . A4 . F4 . . . G4 . . . . . . . A4 . C5 . E5 . . . G5 . F5 . E5 . . . D5 . C5 . B4 . . . A4 . . . . . . .', v: 0.8 },
        { i: 'pad', p: 'A2+E3+C4 - - - - - - - - - - - - - - - F2+C3+A3 - - - - - - - - - - - - - - - C3+G3+E4 - - - - - - - - - - - - - - - E2+B2+G#3 - - - - - - - - - - - - - - -', v: 0.8 },
        { i: 'strings', p: 'E4 - - - - - - - - - - - - - - - F4 - - - - - - - - - - - - - - - G4 - - - - - - - - - - - - - - - G#4 - - - - - - - - - - - - - - -', v: 0.5, min: 0.3 },
      ],
    },
    victory: {
      bpm: 120, div: 2,
      parts: [
        { i: 'brass', p: 'C4 - - . C4 . E4 . G4 - - - - - . . A4 - - . G4 . E4 . F4 - - - - - . . C4 - - . E4 . G4 . C5 - - - - - . . B4 - - . A4 . G4 . C5 - - - - - - -', v: 0.8 },
        { i: 'strings', p: 'C4+E4+G4 - - - - - - - F4+A4+C5 - - - - - - - C4+E4+G4 - - - - - - - G3+B3+D4 - - - - - - -', v: 0.7 },
        { i: 'timp', p: 'C2 . . . . . . . . . . . . . . . F2 . . . . . . . . . . . . . . . C2 . . . . . . . . . . . . . . . G1 . . . G1 . G1 . C2 . . . . . . .', v: 0.8 },
        { i: 'glock', p: 'G5 . . . E5 . . . C6 . . . . . . . A5 . . . F5 . . . C6 . . . . . . . G5 . . . E5 . . . C6 . . . E6 . . . D6 . . . B5 . . . C6 . . . . . . .', v: 0.6 },
      ],
    },
    waltz: {
      bpm: 150, div: 1,
      parts: [
        { i: 'strings', p: 'D5 - - F#5 - - A5 - - A5 - - B5 - A5 G5 - - F#5 - - E5 - - D5 - - C#5 - - D5 - - E5 - - E5 - - F#5 - E5 D5 - - C#5 - - B4 - - A4 - -', v: 0.7 },
        { i: 'bass', p: 'D2 . . D2 . . A1 . . A1 . . G1 . . G1 . . D2 . . D2 . . A1 . . A1 . . E2 . . E2 . . A1 . . A1 . . D2 . . D2 . .', v: 0.6 },
        { i: 'pluck', p: '. F#3+A3 F#3+A3 . F#3+A3 F#3+A3 . E3+A3 E3+A3 . E3+A3 E3+A3 . G3+B3 G3+B3 . G3+B3 G3+B3 . F#3+A3 F#3+A3 . F#3+A3 F#3+A3 . E3+G3 E3+G3 . E3+G3 E3+G3 . G3+B3 G3+B3 . G3+B3 G3+B3 . E3+A3 E3+A3 . E3+A3 E3+A3 . F#3+A3 F#3+A3 . F#3+A3 F#3+A3', v: 0.5 },
      ],
    },
    credits: {
      bpm: 72, div: 2,
      parts: [
        { i: 'piano', p: 'C5 . G4 . E4 . G4 . D5 . G4 . F4 . G4 . E5 . C5 . G4 . C5 . D5 . B4 . G4 . B4 . A4 . E4 . C4 . E4 . F4 . C4 . A3 . C4 . G4 . D4 . B3 . D4 . C4 . G3 . E3 . G3 .', v: 0.7 },
        { i: 'pad', p: 'C3+G3+E4 - - - - - - - - - - - - - - - E3+B3+G4 - - - - - - - - - - - - - - - A2+E3+C4 - - - - - - - - - - - - - - - F2+C3+A3 - - - - - - - G2+D3+B3 - - - - - - -', v: 0.7 },
        { i: 'strings', p: 'G4 - - - - - - - - - - - - - - - B4 - - - - - - - - - - - - - - - C5 - - - - - - - - - - - - - - - A4 - - - - - - - B4 - - - - - - -', v: 0.5 },
      ],
    },
    dread: {
      bpm: 60, div: 2,
      parts: [
        { i: 'drone', p: 'D1 - - - - - - - - - - - - - - - Eb1 - - - - - - - - - - - - - - -', v: 1 },
        { i: 'piano', p: 'D4 . . . . . . . . . . . Eb4 . . . . . . . . . . . . . . . A3 . . .', v: 0.5 },
        { i: 'strings', p: 'A4 - - - - - - - Bb4 - - - - - - - A4 - - - - - - - G#4 - - - - - - -', v: 0.4, min: 0.4 },
        { i: 'kick', p: 'x . . . . . . . . . . . . . . . x . . . . . . . . . . . . . . .', v: 0.6, min: 0.2 },
      ],
    },
  };
  for (const k in TRACKS) for (const p of TRACKS[k].parts) p.parsed = parse(p.p);

  const Music = {
    cur: null, curName: null, gain: null, intensity: 0, nextTime: 0, step: 0, duckV: 1, _inst: Inst,
    play(name, fade = 1) {
      if (!A.ok) { A._pendingMusic = { name, fade }; return; }
      if (Music.curName === name) return;
      Music.stop(fade);
      const tr = TRACKS[name]; if (!tr) return;
      const g = A.ctx.createGain(); g.gain.value = 0.0001; g.connect(A.music);
      g.gain.setTargetAtTime(1, A.ctx.currentTime, fade / 3);
      Music.cur = tr; Music.curName = name; Music.gain = g; Music.step = 0; Music.nextTime = A.ctx.currentTime + 0.1;
      Music.layerGains = tr.parts.map(p => { const lg = A.ctx.createGain(); lg.gain.value = (p.min || 0) <= Music.intensity ? 1 : 0.0001; lg.connect(g); return lg; });
    },
    stop(fade = 1) {
      A._pendingMusic = null;
      if (!Music.gain || !A.ok) { Music.cur = null; Music.curName = null; return; }
      const g = Music.gain; g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, fade / 4);
      setTimeout(() => { try { g.disconnect(); } catch (e) { } }, fade * 1000 + 3000);
      Music.cur = null; Music.curName = null; Music.gain = null;
    },
    setIntensity(v) {
      v = Math.max(0, Math.min(1, v));
      if (Math.abs(v - Music.intensity) < 0.01) return;
      Music.intensity = v;
      if (!Music.cur || !A.ok) return;
      Music.cur.parts.forEach((p, i) => { const on = (p.min || 0) <= v; Music.layerGains[i].gain.setTargetAtTime(on ? 1 : 0.0001, A.ctx.currentTime, 0.6); });
    },
    duck(v) { Music.duckV = v; A.applyVolumes(); },
    tick() {
      if (!A.ok || !Music.cur) return;
      const tr = Music.cur; const stepDur = 60 / tr.bpm / tr.div;
      const ahead = A.ctx.currentTime + 0.3;
      if (Music.nextTime < A.ctx.currentTime - 1) Music.nextTime = A.ctx.currentTime + 0.05; // recover after tab sleep
      while (Music.nextTime < ahead) {
        tr.parts.forEach((p, i) => {
          const P = p.parsed; const s = Music.step % P.steps;
          for (const e of P.ev) if (e.s === s) {
            if (Music.layerGains[i].gain.value < 0.01 && (p.min || 0) > Music.intensity) continue;
            const dur = e.len * stepDur;
            if (e.notes.length === 0) Inst[p.i](Music.nextTime, 440, dur, p.v, Music.layerGains[i]);
            else for (const n of e.notes) Inst[p.i](Music.nextTime, mf(n), dur, p.v, Music.layerGains[i]);
          }
        });
        Music.step++; Music.nextTime += stepDur;
      }
    },
  };
  // percussion tokens like 'x' are not notes; treat them as events with no pitch
  for (const k in TRACKS) for (const p of TRACKS[k].parts) {
    const toks = p.p.trim().split(/\s+/); const ev = [];
    toks.forEach((tk, i) => {
      if (tk === '.' || tk === '-') return;
      if (tk === 'x') { ev.push({ s: i, len: 1, notes: [] }); return; }
      let len = 1; while (toks[i + len] === '-') len++;
      ev.push({ s: i, len, notes: tk.split('+').map(midi).filter(v => v != null) });
    });
    p.parsed = { steps: toks.length, ev };
  }

  A.music = null; // (bus set on unlock)
  A.Music = Music;
  A.tracks = Object.keys(TRACKS);
  R6.Audio = A;
  R6.Music = Music;
})();
