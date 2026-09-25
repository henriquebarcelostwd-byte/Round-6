/* ROUND 6 — particles.js : pooled particles (capped), rain/weather, lightmaps */
'use strict';
(function () {
  const U = R6.U;

  const TYPES = {
    dust: { life: [0.4, 0.9], vx: [-40, 40], vy: [-50, -10], size: [3, 7], g: 30, drag: 3, color: ['#c9b89a', '#b3a283', '#d8cbb0'], fade: 1, grow: 1.5 },
    sand: { life: [0.5, 1.0], vx: [-60, 60], vy: [-80, -20], size: [2, 4], g: 220, drag: 1, color: ['#e2c58f', '#cfae72'] },
    spark: { life: [0.2, 0.5], vx: [-200, 200], vy: [-220, 50], size: [1.5, 3], g: 400, drag: 1, color: ['#fff3b0', '#ffd24a', '#ffffff'], glow: 1 },
    hit: { life: [0.15, 0.3], vx: [-160, 160], vy: [-160, 160], size: [2, 5], g: 0, drag: 6, color: ['#ffffff', '#ffe28a'], glow: 1 },
    glass: { life: [1.2, 2.4], vx: [-160, 160], vy: [-200, 60], size: [3, 10], g: 700, drag: 0.3, color: ['#cfefff', '#a9dcf5', '#e8fbff', '#ffffff'], shard: 1, spin: 12 },
    money: { life: [2.5, 4.5], vx: [-60, 60], vy: [-30, 60], size: [10, 16], g: 60, drag: 1.2, color: ['#e9c46a', '#f4d58d', '#d8b24c'], bill: 1, spin: 4, flutter: 1 },
    confetti: { life: [2, 3.5], vx: [-200, 200], vy: [-400, -100], size: [4, 8], g: 300, drag: 1.4, color: ['#e8336d', '#1f7a6d', '#f2c14e', '#3a86ff', '#ffffff'], rect: 1, spin: 10, flutter: 1 },
    smoke: { life: [1.2, 2.4], vx: [-20, 20], vy: [-40, -10], size: [10, 22], g: -10, drag: 0.8, color: ['#9aa0a6', '#7d8288', '#b8bcc0'], fade: 0.5, grow: 2.2 },
    splash: { life: [0.2, 0.4], vx: [-60, 60], vy: [-120, -40], size: [1, 2.5], g: 600, drag: 0.5, color: ['#bcd6e8', '#e1eef7'] },
    tear: { life: [0.6, 1], vx: [-5, 5], vy: [10, 30], size: [1.5, 2.5], g: 200, drag: 0.5, color: ['#9fd4ff'] },
    sweat: { life: [0.5, 0.8], vx: [-30, 30], vy: [-60, -20], size: [1.5, 3], g: 250, drag: 0.5, color: ['#bfe7ff'] },
    ring: { life: [0.4, 0.6], vx: [0, 0], vy: [0, 0], size: [8, 8], g: 0, drag: 0, color: ['#ffffff'], ring: 1, grow: 6 },
    redring: { life: [0.5, 0.7], vx: [0, 0], vy: [0, 0], size: [6, 6], g: 0, drag: 0, color: ['#ff3b5c'], ring: 1, grow: 8 },
    debris: { life: [0.8, 1.6], vx: [-150, 150], vy: [-260, -60], size: [3, 7], g: 800, drag: 0.4, color: ['#6b5d4f', '#8a7a66', '#4a4038'], rect: 1, spin: 8 },
    candy: { life: [0.8, 1.4], vx: [-120, 120], vy: [-200, -40], size: [4, 10], g: 700, drag: 0.4, color: ['#d99a3d', '#c8862c', '#e8b563'], shard: 1, spin: 8 },
    star: { life: [0.5, 1.0], vx: [-80, 80], vy: [-120, -20], size: [3, 6], g: 100, drag: 2, color: ['#ffe066', '#ffffff'], glow: 1, star: 1 },
    feather: { life: [1.5, 2.5], vx: [-40, 40], vy: [-60, 0], size: [3, 5], g: 40, drag: 2, color: ['#ff5e8a', '#ffd166', '#6ecbff'], flutter: 1, rect: 1, spin: 3 },
    ember: { life: [1, 2], vx: [-15, 15], vy: [-50, -20], size: [1, 2.5], g: -5, drag: 0.5, color: ['#ffb347', '#ff7b3a'], glow: 1 },
    snowdust: { life: [2, 4], vx: [-10, 10], vy: [5, 20], size: [1, 2.2], g: 0, drag: 0, color: ['#ffffff'], fade: 1 },
    gray: { life: [0.6, 1.2], vx: [-50, 50], vy: [-80, -10], size: [4, 9], g: 40, drag: 2, color: ['#6f6f6f', '#8d8d8d', '#555'], fade: 1, grow: 1.8 },
    ink: { life: [0.5, 0.9], vx: [-90, 90], vy: [-120, -20], size: [2, 5], g: 350, drag: 1, color: ['#7a1328', '#9e1b34', '#5a0e1e'] },
  };

  class Particles {
    constructor(max = 1200) { this.max = max; this.p = []; }
    emit(type, x, y, n = 8, o = {}) {
      const T = TYPES[type]; if (!T) return;
      for (let i = 0; i < n; i++) {
        if (this.p.length >= this.max) this.p.shift();
        const life = U.rand(T.life[0], T.life[1]) * (o.life || 1);
        const sp = o.speed || 1;
        const q = {
          t: type, x: x + (o.spread ? U.rand(-o.spread, o.spread) : 0), y: y + (o.spreadY ? U.rand(-o.spreadY, o.spreadY) : 0),
          vx: (U.rand(T.vx[0], T.vx[1]) + (o.vx || 0)) * sp, vy: (U.rand(T.vy[0], T.vy[1]) + (o.vy || 0)) * sp,
          life, max: life, s: U.rand(T.size[0], T.size[1]) * (o.size || 1),
          c: o.color || U.pick(T.color), rot: Math.random() * U.TAU, vr: T.spin ? U.rand(-T.spin, T.spin) : 0,
          g: o.g != null ? o.g : T.g, drag: T.drag, T, ph: Math.random() * 10, z: o.z || 0,
        };
        this.p.push(q);
      }
    }
    update(dt) {
      const P = this.p;
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i]; q.life -= dt;
        if (q.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
        q.vy += q.g * dt; const d = Math.exp(-q.drag * dt); q.vx *= d; q.vy *= d;
        if (q.T.flutter) { q.vx += Math.sin(q.ph + q.life * 6) * 60 * dt; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
        if (q.floor != null && q.y > q.floor) { q.y = q.floor; q.vy *= -0.3; q.vx *= 0.6; }
      }
    }
    clear() { this.p.length = 0; }
    draw(ctx) {
      const P = this.p; if (!P.length) return;
      ctx.save();
      for (let i = 0; i < P.length; i++) {
        const q = P[i], T = q.T; const k = q.life / q.max;
        let a = T.fade ? Math.min(1, k * 1.5) * (T.fade === 0.5 ? 0.5 : 1) : Math.min(1, k * 3);
        const s = q.s * (T.grow ? 1 + (1 - k) * (T.grow - 1) : 1);
        ctx.globalAlpha = a;
        if (T.glow) ctx.globalCompositeOperation = 'lighter'; else ctx.globalCompositeOperation = 'source-over';
        if (T.ring) {
          ctx.strokeStyle = q.c; ctx.lineWidth = 2 * k + 0.5; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, U.TAU); ctx.stroke();
        } else if (T.bill) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, Math.abs(Math.cos(q.rot * 1.3)) * 0.7 + 0.3);
          ctx.fillStyle = q.c; ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9);
          ctx.strokeStyle = 'rgba(80,60,20,.55)'; ctx.lineWidth = 0.8; ctx.strokeRect(-s * 0.85, -s * 0.33, s * 1.7, s * 0.66);
          ctx.fillStyle = 'rgba(120,90,30,.5)'; ctx.beginPath(); ctx.arc(s * 0.35, 0, s * 0.22, 0, U.TAU); ctx.fill();
          ctx.restore();
        } else if (T.shard) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.c; ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.4); ctx.lineTo(s * 0.7, -s * 0.1); ctx.lineTo(-s * 0.1, s * 0.6); ctx.closePath(); ctx.fill();
          if (q.t === 'glass') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8; ctx.stroke(); }
          ctx.restore();
        } else if (T.rect) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, Math.cos(q.rot * 2));
          ctx.fillStyle = q.c; ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore();
        } else if (T.star) {
          ctx.fillStyle = q.c; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath();
          for (let j = 0; j < 8; j++) { const r = j % 2 ? s * 0.4 : s; const an = j * Math.PI / 4; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else {
          ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, U.TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // --- Rain in screen space, with splashes and optional lightning ---
  class Rain {
    constructor(n = 260) {
      this.n = n; this.drops = []; this.splash = []; this.intensity = 1; this.wind = -120; this.flash = 0; this.nextBolt = 6 + Math.random() * 8; this.lightning = false;
      for (let i = 0; i < n; i++) this.drops.push(this.newDrop(true));
    }
    newDrop(init) {
      return { x: Math.random() * (R6.W + 300) - 150, y: init ? Math.random() * R6.H : -20 - Math.random() * 100, v: 900 + Math.random() * 500, l: 12 + Math.random() * 22, z: Math.random() };
    }
    update(dt) {
      for (const d of this.drops) {
        d.y += d.v * dt; d.x += this.wind * dt * (0.5 + d.z);
        if (d.y > R6.H * (0.75 + d.z * 0.3)) {
          if (this.splash.length < 120 && Math.random() < 0.6) this.splash.push({ x: d.x, y: d.y, t: 0.25 });
          Object.assign(d, this.newDrop(false));
        }
      }
      for (let i = this.splash.length - 1; i >= 0; i--) { this.splash[i].t -= dt; if (this.splash[i].t <= 0) this.splash.splice(i, 1); }
      if (this.flash > 0) this.flash -= dt * 2.2;
      if (this.lightning) {
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = 7 + Math.random() * 10; R6.Audio.sfx('thunder', { delay: 0.3 + Math.random() * 0.8 }); }
      }
    }
    draw(ctx) {
      const cnt = Math.floor(this.drops.length * this.intensity);
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < cnt; i++) {
        const d = this.drops[i];
        ctx.strokeStyle = `rgba(190,210,235,${0.18 + d.z * 0.35})`; ctx.lineWidth = 0.8 + d.z * 1.2;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + this.wind * 0.02 * (0.5 + d.z), d.y - d.l); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(200,220,240,.5)'; ctx.lineWidth = 1;
      for (const s of this.splash) { const k = 1 - s.t / 0.25; ctx.beginPath(); ctx.ellipse(s.x, s.y, 2 + k * 7, 1 + k * 2, 0, 0, U.TAU); ctx.stroke(); }
      if (this.flash > 0) { ctx.fillStyle = `rgba(220,230,255,${Math.max(0, this.flash) * 0.45})`; ctx.fillRect(0, 0, R6.W, R6.H); }
      ctx.restore();
    }
  }

  // --- Lightmap: darkness with light holes. Lights provided in SCREEN coordinates ---
  const Light = {
    cv: null, cx: null,
    ensure() {
      if (!this.cv) { this.cv = document.createElement('canvas'); this.cv.width = R6.W / 2; this.cv.height = R6.H / 2; this.cx = this.cv.getContext('2d'); }
    },
    // lights: [{x,y,r,a (0..1), color?, cone:{ang, spread}}]
    draw(ctx, darkness, lights, tint = '#05060c') {
      if (darkness <= 0.01) return;
      this.ensure();
      const c = this.cx; const S = 0.5;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      c.fillStyle = tint; c.globalAlpha = darkness; c.fillRect(0, 0, this.cv.width, this.cv.height); c.globalAlpha = 1;
      c.globalCompositeOperation = 'destination-out';
      for (const L of lights) {
        const x = L.x * S, y = L.y * S, r = L.r * S;
        if (x < -r || y < -r || x > this.cv.width + r || y > this.cv.height + r) continue;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        const a = L.a == null ? 1 : L.a;
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        if (L.cone) {
          c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, L.cone.ang - L.cone.spread, L.cone.ang + L.cone.spread); c.closePath(); c.fill();
        } else { c.beginPath(); c.arc(x, y, r, 0, U.TAU); c.fill(); }
      }
      c.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(this.cv, 0, 0, R6.W, R6.H); ctx.restore();
      // colored glow pass
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const L of lights) {
        if (!L.color) continue;
        const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.8);
        g.addColorStop(0, U.rgba(L.color, 0.18 * (L.a == null ? 1 : L.a))); g.addColorStop(1, U.rgba(L.color, 0));
        ctx.fillStyle = g;
        if (L.cone) { ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.arc(L.x, L.y, L.r * 0.8, L.cone.ang - L.cone.spread, L.cone.ang + L.cone.spread); ctx.closePath(); ctx.fill(); }
        else ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      }
      ctx.restore();
    },
  };

  R6.Particles = Particles;
  R6.Rain = Rain;
  R6.Light = Light;
  R6.PTYPES = TYPES;
})();
