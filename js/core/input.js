/* ROUND 6 — input.js : keyboard, mouse and touch */
'use strict';
(function () {
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  const mouse = { x: 640, y: 360, down: false, pressed: false, released: false, rdown: false, rpressed: false, rreleased: false, wheel: 0, moved: false, dx: 0, dy: 0 };

  const ACTIONS = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    run: ['ShiftLeft', 'ShiftRight'],
    action: ['Space'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    interact: ['KeyE'],
    confirm: ['Enter', 'Space', 'NumpadEnter'],
    back: ['Escape', 'Backspace'],
    pause: ['Escape', 'KeyP'],
    alt: ['KeyQ'],
    punch: ['KeyJ'],
    kick: ['KeyK'],
    grab: ['KeyL'],
    block: ['KeyI', 'ControlLeft'],
    dodge: ['ShiftLeft', 'ShiftRight'],
    tab: ['Tab'],
    sneak: ['KeyC', 'ControlLeft'],
    skip: ['Escape'],
    ff: ['Space', 'Enter'],
  };

  const Input = {
    mouse,
    lastDevice: 'kb',
    enabled: true,
    canvas: null,
    toLogical: null,
    down: code => held.has(code),
    pressed: code => pressed.has(code),
    released: code => released.has(code),
    act(name) { const k = ACTIONS[name]; if (!k) return false; for (let i = 0; i < k.length; i++) if (held.has(k[i])) return true; return false; },
    actP(name) { const k = ACTIONS[name]; if (!k) return false; for (let i = 0; i < k.length; i++) if (pressed.has(k[i])) return true; return false; },
    actR(name) { const k = ACTIONS[name]; if (!k) return false; for (let i = 0; i < k.length; i++) if (released.has(k[i])) return true; return false; },
    axis() {
      let x = 0, y = 0;
      if (Input.act('left')) x -= 1;
      if (Input.act('right')) x += 1;
      if (Input.act('up')) y -= 1;
      if (Input.act('down')) y += 1;
      if (Input.touchAxis && (Input.touchAxis.x || Input.touchAxis.y)) { x = Input.touchAxis.x; y = Input.touchAxis.y; }
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },
    digitP() {
      for (let i = 1; i <= 9; i++) if (pressed.has('Digit' + i) || pressed.has('Numpad' + i)) return i;
      return 0;
    },
    anyP() { return pressed.size > 0 || mouse.pressed; },
    confirmP() { return Input.actP('confirm') || mouse.pressed; },
    endFrame() {
      pressed.clear(); released.clear();
      mouse.pressed = false; mouse.released = false; mouse.rpressed = false; mouse.rreleased = false;
      mouse.wheel = 0; mouse.moved = false; mouse.dx = 0; mouse.dy = 0;
    },
    clearAll() { held.clear(); pressed.clear(); released.clear(); mouse.down = false; mouse.rdown = false; },
    touchAxis: null,
    onKeyHooks: [],
    init(canvas, toLogical) {
      Input.canvas = canvas; Input.toLogical = toLogical;
      window.addEventListener('keydown', e => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
        R6.Audio && R6.Audio.unlock();
        Input.lastDevice = 'kb';
        if (!held.has(e.code)) pressed.add(e.code);
        held.add(e.code);
        for (const h of Input.onKeyHooks) h(e);
      });
      window.addEventListener('keyup', e => { held.delete(e.code); released.add(e.code); });
      window.addEventListener('blur', () => { held.clear(); mouse.down = false; mouse.rdown = false; });
      const setPos = (cx, cy) => {
        const p = toLogical(cx, cy);
        mouse.dx += p.x - mouse.x; mouse.dy += p.y - mouse.y;
        mouse.x = p.x; mouse.y = p.y; mouse.moved = true;
      };
      canvas.addEventListener('mousemove', e => { setPos(e.clientX, e.clientY); Input.lastDevice = 'mouse'; });
      canvas.addEventListener('mousedown', e => {
        R6.Audio && R6.Audio.unlock();
        canvas.focus();
        setPos(e.clientX, e.clientY);
        Input.lastDevice = 'mouse';
        if (e.button === 2) { mouse.rdown = true; mouse.rpressed = true; }
        else { mouse.down = true; mouse.pressed = true; }
      });
      window.addEventListener('mouseup', e => {
        if (e.button === 2) { mouse.rdown = false; mouse.rreleased = true; }
        else { mouse.down = false; mouse.released = true; }
      });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      canvas.addEventListener('wheel', e => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
      // touch → mouse emulation + virtual stick on left half when a scene enables it
      canvas.addEventListener('touchstart', e => {
        R6.Audio && R6.Audio.unlock();
        const t = e.changedTouches[0];
        setPos(t.clientX, t.clientY);
        mouse.down = true; mouse.pressed = true; Input.lastDevice = 'touch';
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchmove', e => { const t = e.changedTouches[0]; setPos(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
      canvas.addEventListener('touchend', e => { mouse.down = false; mouse.released = true; e.preventDefault(); }, { passive: false });
    },
    // for automated tests
    simKey(code, down) {
      if (down) { if (!held.has(code)) pressed.add(code); held.add(code); }
      else { held.delete(code); released.add(code); }
    },
    simTap(code) { pressed.add(code); held.add(code); setTimeout(() => { held.delete(code); released.add(code); }, 60); },
    keyName(action) {
      const map = { KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', Space: 'ESPAÇO', Enter: 'ENTER', Escape: 'ESC', KeyE: 'E', KeyQ: 'Q', ShiftLeft: 'SHIFT', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyI: 'I', Tab: 'TAB', KeyC: 'C' };
      const k = ACTIONS[action]; return k ? (map[k[0]] || k[0]) : action;
    },
  };
  R6.Input = Input;
})();
