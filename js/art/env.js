/* ROUND 6 — env.js : painted side-view stages (backdrops with parallax) for cutscenes and arenas, plus painting helpers */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const W = () => R6.W, H = () => R6.H;
  function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); ctx.fill(); }
  function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rg(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function cached(key, w, h, paint) {
    const C = Env._cache;
    if (C[key]) return C[key];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    paint(cv.getContext('2d'), w, h);
    C[key] = cv; return cv;
  }
  // screen-space parallax layer (tiles horizontally)
  function para(ctx, img, cam, f, y = 0, alpha = 1) {
    const w = img.width; let off = -((cam.x * f) % w); if (off > 0) off -= w;
    ctx.save(); ctx.globalAlpha *= alpha;
    for (let x = off; x < R6.W; x += w) ctx.drawImage(img, Math.floor(x), y);
    ctx.restore();
  }
  function skyline(ctx, w, h, base, seed, col, winCol, density = 0.35, maxH = 260) {
    const r = new U.RNG(seed); let x = 0;
    while (x < w) {
      const bw = r.int(50, 130), bh = r.int(80, maxH);
      ctx.fillStyle = col; ctx.fillRect(x, base - bh, bw, bh + 4);
      if (r.chance(0.3)) { ctx.fillRect(x + bw * 0.3, base - bh - r.int(10, 30), bw * 0.15, 30); }
      for (let wy = base - bh + 10; wy < base - 10; wy += 14) for (let wx = x + 6; wx < x + bw - 8; wx += 12) if (r.chance(density)) { ctx.fillStyle = r.chance(0.8) ? winCol : '#9ecfff'; ctx.globalAlpha = r.range(0.4, 1); ctx.fillRect(wx, wy, 6, 7); ctx.globalAlpha = 1; }
      x += bw + r.int(0, 12);
    }
  }

  const Env = { _cache: {}, stages: {} };
  Env.grad = grad; Env.rg = rg; Env.cached = cached; Env.para = para; Env.skyline = skyline;

  // ---------------------------------------------------------------- SUBWAY STATION
  Env.stages.subway = {
    w: 2400, ground: 560, music: 'dorm', amb: ['hum'],
    back(ctx, cam, t) {
      ctx.fillStyle = '#20252b'; ctx.fillRect(0, 0, R6.W, R6.H);
    },
    world(ctx, cam, t) {
      const g = this.ground;
      // tiled wall
      const wall = cached('subwall', 600, 520, (c, w, h) => {
        c.fillStyle = '#d9dbd4'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 1;
        for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke(); }
        c.fillStyle = '#2e7d5b'; c.fillRect(0, 300, w, 26); c.fillStyle = '#1f5e44'; c.fillRect(0, 326, w, 4);
        c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 440, w, 80);
      });
      for (let x = 0; x < this.w; x += 600) ctx.drawImage(wall, x, g - 520);
      // station signs + ads
      for (let x = 150; x < this.w; x += 700) {
        ctx.fillStyle = '#12355b'; ctx.fillRect(x, g - 420, 330, 50); ctx.fillStyle = '#fff'; ctx.font = R6.UI.font(26, 800); ctx.fillText('ESTAÇÃO ' + ['GONGDEOK', 'SSANGMUN', 'HANGANG'][(x / 700) % 3 | 0], x + 14, g - 386, 268);
        ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.arc(x + 306, g - 395, 13, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2b2b30'; ctx.fillRect(x + 330, g - 380, 180, 240); ctx.fillStyle = grad(ctx, x + 330, g - 380, x + 510, g - 140, [[0, '#f28c28'], [1, '#e8336d']]); ctx.fillRect(x + 338, g - 372, 164, 224);
        R6.UI.text(ctx, 'EMPRÉSTIMO', x + 420, g - 300, { size: 24, align: 'center', color: '#fff', fam: 'title' }); R6.UI.text(ctx, 'SEM CONSULTA', x + 420, g - 272, { size: 18, align: 'center', color: '#fff', weight: 800 });
      }
      // pillars
      for (let x = 60; x < this.w; x += 380) { ctx.fillStyle = '#b9bbb4'; ctx.fillRect(x, g - 560, 46, 560); ctx.fillStyle = '#9d9f98'; ctx.fillRect(x + 34, g - 560, 12, 560); ctx.fillStyle = '#2e7d5b'; ctx.fillRect(x, g - 240, 46, 26); }
      // ceiling lights
      for (let x = 100; x < this.w; x += 260) { const fl = (Math.sin(t * 40 + x) > 0.97) ? 0.4 : 1; ctx.fillStyle = `rgba(255,255,240,${fl})`; ctx.fillRect(x, g - 540, 140, 8); ctx.fillStyle = rg(ctx, x + 70, g - 530, 0, 200, [[0, `rgba(255,255,230,${0.18 * fl})`], [1, 'rgba(255,255,230,0)']]); ctx.fillRect(x - 130, g - 540, 400, 300); }
      // floor
      ctx.fillStyle = grad(ctx, 0, g, 0, g + 200, [[0, '#8d8f8a'], [1, '#5e605c']]); ctx.fillRect(0, g, this.w, 220);
      ctx.fillStyle = '#e9c46a'; ctx.fillRect(0, g + 118, this.w, 10);
      ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let x = 0; x < this.w; x += 60) ctx.fillRect(x, g + 8, 2, 110);
      // benches
      for (let x = 250; x < this.w; x += 760) { ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x, g - 50, 180, 12); ctx.fillStyle = '#555'; ctx.fillRect(x + 10, g - 38, 8, 38); ctx.fillRect(x + 162, g - 38, 8, 38); }
    },
    front(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#1a1c1f'; ctx.fillRect(0, g + 128, this.w, 200);
      ctx.fillStyle = '#3a3c3f'; for (let x = 0; x < this.w; x += 40) ctx.fillRect(x, g + 150, 26, 8);
      ctx.fillStyle = '#6e6e6e'; ctx.fillRect(0, g + 145, this.w, 4); ctx.fillRect(0, g + 175, this.w, 4);
    },
  };

  // ---------------------------------------------------------------- CITY STREET (night, optional rain)
  Env.stages.street = {
    w: 2600, ground: 560, amb: ['rain'], rain: true,
    back(ctx, cam, t) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, R6.H, [[0, '#070a14'], [0.6, '#1a1f35'], [1, '#2a2440']]); ctx.fillRect(0, 0, R6.W, R6.H);
      const far = cached('city_far', 1400, 720, (c, w, h) => skyline(c, w, h, 520, 11, '#10142a', '#f2c94c', 0.18, 320));
      const mid = cached('city_mid', 1400, 720, (c, w, h) => skyline(c, w, h, 560, 23, '#0b0e1c', '#ffd98a', 0.3, 240));
      para(ctx, far, cam, 0.15, -40); para(ctx, mid, cam, 0.35, 0);
    },
    world(ctx, cam, t) {
      const g = this.ground;
      // storefronts
      for (let x = 0; x < this.w; x += 420) {
        ctx.fillStyle = '#2a2530'; ctx.fillRect(x, g - 300, 400, 300);
        const neon = ['#ff3b8d', '#3ae0ff', '#ffd23a', '#7dff6a'][(x / 420) % 4 | 0];
        ctx.save(); ctx.shadowColor = neon; ctx.shadowBlur = 18; ctx.strokeStyle = neon; ctx.lineWidth = 3; ctx.strokeRect(x + 40, g - 280, 220, 50);
        R6.UI.text(ctx, ['KARAOKÊ', 'LOTERIA', 'CHIKIN', 'PENHORES'][(x / 420) % 4 | 0], x + 150, g - 245, { size: 30, align: 'center', color: neon, fam: 'title' });
        ctx.restore();
        ctx.fillStyle = 'rgba(255,220,150,.25)'; ctx.fillRect(x + 40, g - 200, 220, 150);
        ctx.fillStyle = '#18141d'; ctx.fillRect(x + 290, g - 190, 80, 190);
      }
      // lamps
      for (let x = 200; x < this.w; x += 520) {
        ctx.fillStyle = '#222'; ctx.fillRect(x, g - 330, 8, 330); ctx.fillRect(x, g - 330, 60, 6);
        ctx.fillStyle = '#ffeab0'; ctx.fillRect(x + 44, g - 326, 20, 6);
        ctx.fillStyle = rg(ctx, x + 54, g - 320, 0, 260, [[0, 'rgba(255,230,160,.35)'], [1, 'rgba(255,230,160,0)']]); ctx.beginPath(); ctx.moveTo(x + 54, g - 320); ctx.lineTo(x - 80, g); ctx.lineTo(x + 190, g); ctx.closePath(); ctx.fill();
      }
      // wet asphalt
      ctx.fillStyle = grad(ctx, 0, g, 0, g + 200, [[0, '#1b1c22'], [1, '#0c0d10']]); ctx.fillRect(0, g, this.w, 220);
      ctx.fillStyle = '#3b3d45'; ctx.fillRect(0, g, this.w, 10);
      ctx.globalAlpha = 0.18; for (let x = 0; x < this.w; x += 420) { ctx.fillStyle = ['#ff3b8d', '#3ae0ff', '#ffd23a', '#7dff6a'][(x / 420) % 4 | 0]; ctx.fillRect(x + 40, g + 20, 220, 60 + Math.sin(t * 2 + x) * 4); } ctx.globalAlpha = 1;
    },
  };

  // ---------------------------------------------------------------- VAN INTERIOR
  Env.stages.van = {
    w: 1400, ground: 560,
    back(ctx, cam, t) {
      ctx.fillStyle = '#0d0e11'; ctx.fillRect(0, 0, R6.W, R6.H);
      // passing city lights through the window
      ctx.save(); ctx.beginPath(); ctx.rect(360, 190, 560, 150); ctx.clip();
      ctx.fillStyle = '#060810'; ctx.fillRect(360, 190, 560, 150);
      for (let i = 0; i < 12; i++) { const x = ((i * 170 - t * 600) % 1400 + 1400) % 1400 - 200; ctx.fillStyle = i % 3 ? 'rgba(255,210,120,.7)' : 'rgba(120,200,255,.6)'; ctx.fillRect(x, 230 + (i * 23) % 80, 40, 10); }
      ctx.restore();
    },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#2a2c31'; ctx.fillRect(0, 100, this.w, 90); ctx.fillRect(0, 340, this.w, 40);
      ctx.fillStyle = '#1e2024'; ctx.fillRect(0, 380, this.w, 300);
      ctx.strokeStyle = '#3a3d44'; ctx.lineWidth = 6; ctx.strokeRect(360, 190, 560, 150);
      ctx.fillStyle = '#34363c'; for (let x = 120; x < this.w; x += 380) { ctx.fillRect(x, g - 120, 200, 30); ctx.fillRect(x + 160, g - 260, 40, 170); }
    },
  };

  // ---------------------------------------------------------------- PARK AT NIGHT
  Env.stages.park = {
    w: 2200, ground: 560, amb: ['wind'],
    back(ctx, cam, t) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, R6.H, [[0, '#050814'], [1, '#18203a']]); ctx.fillRect(0, 0, R6.W, R6.H);
      for (let i = 0; i < 60; i++) { const x = (i * 97) % R6.W, y = (i * 53) % 300; ctx.fillStyle = `rgba(255,255,255,${0.3 + (Math.sin(t * 2 + i) + 1) * 0.2})`; ctx.fillRect(x, y, 1.5, 1.5); }
      const far = cached('park_far', 1400, 720, (c, w, h) => skyline(c, w, h, 480, 5, '#0c1122', '#e8c47a', 0.1, 200));
      para(ctx, far, cam, 0.12, 0);
      const trees = cached('park_trees', 1600, 720, (c, w, h) => { const r = new U.RNG(4); for (let x = 0; x < w; x += r.int(90, 160)) { c.fillStyle = '#0a1410'; c.fillRect(x + 20, 380, 14, 200); for (let k = 0; k < 4; k++) circ(c, x + 27 + r.range(-40, 40), 360 + r.range(-60, 20), r.range(40, 70), '#0c1a14'); } });
      para(ctx, trees, cam, 0.4, 20);
    },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = grad(ctx, 0, g, 0, g + 200, [[0, '#2a3326'], [1, '#141a12']]); ctx.fillRect(0, g, this.w, 220);
      ctx.fillStyle = '#6f6a5f'; ctx.fillRect(0, g, this.w, 26);
      for (let x = 300; x < this.w; x += 700) {
        ctx.fillStyle = '#222'; ctx.fillRect(x, g - 300, 8, 300); ctx.fillStyle = '#fff6d0'; circ(ctx, x + 4, g - 305, 12, '#fff6d0');
        ctx.fillStyle = rg(ctx, x + 4, g - 300, 0, 300, [[0, 'rgba(255,240,190,.3)'], [1, 'rgba(255,240,190,0)']]); ctx.fillRect(x - 300, g - 600, 600, 700);
        ctx.fillStyle = '#5b3d2a'; ctx.fillRect(x + 90, g - 45, 170, 10); ctx.fillStyle = '#333'; ctx.fillRect(x + 100, g - 35, 6, 35); ctx.fillRect(x + 244, g - 35, 6, 35);
      }
      // tents / boxes of homeless
      for (let x = 900; x < this.w; x += 600) { ctx.fillStyle = '#3a4a5a'; ctx.beginPath(); ctx.moveTo(x, g); ctx.lineTo(x + 70, g - 80); ctx.lineTo(x + 140, g); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a58b62'; ctx.fillRect(x + 160, g - 40, 60, 40); }
    },
  };

  // ---------------------------------------------------------------- DIM ROOM (RPS / roulette) — one lamp over a table
  Env.stages.room = {
    w: 1400, ground: 560, amb: ['hum'],
    back(ctx, cam, t) { ctx.fillStyle = '#070708'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground; const cx = 700;
      ctx.fillStyle = '#15141a'; ctx.fillRect(0, 0, this.w, g);
      ctx.fillStyle = 'rgba(255,255,255,.02)'; for (let x = 0; x < this.w; x += 70) ctx.fillRect(x, 0, 2, g);
      const fl = 0.9 + Math.sin(t * 9) * 0.03 + (Math.random() < 0.01 ? -0.3 : 0);
      ctx.fillStyle = rg(ctx, cx, g - 120, 0, 460, [[0, `rgba(255,236,190,${0.42 * fl})`], [1, 'rgba(255,236,190,0)']]); ctx.fillRect(cx - 500, 0, 1000, g + 200);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, 140); ctx.stroke();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.moveTo(cx - 50, 170); ctx.lineTo(cx + 50, 170); ctx.lineTo(cx + 20, 140); ctx.lineTo(cx - 20, 140); ctx.closePath(); ctx.fill();
      circ(ctx, cx, 172, 10, `rgba(255,240,200,${fl})`);
      ctx.fillStyle = '#0f0f12'; ctx.fillRect(0, g, this.w, 200);
      // table
      ctx.fillStyle = '#3b2a20'; ctx.fillRect(cx - 170, g - 72, 340, 16); ctx.fillStyle = '#2a1d16'; ctx.fillRect(cx - 160, g - 56, 12, 56); ctx.fillRect(cx + 148, g - 56, 12, 56);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(cx - 170, g - 72, 340, 3);
    },
  };

  // ---------------------------------------------------------------- FRONT MAN OFFICE (monitors)
  Env.stages.office = {
    w: 1600, ground: 560, amb: ['hum'],
    back(ctx, cam, t) { ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, this.w, g);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        const x = 180 + c * 160, y = 60 + r * 100;
        ctx.fillStyle = '#111'; ctx.fillRect(x - 4, y - 4, 148, 92);
        const hue = ((c + r) % 3);
        ctx.fillStyle = hue === 0 ? '#1b3a36' : hue === 1 ? '#2b2433' : '#2c2a1c'; ctx.fillRect(x, y, 140, 84);
        ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 84; i += 3) ctx.fillRect(x, y + i, 140, 1);
        for (let k = 0; k < 6; k++) { const px = x + 10 + ((k * 23 + c * 7 + Math.floor(t * 0.5 + k)) % 120), py = y + 30 + (k * 11) % 40; ctx.fillStyle = '#2b7d71'; ctx.fillRect(px, py, 4, 8); }
        R6.UI.text(ctx, 'CAM ' + U.pad(r * 8 + c + 1, 2), x + 6, y + 12, { size: 9, color: '#9f9', fam: 'mono' });
      }
      ctx.fillStyle = 'rgba(80,200,180,.08)'; ctx.fillRect(160, 40, 1300, 420);
      ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, g, this.w, 200);
      ctx.fillStyle = '#1e1a18'; ctx.fillRect(560, g - 90, 480, 18); ctx.fillStyle = '#141110'; ctx.fillRect(580, g - 72, 440, 72);
      ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.ellipse(950, g - 96, 30, 6, 0, 0, TAU); ctx.fill(); // record player
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(950, g - 98, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(210,150,60,.8)'; ctx.fillRect(640, g - 108, 12, 18);
    },
  };

  // ---------------------------------------------------------------- VIP LOUNGE
  Env.stages.vip = {
    w: 1800, ground: 560, music: 'waltz',
    back(ctx, cam, t) { ctx.fillStyle = '#0b0906'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = grad(ctx, 0, 0, 0, g, [[0, '#1d160c'], [1, '#2e2212']]); ctx.fillRect(0, 0, this.w, g);
      // big window looking down into arena
      ctx.fillStyle = '#0a1418'; ctx.fillRect(300, 80, 1200, 300);
      ctx.fillStyle = 'rgba(80,160,200,.15)'; ctx.fillRect(300, 80, 1200, 300);
      for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(200,235,255,.25)'; ctx.fillRect(360 + i * 70, 300, 50, 6); }
      ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 8; ctx.strokeRect(300, 80, 1200, 300);
      for (let x = 500; x < 1500; x += 300) { ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x - 3, 80, 6, 300); }
      // golden statues / columns
      for (let x = 80; x < this.w; x += 1580) { ctx.fillStyle = grad(ctx, x, 0, x + 80, 0, [[0, '#8a6a2a'], [0.5, '#f2c14e'], [1, '#8a6a2a']]); ctx.fillRect(x, 40, 80, g - 40); }
      ctx.fillStyle = '#3a0d14'; ctx.fillRect(0, g, this.w, 200);
      ctx.fillStyle = '#5a1420'; for (let x = 200; x < this.w; x += 420) { ctx.fillRect(x, g - 70, 260, 50); ctx.fillRect(x, g - 110, 30, 90); ctx.fillRect(x + 230, g - 110, 30, 90); }
      // chandelier
      ctx.fillStyle = '#f2c14e'; for (let i = 0; i < 9; i++) circ(ctx, 900 + (i - 4) * 26, 50 + Math.abs(i - 4) * 6, 5, '#ffe9a8');
      ctx.fillStyle = rg(ctx, 900, 60, 0, 380, [[0, 'rgba(255,220,140,.25)'], [1, 'rgba(255,220,140,0)']]); ctx.fillRect(500, 0, 800, 500);
    },
  };

  // ---------------------------------------------------------------- DINNER HALL (final interlude)
  Env.stages.dinner = {
    w: 1800, ground: 560, music: 'waltz',
    back(ctx, cam, t) { ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground; const cx = 900;
      ctx.fillStyle = grad(ctx, 0, 0, 0, g, [[0, '#0e0c14'], [1, '#1c1726']]); ctx.fillRect(0, 0, this.w, g);
      // painted wall pattern (pastel geometric)
      ctx.globalAlpha = 0.12; for (let x = 0; x < this.w; x += 90) for (let y = 30; y < g - 100; y += 90) R6.UI.shapeIcon(ctx, ['circle', 'triangle', 'square'][((x + y) / 90) % 3 | 0], x + 45, y, 18, '#e8336d', 3); ctx.globalAlpha = 1;
      ctx.fillStyle = rg(ctx, cx, 80, 0, 520, [[0, 'rgba(255,225,170,.35)'], [1, 'rgba(255,225,170,0)']]); ctx.fillRect(0, 0, this.w, g + 100);
      for (let i = 0; i < 13; i++) circ(ctx, cx + (i - 6) * 22, 70 + Math.abs(i - 6) * 5, 4.5, '#fff1c4');
      ctx.fillStyle = '#0d0b10'; ctx.fillRect(0, g, this.w, 200);
      // long table with white cloth
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(cx - 420, g - 70, 840, 20); ctx.fillStyle = '#d9d5c9'; ctx.fillRect(cx - 420, g - 50, 840, 26);
      for (let i = -3; i <= 3; i++) { ctx.fillStyle = '#c9c9c9'; ctx.beginPath(); ctx.ellipse(cx + i * 110, g - 72, 22, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#7a2230'; ctx.fillRect(cx + i * 110 + 26, g - 92, 5, 20); }
      for (let i = -1; i <= 1; i++) { ctx.fillStyle = '#f2e6c8'; ctx.fillRect(cx + i * 300 - 3, g - 110, 6, 38); ctx.fillStyle = '#ffcf6a'; circ(ctx, cx + i * 300, g - 114, 4 + Math.sin(t * 9 + i) * 0.8, '#ffcf6a'); }
    },
  };

  // ---------------------------------------------------------------- APARTMENT (home)
  Env.stages.home = {
    w: 1500, ground: 560, music: 'sad',
    back(ctx, cam, t) { ctx.fillStyle = '#0a0b10'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#3a3f3a'; ctx.fillRect(0, 0, this.w, g);
      ctx.fillStyle = '#4a4f48'; for (let x = 0; x < this.w; x += 30) ctx.fillRect(x, 0, 14, g);
      ctx.fillStyle = '#10182a'; ctx.fillRect(560, 120, 360, 220); ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 10; ctx.strokeRect(560, 120, 360, 220); ctx.beginPath(); ctx.moveTo(740, 120); ctx.lineTo(740, 340); ctx.stroke();
      for (let i = 0; i < 20; i++) { ctx.fillStyle = 'rgba(255,220,140,.6)'; ctx.fillRect(580 + (i * 47) % 320, 200 + (i * 31) % 120, 5, 6); }
      ctx.fillStyle = '#5a3d2a'; ctx.fillRect(0, g, this.w, 200);
      ctx.fillStyle = '#8a8f96'; ctx.fillRect(200, g - 60, 240, 60); ctx.fillStyle = '#c8b9a0'; ctx.fillRect(210, g - 80, 220, 25); // bed
      ctx.fillStyle = '#6b4b33'; ctx.fillRect(1000, g - 70, 160, 14); ctx.fillRect(1010, g - 56, 10, 56); ctx.fillRect(1140, g - 56, 10, 56);
      ctx.fillStyle = '#e9e1d0'; ctx.fillRect(1040, g - 86, 40, 16);
    },
  };

  // ---------------------------------------------------------------- SEA / BOAT (escape, dark ending)
  Env.stages.sea = {
    w: 2600, ground: 560, amb: ['sea', 'wind'],
    back(ctx, cam, t) {
      const dawn = this.dawn || 0;
      ctx.fillStyle = grad(ctx, 0, 0, 0, R6.H, [[0, U.mix('#050814', '#3a4a7a', dawn)], [0.55, U.mix('#141a30', '#f2a65a', dawn)], [1, '#0b1020']]); ctx.fillRect(0, 0, R6.W, R6.H);
      if (dawn > 0) { circ(ctx, R6.W * 0.7, 420, 60, U.rgba('#ffd27a', dawn)); }
      const isl = cached('island_sil', 1600, 720, (c) => { c.fillStyle = '#070a12'; c.beginPath(); c.moveTo(0, 470); c.quadraticCurveTo(300, 330, 620, 420); c.quadraticCurveTo(820, 300, 1100, 440); c.lineTo(1600, 470); c.lineTo(1600, 720); c.lineTo(0, 720); c.fill(); c.fillStyle = '#ffd24a'; for (let i = 0; i < 12; i++) c.fillRect(500 + i * 40, 405 - (i % 3) * 8, 3, 3); });
      para(ctx, isl, cam, 0.1, 0);
    },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = grad(ctx, 0, g - 80, 0, g + 200, [[0, '#0c1a2c'], [1, '#050a12']]); ctx.fillRect(0, g - 80, this.w, 300);
      ctx.strokeStyle = 'rgba(160,200,255,.18)'; ctx.lineWidth = 2;
      for (let y = g - 70; y < g + 180; y += 22) { ctx.beginPath(); for (let x = 0; x <= this.w; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 2 + y) * 4); ctx.stroke(); }
    },
  };

  // ---------------------------------------------------------------- ISLAND AERIAL (victory / credits) — screen space
  Env.stages.island = {
    w: 1280, ground: 600,
    back(ctx, cam, t) {
      const dawn = this.dawn != null ? this.dawn : 0.6;
      ctx.fillStyle = grad(ctx, 0, 0, 0, R6.H, [[0, U.mix('#081226', '#6d86b8', dawn)], [0.45, U.mix('#0c1c35', '#f2b07a', dawn)], [0.46, '#0a2238'], [1, '#051120']]); ctx.fillRect(0, 0, R6.W, R6.H);
      circ(ctx, R6.W * 0.78, 300, 44, U.rgba('#ffe0a0', 0.4 + dawn * 0.5));
      ctx.strokeStyle = 'rgba(200,220,255,.12)'; ctx.lineWidth = 1.5;
      for (let y = 340; y < R6.H; y += 14) { ctx.beginPath(); for (let x = 0; x <= R6.W; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.03 + t + y) * 2); ctx.stroke(); }
      const s = this.zoom || 1; const cx = R6.W / 2 + (this.panX || 0), cy = 470;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s * 0.45);
      ctx.fillStyle = '#16301f'; ctx.beginPath(); ctx.ellipse(0, 0, 330, 220, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#244a2d'; ctx.beginPath(); ctx.ellipse(-30, -20, 270, 170, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9d2bf'; ctx.beginPath(); ctx.ellipse(0, 0, 340, 230, 0, 0, TAU); ctx.lineWidth = 10; ctx.strokeStyle = '#c7b98f'; ctx.stroke();
      // facility blocks
      ctx.fillStyle = '#6c7a86'; ctx.fillRect(-120, -60, 240, 130); ctx.fillStyle = '#8796a3'; ctx.fillRect(-100, -50, 90, 50); ctx.fillRect(20, -40, 80, 90);
      ctx.fillStyle = '#e8336d'; ctx.fillRect(-10, 75, 20, 10);
      ctx.fillStyle = '#ffd24a'; for (let i = 0; i < 16; i++) ctx.fillRect(-110 + (i * 29) % 220, -55 + (i * 17) % 120, 4, 4);
      ctx.restore();
    },
    world() { },
  };

  // ---------------------------------------------------------------- CITY DAY (dark ending — another country)
  Env.stages.cityday = {
    w: 2400, ground: 560,
    back(ctx, cam, t) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, R6.H, [[0, '#9cc3e6'], [1, '#e8d8c0']]); ctx.fillRect(0, 0, R6.W, R6.H);
      const far = cached('cityday_far', 1400, 720, (c, w, h) => skyline(c, w, h, 520, 99, '#a7b4c4', '#dfe8f2', 0.25, 360));
      const mid = cached('cityday_mid', 1400, 720, (c, w, h) => skyline(c, w, h, 560, 77, '#7d8a9a', '#cfe0ee', 0.3, 260));
      para(ctx, far, cam, 0.12, -30); para(ctx, mid, cam, 0.3, 0);
    },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#b8b2a6'; ctx.fillRect(0, g, this.w, 30); ctx.fillStyle = '#5b5b60'; ctx.fillRect(0, g + 30, this.w, 200);
      ctx.fillStyle = '#fff'; for (let x = 0; x < this.w; x += 120) ctx.fillRect(x, g + 110, 60, 6);
      for (let x = 400; x < this.w; x += 800) { ctx.fillStyle = '#2d3a2d'; ctx.fillRect(x, g - 200, 10, 200); circ(ctx, x + 5, g - 220, 60, '#3f6f3a'); }
    },
  };

  // ---------------------------------------------------------------- ARCHIVE (secret ending)
  Env.stages.archive = {
    w: 1800, ground: 560, amb: ['hum'],
    back(ctx) { ctx.fillStyle = '#060607'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#121216'; ctx.fillRect(0, 0, this.w, g);
      for (let x = 60; x < this.w; x += 260) {
        ctx.fillStyle = '#26262c'; ctx.fillRect(x, 80, 220, g - 80);
        for (let y = 100; y < g - 20; y += 60) { ctx.fillStyle = '#34343c'; ctx.fillRect(x + 10, y, 200, 48); for (let k = 0; k < 8; k++) { ctx.fillStyle = ['#c9b58a', '#a89a78', '#ddd0b0'][(k + y) % 3]; ctx.fillRect(x + 16 + k * 24, y + 6, 18, 40); } }
      }
      ctx.fillStyle = rg(ctx, 900, 200, 0, 500, [[0, 'rgba(180,220,255,.12)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, this.w, g);
      ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, g, this.w, 200);
    },
  };

  // ---------------------------------------------------------------- BEACH AT DAWN (escape ending)
  Env.stages.beach = {
    w: 2400, ground: 560, amb: ['sea'],
    back(ctx, cam, t) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, R6.H, [[0, '#2c3e6b'], [0.5, '#f0a36b'], [0.62, '#ffd49a'], [1, '#e0c49a']]); ctx.fillRect(0, 0, R6.W, R6.H);
      circ(ctx, R6.W * 0.6, 390, 70, 'rgba(255,230,170,.9)');
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) { const x = ((i * 260 - t * 12) % 1500 + 1500) % 1500 - 100; ctx.beginPath(); ctx.ellipse(x, 120 + i * 30, 90, 14, 0, 0, TAU); ctx.fill(); }
    },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = grad(ctx, 0, g - 110, 0, g, [[0, '#5d7fa8'], [1, '#9db8cc']]); ctx.fillRect(0, g - 110, this.w, 110);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; for (let y = g - 100; y < g; y += 18) { ctx.beginPath(); for (let x = 0; x <= this.w; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 1.5 + y) * 3); ctx.stroke(); }
      ctx.fillStyle = grad(ctx, 0, g, 0, g + 200, [[0, '#e6cf9f'], [1, '#c9ab76']]); ctx.fillRect(0, g, this.w, 220);
      ctx.fillStyle = '#4a4a4f'; ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(0, g - 260); ctx.lineTo(160, g - 180); ctx.lineTo(260, g); ctx.fill(); // tunnel mouth rock
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(110, g - 60, 60, 60, 0, Math.PI, TAU); ctx.fill();
    },
  };

  // ---------------------------------------------------------------- ELEVATOR
  Env.stages.elevator = {
    w: 1280, ground: 560, amb: ['machine'],
    back(ctx) { ctx.fillStyle = '#0a0b0d'; ctx.fillRect(0, 0, R6.W, R6.H); },
    world(ctx, cam, t) {
      const g = this.ground;
      ctx.fillStyle = '#6b7178'; ctx.fillRect(400, 60, 480, g - 60);
      ctx.fillStyle = '#8b9199'; for (let x = 410; x < 880; x += 40) ctx.fillRect(x, 70, 30, g - 80);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(400, 60, 480, 6);
      ctx.fillStyle = '#1a1c20'; ctx.fillRect(560, 90, 160, 36); R6.UI.text(ctx, this.floor || 'B7', 640, 110, { size: 28, align: 'center', base: 'middle', color: '#ff5a3a', fam: 'mono' });
      ctx.fillStyle = '#303338'; ctx.fillRect(0, g, 1280, 200);
    },
  };

  // generic stage render helper: back (screen) → world (camera) → actors callback → front (camera) → overlay
  Env.render = function (ctx, stage, cam, t, drawActors) {
    ctx.save(); stage.back && stage.back(ctx, cam, t); ctx.restore();
    cam.begin(ctx);
    stage.world && stage.world(ctx, cam, t);
    drawActors && drawActors(ctx);
    stage.front && stage.front(ctx, cam, t);
    cam.end(ctx);
  };

  R6.Env = Env;
})();
