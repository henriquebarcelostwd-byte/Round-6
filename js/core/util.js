/* ROUND 6 — util.js : math, random, easing, color and formatting helpers */
'use strict';
window.R6 = window.R6 || {};

(function () {
  const TAU = Math.PI * 2;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) { this.seed = seed >>> 0; this.f = mulberry32(this.seed); }
    next() { return this.f(); }
    range(a, b) { return a + (b - a) * this.f(); }
    int(a, b) { return a + Math.floor(this.f() * (b - a + 1)); }
    pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
    chance(p) { return this.f() < p; }
    gauss(m = 0, s = 1) { const u = 1 - this.f(), v = this.f(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.f() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  }

  const ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => t * (2 - t),
    inOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: t => t * t * t,
    outCubic: t => (--t) * t * t + 1,
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    inBack: t => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
    outElastic: t => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };

  function hex2rgb(h) {
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r, g, b) {
    const c = v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    return '#' + c(r) + c(g) + c(b);
  }
  const _colorCache = new Map();
  function mix(a, b, t) {
    const k = a + '|' + b + '|' + (Math.round(t * 100));
    let v = _colorCache.get(k);
    if (v) return v;
    const A = hex2rgb(a), B = hex2rgb(b);
    v = rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
    if (_colorCache.size > 4000) _colorCache.clear();
    _colorCache.set(k, v);
    return v;
  }
  function shade(c, amt) { return amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt); }
  function rgba(c, a) { const A = hex2rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
  function gray(c, t) {
    const A = hex2rgb(c); const g = A[0] * 0.3 + A[1] * 0.59 + A[2] * 0.11;
    return rgb2hex(A[0] + (g - A[0]) * t, A[1] + (g - A[1]) * t, A[2] + (g - A[2]) * t);
  }

  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const U = {
    TAU,
    RNG,
    ease,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    ilerp: (a, b, v) => (b === a ? 0 : (v - a) / (b - a)),
    smooth: t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); },
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    randi: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    chance: p => Math.random() < p,
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    dist2: (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay),
    angTo: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; },
    approach: (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t)),
    damp: (a, b, lambda, dt) => b + (a - b) * Math.exp(-lambda * dt),
    wave: (t, speed = 1, amp = 1, off = 0) => Math.sin(t * speed + off) * amp,
    hash,
    hex2rgb, rgb2hex, mix, shade, rgba, gray,
    pad: (n, w = 3) => String(Math.max(0, Math.floor(n))).padStart(w, '0'),
    money(n) {
      n = Math.max(0, Math.round(n));
      return '₩' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    moneyShort(n) {
      if (n >= 1e9) return '₩' + (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + ' bi';
      if (n >= 1e6) return '₩' + (n / 1e6).toFixed(1) + ' mi';
      return U.money(n);
    },
    time(sec) {
      sec = Math.max(0, sec);
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },
    wrap(ctx, text, maxW) {
      const out = [];
      const paras = String(text).split('\n');
      for (const para of paras) {
        const words = para.split(' ');
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
          else line = test;
        }
        out.push(line);
      }
      return out;
    },
    // segment/circle helpers
    pointSegDist(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy;
      let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    },
    rectHit: (px, py, r) => px >= r.x && py >= r.y && px <= r.x + r.w && py <= r.y + r.h,
    weighted(items, wf, rnd = Math.random) {
      let tot = 0; for (const it of items) tot += Math.max(0, wf(it));
      let r = rnd() * tot;
      for (const it of items) { r -= Math.max(0, wf(it)); if (r <= 0) return it; }
      return items[items.length - 1];
    },
    // simple timed tween list used by scenes
    Tweens: class {
      constructor() { this.list = []; }
      add(obj, props, dur, easeFn = ease.inOut, onDone) {
        const from = {}; for (const k in props) from[k] = obj[k];
        const tw = { obj, props, from, dur: Math.max(0.0001, dur), t: 0, ease: easeFn, onDone };
        this.list.push(tw); return tw;
      }
      update(dt) {
        for (let i = this.list.length - 1; i >= 0; i--) {
          const tw = this.list[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); const e = tw.ease(k);
          for (const p in tw.props) tw.obj[p] = tw.from[p] + (tw.props[p] - tw.from[p]) * e;
          if (k >= 1) { this.list.splice(i, 1); tw.onDone && tw.onDone(); }
        }
      }
      clear() { this.list.length = 0; }
      get busy() { return this.list.length > 0; }
    },
    // spatial hash for crowd separation
    Grid: class {
      constructor(cell = 32) { this.cell = cell; this.map = new Map(); }
      clear() { this.map.clear(); }
      key(cx, cy) { return (cx + 5000) * 10007 + (cy + 5000); }
      insert(o, x, y) {
        const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
        let b = this.map.get(k); if (!b) { b = []; this.map.set(k, b); } b.push(o);
      }
      query(x, y, r, out) {
        out.length = 0;
        const c = this.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
          const b = this.map.get(this.key(cx, cy)); if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
        }
        return out;
      }
    },
  };

  R6.U = U;
})();
