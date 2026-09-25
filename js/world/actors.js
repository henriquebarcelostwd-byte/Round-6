/* ROUND 6 — actors.js : top-down actors (movement, collision, path following, speech bubbles, emotes) and the World container */
'use strict';
(function () {
  const U = R6.U;

  class Actor {
    constructor(o = {}) {
      this.p = o.p || null;
      this.look = o.look || (this.p ? this.p.look : R6.Char.makeLook());
      this.id = o.id != null ? o.id : (this.p ? 'p' + this.p.num : 'a' + Math.random().toString(36).slice(2, 7));
      this.x = o.x || 0; this.y = o.y || 0; this.r = o.r || 9;
      this.vx = 0; this.vy = 0; this.dvx = 0; this.dvy = 0;
      this.dir = o.dir || 'down';
      this.speed = o.speed || 82; this.runSpeed = o.runSpeed || 140;
      this.accel = o.accel || 900;
      this.anim = 'idle'; this.animT = Math.random() * 3; this.forceAnim = null; this.forceT = 0;
      this.alive = true; this.dead = false; this.deadT = 0; this.bodyAlpha = 1;
      this.path = null; this.pathI = 0; this.goal = null; this.onArrive = null; this.running = false; this.repath = 0; this.stuckT = 0; this.lastPos = { x: this.x, y: this.y };
      this.bubble = null; this.emote = null; this.expr = null;
      this.solid = o.solid !== false; this.pushable = o.pushable !== false; this.mass = o.mass || 1;
      this.scale = o.scale || 0.46;
      this.brain = o.brain || null; this.state = o.state || 'idle'; this.data = o.data || {};
      this.kind = o.kind || (this.p ? 'player' : 'npc');
      this.isPlayer = !!o.isPlayer;
      this.item = o.item || null; this.highlight = null; this.visible = true; this.alpha = 1;
      this.lie = null; // {back:bool} for sleeping/lying
      this.frozen = false; this.stun = 0; this.slow = 1;
      this.label = o.label || null;
    }
    get moving() { return Math.hypot(this.vx, this.vy) > 12; }
    get spd() { return Math.hypot(this.vx, this.vy); }
    faceTo(x, y) { const dx = x - this.x, dy = y - this.y; if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? 'left' : 'right'; else this.dir = dy < 0 ? 'up' : 'down'; }
    face(dir) { this.dir = dir; }
    setAnim(a, dur) { this.forceAnim = a; this.forceT = dur || 0; this.animT = 0; }
    clearAnim() { this.forceAnim = null; this.forceT = 0; }
    say(text, dur = 2.6) { this.bubble = { text, t: 0, dur }; }
    emo(icon, dur = 1.6) { this.emote = { icon, t: 0, dur }; }
    stop() { this.path = null; this.goal = null; this.dvx = 0; this.dvy = 0; this.onArrive = null; }
    // desired velocity (normalized dir * speed)
    steer(dx, dy, run) {
      const l = Math.hypot(dx, dy); const sp = (run ? this.runSpeed : this.speed) * this.slow;
      if (l < 0.001) { this.dvx = 0; this.dvy = 0; return; }
      this.dvx = dx / l * sp; this.dvy = dy / l * sp; this.running = !!run;
    }
    goTo(world, x, y, run = false, cb = null) {
      this.goal = { x, y }; this.running = run; this.onArrive = cb;
      const path = world.map ? world.map.findPath(this.x, this.y, x, y, 8000, { doors: this.canOpenDoors, key: this.doorKey }) : [{ x, y }];
      this.path = path || [{ x, y }]; this.pathI = 0; this.repath = 1.5 + Math.random();
      return !!path;
    }
    followPath(dt, world) {
      if (!this.path) return;
      const pt = this.path[this.pathI];
      if (!pt) { this.finishPath(); return; }
      const dx = pt.x - this.x, dy = pt.y - this.y; const d = Math.hypot(dx, dy);
      const last = this.pathI >= this.path.length - 1;
      if (d < (last ? 4 : 10)) { this.pathI++; if (this.pathI >= this.path.length) this.finishPath(); return; }
      this.steer(dx, dy, this.running);
      if (last && d < 30) { const k = Math.max(0.35, d / 30); this.dvx *= k; this.dvy *= k; }
      // stuck detection → re-path or give up gracefully
      this.repath -= dt;
      if (this.repath <= 0) {
        this.repath = 1.2;
        const moved = Math.hypot(this.x - this.lastPos.x, this.y - this.lastPos.y);
        this.lastPos.x = this.x; this.lastPos.y = this.y;
        if (moved < 6) { this.stuckT++; if (this.stuckT > 2 && this.goal) { this.stuckT = 0; const g = this.goal, cb = this.onArrive; const ok = this.goTo(world, g.x + U.rand(-10, 10), g.y + U.rand(-10, 10), this.running, cb); if (!ok) this.finishPath(); } }
        else this.stuckT = 0;
      }
    }
    finishPath() { this.path = null; this.dvx = 0; this.dvy = 0; const cb = this.onArrive; this.onArrive = null; this.goal = null; if (cb) cb(this); }
    get arrived() { return !this.path; }
    update(dt, world) {
      if (this.dead) { this.deadT += dt; this.vx = this.vy = 0; if (this.bubble) this.bubble = null; return; }
      if (this.stun > 0) { this.stun -= dt; this.dvx = 0; this.dvy = 0; }
      if (this.brain && !this.frozen) this.brain(this, dt, world);
      if (this.path && !this.frozen && this.stun <= 0) this.followPath(dt, world);
      // accelerate toward desired velocity
      const ax = this.dvx - this.vx, ay = this.dvy - this.vy; const al = Math.hypot(ax, ay);
      const maxA = this.accel * dt;
      if (al > maxA && al > 0.0001) { this.vx += ax / al * maxA; this.vy += ay / al * maxA; } else { this.vx = this.dvx; this.vy = this.dvy; }
      if (this.frozen) { this.vx = 0; this.vy = 0; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (world.map) { const c = world.map.collide(this.x, this.y, this.r); this.x = c.x; this.y = c.y; }
      if (world.bounds) { const b = world.bounds; this.x = U.clamp(this.x, b.x + this.r, b.x + b.w - this.r); this.y = U.clamp(this.y, b.y + this.r, b.y + b.h - this.r); }
      // facing
      const sp = this.spd;
      if (sp > 15 && !this.lockDir) { if (Math.abs(this.vx) > Math.abs(this.vy) * 1.1) this.dir = this.vx < 0 ? 'left' : 'right'; else if (Math.abs(this.vy) > 0) this.dir = this.vy < 0 ? 'up' : 'down'; }
      // animation
      if (this.forceAnim) { this.anim = this.forceAnim; if (this.forceT > 0) { this.forceT -= dt; if (this.forceT <= 0) this.forceAnim = null; } }
      else if (this.lie) this.anim = this.lie.anim || 'sleep';
      else this.anim = sp > 110 ? 'run' : sp > 12 ? 'walk' : (this.idleAnim || 'idle');
      const rate = this.anim === 'walk' ? sp / 70 : this.anim === 'run' ? sp / 150 : 1;
      this.animT += dt * rate;
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
      if (this.emote) { this.emote.t += dt; if (this.emote.t > this.emote.dur) this.emote = null; }
      // footsteps for player
      if (this.isPlayer && sp > 20) { this._stepT = (this._stepT || 0) + dt * (sp / 70); if (this._stepT > 0.42) { this._stepT = 0; R6.Audio.sfx('step', { vol: 0.35, gap: 0.1 }); } }
    }
    kill(o = {}) {
      this.dead = true; this.alive = false; this.deadT = 0; this.path = null; this.dvx = this.dvy = 0;
      this.setAnim('die'); this.forceT = 0; this.back = o.back != null ? o.back : Math.random() < 0.5;
      this.look = Object.assign({}, this.look, { tint: null });
      this.deathDir = this.dir === 'up' || this.dir === 'down' ? (Math.random() < 0.5 ? 'left' : 'right') : this.dir;
    }
    draw(ctx, t, zoom = 1) {
      if (!this.visible) return;
      let anim = this.anim, at = this.animT;
      const look = this.look;
      if (this.dead) {
        anim = this.deadT < 0.9 ? 'die' : 'dead'; at = this.deadT;
        look.tint = this.deadT > 0.35 ? 'dead' : this.deadT < 0.12 ? 'red' : null;
        R6.Char.drawTD(ctx, look, this.x, this.y, this.deathDir || 'right', anim, at, { scale: this.scale, zoom, back: this.back, alpha: this.alpha * this.bodyAlpha, shadowA: 0.2 });
        look.tint = null;
        return;
      }
      let dir = this.dir;
      if (this.lie) dir = 'down';
      R6.Char.drawTD(ctx, look, this.x, this.y, dir, anim, at, { scale: this.scale, zoom, expr: this.expr, alpha: this.alpha, item: this.item, highlight: this.highlight, speed: this.running ? 1 : 1 });
    }
    drawOverlay(ctx, t, zoom) {
      const hy = this.y - 52 * this.scale / 0.46 * (this.look.h || 1);
      if (this.emote && !this.dead) drawEmote(ctx, this.emote, this.x, hy - 14, zoom);
      if (this.bubble && !this.dead) drawBubble(ctx, this.bubble, this.x, hy - 8, zoom);
      if (this.label && !this.dead) {
        const s = 1 / Math.max(0.6, zoom);
        ctx.save(); ctx.translate(this.x, hy - 4); ctx.scale(s, s);
        R6.UI.text(ctx, this.label, 0, 0, { size: 12, align: 'center', color: this.labelColor || '#fff', weight: 800, stroke: 'rgba(0,0,0,.7)', strokeW: 3 });
        ctx.restore();
      }
    }
  }

  function drawBubble(ctx, b, x, y, zoom) {
    const s = 1 / Math.max(0.7, zoom);
    const a = Math.min(1, b.t * 6, (b.dur - b.t) * 4);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
    ctx.font = R6.UI.font(13, 600);
    const lines = U.wrap(ctx, b.text, 170);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, h = lines.length * 15 + 10;
    R6.UI.rrect(ctx, -w / 2, -h - 8, w, h, 6); ctx.fillStyle = 'rgba(250,248,242,.95)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(0, -2); ctx.lineTo(5, -9); ctx.fill();
    ctx.fillStyle = '#1b1b1f'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, 0, -h - 3 + i * 15));
    ctx.restore();
  }
  function drawEmote(ctx, e, x, y, zoom) {
    const s = 1 / Math.max(0.7, zoom); const k = Math.min(1, e.t * 5); const bob = Math.sin(e.t * 8) * 2;
    ctx.save(); ctx.translate(x, y - 10 + bob); ctx.scale(s * U.ease.outBack(k), s * U.ease.outBack(k));
    ctx.globalAlpha *= Math.min(1, (e.dur - e.t) * 3);
    const col = { 'O': '#3a86ff', 'X': '#ff3b5c', '!': '#ff3b5c', '?': '#3a86ff', '♥': '#ff5d8f', '#': '#ff6b35', '…': '#ddd', 'z': '#9fc2ff', '♪': '#f2c14e', '$': '#f2c14e', 'T': '#9fd4ff' }[e.icon] || '#fff';
    ctx.fillStyle = 'rgba(15,15,20,.85)'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    R6.UI.text(ctx, e.icon === 'z' ? 'zZ' : e.icon === '#' ? '💢' : e.icon === 'T' ? '😢' : e.icon, 0, 1, { size: e.icon === '#' || e.icon === 'T' ? 11 : 14, align: 'center', base: 'middle', color: col, weight: 800 });
    ctx.restore();
  }

  // ---------------- World: container for a top-down scene ----------------
  class World {
    constructor(o = {}) {
      this.map = o.map || null; this.bounds = o.bounds || null;
      this.actors = []; this.objects = []; // objects: {x,y,sy?,draw(ctx,t), solid:{x,y,w,h}}
      this.grid = new U.Grid(40); this._q = [];
      this.t = 0; this.fx = new R6.Particles(1400);
      this.sepStrength = o.sepStrength || 1;
    }
    add(a) { this.actors.push(a); return a; }
    remove(a) { const i = this.actors.indexOf(a); if (i >= 0) this.actors.splice(i, 1); }
    find(id) { return this.actors.find(a => a.id === id); }
    near(x, y, r, filter) { this.grid.query(x, y, r, this._q); return this._q.filter(a => U.dist2(a.x, a.y, x, y) <= r * r && (!filter || filter(a))); }
    update(dt) {
      this.t += dt;
      for (const a of this.actors) a.update(dt, this);
      // separation (spatial hash)
      this.grid.clear();
      for (const a of this.actors) if (a.solid && !a.dead && a.visible) this.grid.insert(a, a.x, a.y);
      const q = this._q;
      for (const a of this.actors) {
        if (!a.solid || a.dead || !a.visible) continue;
        this.grid.query(a.x, a.y, 24, q);
        for (const b of q) {
          if (b === a || b.id < a.id && b.solid) continue;
          const dx = b.x - a.x, dy = b.y - a.y; const rr = a.r + b.r; const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 0.0001) {
            const d = Math.sqrt(d2); const pen = (rr - d) * 0.5 * this.sepStrength; const nx = dx / d, ny = dy / d;
            const wa = a.pushable ? b.mass / (a.mass + b.mass) : 0, wb = b.pushable ? a.mass / (a.mass + b.mass) : 0;
            a.x -= nx * pen * wa * 2; a.y -= ny * pen * wa * 2; b.x += nx * pen * wb * 2; b.y += ny * pen * wb * 2;
            a.bumped = b; b.bumped = a;
          }
        }
      }
      if (this.map) for (const a of this.actors) if (!a.dead) { const c = this.map.collide(a.x, a.y, a.r); a.x = c.x; a.y = c.y; }
      for (const d of (this.map ? this.map.doors.values() : [])) d.t += dt;
      this.fx.update(dt);
    }
    draw(ctx, cam, extra = []) {
      const t = this.t; const zoom = cam.zoom;
      if (this.map) this.map.drawFloor(ctx, cam);
      if (this.drawFloorExtra) this.drawFloorExtra(ctx, cam, t);
      const v = cam.view(80);
      const list = [];
      for (const o of this.objects) if (o.x > v.x0 - 200 && o.x < v.x1 + 200 && o.y > v.y0 - 100 && o.y < v.y1 + 300) list.push({ y: o.sy != null ? o.sy : o.y, draw: c => o.draw(c, t) });
      for (const a of this.actors) if (a.visible && a.x > v.x0 && a.x < v.x1 && a.y > v.y0 && a.y < v.y1 + 60) list.push({ y: a.dead ? a.y - 6 : a.y, draw: c => a.draw(c, t, zoom) });
      for (const e of extra) list.push(e);
      if (this.map) this.map.renderSorted(ctx, cam, list, t);
      else { list.sort((a, b) => a.y - b.y); list.forEach(d => d.draw(ctx)); }
      this.fx.draw(ctx);
      for (const a of this.actors) if (a.visible && (a.bubble || a.emote || a.label) && a.x > v.x0 && a.x < v.x1 && a.y > v.y0 && a.y < v.y1 + 60) a.drawOverlay(ctx, t, zoom);
    }
  }

  R6.Actor = Actor;
  R6.World = World;
  R6.drawBubble = drawBubble;
})();
