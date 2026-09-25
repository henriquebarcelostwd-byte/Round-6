/* ROUND 6 — props.js : dolls, piggy bank prize, bunks, coffins, cards, ddakji and other shared props */
'use strict';
(function () {
  const U = R6.U, TAU = U.TAU;
  function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, c, rot = 0) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); ctx.fill(); }

  const Props = {};

  // Young-hee style giant doll. x,y = feet. o.face: 1 = facing viewer, 0 = facing away (turn animation in between)
  Props.doll = function (ctx, x, y, s, o = {}) {
    const t = o.t || 0; const face = o.face != null ? o.face : 1; const glow = o.glow || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 60, 12, 0, 0, TAU); ctx.fill();
    // legs + socks + shoes
    for (const sx of [-16, 16]) {
      ctx.fillStyle = '#f6d6b8'; ctx.fillRect(sx - 7, -80, 14, 60);
      ctx.fillStyle = '#f5f2ea'; ctx.fillRect(sx - 8, -30, 16, 22);
      ctx.fillStyle = '#1f1a17'; ctx.beginPath(); ctx.ellipse(sx, -6, 13, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2f2a'; ctx.fillRect(sx - 12, -12, 24, 3);
    }
    // dress
    const dg = ctx.createLinearGradient(-55, 0, 55, 0); dg.addColorStop(0, '#d8741a'); dg.addColorStop(0.5, '#f29034'); dg.addColorStop(1, '#c9650f');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(-34, -190); ctx.lineTo(34, -190); ctx.quadraticCurveTo(52, -120, 60, -78); ctx.lineTo(-60, -78); ctx.quadraticCurveTo(-52, -120, -34, -190); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 10, -150); ctx.lineTo(i * 22, -80); ctx.stroke(); }
    // shirt (yellow) + collar
    ctx.fillStyle = '#f5cf3a'; ctx.beginPath(); ctx.moveTo(-32, -232); ctx.lineTo(32, -232); ctx.lineTo(36, -188); ctx.lineTo(-36, -188); ctx.closePath(); ctx.fill();
    // straps
    ctx.fillStyle = '#e57f22'; ctx.fillRect(-26, -232, 9, 44); ctx.fillRect(17, -232, 9, 44);
    circ(ctx, -21.5, -200, 3.5, '#fff'); circ(ctx, 21.5, -200, 3.5, '#fff');
    // arms
    ctx.strokeStyle = '#f5cf3a'; ctx.lineCap = 'round'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(-34, -226); ctx.lineTo(-44, -180); ctx.moveTo(34, -226); ctx.lineTo(44, -180); ctx.stroke();
    ctx.strokeStyle = '#f6d6b8'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-44, -182); ctx.lineTo(-46, -150); ctx.moveTo(44, -182); ctx.lineTo(46, -150); ctx.stroke();
    circ(ctx, -46, -146, 8, '#f6d6b8'); circ(ctx, 46, -146, 8, '#f6d6b8');
    // neck
    ctx.fillStyle = '#efc9a8'; ctx.fillRect(-9, -246, 18, 16);
    // head: rotates around vertical axis — face visibility = face
    ctx.save(); ctx.translate(0, -284);
    const hr = 44;
    // hair back
    ctx.fillStyle = '#16110e'; ctx.beginPath(); ctx.ellipse(0, 4, hr * 1.08, hr * 1.02, 0, 0, TAU); ctx.fill();
    // pigtails
    const tw = Math.sin(t * 2) * 0.05;
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.translate(sx * hr * 1.05, 8); ctx.rotate(sx * (0.35 + tw));
      ctx.fillStyle = '#16110e'; ctx.beginPath(); ctx.ellipse(0, 18, 13, 24, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f5cf3a'; ctx.fillRect(-9, -6, 18, 7);
      ctx.restore();
    }
    const fv = U.clamp(face, 0, 1);
    if (fv > 0.02) {
      const w = hr * (0.35 + 0.65 * fv);
      const offx = (1 - fv) * hr * 0.6 * (o.turnDir || 1);
      ctx.save(); ctx.translate(offx, 0);
      ctx.fillStyle = '#f7d9bd'; ctx.beginPath(); ctx.ellipse(0, 8, w * 0.92, hr * 0.88, 0, 0, TAU); ctx.fill();
      // bangs
      ctx.fillStyle = '#16110e'; ctx.beginPath(); ctx.ellipse(0, -18, w * 0.98, hr * 0.5, 0, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-w * 0.98, -18); ctx.lineTo(w * 0.98, -18); ctx.lineTo(w * 0.9, -8); ctx.lineTo(-w * 0.9, -8); ctx.fill();
      // eyes
      for (const sx of [-1, 1]) {
        const ex = sx * w * 0.38, ey = 8;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, w * 0.16, 10, 0, 0, TAU); ctx.fill();
        const pc = glow > 0 ? U.mix('#1e1a18', '#ff1133', glow) : '#1e1a18';
        circ(ctx, ex + (o.lookX || 0) * 4, ey + 1, 7, pc);
        circ(ctx, ex - 2, ey - 3, 2.2, '#fff');
        if (glow > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 30); g.addColorStop(0, `rgba(255,30,60,${glow * 0.9})`); g.addColorStop(1, 'rgba(255,0,40,0)'); ctx.fillStyle = g; ctx.fillRect(ex - 30, ey - 30, 60, 60); ctx.restore(); }
        ctx.strokeStyle = '#1e1a18'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - w * 0.16, ey - 12); ctx.lineTo(ex + w * 0.16, ey - 11); ctx.stroke();
      }
      ctx.globalAlpha *= 0.4; circ(ctx, -w * 0.55, 26, 8, '#f08a8a'); circ(ctx, w * 0.55, 26, 8, '#f08a8a'); ctx.globalAlpha /= 0.4;
      ctx.strokeStyle = '#b3473f'; ctx.lineWidth = 2.5; ctx.beginPath();
      if (o.talking) { ell(ctx, 0, 33, 5, 3 + Math.abs(Math.sin(t * 14)) * 4, '#8c2f2a'); } else { ctx.arc(0, 26, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
      ctx.restore();
    } else {
      ctx.fillStyle = '#16110e'; ctx.beginPath(); ctx.ellipse(0, 4, hr * 1.08, hr * 1.02, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2b221c'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -40); ctx.quadraticCurveTo(i * 12, 0, i * 11, 40); ctx.stroke(); }
    }
    ctx.restore();
    ctx.restore();
  };

  // Chul-su (boy doll) for Jump Rope
  Props.chulsu = function (ctx, x, y, s, o = {}) {
    const t = o.t || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 56, 11, 0, 0, TAU); ctx.fill();
    for (const sx of [-16, 16]) { ctx.fillStyle = '#f6d6b8'; ctx.fillRect(sx - 7, -70, 14, 50); ctx.fillStyle = '#fff'; ctx.fillRect(sx - 8, -28, 16, 20); ctx.fillStyle = '#243b8a'; ctx.beginPath(); ctx.ellipse(sx, -6, 13, 8, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2b4fa8'; ctx.fillRect(-38, -120, 76, 52); // shorts/overall
    ctx.fillStyle = '#f5cf3a'; ctx.beginPath(); ctx.moveTo(-34, -236); ctx.lineTo(34, -236); ctx.lineTo(40, -118); ctx.lineTo(-40, -118); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b4fa8'; ctx.fillRect(-26, -236, 9, 120); ctx.fillRect(17, -236, 9, 120);
    const arm = o.armAng || 0;
    ctx.strokeStyle = '#f5cf3a'; ctx.lineCap = 'round'; ctx.lineWidth = 16;
    ctx.save(); ctx.translate(36, -224); ctx.rotate(-arm); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 45); ctx.stroke(); circ(ctx, 0, 52, 9, '#f6d6b8'); ctx.restore();
    ctx.save(); ctx.translate(-36, -224); ctx.rotate(arm * 0.2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 45); ctx.stroke(); circ(ctx, 0, 52, 9, '#f6d6b8'); ctx.restore();
    ctx.fillStyle = '#efc9a8'; ctx.fillRect(-9, -250, 18, 16);
    ctx.save(); ctx.translate(0, -288);
    ctx.fillStyle = '#f7d9bd'; ctx.beginPath(); ctx.ellipse(0, 4, 44, 42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#221a15'; ctx.beginPath(); ctx.ellipse(0, -8, 45, 36, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(-45, -9, 90, 6);
    for (const sx of [-1, 1]) { const ex = sx * 16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, 6, 8, 10, 0, 0, TAU); ctx.fill(); circ(ctx, ex, 7, 6, o.glow ? U.mix('#1e1a18', '#ff1133', o.glow) : '#1e1a18'); circ(ctx, ex - 2, 3, 2, '#fff'); }
    ctx.strokeStyle = '#b3473f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 22, 7, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.globalAlpha *= 0.4; circ(ctx, -28, 20, 7, '#f08a8a'); circ(ctx, 28, 20, 7, '#f08a8a');
    ctx.restore();
    ctx.restore();
  };

  // Giant transparent piggy-bank sphere with money inside. fill 0..1
  Props.piggy = function (ctx, x, y, r, fill, t = 0, o = {}) {
    ctx.save(); ctx.translate(x, y);
    // cable
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r - (o.cable || 260)); ctx.stroke();
    // glow
    const gg = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6); gg.addColorStop(0, 'rgba(255,220,120,.25)'); gg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = gg; ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);
    // inside money pile
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.97, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(40,50,60,.35)'; ctx.fillRect(-r, -r, r * 2, r * 2);
    const level = r - fill * r * 2;
    const g = ctx.createLinearGradient(0, level, 0, r); g.addColorStop(0, '#f4d58d'); g.addColorStop(1, '#b8902f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-r, r);
    for (let i = 0; i <= 20; i++) { const xx = -r + i / 20 * r * 2; ctx.lineTo(xx, level + Math.sin(i * 1.7 + t * 0.5) * 4); }
    ctx.lineTo(r, r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,20,.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const xx = ((i * 37) % (r * 2)) - r, yy = level + 8 + ((i * 53) % Math.max(1, r * 2)); if (yy < r) { ctx.save(); ctx.translate(xx, yy); ctx.rotate((i * 0.7) % 1 - 0.5); ctx.strokeRect(-9, -4, 18, 8); ctx.restore(); } }
    ctx.restore();
    // glass sphere
    const sg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    sg.addColorStop(0, 'rgba(255,255,255,.45)'); sg.addColorStop(0.35, 'rgba(255,255,255,.08)'); sg.addColorStop(1, 'rgba(200,230,255,.22)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
    // pig features: ears, snout, legs
    ctx.fillStyle = 'rgba(255,190,210,.55)';
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.8); ctx.lineTo(-r * 0.3, -r * 1.1); ctx.lineTo(-r * 0.15, -r * 0.92); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.8); ctx.lineTo(r * 0.3, -r * 1.1); ctx.lineTo(r * 0.15, -r * 0.92); ctx.fill();
    ell(ctx, 0, r * 0.1, r * 0.26, r * 0.18, 'rgba(255,190,210,.45)');
    circ(ctx, -r * 0.08, r * 0.1, r * 0.04, 'rgba(120,40,60,.6)'); circ(ctx, r * 0.08, r * 0.1, r * 0.04, 'rgba(120,40,60,.6)');
    // coin slot
    ctx.fillStyle = 'rgba(30,30,30,.6)'; ctx.fillRect(-r * 0.2, -r * 0.99, r * 0.4, 4);
    // highlight
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke();
    ctx.restore();
  };

  // Ddakji (folded paper tile). flip: 0 = face-up (colorA), PI = flipped; viewed from a low angle (perspective squash)
  Props.ddakji = function (ctx, x, y, size, colA, colB, flip = 0, squash = 0.45, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const c = Math.cos(flip); const top = c >= 0 ? colA : colB;
    const hh = size * squash * Math.abs(c) + 1.5;
    // thickness
    ctx.fillStyle = U.shade(top, -0.35); ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(0, -hh); ctx.lineTo(size, 0); ctx.lineTo(size, 4); ctx.lineTo(0, hh + 4); ctx.lineTo(-size, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(0, -hh); ctx.lineTo(size, 0); ctx.lineTo(0, hh); ctx.closePath(); ctx.fill();
    // folds
    ctx.strokeStyle = U.shade(top, -0.25); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-size * 0.5, -hh * 0.5); ctx.lineTo(size * 0.5, hh * 0.5); ctx.moveTo(size * 0.5, -hh * 0.5); ctx.lineTo(-size * 0.5, hh * 0.5); ctx.stroke();
    ctx.fillStyle = U.shade(top, 0.15); ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(0, -hh); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // Black coffin with pink ribbon (top-down or side)
  Props.coffin = function (ctx, x, y, w, h, o = {}) {
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 5, w, h);
    ctx.fillStyle = '#131316'; ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.3); ctx.lineTo(-w * 0.35, -h / 2); ctx.lineTo(w * 0.35, -h / 2); ctx.lineTo(w / 2, -h * 0.3); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#e8336d'; ctx.fillRect(-w / 2, -2, w, 4); ctx.fillRect(-2, -h / 2, 4, h);
    ctx.beginPath(); ctx.ellipse(-6, -2, 7, 4, -0.5, 0, TAU); ctx.ellipse(6, -2, 7, 4, 0.5, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // Invitation card (shapes front; phone number back)
  Props.card = function (ctx, x, y, w, o = {}) {
    const h = w * 0.58;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    const flip = o.flip || 0; const sx = Math.cos(flip); ctx.scale(sx, 1);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#d8b98a'); g.addColorStop(1, '#b08c5c');
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(80,60,30,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    if (sx >= 0) {
      const r = h * 0.18;
      R6.UI.shapeIcon(ctx, 'circle', -w * 0.25, 0, r, '#3b2a1a', w * 0.018);
      R6.UI.shapeIcon(ctx, 'triangle', 0, 0, r * 1.1, '#3b2a1a', w * 0.018);
      R6.UI.shapeIcon(ctx, 'square', w * 0.25, 0, r, '#3b2a1a', w * 0.018);
    } else {
      ctx.scale(-1, 1);
      R6.UI.text(ctx, '8 0 0 - 4 5 6 - ' + (o.code || '0 0 1'), 0, 4, { size: h * 0.14, align: 'center', base: 'middle', color: '#3b2a1a', fam: 'mono', weight: 400 });
    }
    ctx.restore();
  };

  // Bunk bed tower in 3/4 top-down view. x,y = base front-left; w in px; levels stacked upward
  Props.bunk = function (ctx, x, y, w, d, levels, o = {}) {
    const lh = 26; // height per level
    const frame = '#dcdcd6', frameD = '#a7a7a0';
    // back posts
    ctx.fillStyle = frameD; ctx.fillRect(x, y - d - lh * levels, 4, lh * levels); ctx.fillRect(x + w - 4, y - d - lh * levels, 4, lh * levels);
    for (let i = 0; i < levels; i++) {
      const by = y - i * lh;
      // mattress top
      ctx.fillStyle = o.occupied && o.occupied[i] ? '#cfd6d8' : '#e9ece8';
      ctx.fillRect(x + 3, by - d - 10, w - 6, d);
      ctx.fillStyle = '#f7f8f4'; ctx.fillRect(x + 4, by - d - 10, 16, d); // pillow
      // blanket
      ctx.fillStyle = '#9fb3b8'; ctx.fillRect(x + w * 0.45, by - d - 10, w * 0.5, d);
      // side face
      ctx.fillStyle = frame; ctx.fillRect(x, by - 10, w, 6);
      ctx.fillStyle = frameD; ctx.fillRect(x, by - 4, w, 2);
    }
    // front posts + ladder
    ctx.fillStyle = frame; ctx.fillRect(x, y - lh * levels - 6, 4, lh * levels + 6); ctx.fillRect(x + w - 4, y - lh * levels - 6, 4, lh * levels + 6);
    if (o.ladder) { ctx.strokeStyle = '#b9b9b2'; ctx.lineWidth = 2; for (let i = 0; i < levels * 3; i++) { const ly = y - i * lh / 3 - 4; ctx.beginPath(); ctx.moveTo(x + w - 12, ly); ctx.lineTo(x + w - 4, ly); ctx.stroke(); } }
  };

  // Security camera (wall mounted), angle a
  Props.camera = function (ctx, x, y, a, o = {}) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#2c2f36'; ctx.fillRect(-3, -8, 6, 8);
    ctx.rotate(a); ctx.fillStyle = '#e4e4e0'; ctx.fillRect(-4, -5, 18, 10); ctx.fillStyle = '#1b1d22'; ctx.fillRect(12, -4, 5, 8);
    circ(ctx, 0, -3, 1.8, (Math.floor((o.t || 0) * 2) % 2) ? '#ff3344' : '#551111');
    ctx.restore();
  };

  // Round dining table (top-down) with trays
  Props.tray = function (ctx, x, y, o = {}) {
    ctx.fillStyle = '#c9ccce'; ctx.fillRect(x - 12, y - 8, 24, 16);
    ctx.fillStyle = '#b3b6b8'; ctx.fillRect(x - 12, y + 6, 24, 2);
    if (o.food !== false) { circ(ctx, x - 5, y - 1, 4, '#f5efe0'); ctx.fillStyle = '#3f6fb5'; ctx.fillRect(x + 3, y - 5, 5, 9); }
  };

  // Stack of banknotes
  Props.money = function (ctx, x, y, w, h, n = 1) {
    for (let i = 0; i < n; i++) {
      const yy = y - i * 3;
      ctx.fillStyle = '#d8b24c'; ctx.fillRect(x - w / 2, yy - h / 2, w, h);
      ctx.strokeStyle = 'rgba(90,70,20,.5)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 2, yy - h / 2 + 2, w - 4, h - 4);
      ctx.fillStyle = '#b89430'; ctx.fillRect(x - 3, yy - h / 2, 6, h);
    }
  };

  // Stylized tree (the one behind the doll)
  Props.tree = function (ctx, x, y, s, t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#5a3f2b'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-8, -150); ctx.lineTo(8, -150); ctx.lineTo(14, 0); ctx.fill();
    ctx.strokeStyle = '#5a3f2b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(-50, -185); ctx.moveTo(0, -140); ctx.lineTo(55, -200); ctx.moveTo(-20, -160); ctx.lineTo(-30, -220); ctx.stroke();
    const leaves = [['#3f7a3a', -50, -200, 48], ['#4a8a42', 40, -215, 52], ['#3a6e35', -5, -240, 58], ['#55963f', -70, -170, 34], ['#468540', 70, -180, 36]];
    for (const [c, lx, ly, lr] of leaves) { circ(ctx, lx + Math.sin(t + lx) * 1.5, ly, lr, c); }
    ctx.globalAlpha = 0.25; for (const [c, lx, ly, lr] of leaves) circ(ctx, lx - lr * 0.3, ly - lr * 0.3, lr * 0.5, '#a8d68c');
    ctx.restore();
  };

  // Loudspeaker horn
  Props.speaker = function (ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(26, -16); ctx.lineTo(26, 16); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8e94'; ctx.fillRect(-8, -6, 8, 12); ctx.fillStyle = '#2a2c30'; ctx.beginPath(); ctx.ellipse(26, 0, 4, 16, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // Glass panel (side view, slight perspective) — broken flag renders frame only
  Props.glassPanel = function (ctx, x, y, w, d, o = {}) {
    const h = 10;
    ctx.save();
    // frame
    ctx.fillStyle = '#4b4f58'; ctx.fillRect(x - 3, y - 2, w + 6, h + 4);
    if (!o.broken) {
      const g = ctx.createLinearGradient(x, y - d, x + w, y + h);
      g.addColorStop(0, 'rgba(200,235,255,.65)'); g.addColorStop(0.5, 'rgba(160,210,240,.45)'); g.addColorStop(1, 'rgba(220,245,255,.7)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 0.4, y - d); ctx.lineTo(x + w + d * 0.4, y - d); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(180,220,245,.55)'; ctx.fillRect(x, y, w, h * 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + w * 0.15 + d * 0.3, y - d * 0.8); ctx.lineTo(x + w * 0.35 + d * 0.05, y - d * 0.1); ctx.stroke();
      if (o.cracked) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); const cx = x + w / 2 + d * 0.2, cy = y - d / 2; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w * 0.4, cy + Math.sin(a) * d * 0.45); } ctx.stroke(); }
      if (o.glint) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${o.glint * 0.5})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 0.4, y - d); ctx.lineTo(x + w + d * 0.4, y - d); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); ctx.restore(); }
    } else {
      ctx.strokeStyle = '#6b707a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 0.4, y - d); ctx.lineTo(x + w + d * 0.4, y - d); ctx.lineTo(x + w, y); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(200,235,255,.5)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 4); ctx.lineTo(x + 3, y - 10); ctx.fill();
    }
    ctx.restore();
  };

  // Big red button (Sky Squid)
  Props.button = function (ctx, x, y, s, pressed, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(-18, -10, 36, 12); ctx.fillStyle = '#1b1d21'; ctx.fillRect(-18, 0, 36, 4);
    ctx.fillStyle = pressed ? '#8a1020' : '#e0203a'; ctx.beginPath(); ctx.ellipse(0, pressed ? -10 : -14, 13, 6, 0, 0, TAU); ctx.fill();
    ctx.fillRect(-13, pressed ? -10 : -14, 26, pressed ? 2 : 5);
    if (!pressed) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-4, -16, 5, 2, 0, 0, TAU); ctx.fill(); const a = (Math.sin(t * 5) + 1) / 2; ctx.strokeStyle = `rgba(255,60,80,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -12, 22 + a * 6, 11 + a * 3, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  };

  // Scoreboard / big display
  Props.board = function (ctx, x, y, w, h, lines, o = {}) {
    ctx.save();
    ctx.fillStyle = '#0b0d10'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#2a2e35'; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < h; i += 4) ctx.fillRect(x, y + i, w, 1);
    lines.forEach((l, i) => R6.UI.text(ctx, l.t, x + w / 2, y + (i + 1) * h / (lines.length + 1), { size: l.s || 22, align: 'center', base: 'middle', color: l.c || '#ff4d6d', fam: 'mono', weight: 400, shadow: U.rgba(l.c || '#ff4d6d', 0.8), shadowBlur: 10, shadowY: 0 }));
    ctx.restore();
  };

  R6.Props = Props;
})();
