/* ROUND 6 — stealth.js : procedural pastel/industrial mazes, guard vision cones + detection meters, patrol/search/chase AI,
   security cameras, noise events, darkness lighting — shared by the Revolt, Hide & Seek and the Escape */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU, T = R6.T;

  // ---------------- maze generator (cells of cs×cs tiles, corridors of width cw) ----------------
  function genMaze(o) {
    const cols = o.cols, rows = o.rows, cs = o.cell || 6, cw = o.corr || 3, ts = o.ts || 32;
    const W = cols * cs + 1, H = rows * cs + 1;
    const map = new R6.TileMap(W, H, ts);
    const rng = new U.RNG(o.seed || (Math.random() * 1e9) | 0);
    map.fill(0, 0, W - 1, H - 1, T.WALL, o.wall != null ? o.wall : 1);
    const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
    const links = [];
    const stack = [[0, rows - 1]]; visited[rows - 1][0] = true;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !visited[y][x]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = rng.pick(nb); visited[ny][nx] = true; links.push([cx, cy, nx, ny]); stack.push([nx, ny]);
    }
    // extra loops for alternate routes
    const extra = Math.floor(cols * rows * (o.loops != null ? o.loops : 0.18));
    for (let i = 0; i < extra; i++) { const x = rng.int(0, cols - 2), y = rng.int(0, rows - 1); if (rng.chance(0.5)) links.push([x, y, x + 1, y]); else if (y < rows - 1) links.push([x, y, x, y + 1]); }
    const off = Math.floor((cs - cw) / 2);
    const zoneStyle = (cx, cy) => o.zone ? o.zone(cx, cy, rng) : 0;
    const cells = [];
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * cs + 1 + off - (o.roomy && rng.chance(0.35) ? 1 : 0), y0 = cy * cs + 1 + off - (o.roomy && rng.chance(0.35) ? 1 : 0);
      const big = o.roomy && rng.chance(o.roomChance || 0.3);
      const w = big ? cs - 1 : cw, h = big ? cs - 1 : cw;
      const X0 = big ? cx * cs + 1 : x0, Y0 = big ? cy * cs + 1 : y0;
      map.fill(X0, Y0, X0 + w - 1, Y0 + h - 1, T.FLOOR, zoneStyle(cx, cy));
      cells.push({ cx, cy, x: X0, y: Y0, w, h, big, center: map.center(X0 + Math.floor(w / 2), Y0 + Math.floor(h / 2)), style: zoneStyle(cx, cy) });
    }
    for (const [ax, ay, bx, by] of links) {
      const s = zoneStyle(ax, ay);
      if (ay === by) { const y0 = ay * cs + 1 + off; const x0 = Math.min(ax, bx) * cs + 1 + off; map.fill(x0, y0, x0 + cs + cw - 1, y0 + cw - 1, T.FLOOR, s); }
      else { const x0 = ax * cs + 1 + off; const y0 = Math.min(ay, by) * cs + 1 + off; map.fill(x0, y0, x0 + cw - 1, y0 + cs + cw - 1, T.FLOOR, s); }
    }
    // wall styles by nearby zone
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map.get(x, y) === T.WALL) { const cx = Math.min(cols - 1, Math.floor(x / cs)), cy = Math.min(rows - 1, Math.floor(y / cs)); map.ws[y * W + x] = o.wallStyle ? o.wallStyle(cx, cy, rng) : (o.wall || 1); }
    const cellAt = (cx, cy) => cells[cy * cols + cx];
    return { map, cells, cellAt, links, cols, rows, cs, cw, rng, start: cellAt(0, rows - 1), goal: cellAt(cols - 1, 0) };
  }

  // doorway finder: tile positions inside corridors connecting two cells (used to place doors)
  function corridorDoor(M, link) {
    const [ax, ay, bx, by] = link; const off = Math.floor((M.cs - M.cw) / 2);
    if (ay === by) { const x = Math.max(ax, bx) * M.cs; const y0 = ay * M.cs + 1 + off; return { tx: x, ty: y0, horiz: false, len: M.cw }; }
    const y = Math.max(ay, by) * M.cs; const x0 = ax * M.cs + 1 + off; return { tx: x0, ty: y, horiz: true, len: M.cw };
  }

  // ---------------- guard AI ----------------
  class Guard {
    constructor(world, o) {
      this.world = world; this.map = world.map;
      this.a = world.add(new R6.Actor({ look: o.look || R6.Char.makeLook({ outfit: 'guard', mask: U.pick(['circle', 'triangle', 'square']) }), x: o.x, y: o.y, speed: o.speed || 62, runSpeed: o.run || 150, scale: 0.46 }));
      this.a.item = o.item || 'rifle'; this.a.kind = 'guard'; this.a.canOpenDoors = true;
      this.route = o.route || []; this.ri = 0; this.state = 'patrol'; this.t = 0; this.sus = 0; this.last = null; this.facing = 0; this.fov = o.fov || 0.62; this.range = o.range || 250; this.waitT = 0; this.down = false; this.key = o.key || null; this.lookT = 0;
      this.onCatch = o.onCatch; this.rate = o.rate || 1;
    }
    get x() { return this.a.x; } get y() { return this.a.y; }
    dirAngle() { const d = this.a.dir; if (Math.abs(this.a.vx) + Math.abs(this.a.vy) > 8) return Math.atan2(this.a.vy, this.a.vx); return this.facing; }
    canSee(tx, ty, rangeMul = 1) {
      if (this.down) return false;
      const dx = tx - this.x, dy = ty - this.y; const d = Math.hypot(dx, dy);
      if (d > this.range * rangeMul) return false;
      if (d > 26 && Math.abs(U.angDiff(this.facing, Math.atan2(dy, dx))) > this.fov) return false;
      return this.map.los(this.x, this.y - 10, tx, ty - 10);
    }
    hear(x, y, loud) { if (this.down || this.state === 'chase') return; const d = U.dist(x, y, this.x, this.y); if (d < loud) { this.state = 'investigate'; this.last = { x, y }; this.a.emo('?', 1.4); this.a.goTo(this.world, x, y, false); this.t = 0; } }
    update(dt, target, vis) {
      const a = this.a; this.t += dt;
      if (this.down) { a.dvx = a.dvy = 0; return; }
      // facing follows movement; while idle, look around
      const sp = Math.hypot(a.vx, a.vy);
      if (sp > 10) this.facing = U.lerp(this.facing, this.facing + U.angDiff(this.facing, Math.atan2(a.vy, a.vx)), Math.min(1, dt * 8));
      else { this.lookT += dt; this.facing += Math.sin(this.lookT * 0.9) * dt * 0.8; }
      // perception
      const seen = target && vis > 0 && this.canSee(target.x, target.y);
      if (seen) {
        const d = U.dist(target.x, target.y, this.x, this.y);
        const k = (1.6 - d / this.range) * vis * this.rate * R6.Save.D(1, 1.3, 1.7);
        this.sus = Math.min(1, this.sus + dt * k * (this.state === 'chase' ? 3 : 1));
        this.last = { x: target.x, y: target.y };
        if (this.sus > 0.35 && this.state === 'patrol') { this.state = 'investigate'; a.emo('?', 1.2); a.stop(); this.facing = Math.atan2(target.y - this.y, target.x - this.x); R6.Audio.sfx('scan', { vol: 0.4 }); }
        if (this.sus >= 1 && this.state !== 'chase') { this.state = 'chase'; a.emo('!', 1.5); R6.Audio.sfx('alarmBlip'); this.alerted = true; }
      } else this.sus = Math.max(0, this.sus - dt * (this.state === 'chase' ? 0.12 : 0.25));
      switch (this.state) {
        case 'patrol':
          if (!a.path) {
            if (this.waitT > 0) { this.waitT -= dt; break; }
            if (this.route.length) { const p = this.route[this.ri]; this.ri = (this.ri + 1) % this.route.length; a.goTo(this.world, p.x, p.y, false, () => { this.waitT = U.rand(0.8, 2.5); }); }
          }
          break;
        case 'investigate':
          if (seen) { a.stop(); this.facing = Math.atan2(target.y - this.y, target.x - this.x); }
          else if (this.last && !a.path) { a.goTo(this.world, this.last.x, this.last.y, false, () => { this.waitT = 2; }); this.last = null; }
          if (!seen && !a.path && this.t > 6 && this.sus <= 0.05) { this.state = 'patrol'; this.t = 0; }
          break;
        case 'chase':
          if (target && seen) {
            this.repath = (this.repath || 0) - dt;
            if (this.repath <= 0) { this.repath = 0.35; a.goTo(this.world, target.x, target.y, true); }
            if (U.dist(target.x, target.y, this.x, this.y) < 30 && this.onCatch) this.onCatch(this);
          } else if (this.last) { if (!a.path) { a.goTo(this.world, this.last.x, this.last.y, true); this.last = null; } }
          else if (!a.path) { this.state = 'search'; this.t = 0; }
          if (this.sus <= 0) { this.state = 'search'; this.t = 0; }
          break;
        case 'search':
          if (!a.path && this.t < 8) { const ang = Math.random() * TAU; const p = this.map.nearestFree(this.x + Math.cos(ang) * 120, this.y + Math.sin(ang) * 120); a.goTo(this.world, p.x, p.y, false); }
          if (this.t >= 8) { this.state = 'patrol'; this.alerted = false; }
          break;
      }
    }
    knockOut() { this.down = true; this.a.lie = { anim: 'lie' }; this.a.stop(); this.a.solid = false; this.state = 'down'; R6.Audio.sfx('hit'); R6.Audio.sfx('thud', { delay: 0.2 }); this.a.expr = 'dead'; }
    drawCone(ctx) {
      if (this.down) return;
      const col = this.state === 'chase' ? 'rgba(255,40,60,' : this.sus > 0.3 ? 'rgba(255,190,60,' : 'rgba(255,255,220,';
      const g = ctx.createRadialGradient(this.x, this.y - 10, 10, this.x, this.y - 10, this.range);
      g.addColorStop(0, col + '0.22)'); g.addColorStop(1, col + '0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(this.x, this.y - 10);
      const n = 14; for (let i = 0; i <= n; i++) {
        const ang = this.facing - this.fov + i / n * this.fov * 2; let r = this.range;
        // clip by walls (coarse raymarch)
        for (let s = 16; s < this.range; s += 16) { if (this.map.opaqueT(Math.floor((this.x + Math.cos(ang) * s) / this.map.ts), Math.floor((this.y - 10 + Math.sin(ang) * s) / this.map.ts))) { r = s; break; } }
        ctx.lineTo(this.x + Math.cos(ang) * r, this.y - 10 + Math.sin(ang) * r);
      }
      ctx.closePath(); ctx.fill();
      if (this.sus > 0.05) { R6.UI.bar(ctx, this.x - 16, this.y - 70, 32, 5, this.sus, { color: this.state === 'chase' ? '#ff3b5c' : '#ffd166' }); }
    }
  }

  // ---------------- security camera ----------------
  class SecCam {
    constructor(map, o) { Object.assign(this, { map, x: o.x, y: o.y, base: o.a, sweep: o.sweep || 0.8, speed: o.speed || 0.6, range: o.range || 280, fov: 0.35, t: Math.random() * 6, sus: 0, disabled: false }); this.ang = this.base; }
    update(dt, target, vis, onAlarm) {
      if (this.disabled) return;
      this.t += dt; this.ang = this.base + Math.sin(this.t * this.speed) * this.sweep;
      const dx = target.x - this.x, dy = target.y - this.y, d = Math.hypot(dx, dy);
      const seen = vis > 0 && d < this.range && Math.abs(U.angDiff(this.ang, Math.atan2(dy, dx))) < this.fov && this.map.los(this.x, this.y, target.x, target.y - 10);
      if (seen) { this.sus = Math.min(1, this.sus + dt * 1.4 * vis * R6.Save.D(1, 1.3, 1.6)); if (this.sus >= 1 && !this.fired) { this.fired = true; onAlarm && onAlarm(this, target); } }
      else { this.sus = Math.max(0, this.sus - dt * 0.4); if (this.sus < 0.2) this.fired = false; }
    }
    draw(ctx, t) {
      R6.Props.camera(ctx, this.x, this.y, this.ang, { t });
      if (this.disabled) return;
      const g = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.range);
      g.addColorStop(0, this.sus > 0.5 ? 'rgba(255,60,60,.25)' : 'rgba(120,200,255,.18)'); g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.arc(this.x, this.y, this.range, this.ang - this.fov, this.ang + this.fov); ctx.closePath(); ctx.fill();
    }
  }

  // ---------------- noise rings (footsteps / thrown objects) ----------------
  class Noises {
    constructor() { this.list = []; }
    add(x, y, r, o = {}) { this.list.push({ x, y, r, t: 0, dur: o.dur || 0.6, color: o.color || '255,255,255' }); if (this.list.length > 60) this.list.shift(); }
    update(dt) { for (const n of this.list) n.t += dt; this.list = this.list.filter(n => n.t < n.dur); }
    draw(ctx) { for (const n of this.list) { const k = n.t / n.dur; ctx.strokeStyle = `rgba(${n.color},${(1 - k) * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(n.x, n.y, n.r * k, n.r * k * 0.55, 0, 0, TAU); ctx.stroke(); } }
  }

  // screen-edge direction indicators for sounds (hearing footsteps)
  function drawEdgeCue(ctx, cam, x, y, color, label) {
    const s = cam.toScreen(x, y); if (s.x > 40 && s.x < R6.W - 40 && s.y > 40 && s.y < R6.H - 40) return;
    const cx = R6.W / 2, cy = R6.H / 2; const a = Math.atan2(s.y - cy, s.x - cx);
    const ex = cx + Math.cos(a) * (R6.W / 2 - 40), ey = cy + Math.sin(a) * (R6.H / 2 - 40);
    ctx.save(); ctx.translate(U.clamp(ex, 30, R6.W - 30), U.clamp(ey, 30, R6.H - 30)); ctx.rotate(a);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  R6.genMaze = genMaze; R6.corridorDoor = corridorDoor;
  R6.Guard = Guard; R6.SecCam = SecCam; R6.Noises = Noises; R6.drawEdgeCue = drawEdgeCue;
})();
