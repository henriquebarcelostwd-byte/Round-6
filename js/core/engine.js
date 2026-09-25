/* ROUND 6 — engine.js : canvas, main loop, scene manager, cinematic transitions (fade / white / iris / view-shift), slow motion, pause */
'use strict';
(function () {
  const U = R6.U;
  R6.W = 1280; R6.H = 720;

  const E = {
    canvas: null, ctx: null, scale: 1, dpr: 1, time: 0, rt: 0, frame: 0, dt: 0,
    scene: null, trans: null, timeScale: 1, slow: null, flashC: null, flashT: 0, flashD: 0,
    paused: false, timers: [], fps: 60, showFps: false, bufA: null, bufB: null, running: false,
    shakeT: 0, shakeM: 0, errors: [], lodBias: 0,

    init(canvas) {
      E.canvas = canvas; E.ctx = canvas.getContext('2d', { alpha: false });
      E.resize(); window.addEventListener('resize', E.resize);
      document.addEventListener('fullscreenchange', E.resize);
      R6.Input.init(canvas, (cx, cy) => {
        const r = canvas.getBoundingClientRect();
        return { x: (cx - r.left) / r.width * R6.W, y: (cy - r.top) / r.height * R6.H };
      });
      E.bufA = document.createElement('canvas'); E.bufA.width = R6.W; E.bufA.height = R6.H;
      E.bufB = document.createElement('canvas'); E.bufB.width = R6.W; E.bufB.height = R6.H;
      R6.Input.onKeyHooks.push(e => { if (e.code === 'F3') E.showFps = !E.showFps; });
      document.addEventListener('visibilitychange', () => { if (document.hidden && E.scene && E.scene.pausable && !E.trans && !R6.Dialog.active) E.pause(true); });
    },
    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      const s = Math.min(w / R6.W, h / R6.H);
      E.scale = s; E.dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = E.canvas;
      c.style.width = Math.floor(R6.W * s) + 'px'; c.style.height = Math.floor(R6.H * s) + 'px';
      c.width = Math.floor(R6.W * s * E.dpr); c.height = Math.floor(R6.H * s * E.dpr);
      E.ctx.imageSmoothingEnabled = true;
    },
    start(scene) {
      E.scene = scene; scene.enter && scene.enter(null);
      E.running = true; let last = performance.now();
      const loop = now => {
        let rdt = (now - last) / 1000; last = now;
        if (!(rdt > 0)) rdt = 0; if (rdt > 0.1) rdt = 0.1;
        E.fps = U.lerp(E.fps, 1 / Math.max(0.001, rdt), 0.05);
        E._q = (E._q || 0) + rdt; if (E._q > 1.5) { E._q = 0; if (E.fps < 42) E.lodBias = Math.min(0.3, E.lodBias + 0.06); else if (E.fps > 57) E.lodBias = Math.max(0, E.lodBias - 0.03); }
        try { E.tick(rdt); } catch (err) { E.reportError(err); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    reportError(err) {
      console.error(err);
      E.errors.push(String(err && err.stack || err));
      if (E.errors.length > 20) E.errors.shift();
    },
    tick(rdt) {
      E.rt += rdt; E.frame++;
      // slow motion recovery (real time)
      if (E.slow) { E.slow.t += rdt; if (E.slow.t >= E.slow.dur) { E.timeScale = U.lerp(E.timeScale, 1, Math.min(1, rdt * 4)); if (Math.abs(E.timeScale - 1) < 0.02) { E.timeScale = 1; E.slow = null; } } }
      const dt = rdt * E.timeScale;
      E.dt = dt; E.time += dt;
      R6.Music.tick();
      if (E.trans) E.updateTrans(rdt);
      else if (E.paused) R6.PauseMenu && R6.PauseMenu.update(rdt);
      else {
        // pause key
        if (E.scene && E.scene.pausable && R6.Input.actP('pause') && !R6.Dialog.active && !(E.scene.blockPause && E.scene.blockPause())) E.pause(true);
        else {
          R6.Dialog.update(rdt);
          for (let i = E.timers.length - 1; i >= 0; i--) { const tm = E.timers[i]; tm.t -= dt; if (tm.t <= 0) { E.timers.splice(i, 1); tm.fn(); } }
          if (E.scene && E.scene.update) E.scene.update(dt);
        }
      }
      R6.Banner.update(rdt); R6.Toast.update(rdt); if (R6.Elim) R6.Elim.update(rdt);
      if (E.flashT > 0) E.flashT -= rdt;
      if (E.shakeT > 0) E.shakeT -= rdt;
      if (R6.Save && R6.Save.meta) R6.Save.meta.stats.playTime += rdt;
      E.render();
      R6.Input.endFrame();
    },
    render() {
      const ctx = E.ctx; const k = E.scale * E.dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (E.shakeT > 0) { const m = E.shakeM * Math.min(1, E.shakeT * 3); ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m); }
      if (E.trans) E.renderTrans(ctx);
      else if (E.scene) { ctx.save(); E.scene.render(ctx); ctx.restore(); }
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (!E.trans || E.trans.phase === 'in') {
        R6.Dialog.render(ctx);
        R6.Banner.draw(ctx);
        R6.Toast.draw(ctx);
      }
      if (E.flashT > 0) { ctx.save(); ctx.globalAlpha = Math.max(0, E.flashT / E.flashD) * 0.85; ctx.fillStyle = E.flashC; ctx.fillRect(0, 0, R6.W, R6.H); ctx.restore(); }
      if (E.paused && R6.PauseMenu) R6.PauseMenu.render(ctx);
      if (E.showFps) {
        R6.UI.text(ctx, `${Math.round(E.fps)} fps · ${E.scene && E.scene.name || ''}`, 8, R6.H - 8, { size: 13, color: '#8f8', fam: 'mono' });
      }
    },

    // ---------- scene management ----------
    go(scene, o = {}) {
      const type = o.t || 'fade';
      R6.Dialog.close(true);
      if (type === 'cut' || !E.scene) {
        E.swap(scene, o);
        return;
      }
      if (E.trans) { // collapse any running transition
        const tr = E.trans; E.trans = null;
        if (!tr.swapped) E.swap(tr.to, tr.o);
      }
      const dur = o.dur || (type === 'view' ? 2.1 : type === 'iris' ? 1.4 : 1.0);
      E.trans = { type, t: 0, dur, to: scene, from: E.scene, o, swapped: false, phase: 'out', color: o.color || (type === 'white' ? '#ffffff' : '#000000') };
      if (type === 'view') {
        // snapshot outgoing frame
        const b = E.bufA.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.fillStyle = '#000'; b.fillRect(0, 0, R6.W, R6.H);
        try { E.scene.render(b); } catch (e) { E.reportError(e); }
        E.trans.focusFrom = (E.scene.focus && E.scene.focus()) || { x: R6.W / 2, y: R6.H / 2, scale: 0.5 };
        E.swap(scene, o);
        E.trans.swapped = true;
        E.trans.focusTo = (scene.focus && scene.focus()) || { x: R6.W / 2, y: R6.H * 0.62, scale: 1.2 };
      }
    },
    swap(scene, o = {}) {
      const prev = E.scene;
      if (prev && prev.exit) { try { prev.exit(scene); } catch (e) { E.reportError(e); } }
      if (!o.keepLoops) R6.Audio.stopAllLoops(0.5);
      E.timers.length = 0; E.timeScale = 1; E.slow = null; E.paused = false;
      R6.Banner.clear();
      R6.Input.clearAll();
      E.scene = scene;
      if (scene && scene.enter) { try { scene.enter(prev); } catch (e) { E.reportError(e); } }
    },
    updateTrans(rdt) {
      const tr = E.trans; tr.t += rdt;
      const half = tr.dur / 2;
      if (tr.type === 'view') {
        if (tr.t >= tr.dur * 0.62 && tr.to.update) { tr.phase = 'in'; tr.to.update(0); }
        if (tr.t >= tr.dur) { E.trans = null; }
        return;
      }
      if (!tr.swapped && tr.t >= half) { tr.swapped = true; E.swap(tr.to, tr.o); tr.phase = 'in'; }
      if (tr.swapped && E.scene && E.scene.update && tr.t > half + 0.05) E.scene.update(rdt * E.timeScale);
      if (tr.t >= tr.dur) E.trans = null;
    },
    renderTrans(ctx) {
      const tr = E.trans; const half = tr.dur / 2;
      if (tr.type === 'view') return E.renderViewShift(ctx, tr);
      const cur = tr.swapped ? E.scene : tr.from;
      if (cur) { ctx.save(); try { cur.render(ctx); } catch (e) { E.reportError(e); } ctx.restore(); }
      const k = tr.swapped ? 1 - (tr.t - half) / half : tr.t / half;
      const a = U.clamp(k, 0, 1);
      if (tr.type === 'iris') {
        const f = (cur && cur.focus && cur.focus()) || { x: R6.W / 2, y: R6.H / 2 };
        const r = U.lerp(0, 820, 1 - U.ease.inOutCubic(a));
        ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, R6.W, R6.H); ctx.arc(f.x, f.y, Math.max(0.1, r), 0, U.TAU, true); ctx.fill(); ctx.restore();
      } else {
        ctx.save(); ctx.globalAlpha = U.ease.inOut(a); ctx.fillStyle = tr.color; ctx.fillRect(0, 0, R6.W, R6.H); ctx.restore();
      }
    },
    // View-shift: top-down → side-view (or back). Zoom into the player, the floor plane tilts away to the horizon,
    // the player card-flips from 3/4 view to profile, then the new arena unfolds from the horizon around them.
    renderViewShift(ctx, tr) {
      const t = tr.t / tr.dur; const fF = tr.focusFrom, fT = tr.focusTo;
      const W = R6.W, H = R6.H;
      const p1 = U.clamp(t / 0.34, 0, 1), p2 = U.clamp((t - 0.34) / 0.28, 0, 1), p3 = U.clamp((t - 0.62) / 0.38, 0, 1);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      // phase 1-2: old snapshot zooms & tilts toward horizon
      if (p2 < 1) {
        const z = 1 + U.ease.inCubic(p1) * 0.9;
        const sq = 1 - U.ease.inOutCubic(p2) * 0.94;
        const cx = U.lerp(fF.x, W / 2, U.ease.inOut(p1)), cy = U.lerp(fF.y, H * 0.55, U.ease.inOut(p1));
        ctx.save();
        ctx.globalAlpha = 1 - p2 * 0.3;
        // slice-based perspective tilt: upper rows compress more
        const slices = 24;
        for (let i = 0; i < slices; i++) {
          const sy = i / slices * H, sh = H / slices;
          const rel = (sy - fF.y) / H; // negative above focus
          const persp = 1 + Math.max(0, -rel) * p2 * 1.6;
          const dy0 = cy + (sy - fF.y) * z * sq / persp;
          const dy1 = cy + (sy + sh - fF.y) * z * sq / (1 + Math.max(0, -(rel + 1 / slices)) * p2 * 1.6);
          const wS = z / (1 + Math.max(0, -rel) * p2 * 0.5);
          const dx = cx - fF.x * wS;
          ctx.drawImage(E.bufA, 0, sy, W, sh + 1, dx, dy0, W * wS, Math.max(0.5, dy1 - dy0) + 0.5);
        }
        ctx.restore();
        // speed lines
        if (p1 > 0.4) {
          ctx.save(); ctx.globalAlpha = 0.35 * Math.sin(Math.min(1, (t - 0.12) / 0.5) * Math.PI); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          for (let i = 0; i < 26; i++) { const an = i / 26 * U.TAU + E.rt; const r0 = 260 + (i * 37 % 90), r1 = r0 + 180; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(an) * r0, H * 0.55 + Math.sin(an) * r0); ctx.lineTo(W / 2 + Math.cos(an) * r1, H * 0.55 + Math.sin(an) * r1); ctx.stroke(); }
          ctx.restore();
        }
      }
      // phase 3: new scene unfolds from the horizon band
      if (p2 > 0.5) {
        const b = E.bufB.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
        try { E.scene.render(b); } catch (e) { E.reportError(e); }
        const unf = U.ease.outCubic(p3);
        const sq = U.lerp(0.06, 1, unf); const z = U.lerp(1.35, 1, unf);
        const cy = fT.y;
        ctx.save(); ctx.globalAlpha = U.clamp((p2 - 0.5) * 2, 0, 1);
        ctx.translate(fT.x, cy); ctx.scale(z, z * sq); ctx.translate(-fT.x, -cy);
        ctx.drawImage(E.bufB, 0, 0);
        ctx.restore();
      }
      // the SAME player (same look) card-flips from top-down to profile — never swapped
      if (fF.look && t < 0.9) {
        const k = U.clamp((t - 0.2) / 0.55, 0, 1);
        const flip = Math.cos(k * Math.PI); // 1 → -1
        const x = U.lerp(W / 2, fT.x, U.ease.inOut(k));
        const y = U.lerp(H * 0.55 + 20, fT.y, U.ease.inOut(k));
        const sc = U.lerp((fF.scale || 0.5) * 1.9, fT.scale || 1.2, U.ease.inOut(k));
        const a = U.clamp(Math.min((t - 0.15) / 0.1, (0.9 - t) / 0.15), 0, 1);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(Math.max(0.05, Math.abs(flip)), 1);
        ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 20;
        R6.Char.draw(ctx, fF.look, 0, 0, { view: flip > 0 ? 'front' : 'side', dir: fT.facing || 1, anim: 'walk', t: E.rt, scale: sc, shadow: false });
        ctx.restore();
      }
      // vignette + bars for a cinematic feel
      R6.UI.vignette(ctx, 0.7);
      R6.UI.letterbox(ctx, Math.sin(Math.min(1, t) * Math.PI));
    },

    after(sec, fn) { E.timers.push({ t: sec, fn }); },
    slowmo(scale, dur) { E.timeScale = scale; E.slow = { t: 0, dur }; },
    flash(color = '#fff', dur = 0.3) { E.flashC = color; E.flashT = dur; E.flashD = dur; },
    shake(m, d) { if (R6.Save && !R6.Save.settings.shake) m *= 0.15; E.shakeM = Math.max(m, E.shakeT > 0 ? E.shakeM : 0); E.shakeT = Math.max(E.shakeT, d); },
    pause(on) {
      if (on === E.paused) return;
      E.paused = on;
      if (on) { R6.Audio.sfx('back'); R6.Music.duck(0.35); R6.PauseMenu && R6.PauseMenu.open(); }
      else { R6.Music.duck(1); R6.Input.clearAll(); }
    },
  };
  R6.Engine = E;
})();
