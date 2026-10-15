'use strict';
/*
 * Random question generators. Each topic has sub-types with a minimum level (1–3).
 * The level of each topic grows as the girl answers correctly, so questions get harder.
 */

const NAMES_F = ['נועה', 'מאיה', 'תמר', 'שירה', 'רוני', 'יעל', 'הילה', 'אגם', 'ליה', 'עלמה'];
const NAMES_M = ['יואב', 'אורי', 'איתי', 'עומר', 'דניאל', 'נדב', 'אלון', 'רועי', 'איתן', 'גיא'];

// a number with the given number of digits, sometimes with zeros inside (harder)
function randNum(digits, zeros) {
  let s = String(R(1, 9));
  for (let i = 1; i < digits; i++) s += zeros && Math.random() < 0.35 ? '0' : String(R(0, 9));
  return Number(s);
}
const sizeFor = (level) => (level === 1 ? R(3, 4) : 4);

const GEN = {
  place: [
    { id: 'wordsToDigits', min: 1, gen: (L) => Q.wordsToDigits(L === 3 && Math.random() < 0.15 ? 10000 : randNum(sizeFor(L), L >= 2)) },
    { id: 'digitsToWords', min: 1, gen: (L) => Q.digitsToWords(randNum(sizeFor(L), L >= 2)) },
    { id: 'digitValue', min: 1, gen: (L) => {
      let n, pos;
      do { n = randNum(4, false); pos = R(0, 3); } while (digitsOf(n)[pos] === 0);
      return Q.digitValue(n, pos);
    } },
    { id: 'expandedToNum', min: 1, gen: (L) => Q.expandedToNum(expansionOf(randNum(4, L >= 2)).sort(() => (L === 3 ? Math.random() - 0.5 : 0))) },
    { id: 'missingPart', min: 1, gen: (L) => Q.missingPart(randNum(4, L >= 2)) },
    { id: 'expansionBlanks', min: 2, gen: () => Q.expansionBlanks(randNum(4, true)) },
    { id: 'succPred', min: 1, gen: (L) => {
      const k = R(1, 9);
      const n = pick(L === 1 ? [R(100, 999), k * 100, k * 10 + 9 + R(0, 9) * 100]
        : [k * 1000, k * 1000 + 999, k * 1000 + R(1, 9) * 100 + 90, k * 1000 + R(1, 9) * 10, 9999, k * 1000 + 100 * R(1, 9)]);
      return Q.succPred(n);
    } },
    { id: 'evenOdd', min: 1, gen: (L) => Q.evenOdd(randNum(sizeFor(L), true)) },
    { id: 'digitCount', min: 1, gen: () => Q.digitCount(pick([R(1, 9), R(10, 99), R(100, 999), R(1000, 9999), 10000])) },
    { id: 'fromDigits', min: 2, gen: (L) => {
      const ds = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
      if (L < 3 && ds.includes(0)) ds[ds.indexOf(0)] = pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => !ds.includes(x)));
      return Q.fromDigits(ds, Math.random() < 0.5);
    } },
    { id: 'riddle', min: 2, gen: () => pick([
      () => Q.placeRiddle('מה המספר הזוגי הגדול ביותר שהוא תלת־ספרתי?', 998, 'המספר התלת־ספרתי הגדול ביותר הוא 999, אבל הוא אי־זוגי. הזוגי הגדול ביותר הוא <b>998</b>.'),
      () => Q.placeRiddle('מה המספר האי־זוגי הקטן ביותר שהוא דו־ספרתי?', 11, 'הדו־ספרתי הקטן ביותר הוא 10, אבל הוא זוגי. האי־זוגי הקטן ביותר הוא <b>11</b>.'),
      () => Q.placeRiddle('מה המספר הקטן ביותר שיש בו 4 ספרות?', 1000, 'המספר הארבע־ספרתי הקטן ביותר הוא <b>1,000</b>.'),
      () => Q.placeRiddle('מה המספר הגדול ביותר שיש בו 4 ספרות?', 9999, 'המספר הארבע־ספרתי הגדול ביותר הוא <b>9,999</b>.'),
      () => Q.placeRiddle('כמה זה רבבה? (כתבי בספרות)', 10000, 'רבבה = עשרת אלפים = <b>10,000</b>. זה המספר החמש־ספרתי הקטן ביותר.'),
      () => Q.placeRiddle('מה המספר הזוגי הקטן ביותר שהוא ארבע־ספרתי?', 1000, 'המספר הארבע־ספרתי הקטן ביותר הוא 1,000 – והוא זוגי (נגמר ב־0).'),
      () => Q.placeRiddle('מה המספר האי־זוגי הגדול ביותר שהוא ארבע־ספרתי?', 9999, '9,999 נגמר ב־9 – הוא אי־זוגי, והוא הארבע־ספרתי הגדול ביותר.'),
    ])() },
  ],

  line: [
    { id: 'numberLine', min: 1, gen: (L) => {
      const step = pick(L === 1 ? [10, 100, 1000] : L === 2 ? [50, 100, 250, 500, 1000] : [25, 50, 250, 500, 200]);
      const count = pick([6, 7, 9, 11]);
      const start = step * R(0, Math.max(0, Math.floor(10000 / step) - count)) * (Math.random() < 0.4 ? 0 : 1);
      const n = L === 1 ? 1 : R(1, 3);
      // keep at least two neighbouring labels visible so the step can be found
      const pool = shuffle([...Array(count).keys()].filter((i) => i > 1));
      return Q.numberLine(start, step, count, pool.slice(0, n).sort((a, b) => a - b));
    } },
    { id: 'numberLineWide', min: 2, gen: () => {
      // only the two ends + middle are labelled, so the step must be computed
      const step = pick([250, 500, 50, 25]);
      const start = pick([0, 1000, 2000, 4000, 6000]);
      const hid = pick([1, 3]);
      return Q.numberLine(start, step, 5, [hid]);
    } },
    { id: 'midpoint', min: 1, gen: (L) => {
      const gap = pick(L === 1 ? [200, 1000] : [200, 400, 1000, 2000]);
      const a = R(0, 8) * (L === 1 ? 1000 : 100) + (L === 1 ? 0 : 0);
      return Q.midpoint(a, a + gap);
    } },
    { id: 'closer', min: 1, gen: (L) => {
      const big = L === 1 ? 1000 : pick([1000, 100]);
      const a = big === 1000 ? R(0, 8) * 1000 : R(1, 90) * 100;
      const b = a + big;
      let x; do { x = a + R(1, big / 10 - 1) * 10; } while (x === (a + b) / 2);
      return Q.closer(x, a, b);
    } },
  ],

  compare: [
    { id: 'numbers', min: 1, gen: (L) => {
      const n = randNum(L === 1 ? 3 : 4, L >= 2);
      const d = String(n).split('');
      // swap two digits to create a "tricky" close number
      const i = R(1, d.length - 1), j = R(1, d.length - 1);
      [d[i], d[j]] = [d[j], d[i]];
      let m = Number(d.join(''));
      if (Math.random() < 0.15) m = n;
      if (Math.random() < 0.15) m = n - 1;
      return Math.random() < 0.5 ? Q.compare(n, m) : Q.compare(m, n);
    } },
    { id: 'exprs', min: 1, gen: (L) => {
      const a = R(3, 9), b = R(3, 9);
      const opts = [
        () => [[a, '×', b], a * b + pick([-1, 0, 1, 2, -3])],
        () => { const h = R(1, 9) * 100, t = R(1, 9) * 10; return [[h, '+', t], h + t + pick([0, 0, 10, -1])]; },
        () => [[a, '×', b], [b, '×', a]],
        () => [[1000, '−', 1], pick([999, 1000, 998])],
        () => { const t = R(2, 9) * 10; return [[t, '×', 4], t * 4 + pick([-10, 0, 10])]; },
        () => [[a * b, '÷', a], [R(1, 3), '×', R(2, 4)]],
        () => { const th = R(1, 9) * 1000, h = R(1, 9) * 100, u = R(1, 9); return [[th, '+', h, '+', u], th + h + pick([u, u * 10, 10 * R(1, 9)])]; },
        () => [[a, '×', b], [a, '×', b + 1, '−', a]],
      ];
      const [l, r] = pick(L === 1 ? opts.slice(0, 5) : opts)();
      return Math.random() < 0.5 ? Q.compare(l, r) : Q.compare(r, l);
    } },
    { id: 'extreme', min: 1, gen: (L) => {
      const ds = shuffle([R(1, 9), R(0, 9), R(0, 9), R(1, 9)]);
      const set = new Set();
      while (set.size < 4) set.add(Number(shuffle(ds).join('').replace(/^0+/, '') || 0));
      const nums = [...set].filter((v) => v >= 100);
      if (nums.length < 3) return GEN.compare[0].gen(L);
      return Q.extreme(nums, Math.random() < 0.5);
    } },
    { id: 'order', min: 2, gen: () => {
      const t = R(1, 9), ds = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== t)).slice(0, 3);
      const set = new Set();
      let tries = 0;
      while (set.size < 5 && tries++ < 50) { const p = shuffle(ds); set.add(Number(`${t}${p.join('')}`)); }
      return Q.orderNumbers(shuffle([...set]));
    } },
    { id: 'missingDigit', min: 2, gen: () => {
      const n = randNum(4, false);
      const s = fmt(n);
      const pos = pick([2, 3]); // index in "x,xxx" string: hundreds or tens digit
      const type = pick(['>', '<', '=']);
      const other = s.split('');
      if (type === '>') other[pos] = '8';
      if (type === '<') other[pos] = '1';
      const tmpl = s.slice(0, pos) + '_' + s.slice(pos + 1);
      const ans = type === '>' ? 9 : type === '<' ? 0 : Number(s[pos]);
      const expl = type === '=' ? `המספרים צריכים להיות זהים, ולכן הספרה היא <b>${ans}</b>.`
        : type === '>' ? 'כל שאר הספרות זהות, אז הספרה החסרה צריכה להיות גדולה מ־8 – רק <b>9</b>.'
          : 'כל שאר הספרות זהות, אז הספרה החסרה צריכה להיות קטנה מ־1 – רק <b>0</b>.';
      return Q.missingDigitCompare(`${tmpl} ${type} ${other.join('')}`, [ans], expl);
    } },
  ],

  seq: [
    { id: 'blanks', min: 1, gen: (L) => {
      const step = pick(L === 1 ? [2, 3, 5, 10, -10, 100] : L === 2 ? [4, 6, 7, 8, 9, 25, 50, -5, -8, -100] : [-25, 125, 250, -250, 500, 9, -7, 15]);
      const len = 6;
      const a0 = step > 0 ? R(0, 20) * (Math.abs(step) >= 25 ? Math.abs(step) : 1) : Math.abs(step) * (len + R(0, 30));
      const seq = Array.from({ length: len }, (_, i) => a0 + i * step);
      const hide = L === 1 ? [3, 4, 5] : L === 2 ? pick([[3, 4, 5], [1, 3, 5], [2]]) : pick([[1, 3, 5], [0, 2], [1, 4]]);
      return Q.seqBlanks(seq.map((v, i) => (hide.includes(i) ? null : v)), step);
    } },
    { id: 'rule', min: 1, gen: (L) => {
      const step = pick(L === 1 ? [2, 3, 5, 10, -2, -10] : [4, 6, 7, 8, -8, 25, -25, 250, -100]);
      const a0 = step > 0 ? R(1, 30) : R(60, 200);
      return Q.seqRule([0, 1, 2, 3].map((i) => a0 + i * step), step);
    } },
    { id: 'nth', min: 2, gen: () => {
      const step = R(2, 6), a0 = R(1, 9), n = pick([6, 8, 10]);
      return Q.seqNth(a0, step, n);
    } },
    { id: 'down', min: 2, gen: () => {
      const step = pick([25, 50, 10, 100]), a0 = step * R(8, 20), n = pick([4, 5, 6]);
      return Q.seqNth(a0, -step, n, `סדרה מתחילה ב־${M(fmt(a0))} ויורדת ב־${M(step)} בכל צעד. מה המספר ה<b>${ordinal(n)}</b> בסדרה?`);
    } },
    { id: 'appears', min: 2, gen: () => {
      const step = pick([3, 4, 5, 6, 25]), a0 = pick([0, step, R(1, step - 1)]);
      const k = R(8, 20), yes = Math.random() < 0.5;
      return Q.seqAppears(a0, step, a0 + k * step + (yes ? 0 : R(1, step - 1)));
    } },
  ],

  addsub: [
    { id: 'add', min: 1, gen: (L) => {
      if (L === 1) { const a = R(100, 599), b = R(100, 399); return Q.vertical(a, b, '+'); }
      const a = R(1000, 5999), b = R(L === 2 ? 100 : 1000, 3999);
      return Q.vertical(a, b, '+');
    } },
    { id: 'sub', min: 1, gen: (L) => {
      if (L === 1) { const a = R(400, 999), b = R(100, a - 100); return Q.vertical(a, b, '−'); }
      if (L === 3 && Math.random() < 0.5) { const a = pick([R(2, 9) * 1000, R(2, 9) * 1000 + R(1, 9) * 100, R(2, 9) * 100 + R(1, 9)]); return Q.vertical(a, R(Math.floor(a / 4), a - 50), '−'); }
      const a = R(1000, 9999), b = R(100, a - 200);
      return Q.vertical(a, b, '−');
    } },
    { id: 'detective', min: 2, gen: () => {
      const a = R(300, 999), b = R(100, a - 50), right = a - b;
      const wrong = pick([right + 100, right + 110, right - 10, right + 10]);
      return Q.detective(a, b, Math.random() < 0.35 ? right : wrong, pick(NAMES_M));
    } },
    { id: 'check', min: 2, gen: () => { const a = R(10, 90) * 100, b = R(1000, a - 100 > 1000 ? a - 100 : 1500); return Q.checkBySum(Math.max(a, b + 100), b); } },
  ],

  mult: [
    { id: 'fact', min: 1, gen: () => Q.multFact(R(3, 9), R(3, 9)) },
    { id: 'mult2', min: 1, gen: (L) => Q.vertical(R(L === 1 ? 12 : 23, 99), R(2, L === 1 ? 5 : 9), '×') },
    { id: 'mult3', min: 2, gen: () => Q.vertical(R(102, 999), R(2, 9), '×') },
    { id: 'missing', min: 3, gen: () => Q.multMissing(R(2, 9), R(1, 9), R(3, 9)) },
  ],

  order: [
    { id: 'eval', min: 1, gen: (L) => {
      for (let tries = 0; tries < 100; tries++) {
        try {
          const t = pick(EXPR_TEMPLATES.filter((x) => x.L <= L)).make();
          evalTokens(t);
          return Q.evalExpr(t);
        } catch (e) { /* try again */ }
      }
      return Q.evalExpr([4, '+', 3, '×', 5]);
    } },
    { id: 'truefalse', min: 1, gen: (L) => {
      for (let tries = 0; tries < 100; tries++) {
        try {
          const t = pick(EXPR_TEMPLATES.filter((x) => x.L <= L)).make();
          const v = evalTokens(t);
          let claim = v;
          if (Math.random() < 0.6) { claim = naiveValue(t); if (claim === v) continue; }
          return Q.trueFalseExpr(t, claim);
        } catch (e) { /* try again */ }
      }
      return Q.trueFalseExpr([10, '−', 2, '×', 3], 24);
    } },
    { id: 'parens', min: 2, gen: () => {
      for (let tries = 0; tries < 100; tries++) {
        try {
          const a = R(2, 9), b = R(2, 9), c = R(2, 9);
          const base = pick([[a, '+', b, '×', c], [a * 4 + 10, '−', b + 4, '−', c], [a, '×', b, '+', c], [a * (b + c), '÷', b, '+', c]]);
          const opts = [['(', base[0], base[1], base[2], ')', base[3], base[4]], [base[0], base[1], '(', base[2], base[3], base[4], ')']];
          const plain = evalTokens(base);
          const good = opts.filter((o) => { try { return evalTokens(o) !== plain; } catch (e) { return false; } });
          if (!good.length) continue;
          const target = evalTokens(pick(good));
          const all = [base, ...opts].map((o) => { try { return evalTokens(o); } catch (e) { return null; } });
          if (all.filter((v) => v === target).length !== 1) continue;
          return Q.parens(base, target);
        } catch (e) { /* again */ }
      }
      return Q.parens([6, '+', 4, '×', 3], 30);
    } },
  ],

  word: [
    { id: 'add', min: 1, gen: () => { const a = R(10, 30) * 100 + R(0, 99), b = R(100, 600); return Q.word(`בספריית בית הספר היו ${M(fmt(a))} ספרים. השנה קנו עוד ${M(fmt(b))} ספרים. כמה ספרים יש בספרייה עכשיו?`, a + b, `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`, 'המילה <b>"עוד"</b> רומזת שמוסיפים – חיבור.', 'ספרים'); } },
    { id: 'sub', min: 1, gen: () => { const a = R(10, 30) * 100, b = R(200, 900); return Q.word(`בחנות היו ${M(fmt(a))} בקבוקי מים. ביום שישי מכרו ${M(fmt(b))} בקבוקים. כמה בקבוקים נשארו?`, a - b, `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}`, 'המילה <b>"נשארו"</b> רומזת שמורידים – חיסור.', 'בקבוקים'); } },
    { id: 'mult', min: 1, gen: () => { const k = R(3, 9), n = R(12, 60); return Q.word(`בכל קופסה יש ${k} עפרונות. כמה עפרונות יש ב־${n} קופסאות?`, k * n, `${n} × ${k} = ${k * n}`, '<b>"בכל"</b> קופסה אותו מספר – כשיש כמה קבוצות שוות, משתמשים בכפל.', 'עפרונות'); } },
    { id: 'div', min: 1, gen: () => { const g = R(3, 9), k = R(4, 9); return Q.word(`${g * k} תלמידים יוצאים לטיול ומתחלקים <b>שווה בשווה</b> ל־${g} קבוצות. כמה תלמידים יש בכל קבוצה?`, k, `${g * k} ÷ ${g} = ${k}`, '<b>"מתחלקים שווה בשווה"</b> – זה חילוק.', 'תלמידים'); } },
    { id: 'times', min: 1, gen: () => { const a = R(6, 25), k = R(2, 5), f = pick(NAMES_F), m = pick(NAMES_M); return Q.word(`ל${f} יש ${a} גולות, ול${m} יש <b>פי ${k}</b> יותר. כמה גולות יש ל${m}?`, a * k, `${a} × ${k} = ${a * k}`, '<b>"פי"</b> – זה כפל.', 'גולות'); } },
    { id: 'more', min: 1, gen: () => { const a = R(300, 900), b = R(100, a - 50), f = pick(NAMES_F), m = pick(NAMES_M); return Q.word(`ל${f} יש ${a} מדבקות ול${m} יש ${b} מדבקות. <b>בכמה</b> מדבקות יש ל${f} יותר מאשר ל${m}?`, a - b, `${a} − ${b} = ${a - b}`, 'כשמשווים <b>"בכמה יותר"</b> – מחסרים את הקטן מהגדול.', 'מדבקות'); } },
    { id: 'shop', min: 2, gen: () => { const n = R(2, 5), p = R(15, 60), q = R(30, 99), f = pick(NAMES_F); return Q.word(`${f} קנתה ${n} חולצות ב־${p} ₪ כל אחת, ומכנסיים ב־${q} ₪. כמה שילמה בסך הכול?`, n * p + q, `${n} × ${p} + ${q} = ${n * p} + ${q} = ${n * p + q}`, 'שני שלבים: קודם כמה עלו כל החולצות (כפל), ואחר כך מוסיפים את המכנסיים.', '₪'); } },
    { id: 'money', min: 2, gen: () => { const a = R(20, 50) * 10, g = R(5, 20) * 10, c = R(15, Math.floor((a + g) / 10) - 2) * 10, m = pick(NAMES_M); return Q.word(`ל${m} היו ${a} ₪. סבתא נתנה לו עוד ${g} ₪, ואז הוא קנה משחק ב־${c} ₪. כמה כסף נשאר לו?`, a + g - c, `${a} + ${g} − ${c} = ${a + g - c}`, 'שני שלבים: "נתנה לו עוד" – חיבור. "קנה" – הכסף יורד, חיסור.', '₪'); } },
    { id: 'seats', min: 2, gen: () => { const r = R(12, 30), s = R(6, 9), o = R(Math.floor(r * s / 2), r * s - 10); return Q.word(`באולם ${r} שורות, ובכל שורה ${s} כיסאות. ${o} כיסאות תפוסים. כמה כיסאות פנויים?`, r * s - o, `${r} × ${s} − ${o} = ${r * s} − ${o} = ${r * s - o}`, 'קודם מחשבים כמה כיסאות יש בכלל (כפל), ואז מורידים את התפוסים.', 'כיסאות'); } },
    { id: 'bus', min: 2, gen: () => { const a = R(20, 45), b = R(5, 15), c = R(3, 20); return Q.word(`באוטובוס היו ${a} נוסעים. בתחנה ירדו ${b} נוסעים ועלו ${c} נוסעים. כמה נוסעים יש עכשיו באוטובוס?`, a - b + c, `${a} − ${b} + ${c} = ${a - b + c}`, '"ירדו" – חיסור. "עלו" – חיבור. עושים לפי הסדר.', 'נוסעים'); } },
    { id: 'bags', min: 2, gen: () => { const k = R(4, 9), n = R(6, 15); return Q.word(`אפו ${k * n} עוגיות וארזו אותן בשקיות, ${k} עוגיות בכל שקית. כמה שקיות מילאו?`, n, `${k * n} ÷ ${k} = ${n}`, 'מחלקים את כל העוגיות לקבוצות של ' + k + ' – חילוק.', 'שקיות'); } },
    { id: 'pages', min: 3, gen: () => { const p = R(12, 25), d = 7, tot = p * d + R(20, 90), f = pick(NAMES_F); return Q.wordMulti(`${f} קראה ${p} עמודים בכל יום במשך שבוע (7 ימים). בספר יש ${tot} עמודים. כמה עמודים קראה, וכמה נשארו לה?`, [{ label: 'קראה', answer: p * d }, { label: 'נשארו', answer: tot - p * d }], `${M(`${p} × 7 = ${p * d}`)} ; ${M(`${tot} − ${p * d} = ${tot - p * d}`)}`, 'שלב 1: כמה קראה בשבוע (כפל). שלב 2: כמה נשאר מהספר (חיסור).'); } },
    { id: 'ratio', min: 3, gen: () => { const s = R(8, 30), k = pick([2, 3, 4]), f = pick(NAMES_F); return Q.wordMulti(`🧠 אתגר: ל${f} ולאחיה יש יחד ${s * (k + 1)} גולות. ל${f} יש <b>פי ${k}</b> יותר גולות מלאחיה. כמה גולות יש לכל אחד?`, [{ label: 'לאח', answer: s }, { label: `ל${f}`, answer: s * k }], `לאח יש חלק אחד, ל${f} יש ${k} חלקים – ביחד ${k + 1} חלקים. ${M(`${s * (k + 1)} ÷ ${k + 1} = ${s}`)} לאח, ${M(`${s} × ${k} = ${s * k}`)} ל${f}.`, `ציירי: לאח – ריבוע אחד ⬜, ל${f} – ${k} ריבועים. כמה ריבועים ביחד? חלקי את כל הגולות למספר הריבועים.`); } },
  ],

  angles: [
    { id: 'pic', min: 1, gen: () => Q.anglePic(pick([90, 90, R(4, 14) * 5, R(22, 32) * 5])) },
    { id: 'clock', min: 1, gen: () => Q.clock(pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11])) },
    { id: 'object', min: 1, gen: () => { const [n, t] = pick(ANGLE_OBJECTS); return Q.angleObject(n, t); } },
    { id: 'term', min: 1, gen: () => pick([
      () => Q.angleTerm('זווית שגדולה מזווית ישרה נקראת:', 'קהה'),
      () => Q.angleTerm('זווית שקטנה מזווית ישרה נקראת:', 'חדה'),
      () => Q.angleTerm('לזווית בפינה של דף קוראים:', 'ישרה'),
      () => Q.angleTerm('כמה מעלות יש בזווית ישרה?', '90°', ['45°', '90°', '180°']),
    ])() },
  ],

  triangles: [
    { id: 'sides', min: 1, gen: () => {
      const t = pick(['eq', 'iso', 'sc']);
      if (t === 'eq') { const a = R(3, 12); return Q.triSides(a, a, a); }
      if (t === 'iso') { const a = R(4, 10), b = R(2, 2 * a - 1); if (a === b) return Q.triSides(a, a, a); return pick([() => Q.triSides(a, a, b), () => Q.triSides(b, a, a), () => Q.triSides(a, b, a)])(); }
      let a, b, c; do { a = R(3, 12); b = R(3, 12); c = R(3, 12); } while (a === b || b === c || a === c || a + b <= c || a + c <= b || b + c <= a);
      return Q.triSides(a, b, c);
    } },
    { id: 'desc', min: 1, gen: () => pick([
      () => Q.triDesc('במשולש יש זווית ישרה אחת ושתי זוויות חדות. איזה משולש זה?', 'ישר זווית'),
      () => Q.triDesc('כל שלוש הזוויות במשולש חדות. איזה משולש זה?', 'חד זוויות'),
      () => Q.triDesc('במשולש יש זווית קהה אחת ושתי זוויות חדות. איזה משולש זה?', 'קהה זווית'),
      () => Q.triDesc('במשולש יש בדיוק שתי צלעות שוות. איזה משולש זה?', 'שווה שוקיים', true),
      () => Q.triDesc('במשולש כל הצלעות באורך שונה. איזה משולש זה?', 'שונה צלעות', true),
      () => Q.triDesc('במשולש כל שלוש הצלעות שוות. איזה משולש זה?', 'שווה צלעות', true),
    ])() },
    { id: 'picture', min: 1, gen: () => { const [A, B] = randomTriangle(); return Q.triPicture(A, B); } },
    { id: 'degrees', min: 2, gen: () => Q.triAngles(...randomTriangle()) },
    { id: 'tf', min: 2, gen: () => { const [s, v, e] = pick(TRI_FACTS); return Q.trueFalse('triangles', s, v, e); } },
  ],
};

function randomTriangle() {
  const t = pick(['right', 'acute', 'obtuse']);
  if (t === 'right') { const a = R(5, 13) * 5; return pick([[90, a, 90 - a], [a, 90, 90 - a]]); }
  if (t === 'obtuse') { const o = R(21, 28) * 5, a = R(4, (180 - o) / 5 - 4) * 5; return pick([[a, o, 180 - o - a], [o, a, 180 - o - a]]); }
  let A, B, C; do { A = R(9, 17) * 5; B = R(9, 17) * 5; C = 180 - A - B; } while (C >= 90 || C < 40);
  return [A, B, C];
}

const ANGLE_OBJECTS = [
  ['פינה של מחברת', 'ישרה'], ['קצה של משולש פיצה', 'חדה'], ['מחשב נייד פתוח לרווחה', 'קהה'],
  ['האות L', 'ישרה'], ['האות V', 'חדה'], ['פינה של חלון', 'ישרה'], ['מספריים כמעט סגורים', 'חדה'],
  ['פינה של דלת', 'ישרה'], ['מניפה פתוחה לרווחה', 'קהה'], ['חוד של עיפרון מחודד', 'חדה'], ['פינה של מסך טלוויזיה', 'ישרה'],
];

const TRI_FACTS = [
  ['יכול להיות משולש עם שתי זוויות ישרות.', false, 'אם יש שתי זוויות ישרות, הצלעות לא ייפגשו לעולם – אין משולש כזה.'],
  ['כל משולש שווה צלעות הוא גם שווה שוקיים.', true, 'במשולש שווה צלעות יש (לפחות) שתי צלעות שוות – לכן הוא גם שווה שוקיים.'],
  ['יכול להיות משולש ישר זווית שהוא גם שווה שוקיים.', true, 'כמו חצי ריבוע שחתכו באלכסון – יש בו זווית ישרה ושתי צלעות שוות.'],
  ['משולש שווה צלעות יכול להיות קהה זווית.', false, 'במשולש שווה צלעות כל הזוויות שוות (60°) – כולן חדות.'],
  ['יכול להיות משולש עם שתי זוויות קהות.', false, 'שתי זוויות קהות "פתוחות" מדי – הצלעות לא ייסגרו למשולש.'],
  ['במשולש ישר זווית שתי הזוויות האחרות חדות.', true, 'אם יש זווית ישרה, שתי האחרות חייבות להיות חדות.'],
  ['במשולש חד זוויות יש זווית ישרה אחת.', false, 'במשולש חד זוויות <b>כל</b> הזוויות חדות – אין בו זווית ישרה.'],
];

const EXPR_TEMPLATES = [
  { L: 1, make: () => [R(2, 20), '+', R(2, 9), '×', R(2, 9)] },
  { L: 1, make: () => { const b = R(2, 9), c = R(2, 9); return [b * c + R(1, 40), '−', b, '×', c]; } },
  { L: 1, make: () => ['(', R(2, 9), '+', R(1, 9), ')', '×', R(2, 6)] },
  { L: 1, make: () => [R(2, 9), '×', R(2, 9), '+', R(1, 20)] },
  { L: 1, make: () => { const b = R(5, 20), c = R(5, 20); return [b + c + R(1, 30), '−', '(', b, '+', c, ')']; } },
  { L: 1, make: () => { const c = R(2, 9); return [c * R(2, 9), '÷', c, '+', R(1, 9)]; } },
  { L: 2, make: () => { const d = R(2, 9), c = R(1, 9); return [d * R(2, 9), '÷', '(', d + c, '−', c, ')']; } },
  { L: 2, make: () => [R(2, 9), '×', R(2, 9), '+', R(2, 9), '×', R(2, 9)] },
  { L: 2, make: () => { const c = R(2, 9), q = R(2, 9); return [q + R(1, 20), '−', c * q, '÷', c]; } },
  { L: 2, make: () => { const c = R(1, 5); return [R(2, 9), '×', '(', c + R(1, 6), '−', c, ')', '+', R(1, 9)]; } },
  { L: 3, make: () => { const b = R(2, 9); return [b * R(2, 9), '÷', b, '+', R(2, 9), '×', R(2, 9)]; } },
  { L: 3, make: () => { const c = R(2, 6), q = R(2, 6), b = R(1, 9); return ['(', c * q + b, '−', b, ')', '÷', c, '×', R(2, 5)]; } },
  { L: 3, make: () => { const c = R(2, 9); return [R(5, 20), '+', c * R(2, 9), '÷', c, '−', R(1, 5)]; } },
  { L: 3, make: () => { const e = R(1, 5); return [R(2, 6), '×', '(', R(2, 6), '+', R(2, 6), ')', '−', '(', e + R(2, 9), '−', e, ')']; } },
  { L: 3, make: () => [R(60, 100), '−', R(4, 9), '×', R(4, 9)] },
];

// pick a sub-type for a topic at a given level, avoiding the last one used
function generate(topic, level, avoidSub, forceSub) {
  const subs = GEN[topic].filter((s) => s.min <= level);
  let s = forceSub && subs.find((x) => x.id === forceSub);
  if (!s) {
    const pool = subs.length > 1 ? subs.filter((x) => x.id !== avoidSub) : subs;
    s = pick(pool);
  }
  const q = s.gen(level);
  q.genSub = s.id;
  q.topic = topic;
  return q;
}
