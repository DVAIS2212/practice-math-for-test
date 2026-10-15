'use strict';

// ---------- general helpers ----------
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmt = (n) => Number(n).toLocaleString('en-US');
// Math is always written left-to-right inside the Hebrew text
const M = (s) => `<bdi class="math" dir="ltr">${s}</bdi>`;
const digitsOf = (n) => String(n).split('').reverse().map(Number); // ones first
const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

const PLACE = ['יחידות', 'עשרות', 'מאות', 'אלפים', 'רבבות'];
const COL = ['היחידות', 'העשרות', 'המאות', 'האלפים', 'הרבבות'];
const PLACE_VALUE = [1, 10, 100, 1000, 10000];

// ---------- Hebrew number words (as taught in class: "שלושת אלפים ארבע מאות ושבעה") ----------
const W_UNITS = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה'];
const W_TEENS = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר', 'שישה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר'];
const W_TENS = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
const W_HUNDREDS = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות'];
const W_THOUSANDS = ['', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים', 'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים', 'עשרת אלפים'];

function numToWords(n) {
  if (n === 0) return 'אפס';
  const parts = [];
  const th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), r = n % 100;
  if (th) parts.push(W_THOUSANDS[th]);
  if (h) parts.push(W_HUNDREDS[h]);
  if (r >= 10 && r < 20) parts.push(W_TEENS[r - 10]);
  else {
    const t = Math.floor(r / 10), u = r % 10;
    if (t) parts.push(W_TENS[t]);
    if (u) parts.push(W_UNITS[u]);
  }
  if (parts.length > 1) parts[parts.length - 1] = 'ו' + parts[parts.length - 1];
  return parts.join(' ');
}

// ---------- arithmetic expressions with step-by-step evaluation ----------
const OPS = ['+', '−', '×', '÷'];

function renderTokens(t) {
  let s = '';
  for (const x of t) {
    if (x === ')') s += ')';
    else s += (s && !s.endsWith('(') ? ' ' : '') + (typeof x === 'number' ? fmt(x) : x);
  }
  return s;
}

function applyOp(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '−': if (a < b) throw new Error('neg'); return a - b;
    case '×': return a * b;
    case '÷': if (b === 0 || a % b) throw new Error('div'); return a / b;
  }
}

function reduceFlat(t) {
  let i = t.findIndex((x) => x === '×' || x === '÷');
  if (i < 0) i = t.findIndex((x) => x === '+' || x === '−');
  const val = applyOp(t[i - 1], t[i], t[i + 1]);
  return { t: [...t.slice(0, i - 1), val, ...t.slice(i + 2)], op: [t[i - 1], t[i], t[i + 1]], val };
}

function reduceOnce(t) {
  let open = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '(') open = i;
    else if (t[i] === ')') {
      const inner = t.slice(open + 1, i);
      if (inner.length === 1) return { t: [...t.slice(0, open), inner[0], ...t.slice(i + 1)], op: null };
      const r = reduceFlat(inner);
      const nt = r.t.length === 1
        ? [...t.slice(0, open), r.t[0], ...t.slice(i + 1)]
        : [...t.slice(0, open + 1), ...r.t, ...t.slice(i)];
      return { t: nt, op: r.op, val: r.val, inParens: true };
    }
  }
  return reduceFlat(t);
}

function evalSteps(tokens) {
  let t = tokens.slice();
  const steps = [renderTokens(t)];
  const ops = [];
  while (t.length > 1) {
    const r = reduceOnce(t);
    t = r.t;
    if (r.op) ops.push({ op: r.op, val: r.val, inParens: !!r.inParens });
    steps.push(renderTokens(t));
  }
  return { value: t[0], steps, ops };
}

const evalTokens = (t) => evalSteps(t).value;

// left-to-right ignoring order of operations and parentheses (a classic mistake)
function naiveValue(tokens) {
  const t = tokens.filter((x) => x !== '(' && x !== ')');
  let v = t[0];
  for (let i = 1; i < t.length; i += 2) v = applyOp(v, t[i], t[i + 1]);
  return v;
}

// ---------- SVG drawings ----------
function numberLineSVG(values, hidden /* map index -> label */) {
  const n = values.length, W = 680, pad = 40, y = 50;
  const dx = (W - 2 * pad) / (n - 1);
  let s = `<svg class="nline" viewBox="0 0 ${W} 100" role="img" aria-label="ישר מספרים">`;
  s += `<line x1="${pad - 20}" y1="${y}" x2="${W - pad + 20}" y2="${y}" class="nl-axis"/>`;
  s += `<polygon points="${W - pad + 28},${y} ${W - pad + 16},${y - 6} ${W - pad + 16},${y + 6}" class="nl-arrow"/>`;
  values.forEach((v, i) => {
    const x = pad + i * dx;
    s += `<line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y + 10}" class="nl-tick"/>`;
    if (hidden && hidden[i] !== undefined) {
      s += `<rect x="${x - 17}" y="${y + 17}" width="34" height="28" rx="7" class="nl-blank"/>`;
      s += `<text x="${x}" y="${y + 37}" class="nl-blank-t">${hidden[i]}</text>`;
    } else {
      s += `<text x="${x}" y="${y + 36}" class="nl-label">${fmt(v)}</text>`;
    }
  });
  return s + '</svg>';
}

function pt(cx, cy, r, degMath) {
  const a = (degMath * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

function angleSVG(deg, rot) {
  if (rot === undefined) rot = R(0, 11) * 30 + R(-10, 10);
  const cx = 110, cy = 110, L = 92;
  // keep the whole drawing inside the box: centre the angle's bisector away from edges
  const [x1, y1] = pt(cx, cy, L, rot);
  const [x2, y2] = pt(cx, cy, L, rot + deg);
  let mark;
  if (deg === 90) {
    const s = 18;
    const [ax, ay] = pt(0, 0, s, rot), [bx, by] = pt(0, 0, s, rot + 90);
    mark = `<polyline points="${cx + ax},${cy + ay} ${cx + ax + bx},${cy + ay + by} ${cx + bx},${cy + by}" class="ang-mark"/>`;
  } else {
    const r = 26;
    const [p1x, p1y] = pt(cx, cy, r, rot), [p2x, p2y] = pt(cx, cy, r, rot + deg);
    mark = `<path d="M ${p1x} ${p1y} A ${r} ${r} 0 0 0 ${p2x} ${p2y}" class="ang-mark"/>`;
  }
  return `<svg class="angle-svg" viewBox="0 0 220 220" role="img" aria-label="זווית">
    <line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" class="ray"/>
    <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" class="ray"/>
    ${mark}<circle cx="${cx}" cy="${cy}" r="4" class="vertex"/></svg>`;
}

function clockSVG(h) {
  const cx = 100, cy = 100, r = 86;
  let s = `<svg class="clock-svg" viewBox="0 0 200 200" role="img" aria-label="שעון ${h}:00">`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" class="clock-face"/>`;
  for (let k = 1; k <= 12; k++) {
    const [x, y] = pt(cx, cy, r - 16, 90 - k * 30);
    s += `<text x="${x}" y="${y + 6}" class="clock-num">${k}</text>`;
  }
  const hourAng = 90 - (h % 12) * 30;
  // shaded smaller angle between the hands
  const span = Math.min((h % 12) * 30, 360 - (h % 12) * 30);
  const start = (h % 12) * 30 <= 180 ? hourAng : 90;
  const [a1x, a1y] = pt(cx, cy, 30, start), [a2x, a2y] = pt(cx, cy, 30, start + span);
  s += `<path d="M ${cx} ${cy} L ${a1x} ${a1y} A 30 30 0 0 0 ${a2x} ${a2y} Z" class="clock-wedge"/>`;
  const [mx, my] = pt(cx, cy, 64, 90);
  const [hx, hy] = pt(cx, cy, 46, hourAng);
  s += `<line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" class="hand min"/>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" class="hand hour"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="5" class="vertex"/></svg>`;
  return s;
}

// fit a list of points into a viewBox and return {pts, size}
function fitPoints(points, W, H, pad) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const offX = (W - (maxX - minX) * k) / 2, offY = (H - (maxY - minY) * k) / 2;
  return points.map(([x, y]) => [offX + (x - minX) * k, H - (offY + (y - minY) * k)]);
}

function rightMark(V, P1, P2, s) {
  const u = norm([P1[0] - V[0], P1[1] - V[1]]), w = norm([P2[0] - V[0], P2[1] - V[1]]);
  const a = [V[0] + u[0] * s, V[1] + u[1] * s], b = [a[0] + w[0] * s, a[1] + w[1] * s], c = [V[0] + w[0] * s, V[1] + w[1] * s];
  return `<polyline points="${a} ${b} ${c}" class="ang-mark"/>`;
}
function norm([x, y]) { const l = Math.hypot(x, y); return [x / l, y / l]; }

// triangle from two angles (degrees). opts.labels shows the degrees
function triangleSVG(A, B, opts = {}) {
  const C = 180 - A - B, rad = (d) => (d * Math.PI) / 180;
  const b = Math.sin(rad(B)) / Math.sin(rad(C));
  const raw = [[0, 0], [1, 0], [b * Math.cos(rad(A)), b * Math.sin(rad(A))]];
  const P = fitPoints(raw, 260, 190, 28);
  let s = `<svg class="tri-svg" viewBox="0 0 260 190" role="img" aria-label="משולש">`;
  s += `<polygon points="${P.map((p) => p.join(',')).join(' ')}" class="tri"/>`;
  const angs = [A, B, C];
  angs.forEach((d, i) => {
    const V = P[i], P1 = P[(i + 1) % 3], P2 = P[(i + 2) % 3];
    if (d === 90) s += rightMark(V, P1, P2, 14);
    if (opts.labels) {
      const u = norm([(P1[0] + P2[0]) / 2 - V[0], (P1[1] + P2[1]) / 2 - V[1]]);
      s += `<text x="${V[0] + u[0] * 34}" y="${V[1] + u[1] * 34 + 5}" class="tri-label">${d}°</text>`;
    }
  });
  return s + '</svg>';
}

// triangle from three side lengths, with the lengths written on the sides
function triangleSidesSVG(a, b, c) {
  // base a from (0,0) to (a,0); c from origin to apex, b from (a,0) to apex
  const x = (a * a + c * c - b * b) / (2 * a), y = Math.sqrt(Math.max(c * c - x * x, 0.01));
  const P = fitPoints([[0, 0], [a, 0], [x, y]], 260, 200, 34);
  const cen = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
  let s = `<svg class="tri-svg" viewBox="0 0 260 200" role="img" aria-label="משולש">`;
  s += `<polygon points="${P.map((p) => p.join(',')).join(' ')}" class="tri"/>`;
  const sides = [[0, 1, a], [1, 2, b], [2, 0, c]];
  for (const [i, j, len] of sides) {
    const m = [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2];
    const u = norm([m[0] - cen[0], m[1] - cen[1]]);
    s += `<text x="${m[0] + u[0] * 18}" y="${m[1] + u[1] * 18 + 5}" class="tri-label">${len}</text>`;
  }
  return s + '</svg>';
}
