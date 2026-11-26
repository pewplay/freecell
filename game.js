// ================================================================
//  FREECELL — PewPlay
//  @bg #123a5c
//  @accent #4fb3ff
//  @files cards.js
//  Partite numerate (seme casuale ripetibile), mosse multiple secondo
//  le celle e colonne libere, spostamento automatico delle carte sicure.
// ================================================================
(function () {
  'use strict';
  const { clamp, sfx, store } = PP;
  const C = window.Cards;

  const GAME_ID = 'freecell';
  let cols, cells, found, history, moves, time, won, gameNo;
  let geo = { cw: 60, ch: 84, x0: 0, gap: 6, top: 120 };
  let drag = null, flying = [], btns = [], autoT = 0;

  const color = c => (C.isRed(c.s) ? 1 : 0);

  // generatore ripetibile per il numero di partita
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return ((s >>> 16) & 0x7fff) / 0x8000; }; }

  function deal(n) {
    gameNo = n;
    const r = rng(n * 7919 + 17);
    const deck = [];
    for (let s = 0; s < 4; s++) for (let k = 1; k <= 13; k++) deck.push({ r: k, s });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    cols = Array.from({ length: 8 }, () => []);
    deck.forEach((c, i) => cols[i % 8].push(c));
    cells = [null, null, null, null];
    found = [[], [], [], []];
  }

  function start(n) {
    deal(n || PP.randInt(1, 99999));
    history = []; moves = 0; time = 0; won = false; drag = null; flying = []; autoT = 0.5;
    layout();
  }

  // ── REGOLE ──────────────────────────────────────
  const top = col => col[col.length - 1];
  const stacksOn = (a, b) => b && a.r === b.r - 1 && color(a) !== color(b);
  function runStart(col) { let i = col.length - 1; if (i < 0) return -1; while (i > 0 && stacksOn(col[i], col[i - 1])) i--; return i; }
  function capacity(toEmpty) {
    const fc = cells.filter(c => !c).length, ec = cols.filter(c => !c.length).length - (toEmpty ? 1 : 0);
    return (fc + 1) * Math.pow(2, Math.max(0, ec));
  }
  function canFound(card) { const f = found[card.s]; return card.r === f.length + 1; }

  function snapshot() { return { cols: cols.map(c => c.slice()), cells: cells.slice(), found: found.map(f => f.slice()), moves }; }
  function restore(s) { cols = s.cols; cells = s.cells; found = s.found; moves = s.moves; }

  // src: { t: 'col'|'cell', i, idx } ; dst: { t: 'col'|'cell'|'found', i }
  function tryMove(src, dst, quiet) {
    const cards = src.t === 'col' ? cols[src.i].slice(src.idx) : [cells[src.i]];
    if (!cards.length || !cards[0]) return false;
    const first = cards[0];
    if (dst.t === 'found') {
      if (cards.length !== 1 || !canFound(first)) return false;
    } else if (dst.t === 'cell') {
      if (cards.length !== 1 || cells[dst.i]) return false;
    } else {
      if (dst.t === 'col' && src.t === 'col' && dst.i === src.i) return false;
      const t = top(cols[dst.i]);
      if (t && !stacksOn(first, t)) return false;
      if (cards.length > capacity(!t)) { if (!quiet) PP.floatText(`You can move ${capacity(!t)} cards`, PP.W / 2, geo.top - 10, '#ffd98a', 15); return false; }
    }
    history.push(snapshot());
    if (src.t === 'col') cols[src.i].splice(src.idx); else cells[src.i] = null;
    if (dst.t === 'found') found[first.s].push(first);
    else if (dst.t === 'cell') cells[dst.i] = first;
    else cols[dst.i].push(...cards);
    moves++;
    sfx.tone(dst.t === 'found' ? 760 : 480, 0.05, 'triangle', 0.1);
    autoT = 0.18;
    return true;
  }

  // una carta è sicura in fondazione se le carte di colore opposto più basse sono già su
  function safe(card) {
    if (!canFound(card)) return false;
    if (card.r <= 2) return true;
    const opp = [0, 1, 2, 3].filter(s => C.isRed(s) !== C.isRed(card.s));
    return opp.every(s => found[s].length >= card.r - 1);
  }
  function autoMove() {
    for (let i = 0; i < 4; i++) { const c = cells[i]; if (c && safe(c)) { const from = cellPos(i); flyTo(c, from); tryMove({ t: 'cell', i }, { t: 'found' }, true); return true; } }
    for (let i = 0; i < 8; i++) { const c = top(cols[i]); if (c && safe(c)) { const from = cardPos(i, cols[i].length - 1); flyTo(c, from); tryMove({ t: 'col', i, idx: cols[i].length - 1 }, { t: 'found' }, true); return true; } }
    return false;
  }
  function flyTo(card, from) { flying.push({ card, x: from.x, y: from.y, tx: foundPos(card.s).x, ty: foundPos(card.s).y, t: 0 }); }

  function undo() { const s = history.pop(); if (!s) return; restore(s); flying = []; sfx.tone(420, 0.08, 'sine', 0.1, 300); }

  function checkWin() {
    if (found.every(f => f.length === 13) && !won) {
      won = true;
      const key = 'stats', st = store.get(key, { wins: 0, best: 0 });
      st.wins++; const rec = !st.best || time < st.best; if (rec) st.best = Math.floor(time);
      store.set(key, st);
      sfx.win();
      PP.burst(PP.W / 2, PP.H / 2, ['#4fb3ff', '#fff', '#ffd54a', '#ff6b8b'], 70, 450, 5, 1.6, 300);
      PP.game.overDelay = 1500;
      PP.over(rec ? 'New best time!' : 'You won!', `Game #${gameNo} · ${moves} moves · ${fmt(time)}\nWins: ${st.wins} · Best time: ${fmt(st.best)}`, [{ label: 'Same deal', onClick: () => { PP.hideMenu(); PP.state = 'playing'; start(gameNo); } }]);
    }
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ── GEOMETRIA ───────────────────────────────────
  function layout() {
    const pad = 8;
    const cw = Math.min((PP.W - pad * 2) / 8.6, (PP.H - 120) / 5.6, 104);
    const ch = cw * 1.4;
    const gap = (PP.W - pad * 2 - cw * 8) / 7;
    geo = { cw, ch, gap, x0: pad, rowY: 62, top: 62 + ch + 16 };
  }
  const colX = i => geo.x0 + i * (geo.cw + geo.gap);
  const cellPos = i => ({ x: colX(i), y: geo.rowY });
  const foundPos = s => ({ x: colX(4 + s), y: geo.rowY });
  function stepFor(col) { const avail = PP.H - geo.top - geo.ch - 10; return Math.min(geo.ch * 0.3, avail / Math.max(1, col.length - 1)); }
  function cardPos(i, k) { return { x: colX(i), y: geo.top + k * stepFor(cols[i]) }; }

  function update(dt) {
    if (!won) time += dt;
    for (const f of flying) f.t += dt * 4;
    flying = flying.filter(f => f.t < 1);
    if (!drag) { autoT -= dt; if (autoT <= 0) { autoT = 0.12; if (!autoMove()) { autoT = 999; checkWin(); } } }
  }

  function draw(ctx, W, H) {
    layout();
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H / 2, Math.max(W, H) * 0.8);
    g.addColorStop(0, '#1d5a8a'); g.addColorStop(1, '#0a2238');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!cols) return;
    const { cw, ch } = geo;
    for (let i = 0; i < 4; i++) { const p = cellPos(i); if (cells[i] && !(drag && drag.src.t === 'cell' && drag.src.i === i)) C.face(ctx, p.x, p.y, cw, ch, cells[i]); else C.slot(ctx, p.x, p.y, cw, ch, 'FREE'); }
    for (let s = 0; s < 4; s++) {
      const p = foundPos(s), f = found[s];
      const flyingTop = flying.filter(x => x.card.s === s).length;
      const shown = f.length - flyingTop;
      if (shown > 0) C.face(ctx, p.x, p.y, cw, ch, f[shown - 1]); else C.slot(ctx, p.x, p.y, cw, ch, s);
    }
    for (let i = 0; i < 8; i++) {
      const col = cols[i];
      if (!col.length) C.slot(ctx, colX(i), geo.top, cw, ch, null);
      const rs = runStart(col);
      for (let k = 0; k < col.length; k++) {
        if (drag && drag.src.t === 'col' && drag.src.i === i && k >= drag.src.idx) break;
        const p = cardPos(i, k);
        C.face(ctx, p.x, p.y, cw, ch, col[k], null, k < rs && PP.state === 'playing' ? false : false);
      }
    }
    for (const f of flying) { const t = PP.easeInOut(clamp(f.t, 0, 1)); C.face(ctx, PP.lerp(f.x, f.tx, t), PP.lerp(f.y, f.ty, t) - Math.sin(t * Math.PI) * 40, cw, ch, f.card); }
    if (drag && drag.moved) drag.cards.forEach((c, k) => C.face(ctx, drag.x - drag.dx, drag.y - drag.dy + k * geo.ch * 0.26, cw, ch, c, k === 0 ? 'sel' : null));
    PP.drawFx();
    PP.text(`Game #${gameNo}`, 12, 22, 15, '#fff', 'left', 800);
    PP.text(`${moves} moves · ${fmt(time)}`, 12, 42, 11, 'rgba(255,255,255,.7)', 'left', 600);
    btns = [];
    const bw = 70, bh = 40, bx = Math.max(130, W / 2 - bw / 2);
    if (bx + bw < W - 110) { btns.push({ n: 'Undo', x: bx, y: 10, w: bw, h: bh }); PP.rr(bx, 10, bw, bh, 10); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill(); PP.text('Undo', bx + bw / 2, 31, 13, history.length ? '#fff' : 'rgba(255,255,255,.35)', 'center', 700); }
  }

  // ── INPUT ───────────────────────────────────────
  const inRect = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  function pick(p) {
    for (let i = 0; i < 4; i++) { const q = cellPos(i); if (cells[i] && inRect(p, q.x, q.y, geo.cw, geo.ch)) return { src: { t: 'cell', i }, cards: [cells[i]], pos: q }; }
    for (let i = 0; i < 8; i++) {
      const col = cols[i];
      for (let k = col.length - 1; k >= 0; k--) {
        const q = cardPos(i, k), h = k === col.length - 1 ? geo.ch : stepFor(col);
        if (inRect(p, q.x, q.y, geo.cw, h)) {
          if (k < runStart(col)) return null;
          return { src: { t: 'col', i, idx: k }, cards: col.slice(k), pos: q };
        }
      }
    }
    return null;
  }
  function pointerDown(p) {
    for (const b of btns) if (inRect(p, b.x, b.y, b.w, b.h)) { undo(); return; }
    const h = pick(p);
    if (!h) return;
    drag = { ...h, x: p.x, y: p.y, dx: p.x - h.pos.x, dy: p.y - h.pos.y, sx: p.x, sy: p.y, moved: false };
  }
  function pointerMove(p) { if (drag) { drag.x = p.x; drag.y = p.y; if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true; } }
  function pointerUp(p) {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) {
      // tocco: fondazione, poi una colonna utile, poi una cella libera
      if (d.cards.length === 1 && tryMove(d.src, { t: 'found' }, true)) return;
      for (let i = 0; i < 8; i++) if (cols[i].length && tryMove(d.src, { t: 'col', i }, true)) return;
      for (let i = 0; i < 8; i++) if (!cols[i].length && tryMove(d.src, { t: 'col', i }, true)) return;
      if (d.cards.length === 1 && d.src.t === 'col') { const fc = cells.indexOf(null); if (fc >= 0 && tryMove(d.src, { t: 'cell', i: fc }, true)) return; }
      sfx.tone(170, 0.06, 'square', 0.05);
      return;
    }
    const cx = p.x - d.dx + geo.cw / 2, cy = p.y - d.dy + geo.ch / 2;
    if (cy < geo.top - 4) {
      const slot = clamp(Math.floor((cx - geo.x0 + geo.gap / 2) / (geo.cw + geo.gap)), 0, 7);
      if (slot >= 4) { if (tryMove(d.src, { t: 'found' })) return; }
      else if (tryMove(d.src, { t: 'cell', i: slot })) return;
    } else {
      let best = -1, bd = Infinity;
      for (let i = 0; i < 8; i++) { const dd = Math.abs(colX(i) + geo.cw / 2 - cx); if (dd < bd) { bd = dd; best = i; } }
      if (bd < geo.cw && tryMove(d.src, { t: 'col', i: best })) return;
    }
    sfx.tone(200, 0.05, 'sine', 0.05);
  }
  function keyDown(code) { if (code === 'KeyZ' || code === 'Backspace') undo(); }

  function demo(n) {
    start([0, 1234, 8812, 30210][n]);
    // qualche mossa automatica semplice per una partita in corso
    const steps = [0, 14, 26, 6][n];
    for (let k = 0; k < steps; k++) {
      let movedAny = false;
      for (let i = 0; i < 8 && !movedAny; i++) {
        const col = cols[i]; const rs = runStart(col); if (rs < 0) continue;
        for (let j = 0; j < 8 && !movedAny; j++) if (j !== i && cols[j].length && stacksOn(col[rs], top(cols[j]))) movedAny = tryMove({ t: 'col', i, idx: rs }, { t: 'col', i: j }, true);
      }
      if (!movedAny) { const i = k % 8; const fc = cells.indexOf(null); if (fc >= 0 && cols[i].length) tryMove({ t: 'col', i, idx: cols[i].length - 1 }, { t: 'cell', i: fc }, true); }
      while (autoMove()) { /* sposta le carte sicure */ }
    }
    flying = []; time = [0, 141, 302, 48][n]; autoT = 999;
  }

  function icon(c, S) {
    const g = c.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.7);
    g.addColorStop(0, '#2a6fa8'); g.addColorStop(1, '#0a2238');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    const w = S * 0.27, h = w * 1.4;
    C.slot(c, S * 0.2, S * 0.18, w, h, 'FREE');
    C.face(c, S * 0.53, S * 0.18, w, h, { r: 1, s: 1 });
    C.face(c, S * 0.2, S * 0.42, w, h, { r: 7, s: 0 });
    C.face(c, S * 0.53, S * 0.5, w, h, { r: 6, s: 2 });
  }

  PP.run({
    id: GAME_ID,
    title: 'FreeCell',
    intro: 'Move every card to the four foundations, from Ace to King.\nUse the four free cells wisely. Drag or tap cards to move them.',
    bestText: () => { const st = store.get('stats', { wins: 0, best: 0 }); return st.wins ? `Wins: ${st.wins} · Best time: ${fmt(st.best)}` : ''; },
    pauseText: () => `Game #${gameNo} · ${moves} moves`,
    start: () => start(), update, draw, pointerDown, pointerMove, pointerUp, keyDown, demo, icon,
  });
})();
