/* ROUND 6 — dialogue.js : dialogue box with animated portraits, typewriter text, narrator/announcement modes and real choices */
'use strict';
(function () {
  const U = R6.U;
  const D = {
    active: false, cur: null, queue: [], t: 0, shown: 0, choiceI: 0, rects: [], hold: 0,
    // line: {who (participant|actor|{look,name}|null), name, text, expr, mode:'talk'|'narr'|'announce'|'think', choices:[{t,cb,disabled,sub}], onDone, auto}
    show(line) { const L = Array.isArray(line) ? line : [line]; D.queue.push(...L); if (!D.active) D.next(); },
    say(lines, onDone) {
      const arr = lines.map(l => Array.isArray(l) ? { who: l[0], text: l[1], expr: l[2] } : l);
      if (arr.length) arr[arr.length - 1].onDone = onDone;
      D.show(arr);
    },
    narr(text, onDone) { D.show({ mode: 'narr', text, onDone }); },
    announce(text, onDone, auto) { R6.Audio.sfx('announce'); D.show({ mode: 'announce', text, onDone, name: 'ANÚNCIO', auto }); },
    // non-blocking in-game line (auto-dismiss)
    toast(who, text, auto = 2.6, o = {}) { D.show(Object.assign({ who, text, auto }, o)); },
    choose(prompt, choices, o = {}) { D.show(Object.assign({ text: prompt, choices }, o)); },
    next() {
      const L = D.queue.shift();
      if (!L) { D.active = false; D.cur = null; return; }
      D.cur = L; D.active = true; D.t = 0; D.shown = 0; D.choiceI = 0; D.hold = 0;
      while (L.choices && L.choices[D.choiceI] && L.choices[D.choiceI].disabled && D.choiceI < L.choices.length - 1) D.choiceI++;
      if (L.sfx) R6.Audio.sfx(L.sfx);
    },
    close(force) { if (force) { D.queue.length = 0; D.active = false; D.cur = null; } },
    get busy() { return D.active; },
    finish(choice) {
      const L = D.cur;
      D.active = false; D.cur = null;
      if (choice && choice.cb) choice.cb(choice);
      if (L && L.onDone) L.onDone(choice);
      if (!D.active) D.next();
    },
    update(dt) {
      if (!D.active || !D.cur) return;
      const L = D.cur; const I = R6.Input;
      const speed = 45 * (R6.Save.settings.textSpeed || 1) * (L.mode === 'announce' ? 0.8 : 1);
      D.t += dt;
      const before = Math.floor(D.shown);
      D.shown = Math.min(L.text.length, D.shown + dt * speed * (I.act('ff') && D.t > 0.25 ? 3 : 1));
      if (Math.floor(D.shown) > before && Math.floor(D.shown) % 3 === 0 && L.mode !== 'narr') R6.Audio.sfx('type', { vol: 0.35, gap: 0.04 });
      const done = D.shown >= L.text.length;
      if (L.auto) { if (done) { D.hold += dt; if (D.hold > L.auto) D.finish(); } return; }
      if (L.choices) {
        if (!done) { if (I.confirmP()) D.shown = L.text.length; return; }
        const n = L.choices.length;
        const mv = d => { for (let k = 0; k < n; k++) { D.choiceI = (D.choiceI + d + n) % n; if (!L.choices[D.choiceI].disabled) break; } R6.Audio.sfx('hover'); };
        if (I.actP('up')) mv(-1);
        if (I.actP('down')) mv(1);
        const dg = I.digitP(); if (dg && dg <= n && !L.choices[dg - 1].disabled) { D.choiceI = dg - 1; R6.Audio.sfx('confirm'); return D.finish(L.choices[D.choiceI]); }
        const m = I.mouse;
        D.rects.forEach((r, k) => { if (r && U.rectHit(m.x, m.y, r) && !L.choices[k].disabled) { if (m.moved && D.choiceI !== k) { D.choiceI = k; R6.Audio.sfx('hover'); } if (m.pressed) { D.choiceI = k; R6.Audio.sfx('confirm'); D.finish(L.choices[k]); } } });
        if (!D.active || D.cur !== L) return;
        if (I.actP('confirm') && D.t > 0.2) { const c = L.choices[D.choiceI]; if (c && !c.disabled) { R6.Audio.sfx('confirm'); D.finish(c); } }
        return;
      }
      if (I.confirmP() || I.actP('interact')) {
        if (!done) D.shown = L.text.length;
        else if (D.t > 0.15) { R6.Audio.sfx('click', { vol: 0.5 }); D.finish(); }
      }
    },
    render(ctx) {
      if (!D.active || !D.cur) return;
      const L = D.cur; const T = R6.UI.T;
      const W = R6.W, H = R6.H;
      const bx = 150, bw = W - 300, bh = 132, by = H - bh - 26;
      const a = Math.min(1, D.t * 8);
      ctx.save(); ctx.globalAlpha = a;
      if (L.mode === 'narr') {
        const g = ctx.createLinearGradient(0, by - 30, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,.92)');
        ctx.fillStyle = g; ctx.fillRect(0, by - 30, W, H - by + 30);
        R6.UI.para(ctx, L.text.slice(0, Math.floor(D.shown)), W / 2, by + 24, bw - 80, { size: 22, align: 'center', color: '#efe9df', weight: 500, lh: 30 });
      } else {
        const who = L.who; let look = null, name = L.name, num = null, tag = null;
        if (who) {
          const p = who.p || who;
          look = who.look || p.look;
          if (!name) name = p.isPlayer ? R6.State.s.player.name : p.name;
          if (p.num) num = p.num;
          if (p.rel != null && !p.isPlayer && p.num) tag = R6.State.tag(p);
        }
        const isAnn = L.mode === 'announce';
        R6.UI.panel(ctx, bx, by, bw, bh, { r: 8, fill: isAnn ? 'rgba(40,6,18,.92)' : 'rgba(8,10,14,.9)', stroke: isAnn ? '#e8336d' : 'rgba(255,255,255,.14)' });
        let tx = bx + 26;
        if (look) {
          const talking = D.shown < L.text.length;
          R6.Char.portrait(ctx, look, bx + 68, by + bh / 2, 96, L.expr, R6.Engine.rt, talking);
          tx = bx + 132;
        } else if (isAnn) {
          R6.Props.speaker(ctx, bx + 36, by + 58, 1.4);
          tx = bx + 100;
        }
        // name plate
        if (name) {
          ctx.font = R6.UI.font(16, 800);
          const nw = ctx.measureText((num ? '#' + U.pad(num) + '  ' : '') + name).width + 24;
          R6.UI.rrect(ctx, tx - 4, by - 16, nw, 28, 4); ctx.fillStyle = isAnn ? '#e8336d' : T.accent; ctx.fill();
          R6.UI.text(ctx, (num ? '#' + U.pad(num) + '  ' : '') + name, tx + 8, by - 1, { size: 16, weight: 800, base: 'middle', color: '#fff' });
          if (tag) { R6.UI.text(ctx, tag.t, tx + nw + 6, by - 1, { size: 12, weight: 800, base: 'middle', color: tag.c }); }
        }
        const text = L.text.slice(0, Math.floor(D.shown));
        R6.UI.para(ctx, text, tx + 4, by + 22, bx + bw - tx - 30, { size: 21, color: isAnn ? '#ffd9e4' : '#f1ece3', weight: 500, lh: 27, maxLines: 4, fam: L.mode === 'think' ? 'body' : 'body' });
        if (D.shown >= L.text.length && !L.choices && !L.auto) {
          const k = (Math.sin(D.t * 6) + 1) / 2;
          ctx.fillStyle = `rgba(255,255,255,${0.4 + k * 0.6})`; ctx.beginPath(); ctx.moveTo(bx + bw - 30, by + bh - 24 + k * 3); ctx.lineTo(bx + bw - 20, by + bh - 24 + k * 3); ctx.lineTo(bx + bw - 25, by + bh - 17 + k * 3); ctx.fill();
        }
      }
      // choices
      D.rects = [];
      if (L.choices && D.shown >= L.text.length) {
        const n = L.choices.length; const cw = 520, ch = 42, gap = 8;
        const cx = W - cw - 60; let cy = by - 30 - n * (ch + gap);
        L.choices.forEach((c, k) => {
          const r = { x: cx, y: cy, w: cw, h: ch }; D.rects.push(r);
          const hov = k === D.choiceI;
          R6.UI.button(ctx, r.x - (hov ? 10 : 0), r.y, r.w, r.h, (k + 1) + '.  ' + c.t, { hover: hov, disabled: c.disabled, size: 18, align: 'left', sub: c.sub, color: c.color });
          cy += ch + gap;
        });
      }
      ctx.restore();
    },
  };
  R6.Dialog = D;
})();
