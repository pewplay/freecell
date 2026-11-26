// ================================================================
//  Carte francesi disegnate da codice (semi tracciati, niente font).
//  card = { r: 1..13, s: 0..3 }  semi: 0 picche, 1 cuori, 2 quadri, 3 fiori
// ================================================================
(function () {
  'use strict';
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RED = '#d2273f', BLACK = '#1c1f2b';
  const isRed = s => s === 1 || s === 2;

  function suit(c, s, x, y, size, color) {
    c.save();
    c.translate(x, y);
    c.scale(size / 100, size / 100);
    c.fillStyle = color || (isRed(s) ? RED : BLACK);
    c.beginPath();
    if (s === 1) { // cuori
      c.moveTo(0, 38);
      c.bezierCurveTo(-60, -5, -48, -55, 0, -22);
      c.bezierCurveTo(48, -55, 60, -5, 0, 38);
    } else if (s === 2) { // quadri
      c.moveTo(0, -48); c.quadraticCurveTo(14, -14, 38, 0); c.quadraticCurveTo(14, 14, 0, 48);
      c.quadraticCurveTo(-14, 14, -38, 0); c.quadraticCurveTo(-14, -14, 0, -48);
    } else if (s === 0) { // picche
      c.moveTo(0, -46);
      c.bezierCurveTo(52, -4, 50, 38, 6, 22);
      c.lineTo(14, 46); c.lineTo(-14, 46); c.lineTo(-6, 22);
      c.bezierCurveTo(-50, 38, -52, -4, 0, -46);
    } else { // fiori
      c.arc(0, -20, 19, 0, Math.PI * 2);
      c.moveTo(-20, 8); c.arc(-20, 8, 19, 0, Math.PI * 2);
      c.moveTo(20, 8); c.arc(20, 8, 19, 0, Math.PI * 2);
      c.moveTo(-6, 10); c.lineTo(6, 10); c.lineTo(14, 46); c.lineTo(-14, 46); c.closePath();
    }
    c.fill();
    c.restore();
  }

  const PIPS = {
    1: [[0.5, 0.5]],
    2: [[0.5, 0.2], [0.5, 0.8]],
    3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
    4: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.8], [0.7, 0.8]],
    5: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.5], [0.3, 0.8], [0.7, 0.8]],
    6: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
    7: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
    8: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.5, 0.65], [0.3, 0.8], [0.7, 0.8]],
    9: [[0.3, 0.18], [0.7, 0.18], [0.3, 0.39], [0.7, 0.39], [0.5, 0.5], [0.3, 0.61], [0.7, 0.61], [0.3, 0.82], [0.7, 0.82]],
    10: [[0.3, 0.18], [0.7, 0.18], [0.5, 0.29], [0.3, 0.39], [0.7, 0.39], [0.3, 0.61], [0.7, 0.61], [0.5, 0.71], [0.3, 0.82], [0.7, 0.82]],
  };

  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

  // carta scoperta; hl: 'sel' | 'hint' | 'drop' | null
  function face(c, x, y, w, h, card, hl, dim) {
    const r = w * 0.09;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = w * 0.08; c.shadowOffsetY = w * 0.03;
    rr(c, x, y, w, h, r); c.fillStyle = '#fffdf8'; c.fill();
    c.restore();
    rr(c, x, y, w, h, r); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.stroke();
    const col = isRed(card.s) ? RED : BLACK;
    const fs = Math.max(10, w * 0.26);
    c.fillStyle = col;
    c.font = `800 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    c.textAlign = 'left'; c.textBaseline = 'top';
    const label = RANKS[card.r];
    c.fillText(label, x + w * 0.08, y + w * 0.07);
    suit(c, card.s, x + w * 0.08 + c.measureText(label).width + fs * 0.42, y + w * 0.07 + fs * 0.45, fs * 0.82);
    // centro: solo se la carta è abbastanza grande
    const big = h > 70;
    if (card.r <= 10) {
      if (big && card.r > 1) {
        const top = y + h * 0.34, ih = h * 0.6, ix = x + w * 0.12, iw = w * 0.76;
        for (const [px, py] of PIPS[card.r]) suit(c, card.s, ix + px * iw, top + py * ih, Math.min(w * 0.2, h * 0.1));
      } else suit(c, card.s, x + w / 2, y + h * 0.62, w * (card.r === 1 ? 0.5 : 0.38));
    } else {
      // figure: cornice colorata con iniziale e seme
      const fx = x + w * 0.14, fy = y + h * 0.33, fw = w * 0.72, fh = h * 0.58;
      const g = c.createLinearGradient(fx, fy, fx, fy + fh);
      g.addColorStop(0, isRed(card.s) ? '#ffe3e6' : '#e3e8f7'); g.addColorStop(1, isRed(card.s) ? '#ffc9d0' : '#c9d3ef');
      rr(c, fx, fy, fw, fh, w * 0.06); c.fillStyle = g; c.fill();
      c.strokeStyle = col; c.lineWidth = Math.max(1, w * 0.02); c.stroke();
      c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `900 ${fh * 0.42}px Georgia, "Times New Roman", serif`;
      c.fillText(label, fx + fw / 2, fy + fh * 0.4);
      suit(c, card.s, fx + fw / 2, fy + fh * 0.78, fh * 0.26);
      // corona per il re, punto per la regina
      if (card.r === 13) { c.beginPath(); const cx = fx + fw / 2, cy = fy + fh * 0.1, cw = fw * 0.36; c.moveTo(cx - cw / 2, cy + 6); c.lineTo(cx - cw / 2, cy - 4); c.lineTo(cx - cw / 4, cy + 1); c.lineTo(cx, cy - 6); c.lineTo(cx + cw / 4, cy + 1); c.lineTo(cx + cw / 2, cy - 4); c.lineTo(cx + cw / 2, cy + 6); c.closePath(); c.fillStyle = '#e0b030'; c.fill(); }
    }
    if (dim) { rr(c, x, y, w, h, r); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(); }
    if (hl) {
      rr(c, x - 1, y - 1, w + 2, h + 2, r);
      c.lineWidth = Math.max(2.5, w * 0.05);
      c.strokeStyle = hl === 'sel' ? '#ffb400' : hl === 'hint' ? '#2fd47a' : '#5ab8ff';
      c.stroke();
    }
  }

  function back(c, x, y, w, h, color) {
    const r = w * 0.09;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = w * 0.08; c.shadowOffsetY = w * 0.03;
    rr(c, x, y, w, h, r); c.fillStyle = '#fff'; c.fill();
    c.restore();
    const m = w * 0.06;
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, color || '#3d5afe'); g.addColorStop(1, shade(color || '#3d5afe'));
    rr(c, x + m, y + m, w - m * 2, h - m * 2, r * 0.7); c.fillStyle = g; c.fill();
    c.save(); rr(c, x + m, y + m, w - m * 2, h - m * 2, r * 0.7); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = Math.max(1, w * 0.025);
    for (let k = -h; k < w + h; k += w * 0.16) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k - h, y + h); c.stroke(); c.beginPath(); c.moveTo(x + k - h, y); c.lineTo(x + k, y + h); c.stroke(); }
    c.restore();
  }
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.round(v * 0.62));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  function slot(c, x, y, w, h, label) {
    rr(c, x, y, w, h, w * 0.09);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]);
    if (label !== undefined && label !== null) {
      if (typeof label === 'number') suit(c, label, x + w / 2, y + h / 2, w * 0.4, 'rgba(255,255,255,.22)');
      else { c.fillStyle = 'rgba(255,255,255,.3)'; c.font = `800 ${w * 0.22}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + w / 2, y + h / 2); }
    }
  }

  window.Cards = { face, back, slot, suit, isRed, RANKS };
})();
