/* ROUND 6 — cutscene.js : script runner (camera, walking actors, dialogue, choices, parallel tracks, skip) + side-view cutscene scene */
'use strict';
(function () {
  const U = R6.U;

  // upper-body animations that can be played while staying seated
  const UPPER = new Set(['talk', 'hold', 'point', 'cry', 'sad', 'look', 'wave', 'eat', 'argue', 'scared', 'celebrate', 'fistpump', 'handsup', 'shrug', 'sit', 'sitSad']);

  // ---------------- side-view stage actor ----------------
  class StageActor {
    constructor(o) {
      this.id = o.id; this.p = o.p || null; this.look = o.look || (o.p ? o.p.look : R6.Char.makeLook());
      this.name = o.name || (o.p ? o.p.name : '');
      this.x = o.x || 0; this.z = o.z || 0; this.y = o.y; this.dir = o.dir || 1; this.view = o.view || 'side';
      this.anim = o.anim || 'idle'; this.animT = Math.random() * 2; this.expr = o.expr || null; this.alpha = o.alpha != null ? o.alpha : 1;
      this.scale = o.scale || 1.25; this.visible = o.visible !== false; this.item = o.item || null;
      this.target = null; this.speed = 110; this.running = false; this.holdAnim = null; this.bubble = null; this.emote = null; this.dead = false; this.tint = null;
      this.vy = 0; this.airY = 0; this.fallT = 0; this.falling = false;
      this.seat = null; this.seatRef = null; this.lift = 0; this.setSeatFor(this.anim);
    }
    // which kind of support an animation needs: chair (sit/sitSad), floor (sitFloor/hugKnees) or bed (sleep/lie)
    setSeatFor(name) {
      if (name === 'sit' || name === 'sitSad') { if (this.seat !== 'chair') { this.seat = 'chair'; this.seatRef = null; } }
      else if (name === 'sitFloor' || name === 'hugKnees') { this.seat = 'floor'; this.seatRef = null; }
      else if (name === 'sleep' || name === 'lie') { if (this.seat !== 'bed') { this.seat = 'bed'; this.seatRef = null; } }
      else if (UPPER.has(name) && this.seat) { /* stays seated: only the upper body changes */ }
      else { this.seat = null; this.seatRef = null; }
    }
    walkTo(x, z, run) { this.target = { x, z: z != null ? z : this.z }; this.running = !!run; this.seat = null; this.seatRef = null; }
    get busy() { return !!this.target; }
    say(text, dur = 2.6) { this.bubble = { text, t: 0, dur }; }
    emo(icon, dur = 1.6) { this.emote = { icon, t: 0, dur }; }
    update(dt) {
      if (this.target) {
        const sp = (this.running ? 230 : 105) * (this.speedMul || 1);
        const dx = this.target.x - this.x, dz = this.target.z - this.z;
        const d = Math.hypot(dx, dz * 200);
        if (d < 3) { this.x = this.target.x; this.z = this.target.z; this.target = null; if (!this.holdAnim) this.anim = 'idle'; }
        else {
          const k = Math.min(1, sp * dt / d); this.x += dx * k; this.z += dz * k;
          if (Math.abs(dx) > 1) this.dir = dx > 0 ? 1 : -1;
          if (this.view !== 'side' && Math.abs(dx) > 1) this.view = 'side';
          this.anim = this.running ? 'run' : 'walk';
        }
      }
      if (this.falling) { this.fallT += dt; this.vy += 1400 * dt; this.airY += this.vy * dt; }
      this.lift = U.approach(this.lift, this.seatRef ? this.seatRef.lift || 0 : 0, dt * 160);
      this.animT += dt;
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
      if (this.emote) { this.emote.t += dt; if (this.emote.t > this.emote.dur) this.emote = null; }
    }
    feetY(ground) { return (this.y != null ? this.y : ground) - this.z * 70 + this.airY - this.lift; }
    sc() { return this.scale * (1 - this.z * 0.22); }
    draw(ctx, ground, t) {
      if (!this.visible || this.alpha <= 0) return;
      const look = this.tint ? Object.assign({}, this.look, { tint: this.tint }) : this.look;
      const ahead = this.anim === 'die' || this.anim === 'dead' || this.anim === 'fall' || this.anim === 'trip' || this.anim === 'getup';
      const seated = this.seat === 'chair' || this.seat === 'floor' ? this.seat : null;
      R6.Char.draw(ctx, look, this.x, this.feetY(ground), { view: this.view, dir: this.dir, anim: this.anim, t: ahead ? this.animT : this.animT, scale: this.sc(), expr: this.expr, alpha: this.alpha, item: this.item, back: this.back, shadow: !this.falling && !this.lift && this.seat !== 'bed', seated });
    }
    drawOverlay(ctx, ground) {
      const hy = this.feetY(ground) - 108 * this.sc() * (this.look.h || 1);
      if (this.emote) { const e = this.emote; ctx.save(); ctx.translate(this.x, hy - 16 + Math.sin(e.t * 8) * 2); const k = U.ease.outBack(Math.min(1, e.t * 5)); ctx.scale(k * 1.4, k * 1.4); ctx.globalAlpha *= Math.min(1, (e.dur - e.t) * 3); ctx.fillStyle = 'rgba(15,15,20,.85)'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, U.TAU); ctx.fill(); R6.UI.text(ctx, e.icon, 0, 1, { size: 14, align: 'center', base: 'middle', color: '#fff', weight: 800 }); ctx.restore(); }
      if (this.bubble) { ctx.save(); R6.drawBubble(ctx, this.bubble, this.x, hy, 0.8); ctx.restore(); }
    }
  }

  // ---------------- script runner ----------------
  // PACE shortens every timed beat (pauses, captions, camera moves, fades); ENTER/SPACE/E/click/tap finishes the current beat at once
  const PACE = 0.7;
  class Runner {
    constructor(host, steps, onEnd, parent) {
      this.host = host; this.steps = steps || []; this.i = 0; this.cur = null; this.done = false; this.onEnd = onEnd; this.parent = parent;
      this.labels = {}; this.steps.forEach((s, k) => { if (s && s.label) this.labels[s.label] = k; });
      if (!parent) { this.lb = 0; this.lbTarget = host.letterbox != null ? host.letterbox : 1; this.fadeA = 0; this.fadeTarget = 0; this.fadeSpeed = 2; this.fadeColor = '#000'; this.caption = null; this.skipping = false; this.skipHold = 0; }
    }
    get root() { let r = this; while (r.parent) r = r.parent; return r; }
    get skipping() { return this.parent ? this.root.skipping : this._skip; }
    set skipping(v) { if (this.parent) this.root.skipping = v; else this._skip = v; }
    actor(id) { if (id && typeof id === 'object') return id; return this.host.getActor(id); }
    update(dt) {
      if (!this.parent) this.updateRoot(dt);
      let guard = 0;
      while (!this.done && guard++ < 400) {
        if (this.cur) {
          const R = this.root, hurry = R.hurry && !this.cur.noSkip;
          const fin = this.cur.update((this.skipping || hurry) && !this.cur.noSkip ? 99 : dt);
          if (!fin) return;
          if (hurry) R.hurry = false; // one press finishes one beat
          this.cur = null; dt = 0;
        }
        if (this.i >= this.steps.length) { this.finish(); return; }
        const st = this.steps[this.i++];
        if (!st) continue;
        try { this.cur = this.exec(st); } catch (e) { R6.Engine.reportError(e); this.cur = null; }
      }
    }
    updateRoot(dt) {
      this.lb = U.approach(this.lb, this.lbTarget, dt * 2.5);
      if (this.fadeA !== this.fadeTarget) this.fadeA = U.approach(this.fadeA, this.fadeTarget, dt * this.fadeSpeed);
      if (this.caption) { this.caption.t += dt; if (this.caption.t > this.caption.dur) this.caption = null; }
      // advance: a press while no dialogue box is open (and not the press that just closed one) hurries the current beat
      const I = R6.Input, press = I.actP('confirm') || I.actP('interact') || I.mouse.pressed;
      this.hurry = !!(press && !R6.Dialog.active && !this.dlgWas && !this.skipping && this.host.skippable !== false);
      this.dlgWas = R6.Dialog.active;
      if (this.hurry) {
        if (this.caption) this.caption.dur = Math.min(this.caption.dur, this.caption.t + 0.25);
        const b = R6.Banner.list[0]; if (b) b.dur = Math.min(b.dur, b.t + 0.3);
      }
      // skip: hold ESC
      if (!this.skipping && this.host.skippable !== false) {
        if (R6.Input.act('skip') && !R6.Dialog.cur?.choices) { this.skipHold += dt; if (this.skipHold > 0.7) this.skip(); }
        else this.skipHold = Math.max(0, this.skipHold - dt * 2);
      }
    }
    skip() {
      this.skipping = true; this.skipHold = 0;
      R6.Dialog.close(true);
      this.fadeA = 1; this.fadeTarget = 1;
      R6.Audio.sfx('whoosh');
    }
    finish() {
      if (this.done) return; this.done = true;
      if (!this.parent) { if (this.skipping) { this.skipping = false; this.fadeTarget = 0; this.fadeSpeed = 3; } }
      if (this.onEnd) this.onEnd();
    }
    sub(steps) { return new Runner(this.host, steps, null, this); }
    task(fn, noSkip) { return { update: fn, noSkip }; }
    waitTask(sec) { let t = 0; const d = sec * PACE; return this.task(dt => (t += dt) >= d); }
    speaker(who) {
      if (who == null) return null;
      if (typeof who === 'object') return who.p || who;
      if (who === 'player' || who === 'p') { const a = this.actor('p'); return (a && a.p) || R6.State.player; }
      if (String(who).startsWith('key:')) return R6.State.byKey(who.slice(4));
      const a = this.actor(who); if (a) return a.p || a;
      return { name: who };
    }
    exec(st) {
      const R = this.root; const host = this.host; const sk = this.skipping;
      if (st.label) return null;
      if (st.wait != null) return sk ? null : this.waitTask(st.wait);
      if (st.goto) { const k = this.labels[st.goto]; if (k != null) this.i = k; return null; }
      if (st.if) { const branch = st.if(R6.State, host) ? st.then : st.else; if (!branch) return null; const r = this.sub(branch); return this.task(dt => { r.update(dt); return r.done; }); }
      if (st.par) { const rs = st.par.map(s => this.sub(s)); return this.task(dt => { const R = this.root, h = dt >= 99 && !this.skipping; rs.forEach(r => { if (h) R.hurry = true; r.update(dt); }); if (h) R.hurry = false; return rs.every(r => r.done); }); }
      if (st.call) { const res = st.call(host, this); if (res && res.update) return res; return null; }
      if (st.set) { for (const k in st.set) R6.State.flag(k, st.set[k]); return null; }
      if (st.give) { R6.State.give(st.give, st.n || 1); return null; }
      if (st.rel) { for (const k in st.rel) { const p = k.startsWith('#') ? R6.State.byNum(+k.slice(1)) : R6.State.byKey(k); if (p) R6.State.addRel(p, st.rel[k], st.mem); } return null; }
      if (st.say != null || st.text != null && st.who != null) {
        if (sk) return null;
        const who = this.speaker(st.say != null ? st.say : st.who); const a = this.actor(st.say);
        if (a && a.anim !== undefined && st.talkAnim !== false && !a.target && !a.dead && (a.anim === 'idle' || a.anim === 'talk' || (a.seat === 'chair' && (a.anim === 'sit' || a.anim === 'sitSad')))) { a._prevAnim = a.anim === 'talk' ? a._prevAnim || 'idle' : a.anim; a.anim = 'talk'; if (a.forceAnim !== undefined) a.setAnim('talk'); }
        if (a && st.expr) a.expr = st.expr;
        let fin = false;
        R6.Dialog.show({ who, text: st.text, expr: st.expr || (a && a.expr), name: st.name, onDone: () => { fin = true; if (a) { if (a.forceAnim !== undefined) a.clearAnim(); else if (a.anim === 'talk') a.anim = a._prevAnim || 'idle'; } } });
        return this.task(() => fin, true);
      }
      if (st.lines) { const r = this.sub(st.lines.map(l => ({ say: l[0], text: l[1], expr: l[2] }))); return this.task(dt => { r.update(dt); return r.done; }, true); }
      if (st.narr != null) { if (sk) return null; let fin = false; R6.Dialog.show({ mode: 'narr', text: st.narr, onDone: () => fin = true, auto: st.auto }); return this.task(() => fin, true); }
      if (st.announce != null) { if (sk) return null; let fin = false; R6.Dialog.announce(st.announce, () => fin = true); return this.task(() => fin, true); }
      if (st.choice != null) {
        let picked = null;
        const who = st.who ? this.speaker(st.who) : null;
        const opts = st.opts.filter(o => !o.if || o.if(R6.State));
        R6.Dialog.show({ who, text: st.choice, expr: st.expr, choices: opts.map(o => ({ t: typeof o.t === 'function' ? o.t() : o.t, sub: o.sub, disabled: o.disabled ? o.disabled(R6.State) : false, color: o.color, cb: () => { picked = o; } })) });
        let subR = null;
        return this.task(dt => {
          if (!picked) return false;
          if (!subR) {
            const o = picked;
            if (st.id) R6.State.decide(st.id, o.v != null ? o.v : o.t, typeof o.t === 'string' ? o.t : '');
            if (o.set) for (const k in o.set) R6.State.flag(k, o.set[k]);
            if (o.rel) for (const k in o.rel) { const p = k.startsWith('#') ? R6.State.byNum(+k.slice(1)) : R6.State.byKey(k); if (p) R6.State.addRel(p, o.rel[k], o.mem); }
            if (o.karma) R6.State.karma(o.karma);
            if (o.do) o.do(host, this);
            if (o.goto) { const k = this.labels[o.goto]; if (k != null) this.i = k; return true; }
            subR = this.sub(o.then || []);
          }
          subR.update(dt); return subR.done;
        }, true);
      }
      if (st.move || st.walk) {
        const a = this.actor(st.move || st.walk); if (!a) return null;
        const to = st.to;
        if (a.goTo) { // top-down actor
          if (sk) { a.x = to[0]; a.y = to[1]; a.stop(); return null; }
          let fin = false; a.goTo(host.world, to[0], to[1], st.run, () => { fin = true; if (st.face) a.face(st.face); });
          if (st.async) return null;
          let tt = 0; return this.task(dt => { tt += dt; if (this.skipping || dt >= 99) { a.x = to[0]; a.y = to[1]; a.stop(); if (st.face) a.face(st.face); return true; } if (tt > (st.timeout || 20)) { a.stop(); return true; } return fin; });
        } else {
          if (sk) { a.x = to[0]; if (to[1] != null) a.z = to[1]; a.target = null; a.anim = 'idle'; if (st.face) a.dir = st.face; return null; }
          if (st.speed) a.speedMul = st.speed;
          a.walkTo(to[0], to[1], st.run);
          if (st.async) return null;
          return this.task(dt => { if ((this.skipping || dt >= 99) && a.target) { a.x = a.target.x; a.z = a.target.z; a.target = null; if (!a.holdAnim) a.anim = 'idle'; } if (!a.target && st.face) a.dir = st.face; return !a.target; });
        }
      }
      if (st.face) { const a = this.actor(st.face); if (a) { if (a.goTo) { if (st.to) a.faceTo(...st.to); else a.face(st.dir); } else { if (st.view) a.view = st.view; if (st.dir) a.dir = st.dir; if (st.toward) { const b = this.actor(st.toward); if (b) a.dir = b.x > a.x ? 1 : -1; } } } return null; }
      if (st.anim) {
        const a = this.actor(st.anim); if (!a) return null;
        if (a.setAnim) { a.setAnim(st.name, st.keep ? 0 : (st.hold || 0)); } else { a.anim = st.name; a.animT = 0; a.holdAnim = st.keep ? st.name : null; if (a.setSeatFor) a.setSeatFor(st.name); }
        if (st.hold && !sk) { const h = st.hold * PACE; return this.task(((t) => dt => (t += dt) >= h)(0)); }
        return null;
      }
      if (st.expr) { const a = this.actor(st.expr); if (a) a.expr = st.e; return null; }
      if (st.item) { const a = this.actor(st.item); if (a) a.item = st.v; return null; }
      if (st.view) { const a = this.actor(st.view); if (a) a.view = st.v; return null; }
      if (st.show) { const a = this.actor(st.show); if (a) { a.visible = true; } return null; }
      if (st.hide) { const a = this.actor(st.hide); if (a) a.visible = false; return null; }
      if (st.alpha) { const a = this.actor(st.alpha); if (!a) return null; const to = st.v, dur = (st.dur || 0.8) * PACE; if (sk) { a.alpha = to; return null; } const from = a.alpha; let t = 0; return this.task(dt => { t += dt; a.alpha = U.lerp(from, to, Math.min(1, t / dur)); return t >= dur || !!st.async; }); }
      if (st.cam) {
        const c = host.cam; const [x, y, z] = st.cam;
        if (sk || !st.dur) { c.set(x != null ? x : c.x, y != null ? y : c.y, z || c.zoom); host.camTarget = null; return null; }
        host.camTarget = null; c.to(x, y, z, st.dur * PACE, st.ease ? U.ease[st.ease] : undefined);
        if (st.async) return null; return this.task(dt => { if (dt >= 99 && c.tween) c.set(c.tween.x1, c.tween.y1, c.tween.z1); return !c.busy; });
      }
      if (st.camFollow !== undefined) { host.camTarget = st.camFollow ? this.actor(st.camFollow) : null; if (st.zoom) host.cam.tzoom = st.zoom; if (st.offY != null) host.camOffY = st.offY; return null; }
      if (st.shake) { if (!sk) host.cam.shake(st.shake, st.dur || 0.4); return null; }
      if (st.fade) {
        R.fadeColor = st.color || '#000'; R.fadeTarget = st.fade === 'out' ? 1 : 0; R.fadeSpeed = 1 / ((st.dur || 0.8) * PACE);
        if (sk) { if (!this.root.skipping) R.fadeA = R.fadeTarget; return null; }
        if (st.async) return null; return this.task(dt => { if (dt >= 99 && !this.skipping) R.fadeA = R.fadeTarget; return R.fadeA === R.fadeTarget; });
      }
      if (st.sfx) { if (!sk) R6.Audio.sfx(st.sfx, { vol: st.vol, gap: st.gap }); return null; }
      if (st.music !== undefined) { if (st.music) R6.Music.play(st.music, st.dur || 1.5); else R6.Music.stop(st.dur || 1.5); if (st.intensity != null) R6.Music.setIntensity(st.intensity); return null; }
      if (st.loop) { R6.Audio.loop(st.loop, st.vol || 1); return null; }
      if (st.stopLoop) { R6.Audio.stopLoop(st.stopLoop); return null; }
      if (st.slowmo) { if (!sk) R6.Engine.slowmo(st.slowmo, st.dur || 1); return null; }
      if (st.flash) { if (!sk) R6.Engine.flash(st.flash, st.dur || 0.3); return null; }
      if (st.banner) { if (sk) return null; R6.Banner.show(st.banner, st.sub, { style: st.style, dur: (st.dur || 2.6) * PACE, color: st.color, big: st.big }); return st.wait === false ? null : this.waitTask((st.dur || 2.6) * (st.hold || 0.85)); }
      if (st.caption) { if (sk) return null; R.caption = { text: st.caption, sub: st.sub, t: 0, dur: (st.dur || 3.4) * PACE, big: st.big }; return st.async ? null : this.waitTask(st.dur || 3.4); }
      if (st.emote) { const a = this.actor(st.emote); if (a && !sk) a.emo(st.icon, st.dur); return null; }
      if (st.bubble) { const a = this.actor(st.bubble); if (a && !sk) a.say(st.text, st.dur || 2.6); return st.wait && !sk ? this.waitTask(st.wait) : null; }
      if (st.spawn) { host.spawn(st); return null; }
      if (st.remove) { host.despawn(st.remove); return null; }
      if (st.letterbox != null) { R.lbTarget = st.letterbox ? 1 : 0; return null; }
      if (st.elim) { host.eliminate && host.eliminate(st.elim, st); return null; }
      if (st.unlock) { R6.Save.unlockScene(st.unlock, st.title); return null; }
      if (st.gallery) { R6.Save.unlockGallery(st.gallery); return null; }
      if (st.fx) { if (!sk && host.fx) host.fx.emit(st.fx, st.x, st.y, st.n || 10, st.o || {}); return null; }
      console.warn('Unknown cutscene step', st);
      return null;
    }
    renderOverlay(ctx) {
      const R = this.root;
      R6.UI.letterbox(ctx, R.lb);
      if (R.caption) {
        const c = R.caption; const a = Math.min(1, c.t * 2, (c.dur - c.t) * 2);
        ctx.save(); ctx.globalAlpha = Math.max(0, a);
        if (c.big) { ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, R6.W, R6.H); }
        R6.UI.text(ctx, c.text, R6.W / 2, R6.H / 2 - (c.sub ? 14 : 0), { size: c.big ? 64 : 44, fam: 'title', align: 'center', base: 'middle', color: '#fff', spacing: 6, shadow: true });
        if (c.sub) R6.UI.text(ctx, c.sub, R6.W / 2, R6.H / 2 + 34, { size: 20, align: 'center', base: 'middle', color: '#d9d2c5', spacing: 4 });
        ctx.restore();
      }
      if (R.fadeA > 0) { ctx.save(); ctx.globalAlpha = R.fadeA; ctx.fillStyle = R.fadeColor; ctx.fillRect(0, 0, R6.W, R6.H); ctx.restore(); }
      if (R.skipHold > 0.05 && !R.skipping) {
        ctx.save(); ctx.globalAlpha = Math.min(1, R.skipHold * 3);
        R6.UI.text(ctx, 'PULANDO…', R6.W - 40, R6.H - 30, { size: 16, align: 'right', color: '#fff', weight: 800 });
        ctx.strokeStyle = '#e8336d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(R6.W - 150, R6.H - 35, 10, -Math.PI / 2, -Math.PI / 2 + U.TAU * Math.min(1, R.skipHold / 0.7)); ctx.stroke();
        ctx.restore();
      } else if (!R.skipping && R.lb > 0.5 && this.host.skippable !== false) {
        ctx.save(); ctx.globalAlpha = 0.45; R6.UI.text(ctx, (R6.Touch && R6.Touch.on ? 'Toque para avançar' : 'ENTER avança') + ' · segure ESC para pular a cena · P pausa', R6.W - 24, R6.H - 26, { size: 13, align: 'right', color: '#bbb' }); ctx.restore();
      }
    }
  }

  // ---------------- standalone side-view cutscene scene ----------------
  class CutsceneScene {
    constructor(o) {
      this.o = o; this.name = 'cutscene:' + (o.id || o.stage);
      this.stage = Object.assign(Object.create(R6.Env.stages[o.stage] || R6.Env.stages.room), o.stageProps || {});
      this.pausable = true;
      this.actors = new Map();
      this.cam = new R6.Camera({ bounds: { x: 0, y: 0, w: this.stage.w, h: this.stage.ground + 170 } });
      const c = o.cam || [this.stage.w / 2, this.stage.ground - 200, 1];
      this.cam.set(c[0], c[1], c[2] || 1);
      this.fx = new R6.Particles(800);
      this.t = 0; this.letterbox = o.letterbox != null ? o.letterbox : 1;
      this.autoChairs = [];
      (o.actors || []).forEach(a => this.spawn(a));
      this.rain = (o.rain || this.stage.rain) ? new R6.Rain(o.rainN || 260) : null;
      if (this.rain && o.lightning) this.rain.lightning = true;
      this.runner = new Runner(this, o.steps || [], () => this.end());
      this.ended = false;
    }
    getActor(id) { return this.actors.get(id); }
    // find what a sitting/lying actor rests on: a bench/sofa/bed painted in the stage, or a chair placed for them
    resolveSeat(a) {
      const sc = a.sc(), want = a.seat;
      if (want === 'floor') { a.seatRef = { lift: 0 }; return; }
      const kind = want === 'bed' ? 'bed' : 'seat';
      const list = (this.o.seats || []).concat(this.stage.seats || []).filter(q => (q.kind || 'seat') === kind && Math.abs((q.z || 0) - a.z) < 0.15);
      let best = null, bd = 1e9;
      for (const q of list) { const d = Math.abs(a.x - q.x); if (d <= q.w / 2 + 24 && d < bd) { best = q; bd = d; } }
      if (best) {
        const half = Math.max(0, best.w / 2 - 18 * sc);
        a.x = U.clamp(a.x, best.x - half, best.x + half);
        const lift = kind === 'bed' ? best.top - 5 * sc : best.top - R6.Props.CHAIR_TOP * sc;
        a.seatRef = { decl: best, lift: U.clamp(lift, -4, 70) }; return;
      }
      if (kind === 'bed' || this.o.chairs === false || this.stage.chair === 'none') { a.seatRef = { lift: 0, none: true }; return; }
      let ch = this.autoChairs.find(c => Math.abs(c.x - a.x) < 30 && Math.abs(c.z - a.z) < 0.05);
      if (!ch) { ch = { x: a.x, z: a.z, dir: a.dir, view: a.view === 'side' ? 'side' : 'front', style: this.o.chair || this.stage.chair || 'wood' }; this.autoChairs.push(ch); }
      a.x = ch.x; a.seatRef = { auto: ch, lift: 0 };
    }
    drawChair(c, ch, g, sc) { R6.Props.chair(c, ch.x, g - ch.z * 70, sc, ch.dir, ch.style, ch.view); }
    spawn(d) {
      const a = new StageActor({ id: d.id || d.spawn, p: d.p, look: d.look, x: d.x, z: d.z, y: d.y, dir: d.dir, view: d.view, anim: d.anim, scale: d.scale || this.o.scale, alpha: d.alpha, visible: d.visible, item: d.item, expr: d.expr, name: d.name });
      this.actors.set(a.id, a); return a;
    }
    despawn(id) { this.actors.delete(id); }
    eliminate(id, st) {
      const a = this.getActor(id); if (!a) return;
      a.anim = 'die'; a.animT = 0; a.back = st.back; a.holdAnim = 'die';
      if (st.sfx !== false) R6.Audio.sfx(st.sfx || 'gun');
      setTimeout(() => { a.tint = 'dead'; }, 350);
      if (a.p && a.p.alive && st.count !== false) R6.Elim.kill(a.p, { cause: st.cause || 'cutscene', silent: true });
    }
    enter() {
      if (this.o.music !== undefined) { if (this.o.music) R6.Music.play(this.o.music); else R6.Music.stop(); }
      else if (this.stage.music) R6.Music.play(this.stage.music);
      (this.o.amb || this.stage.amb || []).forEach(l => R6.Audio.loop(l, 0.8));
      if (this.o.id) R6.Save.unlockScene(this.o.id, this.o.title);
      if (this.o.onEnter) this.o.onEnter(this);
    }
    exit() { }
    end() { if (this.ended) return; this.ended = true; if (this.o.onEnd) this.o.onEnd(this); }
    focus() {
      const p = this.getActor(this.o.focusId || 'p');
      if (!p) return { x: R6.W / 2, y: R6.H * 0.6, scale: 1.2 };
      const s = this.cam.toScreen(p.x, p.feetY(this.stage.ground));
      return { x: s.x, y: s.y, look: p.look, scale: p.sc() * this.cam.zoom, facing: p.dir };
    }
    update(dt) {
      this.t += dt;
      for (const a of this.actors.values()) a.update(dt);
      if (this.camTarget) { const a = this.camTarget; this.cam.follow(a.x, a.feetY(this.stage.ground) - (this.camOffY != null ? this.camOffY : 110)); }
      this.cam.update(dt);
      this.fx.update(dt);
      if (this.rain) this.rain.update(dt);
      if (this.o.onUpdate) this.o.onUpdate(this, dt);
      this.runner.update(dt);
      for (const a of this.actors.values()) {
        if (a.seat && !a.seatRef && !a.target) this.resolveSeat(a);
        if (a.seatRef && a.seatRef.auto) { a.seatRef.auto.dir = a.dir; a.seatRef.auto.view = a.view === 'side' ? 'side' : 'front'; }
      }
    }
    render(ctx) {
      const st = this.stage, g = st.ground;
      R6.Env.render(ctx, st, this.cam, this.t, c => {
        const list = [...this.actors.values()].sort((a, b) => b.z - a.z);
        if (this.o.drawBack) this.o.drawBack(c, this);
        const used = new Set(); for (const a of list) if (a.seatRef && a.seatRef.auto && a.seat === 'chair') used.add(a.seatRef.auto);
        for (const ch of this.autoChairs) if (!used.has(ch)) this.drawChair(c, ch, g, 1.25 * (1 - ch.z * 0.22));
        list.forEach(a => { if (a.seatRef && a.seatRef.auto && a.seat === 'chair') this.drawChair(c, a.seatRef.auto, g, a.sc()); a.draw(c, g, this.t); });
        if (this.o.drawWorld) this.o.drawWorld(c, this);
        this.fx.draw(c);
        list.forEach(a => a.drawOverlay(c, g));
      });
      if (this.rain) this.rain.draw(ctx);
      if (this.o.drawOverlay) this.o.drawOverlay(ctx, this);
      R6.UI.vignette(ctx, this.o.vignette != null ? this.o.vignette : 0.55);
      this.runner.renderOverlay(ctx);
    }
  }

  R6.StageActor = StageActor;
  R6.Runner = Runner;
  R6.CutsceneScene = CutsceneScene;
  R6.cutscene = (o) => new CutsceneScene(o);
})();
