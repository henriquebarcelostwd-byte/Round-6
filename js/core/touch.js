/* ROUND 6 — touch.js : on-screen controls for phones/tablets — floating joystick (left), action buttons (right),
   pause/skip/relations shortcuts, a back button in menus, and a DOM text prompt for typing names/numbers */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  const STICK_R = 70;

  const T = {
    on: false, touches: new Map(), stick: null, dirs: new Set(), pressedBtn: new Set(),
    portrait: false,
    mode() {
      const E = R6.Engine, sc = E.scene;
      if (!sc) return 'menu';
      if (E.paused) return 'paused';
      if (!sc.pausable) return 'menu';
      return 'play';
    },
    stickActive() {
      const E = R6.Engine, sc = E.scene;
      if (T.mode() !== 'play' || E.trans || (R6.Dialog.active && !(R6.Dialog.cur && R6.Dialog.cur.auto))) return false;
      if (sc.runner && sc.runner.update) return false;
      if (sc.phase === 'rules' || sc.phase === 'result') return false;
      return true;
    },
    buttons() {
      const m = T.mode(), sc = R6.Engine.scene;
      if (m === 'paused') return [];
      if (m === 'menu') return sc && (sc.name === 'menu' || sc.name === 'credits' || sc.name === 'winner') ? [] : [{ code: 'Escape', label: 'VOLTAR', x: 1206, y: 664, r: 30 }];
      const B = [
        { code: 'Space', label: 'ESPAÇO', x: 1182, y: 612, r: 50 },
        { code: 'KeyE', label: 'E', x: 1076, y: 652, r: 36 },
        { code: 'ShiftLeft', label: 'SHIFT', x: 1090, y: 546, r: 34 },
        { code: 'KeyQ', label: 'Q', x: 1186, y: 498, r: 30 },
        { code: 'KeyP', label: 'II', x: 318, y: 46, r: 22 },
        { code: 'Escape', label: 'ESC', x: 372, y: 46, r: 22 },
      ];
      // extra keys only where they are used: combat/stealth games and the dorm
      const n = sc && sc.name || '';
      if (/squidfinal|skysquid|revolt|escape|hideseek|sixlegs|stone|jegi|top|gonggi|hub/.test(n)) {
        ['J', 'K', 'L', 'I', 'C'].forEach((k, i) => B.push({ code: 'Key' + k, label: k, x: 1000 + i * 52, y: 426, r: 22 }));
      }
      if (n.startsWith('hub')) B.push({ code: 'Tab', label: 'TAB', x: 426, y: 46, r: 22 });
      if (n === 'tugofwar') B.push({ code: 'Digit1', label: '1', x: 1000, y: 426, r: 26 }, { code: 'Digit2', label: '2', x: 1060, y: 426, r: 26 });
      return B;
    },
    hit(p) { return T.buttons().find(b => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= (b.r + 10) ** 2); },
    // ---- event routing (called by input.js); return true when the touch is consumed here
    start(t, p) {
      T.on = true;
      const b = T.hit(p);
      if (b) { T.touches.set(t.identifier, { kind: 'btn', b }); T.pressedBtn.add(b.code); R6.Input.simKey(b.code, true); return true; }
      if (T.stickActive() && !T.stick && p.x < R6.W * 0.46 && p.y > 170) {
        const s = { kind: 'stick', ox: p.x, oy: p.y, x: p.x, y: p.y }; T.touches.set(t.identifier, s); T.stick = s; T.updStick(); return true;
      }
      return false;
    },
    move(t, p) {
      const s = T.touches.get(t.identifier); if (!s) return false;
      if (s.kind === 'stick') { s.x = p.x; s.y = p.y; T.updStick(); }
      return true;
    },
    end(t) {
      const s = T.touches.get(t.identifier); if (!s) return false;
      T.touches.delete(t.identifier);
      if (s.kind === 'btn') { T.pressedBtn.delete(s.b.code); R6.Input.simKey(s.b.code, false); }
      if (s.kind === 'stick') { T.stick = null; R6.Input.touchAxis = null; for (const k of T.dirs) R6.Input.simKey(k, false); T.dirs.clear(); }
      return true;
    },
    updStick() {
      const s = T.stick; let dx = s.x - s.ox, dy = s.y - s.oy; const l = Math.hypot(dx, dy);
      if (l > STICK_R) { dx *= STICK_R / l; dy *= STICK_R / l; }
      let ax = dx / STICK_R, ay = dy / STICK_R; if (Math.hypot(ax, ay) < 0.18) { ax = 0; ay = 0; }
      R6.Input.touchAxis = { x: ax, y: ay };
      const want = new Set(); if (ax < -0.45) want.add('KeyA'); if (ax > 0.45) want.add('KeyD'); if (ay < -0.5) want.add('KeyW'); if (ay > 0.5) want.add('KeyS');
      for (const k of T.dirs) if (!want.has(k)) R6.Input.simKey(k, false);
      for (const k of want) if (!T.dirs.has(k)) R6.Input.simKey(k, true);
      T.dirs = want;
    },
    // ---- drawing (screen space, on top of everything)
    draw(ctx) {
      if (!T.on) return;
      ctx.save();
      for (const b of T.buttons()) {
        const down = T.pressedBtn.has(b.code);
        ctx.globalAlpha = down ? 0.9 : 0.55;
        ctx.fillStyle = down ? 'rgba(232,51,109,.75)' : 'rgba(10,12,16,.45)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
        R6.UI.text(ctx, b.label, b.x, b.y + 1, { size: b.label.length > 3 ? Math.max(10, b.r * 0.34) : b.r * 0.62, align: 'center', base: 'middle', color: '#fff', weight: 800 });
      }
      ctx.globalAlpha = 1;
      const s = T.stick;
      if (s) {
        ctx.globalAlpha = 0.6; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.fillStyle = 'rgba(10,12,16,.35)';
        ctx.beginPath(); ctx.arc(s.ox, s.oy, STICK_R, 0, TAU); ctx.fill(); ctx.stroke();
        let dx = s.x - s.ox, dy = s.y - s.oy; const l = Math.hypot(dx, dy); if (l > STICK_R) { dx *= STICK_R / l; dy *= STICK_R / l; }
        ctx.fillStyle = 'rgba(232,51,109,.8)'; ctx.beginPath(); ctx.arc(s.ox + dx, s.oy + dy, 30, 0, TAU); ctx.fill();
      } else if (T.stickActive()) {
        ctx.globalAlpha = 0.22; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(170, 570, STICK_R, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(170, 570, 26, 0, TAU); ctx.stroke();
        R6.UI.text(ctx, 'MOVER', 170, 574, { size: 13, align: 'center', base: 'middle', color: '#fff', weight: 800 });
      }
      ctx.restore();
      if (window.innerHeight > window.innerWidth) {
        ctx.save(); ctx.fillStyle = 'rgba(232,51,109,.92)'; ctx.fillRect(0, 0, R6.W, 44);
        R6.UI.text(ctx, '↻ Gire o aparelho para a horizontal para jogar melhor', R6.W / 2, 29, { size: 20, align: 'center', color: '#fff', weight: 800 });
        ctx.restore();
      }
    },
    get isTouch() { return T.on || ('ontouchstart' in window) || navigator.maxTouchPoints > 0; },
  };

  // DOM text prompt (brings up the phone keyboard); cb(value|null)
  R6.textPrompt = function (title, initial, o, cb) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:16px;';
    const box = document.createElement('form');
    box.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:min(420px,100%);padding:20px;background:#0c0e14;border:1px solid rgba(232,51,109,.6);border-radius:8px;font-family:"Barlow Semi Condensed",Arial,sans-serif;color:#f2efe9;';
    const lab = document.createElement('label'); lab.textContent = title; lab.htmlFor = 'r6-prompt'; lab.style.cssText = 'font-weight:800;letter-spacing:.15em;font-size:14px;color:#bbb;';
    const inp = document.createElement('input'); inp.id = 'r6-prompt'; inp.value = initial || ''; inp.maxLength = o.max || 14; inp.autocomplete = 'off';
    if (o.numeric) { inp.inputMode = 'numeric'; inp.pattern = '[0-9]*'; }
    inp.style.cssText = 'font:800 28px "Barlow Semi Condensed",Arial,sans-serif;padding:10px 12px;border-radius:6px;border:1px solid #444;background:#050608;color:#fff;';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    const mk = (txt, bg) => { const b = document.createElement('button'); b.type = txt === 'OK' ? 'submit' : 'button'; b.textContent = txt; b.style.cssText = 'font:800 18px "Barlow Semi Condensed",Arial,sans-serif;padding:10px 18px;border-radius:6px;border:none;cursor:pointer;color:#fff;background:' + bg; return b; };
    const cancel = mk('CANCELAR', '#333'), ok = mk('OK', '#e8336d');
    row.append(cancel, ok); box.append(lab, inp, row); wrap.append(box); document.body.append(wrap);
    const stop = e => e.stopPropagation();
    ['keydown', 'keyup', 'touchstart', 'touchend', 'mousedown'].forEach(ev => wrap.addEventListener(ev, stop));
    const close = v => { wrap.remove(); R6.Input.clearAll(); const c = document.getElementById('game'); if (c) c.focus(); cb(v); };
    box.addEventListener('submit', e => { e.preventDefault(); close(inp.value); });
    cancel.addEventListener('click', () => close(null));
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  };

  R6.Touch = T;
})();
