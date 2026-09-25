/* ROUND 6 — tilemap.js : 3/4 top-down tile maps — collision, line of sight, A* pathfinding, y-sorted wall rendering */
'use strict';
(function () {
  const U = R6.U;
  const T = { FLOOR: 0, WALL: 1, VOID: 2, DOOR: 3, LOW: 4, OPEN: 5 };

  // wall palettes (top, face, faceDark, line)
  const WSTYLE = [
    { top: '#c9c4b8', face: '#8f8b82', faceD: '#6f6b64', line: '#a8a399' },       // 0 concrete
    { top: '#e889a4', face: '#c45f7c', faceD: '#9e4862', line: '#d9728f' },       // 1 pastel pink
    { top: '#7fbcd6', face: '#4f8fad', faceD: '#3d7390', line: '#68a8c4' },       // 2 pastel blue
    { top: '#ecc85e', face: '#c4a03e', faceD: '#9e8030', line: '#dbb44e' },       // 3 pastel yellow
    { top: '#8fc486', face: '#5f9a56', faceD: '#4a7d43', line: '#78b06f' },       // 4 pastel green
    { top: '#3a3d45', face: '#23252b', faceD: '#18191d', line: '#2e3037' },       // 5 industrial dark
    { top: '#e8e6e0', face: '#b9b6ae', faceD: '#9b988f', line: '#d0cdc5' },       // 6 white tile (dorm)
    { top: '#6f5e4c', face: '#4e4135', faceD: '#3a3028', line: '#5e5042' },       // 7 wood/brown
    { top: '#2c3b52', face: '#1c2638', faceD: '#141b28', line: '#26344a' },       // 8 night blue
  ];

  class TileMap {
    constructor(w, h, ts = 32) {
      this.w = w; this.h = h; this.ts = ts; this.wallH = 26;
      this.g = new Uint8Array(w * h);
      this.ws = new Uint8Array(w * h);      // wall style
      this.fs = new Uint8Array(w * h);      // floor style
      this.doors = new Map();                // idx -> door
      this.floorCv = null;
      this.floorPainter = null;
      this.pw = w * ts; this.ph = h * ts;
    }
    idx(tx, ty) { return ty * this.w + tx; }
    inb(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
    get(tx, ty) { return this.inb(tx, ty) ? this.g[ty * this.w + tx] : T.WALL; }
    set(tx, ty, v, style) { if (!this.inb(tx, ty)) return; const i = ty * this.w + tx; this.g[i] = v; if (style != null) { if (v === T.WALL) this.ws[i] = style; else this.fs[i] = style; } }
    fill(x0, y0, x1, y1, v, style) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, v, style); }
    rect(x0, y0, x1, y1, v, style) { for (let x = x0; x <= x1; x++) { this.set(x, y0, v, style); this.set(x, y1, v, style); } for (let y = y0; y <= y1; y++) { this.set(x0, y, v, style); this.set(x1, y, v, style); } }
    addDoor(tx, ty, o = {}) {
      const d = Object.assign({ tx, ty, open: false, locked: false, key: null, t: 0, horiz: true, id: this.doors.size }, o);
      this.set(tx, ty, d.open ? T.OPEN : T.DOOR); this.doors.set(this.idx(tx, ty), d); return d;
    }
    setDoor(d, open) { if (d.open === open) return; d.open = open; this.g[this.idx(d.tx, d.ty)] = open ? T.OPEN : T.DOOR; d.t = 0; }
    doorAt(tx, ty) { return this.doors.get(this.idx(tx, ty)); }
    solidT(tx, ty) { const v = this.get(tx, ty); return v === T.WALL || v === T.DOOR || v === T.LOW || v === T.VOID; }
    opaqueT(tx, ty) { const v = this.get(tx, ty); return v === T.WALL || v === T.DOOR; }
    solidAt(x, y) { return this.solidT(Math.floor(x / this.ts), Math.floor(y / this.ts)); }
    walkT(tx, ty) { return !this.solidT(tx, ty); }
    center(tx, ty) { return { x: (tx + 0.5) * this.ts, y: (ty + 0.5) * this.ts }; }
    tileOf(x, y) { return { tx: Math.floor(x / this.ts), ty: Math.floor(y / this.ts) }; }

    // circle vs solid tiles: returns corrected position
    collide(x, y, r) {
      const ts = this.ts;
      const tx0 = Math.floor((x - r) / ts), tx1 = Math.floor((x + r) / ts), ty0 = Math.floor((y - r) / ts), ty1 = Math.floor((y + r) / ts);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (!this.solidT(tx, ty)) continue;
        const rx = tx * ts, ry = ty * ts;
        const cx = U.clamp(x, rx, rx + ts), cy = U.clamp(y, ry, ry + ts);
        let dx = x - cx, dy = y - cy; const d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          if (d2 > 0.0001) { const d = Math.sqrt(d2); x += dx / d * (r - d); y += dy / d * (r - d); }
          else { // center inside tile: push out along smallest axis
            const l = x - rx, rr = rx + ts - x, t = y - ry, b = ry + ts - y; const m = Math.min(l, rr, t, b);
            if (m === l) x = rx - r; else if (m === rr) x = rx + ts + r; else if (m === t) y = ry - r; else y = ry + ts + r;
          }
        }
      }
      return { x, y };
    }
    // DDA line of sight against opaque tiles
    los(x0, y0, x1, y1, opaqueOnly = true) {
      const ts = this.ts; let tx = Math.floor(x0 / ts), ty = Math.floor(y0 / ts); const ex = Math.floor(x1 / ts), ey = Math.floor(y1 / ts);
      const dx = x1 - x0, dy = y1 - y0; const stepX = Math.sign(dx), stepY = Math.sign(dy);
      const tDX = stepX ? Math.abs(ts / dx) : Infinity, tDY = stepY ? Math.abs(ts / dy) : Infinity;
      let tMX = stepX > 0 ? ((tx + 1) * ts - x0) / dx : stepX < 0 ? (tx * ts - x0) / dx : Infinity;
      let tMY = stepY > 0 ? ((ty + 1) * ts - y0) / dy : stepY < 0 ? (ty * ts - y0) / dy : Infinity;
      let n = 0;
      while (!(tx === ex && ty === ey) && n++ < 400) {
        if (tMX < tMY) { tMX += tDX; tx += stepX; } else { tMY += tDY; ty += stepY; }
        if (opaqueOnly ? this.opaqueT(tx, ty) : this.solidT(tx, ty)) return false;
      }
      return true;
    }
    walkLine(x0, y0, x1, y1, r = 8) {
      // conservative: sample along segment with radius offsets
      const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / (this.ts * 0.4));
      for (let i = 0; i <= n; i++) { const k = i / Math.max(1, n); const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; if (this.solidAt(x - r, y - r) || this.solidAt(x + r, y - r) || this.solidAt(x - r, y + r) || this.solidAt(x + r, y + r)) return false; }
      return true;
    }
    nearestFree(x, y) {
      const { tx, ty } = this.tileOf(x, y);
      if (this.walkT(tx, ty)) return { x, y };
      for (let r = 1; r < 12; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) { if (Math.abs(ox) !== r && Math.abs(oy) !== r) continue; if (this.walkT(tx + ox, ty + oy)) return this.center(tx + ox, ty + oy); }
      return { x, y };
    }
    // A* (8-dir, no corner cutting). returns array of {x,y} world points or null
    findPath(sx, sy, gx, gy, maxIter = 6000, opts = {}) {
      const s = this.tileOf(sx, sy), g = this.tileOf(gx, gy);
      if (!this.inb(g.tx, g.ty)) return null;
      const passDoors = opts.doors; // treat closed unlocked doors as passable
      const walk = (tx, ty) => { const v = this.get(tx, ty); if (v === T.DOOR && passDoors) { const d = this.doorAt(tx, ty); return d && (!d.locked || (opts.key && d.key === opts.key)); } return v !== T.WALL && v !== T.DOOR && v !== T.LOW && v !== T.VOID; };
      if (!walk(g.tx, g.ty)) { const nf = this.nearestFree(gx, gy); const t2 = this.tileOf(nf.x, nf.y); g.tx = t2.tx; g.ty = t2.ty; }
      const W = this.w, N = this.w * this.h;
      const start = s.ty * W + s.tx, goal = g.ty * W + g.tx;
      if (start === goal) return [{ x: gx, y: gy }];
      const gS = this._gS || (this._gS = new Float32Array(N)); const from = this._from || (this._from = new Int32Array(N)); const stamp = this._stamp || (this._stamp = new Uint32Array(N)); const closed = this._closed || (this._closed = new Uint32Array(N));
      this._run = (this._run || 0) + 1; const run = this._run;
      const heap = []; const push = (i, f) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (; ;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      const h = (i) => { const x = i % W, y = (i / W) | 0; const dx = Math.abs(x - g.tx), dy = Math.abs(y - g.ty); return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); };
      stamp[start] = run; gS[start] = 0; from[start] = -1; push(start, h(start));
      let it = 0, found = false;
      const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
      while (heap.length && it++ < maxIter) {
        const [, cur] = pop();
        if (closed[cur] === run) continue; closed[cur] = run;
        if (cur === goal) { found = true; break; }
        const cx = cur % W, cy = (cur / W) | 0;
        for (const [dx, dy, c] of DIRS) {
          const nx = cx + dx, ny = cy + dy; if (!this.inb(nx, ny) || !walk(nx, ny)) continue;
          if (dx && dy && (!walk(cx + dx, cy) || !walk(cx, cy + dy))) continue;
          const ni = ny * W + nx; if (closed[ni] === run) continue;
          const ng = gS[cur] + c;
          if (stamp[ni] !== run || ng < gS[ni]) { stamp[ni] = run; gS[ni] = ng; from[ni] = cur; push(ni, ng + h(ni)); }
        }
      }
      if (!found) return null;
      const pts = []; let c = goal; let guard = 0;
      while (c !== -1 && guard++ < 5000) { pts.push(this.center(c % W, (c / W) | 0)); c = from[c]; }
      pts.reverse();
      if (pts.length) pts[pts.length - 1] = { x: gx, y: gy };
      // string pulling
      const out = [pts[0]]; let a = 0;
      for (let i = 2; i < pts.length; i++) { if (!this.walkLine(pts[a].x, pts[a].y, pts[i].x, pts[i].y, 7)) { out.push(pts[i - 1]); a = i - 1; } }
      out.push(pts[pts.length - 1]);
      out.shift();
      return out;
    }

    // ---------- rendering ----------
    buildFloor(painter) {
      this.floorPainter = painter || this.floorPainter;
      const cv = document.createElement('canvas'); cv.width = this.pw; cv.height = this.ph;
      const c = cv.getContext('2d');
      c.fillStyle = '#111'; c.fillRect(0, 0, cv.width, cv.height);
      for (let ty = 0; ty < this.h; ty++) for (let tx = 0; tx < this.w; tx++) {
        const v = this.g[ty * this.w + tx];
        if (v === T.WALL) continue;
        this.floorPainter(c, tx * this.ts, ty * this.ts, this.ts, this.fs[ty * this.w + tx], tx, ty, v);
      }
      // wall contact shadows on floor
      c.fillStyle = 'rgba(0,0,0,.22)';
      for (let ty = 1; ty < this.h; ty++) for (let tx = 0; tx < this.w; tx++) if (this.g[ty * this.w + tx] !== T.WALL && this.g[(ty - 1) * this.w + tx] === T.WALL) c.fillRect(tx * this.ts, ty * this.ts, this.ts, 7);
      c.fillStyle = 'rgba(0,0,0,.12)';
      for (let ty = 0; ty < this.h; ty++) for (let tx = 1; tx < this.w; tx++) if (this.g[ty * this.w + tx] !== T.WALL && this.g[ty * this.w + tx - 1] === T.WALL) c.fillRect(tx * this.ts, ty * this.ts, 5, this.ts);
      this.floorCv = cv;
    }
    drawFloor(ctx, cam) {
      if (!this.floorCv) return;
      const v = cam.view(40);
      const sx = Math.max(0, Math.floor(v.x0)), sy = Math.max(0, Math.floor(v.y0));
      const ex = Math.min(this.pw, Math.ceil(v.x1)), ey = Math.min(this.ph, Math.ceil(v.y1));
      if (ex > sx && ey > sy) ctx.drawImage(this.floorCv, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
    }
    // draw a single row of walls/doors (called in y-sorted order)
    drawWallRow(ctx, ty, tx0, tx1, t) {
      const ts = this.ts, H = this.wallH;
      for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * this.w + tx; const v = this.g[i];
        if (v === T.WALL) {
          const S = WSTYLE[this.ws[i]] || WSTYLE[0];
          const x = tx * ts, y = ty * ts;
          const below = ty + 1 < this.h ? this.g[i + this.w] : T.WALL;
          if (below !== T.WALL) {
            ctx.fillStyle = S.face; ctx.fillRect(x, y + ts - H, ts, H);
            ctx.fillStyle = S.faceD; ctx.fillRect(x, y + ts - 4, ts, 4);
            ctx.fillStyle = S.line; ctx.fillRect(x, y + ts - H, ts, 2);
          }
          ctx.fillStyle = S.top; ctx.fillRect(x, y - H, ts, ts);
          // top edge highlights where neighbor isn't wall
          ctx.fillStyle = 'rgba(255,255,255,.12)';
          if (ty === 0 || this.g[i - this.w] !== T.WALL) ctx.fillRect(x, y - H, ts, 2);
          ctx.fillStyle = 'rgba(0,0,0,.12)';
          if (tx > 0 && this.g[i - 1] !== T.WALL) ctx.fillRect(x, y - H, 2, ts);
          if (tx < this.w - 1 && this.g[i + 1] !== T.WALL) ctx.fillRect(x + ts - 2, y - H, 2, ts);
        } else if (v === T.DOOR || v === T.OPEN) {
          const d = this.doors.get(i); if (!d) continue;
          this.drawDoor(ctx, d, t);
        }
      }
    }
    drawDoor(ctx, d, t) {
      const ts = this.ts, H = this.wallH, x = d.tx * ts, y = d.ty * ts;
      const col = d.color || '#7a5a3a';
      if (d.horiz) {
        // frame
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(x - 2, y + ts - H - 8, 4, H + 8); ctx.fillRect(x + ts - 2, y + ts - H - 8, 4, H + 8); ctx.fillRect(x - 2, y + ts - H - 10, ts + 4, 4);
        if (!d.open) {
          ctx.fillStyle = col; ctx.fillRect(x + 2, y + ts - H - 6, ts - 4, H + 6);
          ctx.fillStyle = U.shade(col, -0.25); ctx.fillRect(x + 2, y + ts - 5, ts - 4, 3);
          ctx.fillStyle = '#e8c24a'; ctx.fillRect(x + ts - 9, y + ts - H / 2 - 2, 3, 4);
          if (d.key) R6.UI.shapeIcon(ctx, d.key, x + ts / 2, y + ts - H / 2 - 4, 5, '#fff', 1.6);
          if (d.locked && !d.key) { ctx.fillStyle = '#ff3b5c'; ctx.fillRect(x + ts / 2 - 2, y + ts - H / 2 - 3, 4, 5); }
        } else {
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2, y + ts - H - 6, ts - 4, H + 6);
          ctx.fillStyle = col; ctx.fillRect(x + 2, y + ts - H - 6, 5, H + 6);
        }
      } else {
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(x + ts / 2 - 3, y - H, 6, ts + 2);
        if (!d.open) { ctx.fillStyle = col; ctx.fillRect(x + ts / 2 - 5, y - H + 2, 10, ts); if (d.key) R6.UI.shapeIcon(ctx, d.key, x + ts / 2, y - H / 2 + 6, 4, '#fff', 1.4); }
      }
    }
    // y-sorted render: drawables = [{y, draw(ctx)}]
    renderSorted(ctx, cam, drawables, t) {
      const v = cam.view(80); const ts = this.ts;
      const ty0 = Math.max(0, Math.floor(v.y0 / ts)), ty1 = Math.min(this.h - 1, Math.floor((v.y1 + this.wallH) / ts));
      const tx0 = Math.max(0, Math.floor(v.x0 / ts)), tx1 = Math.min(this.w - 1, Math.floor(v.x1 / ts));
      drawables.sort((a, b) => a.y - b.y);
      let k = 0;
      for (let ty = ty0; ty <= ty1; ty++) {
        const rowY = (ty + 1) * ts;
        while (k < drawables.length && drawables[k].y < rowY - 0.5) { drawables[k].draw(ctx); k++; }
        this.drawWallRow(ctx, ty, tx0, tx1, t);
      }
      while (k < drawables.length) { drawables[k].draw(ctx); k++; }
    }
  }

  // --------- common floor painters ----------
  const Floors = {
    dorm(c, x, y, ts, s, tx, ty, v) {
      const base = s === 1 ? '#d8d5cc' : s === 2 ? '#8e9aa3' : s === 3 ? '#b7a58a' : '#cfcbc0';
      c.fillStyle = (tx + ty) % 2 ? base : U.shade(base, -0.04); c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(x, y, ts, 1); c.fillRect(x, y, 1, ts);
      if (v === T.VOID) { c.fillStyle = '#050506'; c.fillRect(x, y, ts, ts); }
    },
    pastel(c, x, y, ts, s, tx, ty, v) {
      const cols = ['#f0e6d2', '#f6c9d4', '#c9e6f0', '#f6e7ae', '#cfe8c6', '#e0d6f2'];
      c.fillStyle = cols[s % cols.length]; c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(x, y + ts - 1, ts, 1);
      if (v === T.VOID) { c.fillStyle = '#050506'; c.fillRect(x, y, ts, ts); }
    },
    maze(c, x, y, ts, s, tx, ty, v) {
      const cols = ['#e9e2d0', '#f2c7cf', '#c4e2ec', '#f1e2a8', '#cde6c3'];
      c.fillStyle = cols[s % cols.length]; c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(255,255,255,.18)'; if ((tx + ty) % 2) c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(x, y, ts, 1); c.fillRect(x, y, 1, ts);
    },
    industrial(c, x, y, ts, s, tx, ty, v) {
      c.fillStyle = s === 1 ? '#3c4048' : s === 2 ? '#2a2d33' : '#4a4e56'; c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(x + 2, y + 2, ts - 4, 1);
      c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x, y + ts - 1, ts, 1); c.fillRect(x + ts - 1, y, 1, ts);
      if (s === 3) { c.fillStyle = '#d6b640'; for (let i = 0; i < ts; i += 8) c.fillRect(x + i, y + ts / 2 - 2, 4, 4); }
      if (v === T.VOID) { c.fillStyle = '#030304'; c.fillRect(x, y, ts, ts); }
    },
    sand(c, x, y, ts, s, tx, ty, v) {
      const r = (Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
      c.fillStyle = s === 1 ? '#c9a66b' : U.mix('#dcc08a', '#cfb07a', Math.abs(r)); c.fillRect(x, y, ts, ts);
      c.fillStyle = 'rgba(120,90,40,.12)'; c.fillRect(x + (Math.abs(r) * ts) | 0, y + ((Math.abs(r) * 97) % ts) | 0, 2, 2);
    },
  };

  R6.TileMap = TileMap;
  R6.T = T;
  R6.WSTYLE = WSTYLE;
  R6.Floors = Floors;
})();
