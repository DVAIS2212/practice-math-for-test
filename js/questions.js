'use strict';
/*
 * Question builders. Every builder returns a plain object:
 *  { topic, sub, kind: 'num'|'choice'|'multi'|'select', prompt, visual,
 *    answer | accept | choices | blanks | options+correct, hint, solution, vertical? }
 * The generators (random practice) and the booklet both use these builders.
 */

const TOPICS = [
  { id: 'place', name: 'מבנה המספר העשרוני', icon: '🔢' },
  { id: 'line', name: 'ישר המספרים', icon: '📏' },
  { id: 'compare', name: 'אי־שוויונים', icon: '🐊' },
  { id: 'seq', name: 'סדרות חשבוניות', icon: '🪜' },
  { id: 'addsub', name: 'חיבור וחיסור במאונך', icon: '➕' },
  { id: 'mult', name: 'כפל במאונך', icon: '✖️' },
  { id: 'order', name: 'סדר פעולות חשבון', icon: '🧩' },
  { id: 'word', name: 'שאלות מילוליות', icon: '📚' },
  { id: 'angles', name: 'סוגי זוויות', icon: '📐' },
  { id: 'triangles', name: 'סוגי משולשים', icon: '🔺' },
];
const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

const choicesOf = (labels) => labels.map((l) => ({ label: l, value: l }));
const steps = (arr) => `<ol class="steps">${arr.map((s) => `<li>${s}</li>`).join('')}</ol>`;

function placeTable(n) {
  const d = digitsOf(n);
  const k = d.length;
  let head = '', row = '', vals = '';
  for (let i = k - 1; i >= 0; i--) {
    head += `<th>${PLACE[i]}</th>`;
    row += `<td class="pt-digit">${d[i]}</td>`;
    vals += `<td>${fmt(d[i] * PLACE_VALUE[i])}</td>`;
  }
  return `<table class="place-table" dir="ltr"><tr>${head}</tr><tr>${row}</tr><tr class="pt-vals">${vals}</tr></table>`;
}

function expansionOf(n) {
  return digitsOf(n).map((d, i) => d * PLACE_VALUE[i]).filter((v) => v).reverse();
}

const Q = {
  // ======================= 1. place value =======================
  wordsToDigits(n, words) {
    return {
      topic: 'place', sub: 'wordsToDigits', kind: 'num',
      prompt: 'כתבי את המספר בספרות:',
      visual: `<div class="big-words">${words || numToWords(n)}</div>`,
      answer: n,
      hint: 'פרקי את המספר לחלקים: כמה <b>אלפים</b>, כמה <b>מאות</b>, כמה <b>עשרות</b> וכמה <b>יחידות</b>. אם חסר מקום (למשל אין מאות) – כותבים שם <b>0</b>.',
      solution: placeTable(n) + `<p>ולכן המספר הוא ${M(fmt(n))}</p>`,
    };
  },

  digitsToWords(n) {
    const d = String(n).split('');
    const cands = new Set();
    for (let tries = 0; tries < 60 && cands.size < 6; tries++) {
      const a = d.slice();
      const i = R(0, a.length - 1), j = R(0, a.length - 1);
      [a[i], a[j]] = [a[j], a[i]];
      const v = Number(a.join(''));
      if (a[0] !== '0' && v !== n) cands.add(v);
    }
    if (cands.size < 2) { cands.add(n + 10); cands.add(n + 100); }
    const opts = shuffle([n, ...shuffle([...cands]).slice(0, 2)]);
    return {
      topic: 'place', sub: 'digitsToWords', kind: 'choice',
      prompt: `איך קוראים את המספר?`,
      visual: `<div class="big-num">${M(fmt(n))}</div>`,
      choices: opts.map((v) => ({ label: numToWords(v), value: String(v) })),
      answer: String(n),
      hint: 'התחילי מהספרה השמאלית (האלפים), ואז מאות, עשרות ויחידות. 0 – לא אומרים אותו בכלל.',
      solution: placeTable(n) + `<p>${M(fmt(n))} = <b>${numToWords(n)}</b></p>`,
    };
  },

  digitValue(n, pos) {
    const d = digitsOf(n);
    const val = d[pos] * PLACE_VALUE[pos];
    // render the number with the chosen digit highlighted
    let html = '', idx = d.length - 1;
    for (const ch of fmt(n)) {
      if (ch === ',') { html += ','; continue; }
      html += idx === pos ? `<span class="hl">${ch}</span>` : ch;
      idx--;
    }
    return {
      topic: 'place', sub: 'digitValue', kind: 'num',
      prompt: 'מה הערך של הספרה הצבועה?',
      visual: `<div class="big-num" dir="ltr">${html}</div>`,
      answer: val,
      hint: 'באיזה מקום נמצאת הספרה הצבועה – יחידות, עשרות, מאות או אלפים? <br>הערך = הספרה × המקום. למשל 4 במקום המאות שווה 400.',
      solution: placeTable(n) + `<p>הספרה ${d[pos]} נמצאת במקום ה<b>${PLACE[pos]}</b>, ולכן הערך שלה הוא <b>${M(fmt(val))}</b></p>`,
    };
  },

  expandedToNum(parts) {
    const n = parts.reduce((a, b) => a + b, 0);
    return {
      topic: 'place', sub: 'expandedToNum', kind: 'num',
      prompt: 'איזה מספר מתקבל?',
      visual: `<div class="big-num">${M(parts.map(fmt).join(' + ') + ' = ?')}</div>`,
      answer: n,
      hint: 'כל מחובר נכנס למקום שלו: אלפים, מאות, עשרות, יחידות. מקום שאין לו מחובר – כותבים בו 0.',
      solution: placeTable(n) + `<p>${M(parts.map(fmt).join(' + ') + ' = ' + fmt(n))}</p>`,
    };
  },

  expansionBlanks(n) {
    const parts = expansionOf(n);
    return {
      topic: 'place', sub: 'expansionBlanks', kind: 'multi',
      prompt: 'פרקי את המספר לפי ערך הספרות:',
      visual: `<div class="big-num">${M(fmt(n) + ' = ' + parts.map((_, i) => `<span class="blank-tag">${LETTERS[i]}</span>`).join(' + '))}</div>`,
      blanks: parts.map((v, i) => ({ label: LETTERS[i], answer: v })),
      hint: 'כל ספרה הופכת למחובר: הספרה × המקום שלה. מתחילים מהאלפים. ספרה 0 – מדלגים עליה.',
      solution: placeTable(n) + `<p>${M(fmt(n) + ' = ' + parts.map(fmt).join(' + '))}</p>`,
    };
  },

  missingPart(n) {
    const parts = expansionOf(n);
    const k = R(0, parts.length - 1);
    const shown = parts.map((v, i) => (i === k ? '?' : fmt(v)));
    return {
      topic: 'place', sub: 'missingPart', kind: 'num',
      prompt: 'מה חסר בפירוק?',
      visual: `<div class="big-num">${M(fmt(n) + ' = ' + shown.join(' + '))}</div>`,
      answer: parts[k],
      hint: 'בדקי איזה מקום (אלפים / מאות / עשרות / יחידות) לא מופיע בפירוק, ומה הספרה שלו במספר.',
      solution: placeTable(n) + `<p>${M(fmt(n) + ' = ' + parts.map(fmt).join(' + '))}</p>`,
    };
  },

  succPred(n) {
    return {
      topic: 'place', sub: 'succPred', kind: 'multi',
      prompt: 'השלימי את הקודם ואת העוקב:',
      visual: `<div class="big-num">${M(`<span class="blank-tag">א</span> ← ${fmt(n)} → <span class="blank-tag">ב</span>`)}</div>`,
      blanks: [{ label: 'א – הקודם', answer: n - 1 }, { label: 'ב – העוקב', answer: n + 1 }],
      hint: '<b>הקודם</b> = המספר פחות 1. <b>העוקב</b> = המספר ועוד 1. שימי לב כשעוברים עשרת, מאה או אלף!',
      solution: `<p>הקודם: ${M(fmt(n) + ' − 1 = ' + fmt(n - 1))}</p><p>העוקב: ${M(fmt(n) + ' + 1 = ' + fmt(n + 1))}</p>`,
    };
  },

  evenOdd(n) {
    const u = n % 10, even = u % 2 === 0;
    return {
      topic: 'place', sub: 'evenOdd', kind: 'choice',
      prompt: 'המספר זוגי או אי־זוגי?',
      visual: `<div class="big-num">${M(fmt(n))}</div>`,
      choices: choicesOf(['זוגי', 'אי־זוגי']),
      answer: even ? 'זוגי' : 'אי־זוגי',
      hint: 'מסתכלים רק על ספרת <b>היחידות</b> (הספרה הימנית ביותר). זוגי נגמר ב־0, 2, 4, 6, 8.',
      solution: `<p>ספרת היחידות היא ${u}, ולכן המספר <b>${even ? 'זוגי' : 'אי־זוגי'}</b>.</p>`,
    };
  },

  digitCount(n) {
    const names = ['חד־ספרתי', 'דו־ספרתי', 'תלת־ספרתי', 'ארבע־ספרתי', 'חמש־ספרתי'];
    const k = String(n).length;
    return {
      topic: 'place', sub: 'digitCount', kind: 'choice',
      prompt: 'כמה ספרות יש במספר?',
      visual: `<div class="big-num">${M(fmt(n))}</div>`,
      choices: choicesOf(names),
      answer: names[k - 1],
      hint: 'ספרי את הספרות במספר (הפסיק לא נחשב!).',
      solution: `<p>במספר ${M(fmt(n))} יש ${k} ספרות, ולכן הוא <b>${names[k - 1]}</b>.</p>`,
    };
  },

  selectNumbers(prompt, nums, pred, hint, explain) {
    return {
      topic: 'place', sub: 'select', kind: 'select',
      prompt, visual: '',
      options: nums.map((v) => ({ label: fmt(v), value: String(v) })),
      correct: nums.filter(pred).map(String),
      hint, solution: `<p>${explain}: ${nums.filter(pred).map((v) => M(fmt(v))).join(' , ')}</p>`,
    };
  },

  fromDigits(digits, largest) {
    const sorted = digits.slice().sort((a, b) => (largest ? b - a : a - b));
    if (!largest && sorted[0] === 0) { const i = sorted.findIndex((x) => x > 0); [sorted[0], sorted[i]] = [sorted[i], sorted[0]]; }
    const ans = Number(sorted.join(''));
    return {
      topic: 'place', sub: 'fromDigits', kind: 'num',
      prompt: `מהספרות ${M(digits.join(' , '))} (כל ספרה פעם אחת) בני את המספר ה<b>${largest ? 'גדול' : 'קטן'} ביותר</b>:`,
      visual: '',
      answer: ans,
      hint: largest
        ? 'שימי את הספרה הכי גדולה במקום הכי שווה – האלפים (בצד שמאל), ואחריה את הבאה בגודל.'
        : 'שימי את הספרה הכי קטנה בהתחלה (באלפים) – אבל לא 0! ואז את הבאה בגודל.',
      solution: `<p>מסדרים את הספרות מה${largest ? 'גדולה לקטנה' : 'קטנה לגדולה'}: <b>${M(fmt(ans))}</b></p>`,
    };
  },

  placeRiddle(text, ans, explain) {
    return {
      topic: 'place', sub: 'riddle', kind: 'num',
      prompt: text, visual: '', answer: ans,
      hint: 'חשבי: כמה ספרות צריכות להיות במספר? ואיך הוא צריך להיגמר?',
      solution: `<p>${explain}</p>`,
    };
  },

  // ======================= 2. number line =======================
  numberLine(start, step, count, hiddenIdx) {
    const values = Array.from({ length: count }, (_, i) => start + i * step);
    const hidden = {};
    const single = hiddenIdx.length === 1;
    hiddenIdx.forEach((i, k) => (hidden[i] = single ? '?' : LETTERS[k]));
    const q = {
      topic: 'line', sub: 'numberLine',
      prompt: single ? 'איזה מספר מסתתר מאחורי סימן השאלה?' : 'השלימי את המספרים החסרים על הישר:',
      visual: numberLineSVG(values, hidden),
      hint: 'בחרי שני מספרים שאת רואה ובדקי כמה שנתות יש ביניהם. ההפרש ביניהם חלקי מספר הקפיצות = בכמה קופצים בכל שנתה.',
      solution: `<p>בכל שנתה קופצים ב־<b>${fmt(step)}</b>:</p><p>${M(values.map(fmt).join(' , '))}</p>`,
    };
    if (single) Object.assign(q, { kind: 'num', answer: values[hiddenIdx[0]] });
    else Object.assign(q, { kind: 'multi', blanks: hiddenIdx.map((i, k) => ({ label: LETTERS[k], answer: values[i] })) });
    return q;
  },

  midpoint(a, b) {
    const m = (a + b) / 2;
    return {
      topic: 'line', sub: 'midpoint', kind: 'num',
      prompt: `איזה מספר נמצא בדיוק באמצע בין ${M(fmt(a))} ל־${M(fmt(b))}?`,
      visual: numberLineSVG([a, m, b], { 1: '?' }),
      answer: m,
      hint: `חשבי את המרחק בין המספרים (${M(fmt(b) + ' − ' + fmt(a))}), קחי ממנו חצי, והוסיפי את החצי למספר הקטן.`,
      solution: steps([
        `המרחק: ${M(fmt(b) + ' − ' + fmt(a) + ' = ' + fmt(b - a))}`,
        `חצי מהמרחק: ${M(fmt(b - a) + ' ÷ 2 = ' + fmt((b - a) / 2))}`,
        `האמצע: ${M(fmt(a) + ' + ' + fmt((b - a) / 2) + ' = ' + fmt(m))}`,
      ]),
    };
  },

  closer(x, a, b) {
    const m = (a + b) / 2;
    const ans = x < m ? a : b;
    return {
      topic: 'line', sub: 'closer', kind: 'choice',
      prompt: `האם ${M(fmt(x))} קרוב יותר ל־${M(fmt(a))} או ל־${M(fmt(b))}?`,
      visual: '',
      choices: [{ label: `ל־${fmt(a)}`, value: String(a) }, { label: `ל־${fmt(b)}`, value: String(b) }],
      answer: String(ans),
      hint: `מצאי את האמצע בין ${M(fmt(a))} ל־${M(fmt(b))}. אם המספר קטן מהאמצע – הוא קרוב יותר ל־${M(fmt(a))}.`,
      solution: `<p>האמצע הוא ${M(fmt(m))}. המספר ${M(fmt(x))} ${x < m ? 'קטן' : 'גדול'} מהאמצע, ולכן הוא קרוב יותר ל־<b>${M(fmt(ans))}</b>.</p>`,
    };
  },

  // ======================= 3. compare =======================
  compare(left, right) {
    const L = Array.isArray(left) ? left : [left], Rt = Array.isArray(right) ? right : [right];
    const lv = evalTokens(L), rv = evalTokens(Rt);
    const sym = lv > rv ? '>' : lv < rv ? '<' : '=';
    const plain = L.length === 1 && Rt.length === 1;
    const sol = [];
    if (L.length > 1) sol.push(`${M(renderTokens(L) + ' = ' + fmt(lv))}`);
    if (Rt.length > 1) sol.push(`${M(renderTokens(Rt) + ' = ' + fmt(rv))}`);
    sol.push(`${M(fmt(lv) + ' ' + sym + ' ' + fmt(rv))}`);
    if (plain) sol.unshift(compareExplain(lv, rv));
    return {
      topic: 'compare', sub: plain ? 'numbers' : 'exprs', kind: 'choice',
      prompt: 'איזה סימן מתאים?',
      visual: `<div class="big-num">${M(renderTokens(L) + ' <span class="circle-blank">?</span> ' + renderTokens(Rt))}</div>`,
      choices: choicesOf(['>', '<', '=']).map((c) => ({ ...c, label: `<span class="sym">${c.label}</span>` })),
      answer: sym,
      hint: plain
        ? 'למי יש יותר ספרות? אם אותו מספר ספרות – השווי ספרה־ספרה משמאל: קודם האלפים, אחר כך המאות... 🐊 הפה של התנין נפתח אל המספר הגדול.'
        : 'קודם חשבי כל צד בנפרד, ורק אז השווי. 🐊 הפה של התנין נפתח אל המספר הגדול.',
      solution: steps(sol),
    };
  },

  missingDigitCompare(template, accept, explain) {
    return {
      topic: 'compare', sub: 'missingDigit', kind: 'num',
      prompt: 'איזו ספרה חסרה כדי שהתשובה תהיה נכונה?',
      visual: `<div class="big-num">${M(template.replace('_', '<span class="circle-blank">?</span>'))}</div>`,
      answer: accept[0], accept,
      hint: 'השווי את שני המספרים ספרה־ספרה משמאל. מצאי את המקום הראשון שבו הם שונים, ונסי להציב שם ספרות שונות.',
      solution: `<p>${explain}</p>`,
    };
  },

  orderNumbers(nums) {
    const sorted = nums.slice().sort((a, b) => a - b);
    return {
      topic: 'compare', sub: 'order', kind: 'multi',
      prompt: 'סדרי את המספרים מהקטן לגדול:',
      visual: `<div class="big-num">${M(nums.map(fmt).join(' &nbsp; '))}</div>`,
      blanks: sorted.map((v, i) => ({ label: i === 0 ? 'הכי קטן' : i === sorted.length - 1 ? 'הכי גדול' : `${i + 1}`, answer: v })),
      hint: 'כל המספרים מתחילים באותו מספר אלפים? אז השווי לפי המאות, ואחר כך לפי העשרות.',
      solution: `<p>${M(sorted.map(fmt).join(' < '))}</p>`,
    };
  },

  extreme(nums, biggest) {
    const ans = biggest ? Math.max(...nums) : Math.min(...nums);
    return {
      topic: 'compare', sub: 'extreme', kind: 'choice',
      prompt: `מה המספר ה<b>${biggest ? 'גדול' : 'קטן'} ביותר</b>?`,
      visual: '',
      choices: nums.map((v) => ({ label: fmt(v), value: String(v) })),
      answer: String(ans),
      hint: 'השווי ספרה־ספרה משמאל: קודם האלפים, אחר כך המאות, ואז העשרות.',
      solution: `<p>${M(nums.slice().sort((a, b) => a - b).map(fmt).join(' < '))}</p><p>ולכן התשובה: <b>${M(fmt(ans))}</b></p>`,
    };
  },

  // ======================= 4. sequences =======================
  seqBlanks(seq /* numbers with null for blanks */, step) {
    const full = [];
    const firstKnown = seq.findIndex((x) => x !== null);
    for (let i = 0; i < seq.length; i++) full.push(seq[firstKnown] + (i - firstKnown) * step);
    const idx = seq.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0);
    const single = idx.length === 1;
    let k = 0;
    const shown = seq.map((x) => (x === null ? `<span class="blank-tag">${single ? '?' : LETTERS[k++]}</span>` : fmt(x)));
    const q = {
      topic: 'seq', sub: 'blanks',
      prompt: single ? 'מה המספר החסר בסדרה?' : 'מצאי את הכלל והשלימי את הסדרה:',
      visual: `<div class="big-num seq">${M(shown.join(' , '))}</div>`,
      hint: 'מצאי שני מספרים צמודים שאת יודעת – ההפרש ביניהם הוא הכלל (+ או −). אם יש חור באמצע, ההפרש בין המספרים שמשני צדיו מתחלק לשתי קפיצות.',
      solution: `<p>הכלל: <b>${M((step > 0 ? '+' : '−') + fmt(Math.abs(step)))}</b></p><p>${M(full.map(fmt).join(' , '))}</p>`,
    };
    if (single) Object.assign(q, { kind: 'num', answer: full[idx[0]] });
    else Object.assign(q, { kind: 'multi', blanks: idx.map((i, j) => ({ label: LETTERS[j], answer: full[i] })) });
    return q;
  },

  seqRule(seq, step) {
    const s = Math.abs(step);
    const opts = new Set([step]);
    opts.add(-step);
    for (const d of shuffle([1, 2, -1, -2, s, -s])) { if (opts.size >= 4) break; const c = step + (step > 0 ? d : -d); if (c !== 0 && Math.abs(c) !== 0) opts.add(c); }
    const lab = (v) => (v > 0 ? '+' : '−') + fmt(Math.abs(v));
    return {
      topic: 'seq', sub: 'rule', kind: 'choice',
      prompt: 'מה הכלל של הסדרה?',
      visual: `<div class="big-num seq">${M(seq.map(fmt).join(' , ') + ' , ...')}</div>`,
      choices: shuffle([...opts]).map((v) => ({ label: `<bdi dir="ltr">${lab(v)}</bdi>`, value: String(v) })),
      answer: String(step),
      hint: `חשבי: כמה צריך להוסיף (או להוריד) כדי להגיע מ־${M(fmt(seq[0]))} ל־${M(fmt(seq[1]))}? בדקי שזה נכון גם בזוג הבא.`,
      solution: `<p>${M(fmt(seq[1]) + ' − ' + fmt(seq[0]) + ' = ' + fmt(seq[1] - seq[0]))} … הכלל הוא <b>${M(lab(step))}</b></p>`,
    };
  },

  seqNth(a0, step, n, text) {
    const ans = a0 + (n - 1) * step;
    const list = Array.from({ length: Math.min(n, 12) }, (_, i) => a0 + i * step);
    return {
      topic: 'seq', sub: 'nth', kind: 'num',
      prompt: text || `בסדרה ${M([0, 1, 2, 3].map((i) => fmt(a0 + i * step)).join(' , ') + ' ...')} מה המספר ה<b>${ordinal(n)}</b>?`,
      visual: '',
      answer: ans,
      hint: `מהמספר הראשון עד המספר ה${ordinal(n)} יש ${n - 1} קפיצות. אפשר גם פשוט להמשיך לכתוב את הסדרה ולספור.`,
      solution: `<p>${M(list.map(fmt).join(' , '))}</p><p>או: ${M(fmt(a0) + ` ${step > 0 ? '+' : '−'} ` + (n - 1) + ' × ' + fmt(Math.abs(step)) + ' = ' + fmt(ans))}</p>`,
    };
  },

  seqAppears(a0, step, x) {
    const yes = (x - a0) % step === 0 && (x - a0) / step >= 0;
    const list = [];
    for (let v = a0; v <= x + step && list.length < 30; v += step) list.push(v);
    return {
      topic: 'seq', sub: 'appears', kind: 'choice',
      prompt: `בסדרה ${M([0, 1, 2, 3].map((i) => fmt(a0 + i * step)).join(' , ') + ' ...')} האם המספר ${M(fmt(x))} יופיע?`,
      visual: '',
      choices: choicesOf(['כן', 'לא']),
      answer: yes ? 'כן' : 'לא',
      hint: `המשיכי את הסדרה עד שתגיעי ל־${M(fmt(x))} או שתעברי אותו.`,
      solution: `<p>${M(list.map(fmt).join(' , '))}</p><p>${yes ? 'הגענו בדיוק אל ' : 'דילגנו מעל '}${M(fmt(x))} – התשובה: <b>${yes ? 'כן' : 'לא'}</b></p>`,
    };
  },

  // ======================= 5. add / subtract =======================
  vertical(a, b, op) {
    const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
    const A = fmt(a), B = fmt(b), C = fmt(ans);
    const w = Math.max(A.length, B.length + 2, C.length) + 1;
    const topic = op === '×' ? 'mult' : 'addsub';
    const sol = op === '+' ? addSteps(a, b) : op === '−' ? subSteps(a, b) : multSteps(a, b);
    let hint;
    if (op === '+') hint = `מתחילים מעמודת <b>היחידות</b> (מימין): ${M(digitsOf(a)[0] + ' + ' + digitsOf(b)[0])}. אם יוצא 10 או יותר – כותבים את ספרת היחידות ומעבירים 1 לעמודה הבאה (המרה).`;
    else if (op === '−') hint = `מתחילים מעמודת <b>היחידות</b>. אם הספרה למעלה קטנה מהספרה למטה – פורטים: לוקחים 1 מהעמודה שמשמאל, והספרה שלנו גדלה ב־10. <br>בדיקה: התשובה + ${M(fmt(b))} צריכה לצאת ${M(fmt(a))}.`;
    else hint = `כופלים את ${b} בכל ספרה, מתחילים מהיחידות: ${M(digitsOf(a)[0] + ' × ' + b)}. אם יוצא 10 או יותר – כותבים את היחידות ו"זוכרים" את העשרות לעמודה הבאה.<br>דרך נוספת: ${M(expansionOf(a).map(fmt).join(' + '))}, וכופלים כל חלק ב־${b}.`;
    return {
      topic, sub: op === '×' ? (a >= 100 ? 'mult3' : 'mult2') : op === '+' ? 'add' : 'sub', kind: 'num',
      prompt: op === '×' ? 'פתרי במאונך:' : 'פתרי במאונך. שימי לב לפריטה ולהמרה!',
      vertical: { top: A.padStart(w), bottom: (op + ' ' + B).padStart(w), width: w },
      visual: '',
      answer: ans,
      hint,
      solution: steps(sol) + `<p>התשובה: <b>${M(C)}</b></p>`,
    };
  },

  detective(a, b, claimed, name) {
    const right = a - b;
    return {
      topic: 'addsub', sub: 'detective', kind: 'choice',
      prompt: `🕵️ ${name} פתר: ${M(fmt(a) + ' − ' + fmt(b) + ' = ' + fmt(claimed))}. האם הוא צדק?`,
      visual: '',
      choices: choicesOf(['צדק', 'לא צדק']),
      answer: claimed === right ? 'צדק' : 'לא צדק',
      hint: `בדקי בעזרת חיבור: ${M(fmt(claimed) + ' + ' + fmt(b))} – האם יוצא ${M(fmt(a))}?`,
      solution: steps(subSteps(a, b)) + `<p>התשובה הנכונה: <b>${M(fmt(right))}</b>. בדיקה: ${M(fmt(right) + ' + ' + fmt(b) + ' = ' + fmt(a))}</p>`,
    };
  },

  checkBySum(a, b) {
    const d = a - b;
    const opts = shuffle([
      `${fmt(d)} + ${fmt(b)} = ${fmt(a)}`,
      `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`,
      `${fmt(d)} + ${fmt(a)} = ${fmt(a + d)}`,
    ]);
    return {
      topic: 'addsub', sub: 'check', kind: 'choice',
      prompt: `${M(fmt(a) + ' − ' + fmt(b) + ' = ' + fmt(d))}. באיזה תרגיל חיבור בודקים את התשובה?`,
      visual: '',
      choices: opts.map((o) => ({ label: `<bdi dir="ltr">${o}</bdi>`, value: o })),
      answer: `${fmt(d)} + ${fmt(b)} = ${fmt(a)}`,
      hint: 'בחיסור: התשובה + המספר שהורדנו = המספר שממנו התחלנו.',
      solution: `<p>${M(fmt(d) + ' + ' + fmt(b) + ' = ' + fmt(a))} ✔️</p>`,
    };
  },

  // ======================= 6. multiplication =======================
  multFact(a, b) {
    return {
      topic: 'mult', sub: 'fact', kind: 'num',
      prompt: 'כמה זה?',
      visual: `<div class="big-num">${M(a + ' × ' + b + ' = ?')}</div>`,
      answer: a * b,
      hint: `אפשר לפרק: ${M(`${a} × ${b} = ${a} × ${b - Math.floor(b / 2)} + ${a} × ${Math.floor(b / 2)}`)}`,
      solution: `<p>${M(`${a} × ${b - Math.floor(b / 2)} = ${a * (b - Math.floor(b / 2))}`)}, ${M(`${a} × ${Math.floor(b / 2)} = ${a * Math.floor(b / 2)}`)}</p><p>${M(`${a * (b - Math.floor(b / 2))} + ${a * Math.floor(b / 2)} = ${a * b}`)}</p>`,
    };
  },

  multMissing(t, u, b) {
    const a = t * 10 + u, p = a * b;
    return {
      topic: 'mult', sub: 'missing', kind: 'num',
      prompt: '🧠 אתגר: איזו ספרה חסרה?',
      visual: `<div class="big-num">${M(`${t}<span class="circle-blank">?</span> × ${b} = ${fmt(p)}`)}</div>`,
      answer: u,
      hint: `ספרת היחידות של התוצאה היא ${p % 10}. איזו ספרה כפול ${b} נגמרת ב־${p % 10}? נסי ובדקי.`,
      solution: `<p>${M(`${a} × ${b} = ${fmt(p)}`)} – הספרה החסרה היא <b>${u}</b>.</p>`,
    };
  },

  // ======================= 7. order of operations =======================
  evalExpr(tokens) {
    const r = evalSteps(tokens);
    const first = r.ops[0];
    const why = first.inParens ? 'כי יש סוגריים – הם תמיד ראשונים' : first.op[1] === '×' || first.op[1] === '÷' ? 'כי כפל וחילוק באים לפני חיבור וחיסור' : 'כי אין סוגריים, כפל או חילוק – מחשבים משמאל לימין';
    return {
      topic: 'order', sub: 'eval', kind: 'num',
      prompt: 'חשבי (זכרי את סדר הפעולות!):',
      visual: `<div class="big-num">${M(renderTokens(tokens) + ' = ?')}</div>`,
      answer: r.value,
      hint: `סדר הפעולות: 1️⃣ סוגריים 2️⃣ כפל וחילוק 3️⃣ חיבור וחיסור.<br>כאן מתחילים מ־${M(renderTokens(first.op))} – ${why}.`,
      solution: `<div class="chain">${r.steps.map((s, i) => `<div>${i ? '= ' : ''}${M(s)}</div>`).join('')}</div>`,
    };
  },

  parens(base, target) {
    // options: no parentheses, parentheses on the first pair, on the second pair
    const [a, o1, b, o2, c] = base;
    const variants = [base, ['(', a, o1, b, ')', o2, c], [a, o1, '(', b, o2, c, ')']];
    const ok = [];
    for (const v of variants) { try { ok.push({ t: v, v: evalTokens(v) }); } catch (e) { /* invalid */ } }
    const right = ok.find((o) => o.t.includes('(') && o.v === target);
    return {
      topic: 'order', sub: 'parens', kind: 'choice',
      prompt: `איפה צריך לשים סוגריים כדי שהתשובה תהיה ${M(fmt(target))}?`,
      visual: `<div class="big-num">${M(renderTokens(base) + ' = ' + fmt(target))}</div>`,
      choices: shuffle(ok).map((o) => ({ label: `<bdi dir="ltr">${renderTokens(o.t)}</bdi>`, value: renderTokens(o.t) })),
      answer: renderTokens(right.t),
      hint: 'נסי לחשב כל אפשרות. זכרי: מה שבסוגריים מחשבים ראשון!',
      solution: ok.map((o) => `<p>${M(renderTokens(o.t) + ' = ' + fmt(o.v))} ${o === right ? '✔️' : ''}</p>`).join(''),
    };
  },

  trueFalseExpr(tokens, claimed) {
    const r = evalSteps(tokens);
    const ok = r.value === claimed;
    return {
      topic: 'order', sub: 'truefalse', kind: 'choice',
      prompt: 'נכון או לא נכון?',
      visual: `<div class="big-num">${M(renderTokens(tokens) + ' = ' + fmt(claimed))}</div>`,
      choices: choicesOf(['נכון', 'לא נכון']),
      answer: ok ? 'נכון' : 'לא נכון',
      hint: 'פתרי בעצמך לפי סדר הפעולות (סוגריים ← כפל וחילוק ← חיבור וחיסור) והשווי לתשובה שכתובה.',
      solution: `<div class="chain">${r.steps.map((s, i) => `<div>${i ? '= ' : ''}${M(s)}</div>`).join('')}</div><p>${ok ? 'נכון ✔️' : `לא נכון – התשובה הנכונה היא <b>${M(fmt(r.value))}</b>`}</p>`,
    };
  },

  // ======================= 8. word problems =======================
  word(text, answer, exercise, hint, unit) {
    return {
      topic: 'word', sub: 'word', kind: 'num',
      prompt: text, visual: '', answer, unit,
      hint: hint + '<br>כתבי תרגיל, פתרי, ובדקי שהתשובה הגיונית.',
      solution: `<p>התרגיל: ${M(exercise)}</p><p>התשובה: <b>${M(fmt(answer))}</b> ${unit || ''}</p>`,
    };
  },

  wordMulti(text, blanks, exercise, hint) {
    return {
      topic: 'word', sub: 'wordMulti', kind: 'multi',
      prompt: text, visual: '', blanks,
      hint: hint + '<br>כתבי תרגיל לכל שלב.',
      solution: `<p>${exercise}</p>`,
    };
  },

  // ======================= 9. angles =======================
  anglePic(deg, rot) {
    const t = angleTypeOf(deg);
    return {
      topic: 'angles', sub: 'pic', kind: 'choice',
      prompt: 'איזו זווית זו?',
      visual: angleSVG(deg, rot),
      choices: choicesOf(['ישרה', 'חדה', 'קהה']),
      answer: t,
      hint: 'דמייני פינה של דף 📄 (זווית ישרה). אם הזווית <b>צרה</b> יותר מהפינה – חדה. אם היא <b>פתוחה</b> יותר – קהה. ריבוע קטן בפינה = זווית ישרה.',
      solution: `<p>${t === 'ישרה' ? 'הזווית בדיוק כמו פינה של דף (יש בה ריבוע קטן) – <b>ישרה</b>.' : t === 'חדה' ? 'הזווית צרה יותר מפינה של דף – <b>חדה</b>.' : 'הזווית פתוחה יותר מפינה של דף – <b>קהה</b>.'}</p>`,
    };
  },

  clock(h) {
    const k = Math.min(h % 12, 12 - (h % 12));
    const t = k === 3 ? 'ישרה' : k < 3 ? 'חדה' : 'קהה';
    return {
      topic: 'angles', sub: 'clock', kind: 'choice',
      prompt: `🕐 איזו זווית יוצרים מחוגי השעון בשעה ${M(h + ':00')}?`,
      visual: clockSVG(h),
      choices: choicesOf(['ישרה', 'חדה', 'קהה']),
      answer: t,
      hint: 'ספרי כמה "פלחים" (רווחים בין מספרים) יש בין המחוגים. 3 פלחים – כמו ב־3:00 – זו זווית ישרה. פחות מ־3 – חדה. יותר מ־3 – קהה.',
      solution: `<p>בין המחוגים יש ${k} פלחים. ${k === 3 ? 'בדיוק 3 – <b>ישרה</b>' : k < 3 ? 'פחות מ־3 – <b>חדה</b>' : 'יותר מ־3 – <b>קהה</b>'}.</p>`,
    };
  },

  angleObject(name, type) {
    return {
      topic: 'angles', sub: 'object', kind: 'choice',
      prompt: `איזו זווית יש ב${name}?`,
      visual: '',
      choices: choicesOf(['ישרה', 'חדה', 'קהה']),
      answer: type,
      hint: 'דמייני את הצורה. האם היא כמו פינה של דף (ישרה), צרה יותר (חדה) או פתוחה יותר (קהה)?',
      solution: `<p>ב${name} יש זווית <b>${type}</b>.</p>`,
    };
  },

  angleTerm(text, ans, opts) {
    return {
      topic: 'angles', sub: 'term', kind: 'choice',
      prompt: text, visual: '',
      choices: choicesOf(opts || ['ישרה', 'חדה', 'קהה']),
      answer: ans,
      hint: '<b>ישרה</b> – כמו פינה של דף. <b>חדה</b> – קטנה מישרה. <b>קהה</b> – גדולה מישרה.',
      solution: `<p>התשובה: <b>${ans}</b></p>`,
    };
  },

  // ======================= 10. triangles =======================
  triSides(a, b, c) {
    const eq = (a === b) + (b === c) + (a === c);
    const ans = eq === 3 ? 'שווה צלעות' : eq === 1 ? 'שווה שוקיים' : 'שונה צלעות';
    return {
      topic: 'triangles', sub: 'sides', kind: 'choice',
      prompt: `אורכי הצלעות של המשולש הם ${M(a + ', ' + b + ', ' + c)} ס"מ. איזה משולש זה?`,
      visual: triangleSidesSVG(a, b, c),
      choices: choicesOf(['שווה צלעות', 'שווה שוקיים', 'שונה צלעות']),
      answer: ans,
      hint: 'ספרי כמה צלעות שוות: <b>3 שוות</b> – שווה צלעות. <b>2 שוות</b> – שווה שוקיים. <b>אף אחת</b> – שונה צלעות.',
      solution: `<p>${eq === 3 ? 'כל שלוש הצלעות שוות' : eq === 1 ? 'שתי צלעות שוות' : 'אין צלעות שוות'} – <b>${ans}</b>.</p>`,
    };
  },

  triAngles(A, B, C) {
    const mx = Math.max(A, B, C);
    const ans = mx === 90 ? 'ישר זווית' : mx > 90 ? 'קהה זווית' : 'חד זוויות';
    return {
      topic: 'triangles', sub: 'degrees', kind: 'choice',
      prompt: `הזוויות של המשולש הן ${M(A + '°, ' + B + '°, ' + C + '°')}. איזה משולש זה?`,
      visual: triangleSVG(A, B, { labels: true }),
      choices: choicesOf(['ישר זווית', 'חד זוויות', 'קהה זווית']),
      answer: ans,
      hint: 'זווית ישרה = 90°. בדקי את הזווית הכי גדולה: <b>בדיוק 90°</b> – ישר זווית. <b>יותר מ־90°</b> – קהה זווית. <b>כולן פחות מ־90°</b> – חד זוויות.',
      solution: `<p>הזווית הגדולה היא ${mx}° ${mx === 90 ? '(ישרה)' : mx > 90 ? '(קהה – גדולה מ־90°)' : '(חדה – קטנה מ־90°)'} – <b>${ans}</b>.</p>`,
    };
  },

  triPicture(A, B) {
    const C = 180 - A - B, mx = Math.max(A, B, C);
    const ans = mx === 90 ? 'ישר זווית' : mx > 90 ? 'קהה זווית' : 'חד זוויות';
    return {
      topic: 'triangles', sub: 'picture', kind: 'choice',
      prompt: 'איזה משולש זה (לפי הזוויות)?',
      visual: triangleSVG(A, B),
      choices: choicesOf(['ישר זווית', 'חד זוויות', 'קהה זווית']),
      answer: ans,
      hint: 'מצאי את הזווית הכי גדולה במשולש והשווי אותה לפינה של דף. ריבוע קטן = זווית ישרה.',
      solution: `<p>${mx === 90 ? 'יש במשולש זווית ישרה (מסומנת בריבוע)' : mx > 90 ? 'יש במשולש זווית אחת פתוחה יותר מפינה של דף – קהה' : 'כל הזוויות צרות יותר מפינה של דף – חדות'} – <b>${ans}</b>.</p>`,
    };
  },

  triDesc(text, ans, side) {
    return {
      topic: 'triangles', sub: 'desc', kind: 'choice',
      prompt: text, visual: '',
      choices: choicesOf(side ? ['שווה צלעות', 'שווה שוקיים', 'שונה צלעות'] : ['ישר זווית', 'חד זוויות', 'קהה זווית']),
      answer: ans,
      hint: side
        ? '<b>שווה צלעות</b> – 3 צלעות שוות. <b>שווה שוקיים</b> – 2 צלעות שוות. <b>שונה צלעות</b> – אין צלעות שוות.'
        : '<b>ישר זווית</b> – יש זווית ישרה. <b>קהה זווית</b> – יש זווית קהה. <b>חד זוויות</b> – כל הזוויות חדות.',
      solution: `<p>התשובה: <b>${ans}</b></p>`,
    };
  },

  trueFalse(topic, statement, isTrue, explain) {
    return {
      topic, sub: 'tf', kind: 'choice',
      prompt: `נכון או לא נכון?<br><b>${statement}</b>`, visual: '',
      choices: choicesOf(['נכון', 'לא נכון']),
      answer: isTrue ? 'נכון' : 'לא נכון',
      hint: 'נסי לצייר את זה לעצמך על דף. אפשר לצייר את זה בכלל?',
      solution: `<p><b>${isTrue ? 'נכון' : 'לא נכון'}</b> – ${explain}</p>`,
    };
  },
};

function ordinal(n) {
  const o = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני', 'תשיעי', 'עשירי'];
  return o[n] || `ה־${n}`;
}

function angleTypeOf(deg) { return deg === 90 ? 'ישרה' : deg < 90 ? 'חדה' : 'קהה'; }

function compareExplain(a, b) {
  const A = String(a), B = String(b);
  if (A.length !== B.length) return `ל־${M(fmt(a))} יש ${A.length} ספרות ול־${M(fmt(b))} יש ${B.length} ספרות – למספר עם יותר ספרות יש ערך גדול יותר.`;
  for (let i = 0; i < A.length; i++) {
    if (A[i] !== B[i]) return `משווים משמאל: הספרות הראשונות שונות במקום ה${PLACE[A.length - 1 - i]}: ${A[i]} ${A[i] > B[i] ? '>' : '<'} ${B[i]}.`;
  }
  return 'המספרים זהים.';
}

// --- column-by-column explanations ---
function addSteps(a, b) {
  const da = digitsOf(a), db = digitsOf(b), n = Math.max(da.length, db.length);
  const out = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const x = da[i] || 0, y = db[i] || 0, s = x + y + carry;
    let t = `עמודת ${COL[i]}: ${M(`${x} + ${y}${carry ? ' + 1' : ''} = ${s}`)}`;
    t += s >= 10 ? ` → כותבים <b>${s % 10}</b> ומעבירים 1 לעמודת ${COL[i + 1]}` : ` → כותבים <b>${s}</b>`;
    out.push(t);
    carry = s >= 10 ? 1 : 0;
  }
  if (carry) out.push(`ה־1 שהעברנו יורד לעמודת ${COL[n]}`);
  return out;
}

function subSteps(a, b) {
  const da = digitsOf(a), db = digitsOf(b);
  const out = [];
  let borrow = 0;
  for (let i = 0; i < da.length; i++) {
    const x = da[i], y = db[i] || 0;
    if (i >= db.length && !borrow) { if (i < da.length - 1 || x) out.push(`עמודת ${COL[i]}: אין מה להוריד → כותבים <b>${x}</b>`); continue; }
    let t = `עמודת ${COL[i]}: `;
    let top = x - borrow;
    if (borrow && x === 0) {
      top = 9;
      t += `יש 0 ונתנו 1 לעמודה הקודמת – לכן גם כאן פורטים: ${M('10 − 1 = 9')}. `;
      t += `${M(`9 − ${y} = ${9 - y}`)} → כותבים <b>${9 - y}</b>`;
      out.push(t); borrow = 1; continue;
    }
    if (borrow) t += `(נתנו 1 לעמודה הקודמת, אז ${x} הפך ל־${top}) `;
    if (top < y) {
      t += `${top} קטן מ־${y}, לכן פורטים 1 מעמודת ${COL[i + 1]}: ${M(`${top + 10} − ${y} = ${top + 10 - y}`)} → כותבים <b>${top + 10 - y}</b>`;
      borrow = 1;
    } else {
      t += `${M(`${top} − ${y} = ${top - y}`)} → כותבים <b>${top - y}</b>`;
      borrow = 0;
    }
    out.push(t);
  }
  return out;
}

function multSteps(a, b) {
  const da = digitsOf(a);
  const out = [];
  let carry = 0;
  for (let i = 0; i < da.length; i++) {
    const p = da[i] * b + carry;
    let t = `עמודת ${COL[i]}: ${M(`${da[i]} × ${b}${carry ? ` + ${carry}` : ''} = ${p}`)}`;
    t += i === da.length - 1 ? ` → כותבים <b>${p}</b>` : p >= 10 ? ` → כותבים <b>${p % 10}</b> וזוכרים ${Math.floor(p / 10)}` : ` → כותבים <b>${p}</b>`;
    out.push(t);
    carry = Math.floor(p / 10);
  }
  const parts = expansionOf(a);
  out.push(`בדיקה בפירוק: ${M(parts.map((v) => `${fmt(v)} × ${b}`).join(' + ') + ' = ' + parts.map((v) => fmt(v * b)).join(' + ') + ' = ' + fmt(a * b))}`);
  return out;
}
