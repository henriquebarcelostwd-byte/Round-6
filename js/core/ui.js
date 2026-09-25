/* ROUND 6 — ui.js : text, panels, buttons, menus, banners, toasts, logo, shape icons */
'use strict';
(function () {
  const U = R6.U;
  const FAM = {
    title: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
    body: "'Barlow Semi Condensed', 'Arial Narrow', Arial, sans-serif",
    mono: "'Share Tech Mono', 'Consolas', monospace",
  };
  const THEMES = {
    ui_default: { accent: '#e8336d', accent2: '#2a9d8f', gold: '#f2c14e', panel: 'rgba(9,11,16,0.88)', line: 'rgba(255,255,255,0.12)', text: '#f2efe9', dim: '#9aa3ad' },
    ui_teal: { accent: '#2ec4b6', accent2: '#e8336d', gold: '#f2c14e', panel: 'rgba(4,20,22,0.9)', line: 'rgba(46,196,182,0.25)', text: '#eafffb', dim: '#8fb8b3' },
    ui_gold: { accent: '#f2c14e', accent2: '#e8336d', gold: '#ffe08a', panel: 'rgba(20,15,5,0.9)', line: 'rgba(242,193,78,0.3)', text: '#fff6e0', dim: '#b8a57a' },
    ui_noir: { accent: '#ffffff', accent2: '#888888', gold: '#dddddd', panel: 'rgba(0,0,0,0.92)', line: 'rgba(255,255,255,0.2)', text: '#ffffff', dim: '#8a8a8a' },
    ui_neon: { accent: '#ff2bd6', accent2: '#00e5ff', gold: '#fff04a', panel: 'rgba(12,4,24,0.9)', line: 'rgba(255,43,214,0.3)', text: '#f6eaff', dim: '#a18fb8' },
  };

  const UI = {
    FAM,
    THEMES,
    get T() { const id = R6.Save && R6.Save.meta ? R6.Save.meta.equipped.ui : 'ui_default'; return THEMES[id] || THEMES.ui_default; },
    font(size, weight = 600, fam = 'body') { return `${weight} ${size}px ${FAM[fam] || fam}`; },
    text(ctx, str, x, y, o = {}) {
      ctx.save();
      ctx.font = UI.font(o.size || 18, o.weight || (o.fam === 'title' ? 400 : 600), o.fam || 'body');
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.base || 'alphabetic';
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      if (o.spacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = o.spacing + 'px';
      if (o.shadow) { ctx.shadowColor = o.shadow === true ? 'rgba(0,0,0,.8)' : o.shadow; ctx.shadowBlur = o.shadowBlur || 6; ctx.shadowOffsetY = o.shadowY != null ? o.shadowY : 2; }
      if (o.stroke) { ctx.lineWidth = o.strokeW || 4; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y, o.maxW); }
      ctx.fillStyle = o.color || UI.T.text;
      ctx.fillText(str, x, y, o.maxW);
      ctx.restore();
    },
    measure(ctx, str, size, weight = 600, fam = 'body') { ctx.save(); ctx.font = UI.font(size, weight, fam); const w = ctx.measureText(str).width; ctx.restore(); return w; },
    para(ctx, str, x, y, maxW, o = {}) {
      ctx.save(); ctx.font = UI.font(o.size || 18, o.weight || 500, o.fam || 'body');
      const lines = U.wrap(ctx, str, maxW); const lh = o.lh || (o.size || 18) * 1.3;
      ctx.fillStyle = o.color || UI.T.text; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1; }
      const maxLines = o.maxLines || 99;
      lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(l, x, y + i * lh));
      ctx.restore();
      return Math.min(lines.length, maxLines) * lh;
    },
    rrect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    },
    panel(ctx, x, y, w, h, o = {}) {
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; }
      UI.rrect(ctx, x, y, w, h, o.r != null ? o.r : 6);
      ctx.fillStyle = o.fill || UI.T.panel; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = o.lw || 1; ctx.strokeStyle = o.stroke || UI.T.line; ctx.stroke();
      if (o.accent) { ctx.fillStyle = o.accent === true ? UI.T.accent : o.accent; ctx.fillRect(x, y + 6, 3, h - 12); }
      ctx.restore();
    },
    button(ctx, x, y, w, h, label, o = {}) {
      const T = UI.T; const hov = o.hover, act = o.active, dis = o.disabled;
      ctx.save();
      const k = o.anim || 0;
      UI.rrect(ctx, x, y, w, h, o.r != null ? o.r : 4);
      const base = o.color || T.accent;
      ctx.fillStyle = dis ? 'rgba(40,44,50,.6)' : hov ? U.rgba(base, 0.95) : o.fill || 'rgba(14,17,24,.82)';
      ctx.fill();
      ctx.lineWidth = hov ? 2 : 1; ctx.strokeStyle = dis ? 'rgba(255,255,255,.08)' : hov ? '#fff' : U.rgba(base, 0.55); ctx.stroke();
      if (hov && !dis) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, w * (0.3 + 0.7 * Math.min(1, k)), 2); }
      const tc = dis ? '#666b73' : hov ? '#fff' : o.textColor || T.text;
      const sz = o.size || 20;
      if (o.icon) { UI.shapeIcon(ctx, o.icon, x + 22, y + h / 2, sz * 0.42, hov ? '#fff' : base, 2.5); }
      UI.text(ctx, label, o.icon ? x + 42 : o.align === 'left' ? x + 16 : x + w / 2, y + h / 2 + 1, { size: sz, color: tc, align: o.icon || o.align === 'left' ? 'left' : 'center', base: 'middle', weight: o.weight || 700, fam: o.fam || 'body', maxW: w - 20 });
      if (o.sub) UI.text(ctx, o.sub, x + w - 14, y + h / 2 + 1, { size: 14, color: hov ? '#fff' : T.dim, align: 'right', base: 'middle', weight: 600 });
      ctx.restore();
    },
    shapeIcon(ctx, kind, x, y, r, color, lw = 3, fill = false) {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (kind === 'circle') ctx.arc(x, y, r, 0, U.TAU);
      else if (kind === 'triangle') { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.95, y + r * 0.72); ctx.lineTo(x - r * 0.95, y + r * 0.72); ctx.closePath(); }
      else if (kind === 'square') ctx.rect(x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64);
      else if (kind === 'star') { for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
      else if (kind === 'umbrella') {
        ctx.arc(x, y - r * 0.05, r, Math.PI, 0); ctx.quadraticCurveTo(x + r * 0.75, y - r * 0.25, x + r * 0.5, y); ctx.quadraticCurveTo(x + r * 0.25, y - r * 0.25, x, y);
        ctx.quadraticCurveTo(x - r * 0.25, y - r * 0.25, x - r * 0.5, y); ctx.quadraticCurveTo(x - r * 0.75, y - r * 0.25, x - r, y - r * 0.05);
        ctx.moveTo(x, y); ctx.lineTo(x, y + r * 0.75); ctx.arc(x + r * 0.18, y + r * 0.75, r * 0.18, Math.PI, 0, true);
      }
      else if (kind === 'o') ctx.arc(x, y, r, 0, U.TAU);
      else if (kind === 'x') { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); }
      if (fill) ctx.fill(); else ctx.stroke();
      ctx.restore();
    },
    // stylized title logo: R [circle] U N D  6 with shapes
    logo(ctx, x, y, size, t = 0, o = {}) {
      ctx.save();
      const col = o.color || '#e8336d';
      ctx.translate(x, y);
      const letters = ['R', 'O', 'U', 'N', 'D'];
      ctx.font = `400 ${size}px ${FAM.title}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const ws = letters.map(l => l === 'O' ? size * 0.66 : ctx.measureText(l).width + size * 0.06);
      const gap = size * 0.52;
      const total = ws.reduce((a, b) => a + b, 0) + gap * 2.2;
      let cx = -total / 2;
      ctx.shadowColor = U.rgba(col, 0.8); ctx.shadowBlur = 24 + Math.sin(t * 2) * 6;
      for (let i = 0; i < letters.length; i++) {
        const lx = cx + ws[i] / 2;
        if (letters[i] === 'O') UI.shapeIcon(ctx, 'circle', lx, 0, size * 0.3, col, size * 0.075);
        else { ctx.fillStyle = '#f5f1ea'; ctx.fillText(letters[i], lx, size * 0.04); }
        cx += ws[i];
      }
      cx += gap * 0.35;
      // "6" framed by triangle and square
      ctx.fillStyle = col; ctx.font = `400 ${size * 1.25}px ${FAM.title}`; ctx.fillText('6', cx + gap * 0.25, size * 0.02);
      UI.shapeIcon(ctx, 'triangle', cx + gap * 1.15, -size * 0.25, size * 0.14, '#f5f1ea', size * 0.035);
      UI.shapeIcon(ctx, 'square', cx + gap * 1.15, size * 0.22, size * 0.12, '#f5f1ea', size * 0.035);
      ctx.restore();
      if (o.sub) UI.text(ctx, o.sub, x, y + size * 0.72, { size: size * 0.18, align: 'center', color: '#cfc9bf', spacing: size * 0.05, weight: 600 });
    },
    vignette(ctx, strength = 0.6, color = '#000') {
      const g = ctx.createRadialGradient(R6.W / 2, R6.H / 2, R6.H * 0.3, R6.W / 2, R6.H / 2, R6.W * 0.72);
      g.addColorStop(0, U.rgba(color, 0)); g.addColorStop(1, U.rgba(color, strength));
      ctx.fillStyle = g; ctx.fillRect(0, 0, R6.W, R6.H);
    },
    letterbox(ctx, k) {
      if (k <= 0) return; const h = 72 * k;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R6.W, h); ctx.fillRect(0, R6.H - h, R6.W, h);
    },
    keyHint(ctx, key, label, x, y, o = {}) {
      ctx.save();
      ctx.font = UI.font(14, 800); const kw = Math.max(24, ctx.measureText(key).width + 12);
      const a = o.alpha != null ? o.alpha : 1; ctx.globalAlpha *= a;
      UI.rrect(ctx, x, y - 12, kw, 24, 4); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key, x + kw / 2, y + 1);
      ctx.font = UI.font(15, 600); ctx.textAlign = 'left'; ctx.fillStyle = o.color || '#e9e6e0';
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4;
      ctx.fillText(label, x + kw + 7, y + 1);
      const w = kw + 7 + ctx.measureText(label).width;
      ctx.restore();
      return w;
    },
    hints(ctx, list, x, y, o = {}) {
      let cx = x;
      if (o.align === 'center') {
        let tw = 0; ctx.save(); for (const [k, l] of list) { ctx.font = UI.font(14, 800); const kw = Math.max(24, ctx.measureText(k).width + 12); ctx.font = UI.font(15, 600); tw += kw + 7 + ctx.measureText(l).width + 22; } ctx.restore();
        cx = x - tw / 2;
      }
      for (const [k, l] of list) cx += UI.keyHint(ctx, k, l, cx, y, o) + 22;
    },
    bar(ctx, x, y, w, h, v, o = {}) {
      ctx.save();
      UI.rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = o.bg || 'rgba(255,255,255,.1)'; ctx.fill();
      const vv = U.clamp(v, 0, 1);
      if (vv > 0) { UI.rrect(ctx, x, y, Math.max(h, w * vv), h, h / 2); ctx.fillStyle = o.color || UI.T.accent; ctx.fill(); }
      if (o.mark != null) { ctx.fillStyle = '#fff'; ctx.fillRect(x + w * o.mark - 1, y - 2, 2, h + 4); }
      if (o.zone) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + w * o.zone[0], y, w * (o.zone[1] - o.zone[0]), h); }
      ctx.restore();
    },
  };

  // ---- Menu: keyboard + mouse navigable vertical list ----
  class Menu {
    constructor(items, o = {}) {
      this.items = items; this.i = o.start || 0; this.o = o; this.anim = 0; this.rects = [];
      while (this.items[this.i] && this.items[this.i].disabled) this.i++;
      if (this.i >= this.items.length) this.i = 0;
    }
    move(d) {
      const n = this.items.length; if (!n) return;
      for (let k = 0; k < n; k++) { this.i = (this.i + d + n) % n; if (!this.items[this.i].disabled && !this.items[this.i].sep) break; }
      this.anim = 0; R6.Audio.sfx('hover');
    }
    update(dt) {
      this.anim += dt * 4;
      const I = R6.Input; const horiz = this.o.horizontal;
      if (I.actP(horiz ? 'left' : 'up')) this.move(-1);
      if (I.actP(horiz ? 'right' : 'down')) this.move(1);
      const m = I.mouse;
      if (m.moved || m.pressed) {
        for (let k = 0; k < this.rects.length; k++) {
          const r = this.rects[k]; if (!r) continue;
          if (U.rectHit(m.x, m.y, r) && !this.items[k].disabled && !this.items[k].sep) {
            if (this.i !== k) { this.i = k; this.anim = 0; R6.Audio.sfx('hover'); }
            if (m.pressed) return this.choose();
          }
        }
      }
      if (I.actP('confirm')) return this.choose();
      if (this.o.onBack && I.actP('back')) { R6.Audio.sfx('back'); this.o.onBack(); return null; }
      const it = this.items[this.i];
      if (it && it.onLeft && I.actP(horiz ? 'up' : 'left')) { it.onLeft(); R6.Audio.sfx('hover'); }
      if (it && it.onRight && I.actP(horiz ? 'down' : 'right')) { it.onRight(); R6.Audio.sfx('hover'); }
      return null;
    }
    choose() {
      const it = this.items[this.i]; if (!it || it.disabled) { R6.Audio.sfx('error'); return null; }
      R6.Audio.sfx('confirm');
      if (it.action) it.action(it);
      return it;
    }
    draw(ctx, x, y, w, h, gap = 8, o = {}) {
      this.rects = [];
      let cy = y;
      this.items.forEach((it, k) => {
        if (it.sep) { this.rects.push(null); cy += h * 0.4; return; }
        const r = this.o.horizontal ? { x: x + k * (w + gap), y, w, h } : { x, y: cy, w, h };
        this.rects.push(r);
        const hov = k === this.i;
        const label = typeof it.label === 'function' ? it.label() : it.label;
        const sub = typeof it.sub === 'function' ? it.sub() : it.sub;
        UI.button(ctx, r.x + (hov && !this.o.horizontal ? 8 * Math.min(1, this.anim) : 0), r.y, r.w, r.h, label, { hover: hov, disabled: it.disabled, sub, icon: it.icon, size: o.size || 20, anim: this.anim, color: it.color, align: o.align });
        if (!this.o.horizontal) cy += h + gap;
      });
    }
  }
  UI.Menu = Menu;

  // ---- Banner (GAME PASSED / ELIMINATED / titles) ----
  const Banner = {
    list: [],
    show(title, sub, o = {}) { Banner.list.push({ title, sub, t: 0, dur: o.dur || 2.6, color: o.color || '#e8336d', style: o.style || 'info', big: o.big }); },
    clear() { Banner.list.length = 0; },
    update(dt) { if (Banner.list.length) { const b = Banner.list[0]; b.t += dt; if (b.t >= b.dur) Banner.list.shift(); } },
    get active() { return Banner.list.length > 0; },
    draw(ctx) {
      const b = Banner.list[0]; if (!b) return;
      const k = b.t / b.dur; const inK = U.ease.outCubic(Math.min(1, b.t / 0.35)); const outK = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      const a = Math.min(inK, outK);
      ctx.save(); ctx.globalAlpha = a;
      const cy = R6.H * 0.42; const h = b.big ? 170 : 120;
      const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(0,0,0,.78)'); g.addColorStop(0.8, 'rgba(0,0,0,.78)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, cy - h / 2, R6.W, h);
      ctx.fillStyle = b.color; ctx.fillRect(R6.W / 2 - 300 * inK, cy - h / 2 + 14, 600 * inK, 2); ctx.fillRect(R6.W / 2 - 300 * inK, cy + h / 2 - 16, 600 * inK, 2);
      const sc = 1 + (1 - inK) * 0.3;
      ctx.translate(R6.W / 2, cy - (b.sub ? 10 : 0)); ctx.scale(sc, sc);
      UI.text(ctx, b.title, 0, 0, { size: b.big ? 96 : 72, fam: 'title', align: 'center', base: 'middle', color: b.style === 'fail' ? '#ff3b5c' : b.style === 'pass' ? '#ffffff' : '#fff', shadow: U.rgba(b.color, 0.9), shadowBlur: 22, spacing: 4 });
      ctx.restore();
      if (b.sub) { ctx.save(); ctx.globalAlpha = a; UI.text(ctx, b.sub, R6.W / 2, cy + 44, { size: 22, align: 'center', base: 'middle', color: '#e7e1d6', weight: 600, spacing: 3 }); ctx.restore(); }
    },
  };
  UI.Banner = Banner;

  // ---- Toast notifications (relationship changes, items, events) ----
  const Toast = {
    list: [],
    show(text, o = {}) {
      if (Toast.list.length && Toast.list[Toast.list.length - 1].text === text) return;
      Toast.list.push({ text, t: 0, dur: o.dur || 3.2, color: o.color || UI.T.accent2, icon: o.icon });
      if (Toast.list.length > 5) Toast.list.shift();
    },
    clear() { Toast.list.length = 0; },
    update(dt) { for (let i = Toast.list.length - 1; i >= 0; i--) { Toast.list[i].t += dt; if (Toast.list[i].t > Toast.list[i].dur) Toast.list.splice(i, 1); } },
    draw(ctx) {
      let y = R6.H - 150;
      for (let i = Toast.list.length - 1; i >= 0; i--) {
        const q = Toast.list[i]; const a = Math.min(1, q.t * 5, (q.dur - q.t) * 3); const sx = (1 - U.ease.outCubic(Math.min(1, q.t * 4))) * 40;
        ctx.save(); ctx.globalAlpha = a; ctx.font = UI.font(16, 600);
        const w = ctx.measureText(q.text).width + 44;
        const x = R6.W - w - 20 + sx;
        UI.panel(ctx, x, y - 16, w, 32, { r: 4, shadow: false, fill: 'rgba(8,10,14,.86)' });
        ctx.fillStyle = q.color; ctx.fillRect(x, y - 16, 4, 32);
        if (q.icon) UI.shapeIcon(ctx, q.icon, x + 20, y, 7, q.color, 2);
        UI.text(ctx, q.text, x + (q.icon ? 34 : 16), y + 1, { size: 16, base: 'middle', color: '#eee' });
        ctx.restore();
        y -= 38;
      }
    },
  };
  UI.Toast = Toast;

  R6.UI = UI;
  R6.Banner = Banner;
  R6.Toast = Toast;
})();
