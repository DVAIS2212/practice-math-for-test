'use strict';

// ====================== settings ======================
const EXAM_DATE = new Date(2026, 10, 3); // יום ג' 3.11.26
const MIN_SESSION_MS = 5 * 60 * 1000;
const IDLE_MS = 2 * 60 * 1000;          // time without any touch/typing doesn't count
const BLOCK_SIZE = 4;                    // questions per topic in a mixed session
const EXAM_SIZE = 12;
const STORE_KEY = 'mathprep.v1';
const AVATARS = ['🦄', '🐱', '🦊', '🐼', '🐬', '🦋', '🐨', '🌸', '⭐', '🐰'];

// ====================== storage ======================
function loadStore() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && s.profiles) return s; } catch (e) { /* ignore */ }
  return { profiles: {}, last: null };
}
let store = loadStore();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }

let me = null;   // current profile name
let S = null;    // current session
const P = () => store.profiles[me];
function tstat(t) {
  const p = P();
  if (!p.topics[t]) p.topics[t] = { answered: 0, firstTry: 0, recent: [], level: 1, streak: 0, fails: 0, lessonSeen: false };
  return p.topics[t];
}
function mastery(t) {
  const s = P().topics[t];
  if (!s || s.recent.length < 3) return null;
  return s.recent.reduce((a, b) => a + b, 0) / s.recent.length;
}
function starsFor(t) {
  const m = mastery(t), s = P().topics[t];
  if (m === null) return 0;
  if (s.recent.length >= 8 && m >= 0.9 && s.level >= 3) return 3;
  if (m >= 0.75 && s.level >= 2) return 2;
  if (m >= 0.5) return 1;
  return 0;
}

// ====================== small helpers ======================
const $app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const daysLeft = () => Math.max(0, Math.round((EXAM_DATE - new Date(new Date().toDateString())) / 86400000));
const mmss = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const PRAISE = ['כל הכבוד! 🌟', 'מצוין! 🎉', 'יפה מאוד! 💪', 'נכון! ⭐', 'וואו, איזו אלופה! 🏆', 'בדיוק! 👏', 'מעולה! 🥳'];
const RETRY = ['לא בדיוק, נסי שוב 🙂', 'כמעט! נסי עוד פעם', 'אופס, בדקי שוב 🔍', 'לא נורא, נסי שוב'];

function parseNum(s) {
  const t = String(s).replace(/[,\s₪]/g, '').replace(/[^\d-]/g, '');
  if (!t || t === '-') return null;
  return Number(t);
}

function toast(msg, ms = 2600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, ms);
}

function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const bits = ['⭐', '🎉', '✨', '💖', '🌟'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.textContent = pick(bits);
    s.style.left = R(5, 95) + '%';
    s.style.animationDelay = (Math.random() * 0.3) + 's';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1600);
}

function streakDays() {
  const days = new Set(P().sessions.filter((s) => s.ms >= 60000).map((s) => dayKey(s.start)));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ====================== login ======================
function showLogin() {
  S = null;
  const names = Object.keys(store.profiles);
  $app.innerHTML = `
    <div class="screen login">
      <div class="logo">🧮</div>
      <h1>מתכוננות למיפוי במתמטיקה</h1>
      <p class="sub">כיתה ד' · המיפוי ביום ג' 3.11 · עוד <b>${daysLeft()}</b> ימים</p>
      ${names.length ? `<h2>מי מתרגלת היום?</h2>
      <div class="profiles">${names.map((n) => `<button class="profile-btn" data-name="${esc(n)}"><span class="avatar">${store.profiles[n].avatar}</span>${esc(n)}</button>`).join('')}</div>
      <div class="or">או</div>` : '<h2>מה השם שלך?</h2>'}
      <form class="new-profile">
        <input id="newName" maxlength="20" placeholder="${names.length ? 'שם חדש' : 'כתבי את השם שלך'}" autocomplete="off">
        <button class="btn primary" type="submit">כניסה ←</button>
      </form>
      <p class="note">ההתקדמות נשמרת במכשיר הזה, לכל ילדה בנפרד.</p>
    </div>`;
  $app.querySelectorAll('.profile-btn').forEach((b) => b.onclick = () => login(b.dataset.name));
  $app.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const n = document.getElementById('newName').value.trim();
    if (!n) return;
    login(n);
  };
}

function login(name) {
  if (!store.profiles[name]) {
    const used = Object.values(store.profiles).map((p) => p.avatar);
    store.profiles[name] = { name, avatar: AVATARS.find((a) => !used.includes(a)) || pick(AVATARS), created: Date.now(), topics: {}, sessions: [], booklet: {}, stars: 0 };
  }
  me = name;
  store.last = name;
  save();
  showHome();
}

// ====================== home ======================
function showHome() {
  S = null;
  const p = P();
  const today = dayKey(Date.now());
  const todayMs = p.sessions.filter((s) => dayKey(s.start) === today).reduce((a, s) => a + s.ms, 0);
  const weak = TOPICS.filter((t) => mastery(t.id) !== null && mastery(t.id) < 0.6).map((t) => t.name);
  const untouched = TOPICS.filter((t) => !p.topics[t.id]).length;
  const bookletDone = BOOKLET.reduce((a, pg) => a + pg.qs.filter((q) => p.booklet[q.id] !== undefined).length, 0);
  const bookletTotal = BOOKLET.reduce((a, pg) => a + pg.qs.length, 0);
  const last14 = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return dayKey(d); });
  const practicedDays = new Set(p.sessions.filter((s) => s.ms >= 60000).map((s) => dayKey(s.start)));

  $app.innerHTML = `
    <div class="screen home">
      <header class="top">
        <div class="hello"><span class="avatar big">${p.avatar}</span><div><h1>שלום ${esc(p.name)}!</h1>
          <div class="sub">עוד <b>${daysLeft()}</b> ימים למיפוי · ⭐ ${p.stars} כוכבים · 🔥 ${streakDays()} ימים ברצף</div></div></div>
        <button class="btn ghost small" id="switchUser">החלפת משתמשת</button>
      </header>

      <div class="days">${last14.map((d) => `<span class="day ${practicedDays.has(d) ? 'on' : ''} ${d === today ? 'today' : ''}" title="${d}"></span>`).join('')}<span class="days-label">14 הימים האחרונים</span></div>

      <div class="main-actions">
        <button class="action-card daily" id="daily">
          <span class="ac-icon">🚀</span><span class="ac-title">תרגול יומי</span>
          <span class="ac-sub">${todayMs >= MIN_SESSION_MS ? 'כבר תרגלת היום – כל הכבוד! אפשר עוד 💪' : untouched ? 'נתרגל נושאים שונים, עם הסבר לפני כל נושא' : weak.length ? 'נתמקד בנושאים שצריך לחזק' : 'תרגול מעורב מכל הנושאים'}</span>
        </button>
        <button class="action-card booklet" id="booklet">
          <span class="ac-icon">📒</span><span class="ac-title">חוברת התרגול</span>
          <span class="ac-sub">השאלות מהחוברת המודפסת · ${bookletDone}/${bookletTotal}</span>
        </button>
        <button class="action-card exam" id="exam">
          <span class="ac-icon">📝</span><span class="ac-title">מבחן ניסיון</span>
          <span class="ac-sub">${EXAM_SIZE} שאלות מכל הנושאים, בלי רמזים – כמו במיפוי</span>
        </button>
      </div>

      <h2>בחרי נושא לתרגול</h2>
      <div class="topics">${TOPICS.map((t) => {
        const m = mastery(t.id), st = starsFor(t.id);
        return `<button class="topic-card" data-topic="${t.id}">
          <span class="tc-icon">${t.icon}</span><span class="tc-name">${t.name}</span>
          <span class="tc-stars">${'★'.repeat(st)}<span class="dim">${'★'.repeat(3 - st)}</span></span>
          <span class="bar"><span style="width:${m === null ? 0 : Math.round(m * 100)}%"></span></span>
          <span class="tc-sub">${m === null ? 'עוד לא תרגלת' : `שלב ${P().topics[t.id].level} · ${Math.round(m * 100)}% הצלחה`}</span>
        </button>`;
      }).join('')}</div>

      <footer class="foot"><button class="btn ghost small" id="report">📊 דוח להורים</button></footer>
    </div>`;
  document.getElementById('switchUser').onclick = showLogin;
  document.getElementById('daily').onclick = () => startSession({ mode: 'practice' });
  document.getElementById('booklet').onclick = showBookletIndex;
  document.getElementById('exam').onclick = () => startSession({ mode: 'exam' });
  document.getElementById('report').onclick = showReport;
  $app.querySelectorAll('.topic-card').forEach((b) => b.onclick = () => startSession({ mode: 'practice', topic: b.dataset.topic }));
}

// ====================== booklet index ======================
function showBookletIndex() {
  const p = P();
  $app.innerHTML = `
    <div class="screen">
      <header class="top"><h1>📒 חוברת התרגול</h1><button class="btn ghost small" id="back">→ חזרה</button></header>
      <p class="sub">אותן שאלות כמו בחוברת המודפסת – עמוד לכל נושא. אפשר לפתור על הדף ולבדוק כאן, או לפתור כאן ישר.</p>
      <div class="pages">${BOOKLET.map((pg) => {
        const done = pg.qs.filter((q) => p.booklet[q.id] !== undefined).length;
        const good = pg.qs.filter((q) => p.booklet[q.id] === 1).length;
        return `<button class="page-card ${done === pg.qs.length ? 'complete' : ''}" data-page="${pg.id}">
          <span class="pc-icon">${pg.topic === 'mixed' ? '🏁' : TOPIC[pg.topic].icon}</span>
          <span class="pc-title">${pg.title}</span>
          <span class="bar"><span style="width:${Math.round((done / pg.qs.length) * 100)}%"></span></span>
          <span class="pc-sub">${done}/${pg.qs.length} שאלות${done ? ` · ${good} בניסיון ראשון` : ''}</span>
        </button>`;
      }).join('')}</div>
    </div>`;
  document.getElementById('back').onclick = showHome;
  $app.querySelectorAll('.page-card').forEach((b) => b.onclick = () => startSession({ mode: 'booklet', page: b.dataset.page }));
}

// ====================== sessions ======================
function startSession(opts) {
  const p = P();
  S = {
    mode: opts.mode, topic: opts.topic || null, page: null,
    elapsed: 0, lastAct: Date.now(), minReached: false,
    count: 0, firstTry: 0, starsEarned: 0, answers: [],
    queue: [], retry: [], lessonsShown: new Set(),
    block: null, blockLeft: 0, lastSub: {}, topicFails: {},
    q: null, record: { start: Date.now(), ms: 0, mode: opts.mode, questions: 0, firstTry: 0, topics: [] },
  };
  p.sessions.push(S.record);
  if (opts.mode === 'booklet') {
    S.page = BOOKLET.find((pg) => pg.id === opts.page);
    // unanswered questions first, then the rest
    const qs = S.page.qs;
    S.queue = [...qs.filter((q) => p.booklet[q.id] === undefined), ...qs.filter((q) => p.booklet[q.id] !== undefined)];
  }
  if (opts.mode === 'exam') {
    const topics = shuffle(TOPICS.map((t) => t.id));
    const list = [...topics, ...shuffle(topics).slice(0, EXAM_SIZE - topics.length)];
    S.queue = list.map((t) => generate(t, Math.max(2, tstat(t).level)));
  }
  save();
  nextStep();
}

// a weighted choice of the next topic for mixed practice: weaker / new topics come more often
function chooseTopic() {
  const weights = TOPICS.map((t) => {
    const m = mastery(t.id);
    let w = m === null ? 1.4 : 1.15 - m;
    if (t.id === S.block) w *= 0.1;
    return Math.max(w, 0.08);
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < TOPICS.length; i++) { r -= weights[i]; if (r <= 0) return TOPICS[i].id; }
  return TOPICS[0].id;
}

function nextStep() {
  if (!S) return;
  S.q = null;
  if (S.mode === 'exam') {
    if (!S.queue.length) return finishSession();
    return showQuestion(S.queue.shift());
  }
  if (S.mode === 'booklet') {
    if (S.page.topic !== 'mixed' && !S.lessonsShown.has(S.page.topic)) return showLesson(S.page.topic);
    if (S.queue.length) return showQuestion(S.queue.shift());
    // page finished
    if (!S.minReached) {
      S.mode = 'practice';
      S.topic = S.page.topic === 'mixed' ? null : S.page.topic;
      toast('🎉 סיימת את העמוד! נמשיך לתרגל עוד קצת עד שיעברו 5 דקות', 3500);
    } else {
      return finishSession();
    }
  }
  // practice
  const due = S.retry.findIndex((r) => r.due <= S.count);
  let topic;
  if (due >= 0 && (!S.topic || S.retry[due].topic === S.topic)) {
    const r = S.retry.splice(due, 1)[0];
    topic = r.topic;
    if (S.lessonsShown.has(topic) || S.topic) {
      const q = generate(topic, tstat(topic).level, null, r.sub);
      q.isRetry = true;
      return showQuestion(q);
    }
  }
  if (S.topic) topic = S.topic;
  else {
    if (!S.block || S.blockLeft <= 0) { S.block = chooseTopic(); S.blockLeft = BLOCK_SIZE; }
    topic = S.block;
  }
  if (!S.lessonsShown.has(topic)) return showLesson(topic);
  if ((S.topicFails[topic] || 0) >= 2) { S.topicFails[topic] = 0; return showLesson(topic, true); }
  S.blockLeft--;
  const q = generate(topic, tstat(topic).level, S.lastSub[topic]);
  S.lastSub[topic] = q.genSub;
  showQuestion(q);
}

function sessionBar() {
  const isExam = S.mode === 'exam';
  const pct = Math.min(1, S.elapsed / MIN_SESSION_MS);
  return `<header class="sbar">
    <div class="timer ${S.minReached ? 'done' : ''}" title="זמן תרגול">
      <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" class="t-bg"/><circle cx="18" cy="18" r="15.9" class="t-fg" stroke-dasharray="${(pct * 100).toFixed(1)} 100"/></svg>
      <span id="timerText">${mmss(S.elapsed)}</span>
    </div>
    <div class="sb-info">${isExam ? `📝 מבחן ניסיון · שאלה ${S.count + 1} מתוך ${EXAM_SIZE}` : S.mode === 'booklet' ? `📒 ${S.page.title.split(' ')[0].replace('.', '') === 'חזרה' ? 'חזרה כללית' : 'עמוד ' + S.page.title.split('.')[0]} · ⭐ ${S.starsEarned}` : `שאלה ${S.count + 1} · ⭐ ${S.starsEarned}`}</div>
    <div class="sb-actions">
      ${!isExam && S.q && S.q.topic && LESSONS[S.q.topic] ? '<button class="btn ghost small" id="openLesson">📖 הסבר</button>' : ''}
      <button class="btn small ${S.minReached || isExam ? '' : 'locked'}" id="finish">${S.minReached || isExam ? 'סיום' : '🔒 סיום'}</button>
    </div>
  </header>`;
}

function bindSessionBar() {
  const f = document.getElementById('finish');
  if (f) f.onclick = () => {
    if (S.mode === 'exam') { if (confirm('לצאת מהמבחן? התשובות עד עכשיו יישמרו.')) finishSession(); return; }
    if (!S.minReached) { toast(`⏳ עוד ${mmss(MIN_SESSION_MS - S.elapsed)} דקות של תרגול ואפשר לסיים`); return; }
    finishSession();
  };
  const l = document.getElementById('openLesson');
  if (l) l.onclick = () => openLessonModal(S.q.topic);
}

// ---------- lesson ----------
function showLesson(topic, again) {
  const L = LESSONS[topic], st = tstat(topic);
  const seen = st.lessonSeen;
  S.lessonsShown.add(topic);
  $app.innerHTML = `${sessionBar()}
    <div class="screen lesson">
      <div class="card">
        <div class="topic-tag">${TOPIC[topic].icon} ${again ? 'בואי נחזור רגע על ההסבר' : seen ? 'תזכורת קצרה' : 'נושא חדש!'}</div>
        <h1>${L.title}</h1>
        <div class="lesson-body">${L.body}</div>
        <div class="actions"><button class="btn primary big" id="go">הבנתי, בואי נתרגל! ✏️</button></div>
      </div>
    </div>`;
  st.lessonSeen = true;
  save();
  bindSessionBar();
  document.getElementById('go').onclick = nextStep;
  window.scrollTo(0, 0);
}

function openLessonModal(topic) {
  const L = LESSONS[topic];
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-card"><button class="close" aria-label="סגירה">✕</button><h1>${L.title}</h1><div class="lesson-body">${L.body}</div><div class="actions"><button class="btn primary">חזרה לשאלה</button></div></div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelector('.close').onclick = close;
  m.querySelector('.btn').onclick = close;
  m.onclick = (e) => { if (e.target === m) close(); };
}

// ---------- question ----------
function showQuestion(q) {
  q = { ...q };
  S.q = q;
  q.wrong = 0; q.hintUsed = false; q.done = false; q.solved = false;
  const isExam = S.mode === 'exam';
  const nChoices = q.kind === 'choice' ? q.choices.length : 0;
  // hint is offered after 2 mistakes (1 when there are only a few options); full solution after 3
  q.hintAt = q.kind === 'choice' && nChoices <= 3 ? 1 : 2;
  q.solveAt = q.kind !== 'choice' ? 3 : nChoices <= 2 ? 1 : nChoices === 3 ? 2 : 3;

  let answerHtml = '';
  if (q.kind === 'num' && q.vertical) {
    const v = q.vertical;
    answerHtml = `<div class="vertical" dir="ltr" style="--w:${v.width}"><div>${esc(v.top)}</div><div>${esc(v.bottom)}</div><div class="vline"></div>
      <input id="ans" class="vinput" inputmode="numeric" autocomplete="off" aria-label="תשובה"></div>`;
  } else if (q.kind === 'num') {
    answerHtml = `<div class="num-answer"><input id="ans" inputmode="numeric" autocomplete="off" placeholder="התשובה" aria-label="תשובה">${q.unit ? `<span class="unit">${q.unit}</span>` : ''}</div>`;
  } else if (q.kind === 'choice') {
    answerHtml = `<div class="choices ${q.choices.length > 3 ? 'many' : ''}">${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${c.label}</button>`).join('')}</div>`;
  } else if (q.kind === 'multi') {
    answerHtml = `<div class="blanks">${q.blanks.map((b, i) => `<label class="blank"><span>${b.label}</span><input data-i="${i}" inputmode="numeric" autocomplete="off"></label>`).join('')}</div>`;
  } else if (q.kind === 'select') {
    answerHtml = `<div class="select-opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><bdi dir="ltr">${o.label}</bdi></button>`).join('')}</div>`;
  }
  const needsCheck = q.kind !== 'choice';

  $app.innerHTML = `${sessionBar()}
    <div class="screen question">
      <div class="card q-card">
        <div class="topic-tag">${TOPIC[q.topic].icon} ${TOPIC[q.topic].name}${q.isRetry ? ' · שאלה דומה לחיזוק' : ''}</div>
        <div class="prompt">${q.prompt}</div>
        ${q.visual ? `<div class="visual">${q.visual}</div>` : ''}
        <div class="answer">${answerHtml}</div>
        <div class="feedback" id="fb" aria-live="polite"></div>
        <div class="hint-box hidden" id="hintBox"><b>💡 רמז:</b> ${q.hint}</div>
        <div class="solution-box hidden" id="solBox"><div class="sol-title">👩‍🏫 בואי נפתור ביחד:</div>${q.solution}</div>
        <div class="actions" id="actions">
          ${!isExam ? '<button class="btn ghost" id="hintBtn">💡 רמז</button>' : ''}
          ${needsCheck ? `<button class="btn primary" id="checkBtn">${isExam ? 'הבא ←' : 'בדיקה ✓'}</button>` : ''}
        </div>
      </div>
    </div>`;
  bindSessionBar();

  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) hintBtn.onclick = showHint;
  const check = document.getElementById('checkBtn');
  if (check) check.onclick = () => checkAnswer();
  $app.querySelectorAll('.choice').forEach((b) => b.onclick = () => checkAnswer(Number(b.dataset.i)));
  $app.querySelectorAll('.opt').forEach((b) => b.onclick = () => { if (!q.done) b.classList.toggle('selected'); });
  const inputs = [...$app.querySelectorAll('input')];
  inputs.forEach((inp, i) => inp.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const nextEmpty = inputs.slice(i + 1).find((x) => !x.value && !x.readOnly);
    if (q.kind === 'multi' && nextEmpty) nextEmpty.focus();
    else if (!q.done) checkAnswer();
  }));
  if (inputs[0] && window.matchMedia('(pointer: fine)').matches) inputs[0].focus();
  window.scrollTo(0, 0);
}

function showHint() {
  const q = S.q;
  q.hintUsed = true;
  const box = document.getElementById('hintBox');
  box.classList.remove('hidden');
  box.classList.add('pop');
  const b = document.getElementById('hintBtn');
  if (b) b.classList.remove('pulse');
}

function setFeedback(html, cls) {
  const fb = document.getElementById('fb');
  fb.className = 'feedback ' + (cls || '');
  fb.innerHTML = html;
  if (cls === 'bad') { fb.classList.remove('shake'); void fb.offsetWidth; fb.classList.add('shake'); }
}

function checkAnswer(choiceIdx) {
  const q = S.q;
  if (!q || q.done) return;
  let correct = false;

  if (q.kind === 'num') {
    const inp = document.getElementById('ans');
    const v = parseNum(inp.value);
    if (v === null) { if (S.mode !== 'exam') { setFeedback('כתבי מספר בתור תשובה ✏️', 'info'); return; } }
    correct = q.accept ? q.accept.includes(v) : v === q.answer;
    if (!correct && S.mode !== 'exam') inp.select();
  } else if (q.kind === 'choice') {
    const c = q.choices[choiceIdx];
    correct = c.value === q.answer;
    const btn = $app.querySelector(`.choice[data-i="${choiceIdx}"]`);
    if (correct) btn.classList.add('right');
    else { btn.classList.add('wrong'); btn.disabled = true; }
  } else if (q.kind === 'multi') {
    const inputs = [...$app.querySelectorAll('.blanks input')];
    if (S.mode !== 'exam' && inputs.some((i) => !i.value.trim())) { setFeedback('השלימי את כל המקומות הריקים ✏️', 'info'); return; }
    correct = true;
    inputs.forEach((inp, i) => {
      const b = q.blanks[i];
      const v = parseNum(inp.value);
      const ok = b.accept ? b.accept.includes(v) : v === b.answer;
      if (S.mode === 'exam') return void (correct = correct && ok);
      inp.classList.toggle('right', ok);
      inp.classList.toggle('wrong', !ok);
      if (ok) inp.readOnly = true;
      correct = correct && ok;
    });
  } else if (q.kind === 'select') {
    const sel = [...$app.querySelectorAll('.opt.selected')].map((b) => q.options[Number(b.dataset.i)].value);
    if (S.mode !== 'exam' && !sel.length) { setFeedback('בחרי לפחות מספר אחד', 'info'); return; }
    correct = sel.length === q.correct.length && sel.every((v) => q.correct.includes(v));
  }

  if (S.mode === 'exam') return examAnswer(correct);

  if (correct) {
    q.done = true;
    const score = q.wrong === 0 && !q.hintUsed ? 1 : q.wrong <= 1 ? 0.5 : 0.25;
    recordAnswer(q, score);
    lockInputs();
    setFeedback(score === 1 ? pick(PRAISE) : 'נכון! יפה שלא ויתרת 💪', 'good');
    if (score === 1) confetti();
    showContinue();
    return;
  }

  q.wrong++;
  if (q.wrong >= q.solveAt) {
    q.done = true; q.solved = true;
    recordAnswer(q, 0);
    lockInputs();
    revealAnswer();
    document.getElementById('solBox').classList.remove('hidden');
    setFeedback(`התשובה הנכונה: <b>${answerText(q)}</b>. בואי נראה איך פותרים 👇`, 'teach');
    S.retry.push({ topic: q.topic, sub: q.genSub || null, due: S.count + 2 });
    showContinue('הבנתי, המשך ←');
    return;
  }
  if (q.wrong >= q.hintAt) {
    if (!q.hintUsed) {
      setFeedback('נראה שזה קצת קשה. רוצה רמז? 💡', 'bad');
      const b = document.getElementById('hintBtn');
      if (b) { b.classList.add('pulse'); b.textContent = '💡 כן, תני לי רמז'; }
    } else setFeedback('עדיין לא. קראי שוב את הרמז ונסי שוב 🙂', 'bad');
    return;
  }
  setFeedback(pick(RETRY), 'bad');
}

function answerText(q) {
  if (q.kind === 'num') return M(fmt(q.answer)) + (q.accept && q.accept.length > 1 ? ` (או ${q.accept.slice(1).map(fmt).join(', ')})` : '');
  if (q.kind === 'choice') return q.choices.find((c) => c.value === q.answer).label;
  if (q.kind === 'multi') return q.blanks.map((b) => `${b.label}: ${M(fmt(b.answer))}`).join(' · ');
  if (q.kind === 'select') return q.correct.map((v) => M(fmt(Number(v)))).join(' , ');
  return '';
}

function revealAnswer() {
  const q = S.q;
  if (q.kind === 'choice') $app.querySelectorAll('.choice').forEach((b) => { if (q.choices[Number(b.dataset.i)].value === q.answer) b.classList.add('right'); });
  if (q.kind === 'select') $app.querySelectorAll('.opt').forEach((b) => b.classList.toggle('right', q.correct.includes(q.options[Number(b.dataset.i)].value)));
}

function lockInputs() {
  $app.querySelectorAll('.answer input').forEach((i) => (i.readOnly = true));
  $app.querySelectorAll('.choice').forEach((b) => (b.disabled = true));
  const c = document.getElementById('checkBtn');
  if (c) c.remove();
}

function showContinue(label) {
  const a = document.getElementById('actions');
  a.innerHTML = `${S.q.solved ? '' : '<button class="btn ghost" id="whyBtn">👩‍🏫 איך פותרים?</button>'}<button class="btn primary big" id="nextBtn">${label || 'הבא ←'}</button>`;
  const w = document.getElementById('whyBtn');
  if (w) w.onclick = () => { document.getElementById('solBox').classList.remove('hidden'); w.remove(); };
  const n = document.getElementById('nextBtn');
  n.onclick = () => { S.count++; nextStep(); };
  n.focus({ preventScroll: true });
}

// Enter moves to the next question after a correct answer
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && S && S.q && S.q.done) {
    const n = document.getElementById('nextBtn');
    if (n && document.activeElement !== n) { e.preventDefault(); n.click(); }
  }
});

function recordAnswer(q, score) {
  const st = tstat(q.topic);
  st.answered++;
  if (score === 1) st.firstTry++;
  st.recent.push(score);
  if (st.recent.length > 12) st.recent.shift();
  // level up after 3 clean answers in a row, down after 2 "taught" answers in a row
  if (score === 1) { st.streak++; st.fails = 0; if (st.streak >= 3 && st.level < 3) { st.level++; st.streak = 0; if (S.mode === 'practice') toast(`🆙 עלית לשלב ${st.level} ב${TOPIC[q.topic].name}!`); } }
  else if (score === 0) { st.streak = 0; st.fails++; if (st.fails >= 2 && st.level > 1) { st.level--; st.fails = 0; } }
  else st.streak = 0;
  S.topicFails[q.topic] = score === 0 ? (S.topicFails[q.topic] || 0) + 1 : 0;

  if (score === 1) { S.starsEarned++; P().stars++; S.firstTry++; }
  if (q.id) P().booklet[q.id] = Math.max(P().booklet[q.id] ?? 0, score);
  S.answers.push({ topic: q.topic, score });
  S.record.questions++;
  S.record.firstTry = S.firstTry;
  if (!S.record.topics.includes(q.topic)) S.record.topics.push(q.topic);
  save();
}

// ---------- exam ----------
function examAnswer(correct) {
  const q = S.q;
  q.done = true;
  q.wasCorrect = correct;
  recordAnswer(q, correct ? 1 : 0);
  S.examResults = S.examResults || [];
  S.examResults.push(q);
  S.count++;
  nextStep();
}

// ---------- finish ----------
function finishSession() {
  const s = S;
  s.record.ms = s.elapsed;
  save();
  const n = s.answers.length;
  const pct = n ? Math.round((s.firstTry / n) * 100) : 0;
  let body;
  if (s.mode === 'exam') {
    const res = s.examResults || [];
    const ok = res.filter((q) => q.wasCorrect).length;
    body = `
      <div class="big-score">${ok}/${res.length}</div>
      <p class="sub">${ok === res.length ? 'מושלם! את מוכנה למיפוי 🏆' : ok >= res.length * 0.75 ? 'יפה מאוד! עוד קצת חיזוק ואת שם 💪' : 'כל מבחן ניסיון מלמד אותנו משהו. בואי נראה מה לחזק 👇'}</p>
      <div class="exam-list">${res.map((q, i) => `
        <details class="exam-item ${q.wasCorrect ? 'ok' : 'no'}">
          <summary><span>${q.wasCorrect ? '✅' : '❌'}</span> שאלה ${i + 1} · ${TOPIC[q.topic].icon} ${TOPIC[q.topic].name}</summary>
          <div class="prompt">${q.prompt}</div>${q.visual ? `<div class="visual">${q.visual}</div>` : ''}
          ${q.vertical ? `<div class="vertical small" dir="ltr"><div>${esc(q.vertical.top)}</div><div>${esc(q.vertical.bottom)}</div><div class="vline"></div></div>` : ''}
          <p>התשובה הנכונה: <b>${answerText(q)}</b></p>
          <div class="solution-box">${q.solution}</div>
        </details>`).join('')}</div>`;
  } else {
    const byTopic = {};
    s.answers.forEach((a) => { (byTopic[a.topic] ||= []).push(a.score); });
    body = `
      <div class="big-score">⭐ ${s.starsEarned}</div>
      <p class="sub">${n} שאלות · ${pct}% בניסיון ראשון · ${mmss(s.elapsed)} דקות תרגול</p>
      <div class="topic-summary">${Object.entries(byTopic).map(([t, arr]) => `<div><span>${TOPIC[t].icon} ${TOPIC[t].name}</span><span>${arr.filter((x) => x === 1).length}/${arr.length}</span></div>`).join('')}</div>
      <p class="encourage">${pct >= 85 ? 'איזה יופי של עבודה! 🏆' : pct >= 60 ? 'עבודה טובה! כל תרגול מקרב אותך למיפוי 💪' : 'כל הכבוד על ההתמדה! ככה לומדים – ממשיכים לתרגל 🌱'}</p>`;
  }
  S = null;
  $app.innerHTML = `<div class="screen finish"><div class="card"><h1>${s.mode === 'exam' ? '📝 תוצאות מבחן הניסיון' : '🎉 סיימת את התרגול!'}</h1>${body}
    <div class="actions"><button class="btn primary big" id="home">למסך הבית</button></div></div></div>`;
  document.getElementById('home').onclick = showHome;
  if (s.mode !== 'exam' || (s.examResults || []).every((q) => q.wasCorrect)) confetti();
}

// ---------- timer ----------
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { if (S) S.lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (!S || document.hidden || Date.now() - S.lastAct > IDLE_MS) return;
  S.elapsed += 1000;
  S.record.ms = S.elapsed;
  const t = document.getElementById('timerText');
  if (t) t.textContent = mmss(S.elapsed);
  const fg = document.querySelector('.t-fg');
  if (fg) fg.setAttribute('stroke-dasharray', `${(Math.min(1, S.elapsed / MIN_SESSION_MS) * 100).toFixed(1)} 100`);
  if (!S.minReached && S.elapsed >= MIN_SESSION_MS) {
    S.minReached = true;
    document.querySelector('.timer')?.classList.add('done');
    const f = document.getElementById('finish');
    if (f && S.mode !== 'exam') { f.classList.remove('locked'); f.textContent = 'סיום'; }
    if (S.mode !== 'exam') toast('🎉 עברו 5 דקות! אפשר לסיים – או להמשיך לתרגל ולצבור עוד כוכבים');
  }
  if (S.elapsed % 15000 === 0) save();
}, 1000);
window.addEventListener('pagehide', save);

// ====================== parents report ======================
function showReport() {
  const p = P();
  const byDay = {};
  p.sessions.forEach((s) => { const d = dayKey(s.start); byDay[d] = (byDay[d] || 0) + s.ms; });
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 21);
  const total = p.sessions.reduce((a, s) => a + s.ms, 0);
  const exams = p.sessions.filter((s) => s.mode === 'exam' && s.questions);
  $app.innerHTML = `
    <div class="screen report">
      <header class="top"><h1>📊 דוח להורים – ${esc(p.name)}</h1><button class="btn ghost small" id="back">→ חזרה</button></header>
      <div class="kpis">
        <div><b>${Math.round(total / 60000)}</b><span>דקות תרגול</span></div>
        <div><b>${p.sessions.filter((s) => s.questions).length}</b><span>אימונים</span></div>
        <div><b>${Object.values(p.topics).reduce((a, t) => a + t.answered, 0)}</b><span>שאלות</span></div>
        <div><b>${daysLeft()}</b><span>ימים למיפוי</span></div>
      </div>
      <h2>לפי נושא</h2>
      <table class="rep"><tr><th>נושא</th><th>שאלות</th><th>הצלחה בניסיון ראשון</th><th>הצלחה לאחרונה</th><th>שלב</th></tr>
      ${TOPICS.map((t) => { const s = p.topics[t.id]; const m = mastery(t.id); return `<tr class="${m !== null && m < 0.6 ? 'weak' : ''}"><td>${t.icon} ${t.name}</td><td>${s ? s.answered : 0}</td><td>${s && s.answered ? Math.round((s.firstTry / s.answered) * 100) + '%' : '–'}</td><td>${m === null ? '–' : Math.round(m * 100) + '%'}</td><td>${s ? s.level : '–'}</td></tr>`; }).join('')}
      </table>
      <p class="note">שורה מסומנת = נושא שכדאי לחזק. "שלב" עולה מ־1 ל־3 ככל שהשאלות נפתרות נכון, והשאלות נעשות קשות יותר.</p>
      ${exams.length ? `<h2>מבחני ניסיון</h2><table class="rep"><tr><th>תאריך</th><th>ציון</th></tr>${exams.slice(-10).reverse().map((s) => `<tr><td>${new Date(s.start).toLocaleDateString('he-IL')}</td><td>${s.firstTry}/${s.questions}</td></tr>`).join('')}</table>` : ''}
      <h2>זמן תרגול לפי יום</h2>
      <table class="rep"><tr><th>תאריך</th><th>דקות</th></tr>${days.map(([d, ms]) => `<tr><td>${d.split('-').reverse().join('.')}</td><td>${Math.round(ms / 60000)}${ms >= MIN_SESSION_MS ? ' ✅' : ''}</td></tr>`).join('') || '<tr><td colspan="2">עוד אין</td></tr>'}</table>
      <h2>העברה למכשיר אחר</h2>
      <p class="note">ההתקדמות נשמרת בדפדפן של המכשיר הזה. כדי להמשיך במכשיר אחר: העתיקו את הקוד, ובמכשיר השני הדביקו אותו כאן ולחצו "טעינה".</p>
      <div class="transfer"><button class="btn small" id="copyCode">העתקת קוד ההתקדמות</button>
        <textarea id="importCode" rows="2" placeholder="הדביקו כאן קוד ממכשיר אחר"></textarea>
        <button class="btn small" id="importBtn">טעינה</button></div>
    </div>`;
  document.getElementById('back').onclick = showHome;
  document.getElementById('copyCode').onclick = async () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
    try { await navigator.clipboard.writeText(code); toast('הקוד הועתק ✔️'); }
    catch (e) { document.getElementById('importCode').value = code; toast('הקוד מופיע בתיבה – העתיקו אותו'); }
  };
  document.getElementById('importBtn').onclick = () => {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('importCode').value.trim()))));
      if (!obj.name || !obj.topics) throw new Error('bad');
      if (!confirm(`לטעון את ההתקדמות של ${obj.name}? ההתקדמות הנוכחית של ${obj.name} במכשיר הזה תוחלף.`)) return;
      store.profiles[obj.name] = obj;
      me = obj.name; save(); toast('ההתקדמות נטענה ✔️'); showHome();
    } catch (e) { toast('הקוד לא תקין'); }
  };
}

// ====================== start ======================
showLogin();
