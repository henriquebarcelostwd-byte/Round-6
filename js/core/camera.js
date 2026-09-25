/* ROUND 6 — camera.js : smooth follow, bounded cinematic camera with zoom, tweens and shake */
'use strict';
(function () {
  const U = R6.U;
  class Camera {
    constructor(opts = {}) {
      this.x = opts.x || 0; this.y = opts.y || 0; this.zoom = opts.zoom || 1;
      this.bounds = opts.bounds || null; // {x,y,w,h}
      this.tx = this.x; this.ty = this.y; this.tzoom = this.zoom;
      this.followRate = opts.followRate || 6;
      this.zoomRate = 4;
      this.tween = null;
      this.shakeT = 0; this.shakeMag = 0; this.sx = 0; this.sy = 0;
      this.lookAhead = { x: 0, y: 0 };
      this.minZoom = opts.minZoom || 0.2; this.maxZoom = opts.maxZoom || 4;
      this.W = R6.W; this.H = R6.H;
      this.rot = 0;
    }
    set(x, y, zoom) { this.x = this.tx = x; this.y = this.ty = y; if (zoom) this.zoom = this.tzoom = zoom; this.tween = null; this.clamp(); return this; }
    follow(x, y, zoom) { this.tx = x; this.ty = y; if (zoom) this.tzoom = zoom; }
    to(x, y, zoom, dur = 1, easeFn = U.ease.inOutCubic) {
      this.tween = { x0: this.x, y0: this.y, z0: this.zoom, x1: x != null ? x : this.x, y1: y != null ? y : this.y, z1: zoom || this.zoom, t: 0, dur: Math.max(0.001, dur), ease: easeFn };
      this.tx = this.tween.x1; this.ty = this.tween.y1; this.tzoom = this.tween.z1;
    }
    get busy() { return !!this.tween; }
    shake(mag, dur = 0.3) {
      if (R6.Save && !R6.Save.settings.shake) mag *= 0.15;
      this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, dur);
    }
    update(dt) {
      if (this.tween) {
        const tw = this.tween; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); const e = tw.ease(k);
        this.x = U.lerp(tw.x0, tw.x1, e); this.y = U.lerp(tw.y0, tw.y1, e); this.zoom = U.lerp(tw.z0, tw.z1, e);
        if (k >= 1) this.tween = null;
      } else {
        this.x = U.damp(this.x, this.tx, this.followRate, dt);
        this.y = U.damp(this.y, this.ty, this.followRate, dt);
        this.zoom = U.damp(this.zoom, this.tzoom, this.zoomRate, dt);
      }
      this.zoom = U.clamp(this.zoom, this.minZoom, this.maxZoom);
      this.clamp();
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const m = this.shakeMag * Math.min(1, this.shakeT * 4);
        this.sx = (Math.random() * 2 - 1) * m; this.sy = (Math.random() * 2 - 1) * m;
        if (this.shakeT <= 0) { this.shakeMag = 0; this.sx = this.sy = 0; }
      }
    }
    clamp() {
      const b = this.bounds; if (!b) return;
      const hw = this.W / 2 / this.zoom, hh = this.H / 2 / this.zoom;
      if (b.w <= hw * 2) this.x = b.x + b.w / 2; else this.x = U.clamp(this.x, b.x + hw, b.x + b.w - hw);
      if (b.h <= hh * 2) this.y = b.y + b.h / 2; else this.y = U.clamp(this.y, b.y + hh, b.y + b.h - hh);
    }
    // minimal zoom so the view never exceeds bounds (prevents showing outside the map)
    fitZoom() { const b = this.bounds; if (!b) return this.minZoom; return Math.max(this.W / b.w, this.H / b.h); }
    begin(ctx) {
      ctx.save();
      ctx.translate(this.W / 2 + this.sx, this.H / 2 + this.sy);
      if (this.rot) ctx.rotate(this.rot);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    }
    end(ctx) { ctx.restore(); }
    toScreen(wx, wy) { return { x: (wx - this.x) * this.zoom + this.W / 2, y: (wy - this.y) * this.zoom + this.H / 2 }; }
    toWorld(sx, sy) { return { x: (sx - this.W / 2) / this.zoom + this.x, y: (sy - this.H / 2) / this.zoom + this.y }; }
    view(pad = 0) {
      const hw = this.W / 2 / this.zoom + pad, hh = this.H / 2 / this.zoom + pad;
      return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
    }
    visible(x, y, r = 60) { const v = this.view(r); return x >= v.x0 && x <= v.x1 && y >= v.y0 && y <= v.y1; }
  }
  R6.Camera = Camera;
})();
