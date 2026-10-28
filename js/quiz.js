// ---
// purpose: NOTE QUIZ: one lit note glows with its name hidden, player names it
// exports: quiz, quizStart, quizStop, toggleQuiz, quizAnswer, quizKeyChroma, quizPool, quizRefresh, renderQuizKeys
// depends: app.js (state, $, $$), engine.js (spell, mkSvg, refreshNotes), audio.js (playNote, playBuzz)
// gotcha: quiz.gen drops stale next-round timers after stop/restart
// ---

const quiz = { on:false, target:null, score:0, tries:0, streak:0, best:0, locked:false, gen:0, acc:null };
const NATURALS = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };   // chroma convention: C=0 … A=9, as data.js
const QUIZ_WHITE = [0, 2, 4, 5, 7, 9, 11];
const QUIZ_BLACK = [1, 3, 6, 8, 10];
const QUIZ_LIT = ['in-scale', 'root', 'blue', 'chromatic'];
const QUIZ_BEST_KEY = 'pent-quiz-best';
const QUIZ_LOCKS = ['#play-scale', '#pattern-build'];

// e.code is the physical key, so Shift never changes the letter; Shift = sharp (flat in FLATS mode)
function quizKeyChroma(e) {
  const m = /^Key([A-G])$/.exec(e.code);
  if (!m) return null;
  const shift = e.shiftKey ? (state.accidentals === 'flat' ? -1 : 1) : 0;
  return ((NATURALS[m[1]] + shift) % 12 + 12) % 12;
}

// The notes the board shows right now (box, pattern and chromatic all count)
function quizPool() {
  return $$('#fretboard .fb-note').filter(g =>
    !g.classList.contains('dimmed') && QUIZ_LIT.some(c => g.classList.contains(c)));
}

function renderQuizKeys() {
  const key = (c, cls, style = '') =>
    `<button class="pk ${cls}" data-chroma="${c}" aria-label="${spell(c)}"${style}><span>${spell(c)}</span></button>`;
  const host = $('#quiz-keys');
  quiz.acc = state.accidentals;
  host.innerHTML = QUIZ_WHITE.map(c => key(c, 'white')).join('') +
    QUIZ_BLACK.map(c => key(c, 'black', ` style="--slot:${QUIZ_WHITE.filter(w => w < c).length}"`)).join('');
  host.querySelectorAll('.pk').forEach(b => b.addEventListener('click', () => quizAnswer(+b.dataset.chroma)));
}

// Removes the previous round's target, its reticle and the piano feedback colours
function clearTarget() {
  if (quiz.target) {
    quiz.target.classList.remove('quiz-target', 'quiz-reveal');
    quiz.target.querySelectorAll('.quiz-reticle').forEach(r => r.remove());
  }
  quiz.target = null;
  $$('#quiz-keys .pk').forEach(k => k.classList.remove('right', 'wrong', 'reveal'));
}

function nextRound() {
  const prev = quiz.target;
  clearTarget();
  let cands = quizPool();
  if (!cands.length) cands = $$('#fretboard .fb-note');
  if (cands.length > 1) cands = cands.filter(g => g !== prev);
  const t = cands[Math.floor(Math.random() * cands.length)];
  const c = t.querySelector('circle');   // first circle is the note itself
  t.classList.add('quiz-target');
  t.appendChild(mkSvg('circle', { class: 'quiz-reticle', r: 17, cx: c.getAttribute('cx'), cy: c.getAttribute('cy') }));
  quiz.target = t; quiz.locked = false;
  const wrap = t.closest('.fretboard-wrap');   // phones: the neck scrolls sideways, so bring the target into view
  if (wrap) {
    const r = t.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    if (r.left < w.left || r.right > w.right) wrap.scrollLeft += r.left - w.left - w.width / 2;
  }
  $('#quiz-prompt').textContent = 'Name the glowing note';
  updateQuizStats();
}

function updateQuizStats() {
  $('#quiz-score').textContent = `${quiz.score}/${quiz.tries}`;
  $('#quiz-streak').textContent = quiz.streak;
  $('#quiz-best').textContent = quiz.best;
}

// Clicks and keys both land here; `locked` holds the board still while the feedback shows
function quizAnswer(chroma) {
  if (!quiz.on || quiz.locked || !quiz.target) return;
  const t = quiz.target, want = +t.dataset.chroma, right = chroma === want;
  quiz.locked = true; quiz.tries++;
  playNote(+t.dataset.midi);
  const pressed = $(`#quiz-keys .pk[data-chroma="${chroma}"]`);
  if (right) {
    quiz.score++; quiz.streak++;
    quiz.best = Math.max(quiz.best, quiz.streak);
    try { localStorage.setItem(QUIZ_BEST_KEY, String(quiz.best)); } catch (e) {}
    pressed.classList.add('right');
    $('#quiz-prompt').textContent = `✓ ${spell(want)}`;
    const s = $('#quiz-streak'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');   // re-run the bump
  } else {
    quiz.streak = 0;
    pressed.classList.add('wrong');
    $(`#quiz-keys .pk[data-chroma="${want}"]`).classList.add('reveal');
    $('#quiz-prompt').textContent = `✗ It was ${spell(want)}`;
    if (state.sound) playBuzz();
  }
  t.classList.add('quiz-reveal');
  updateQuizStats();
  const g = quiz.gen;
  setTimeout(() => { if (quiz.on && quiz.gen === g) nextRound(); }, right ? 750 : 1500);
}

function quizStart() {
  if (quiz.on || state.mode === 'game') return;   // the lick game owns the board
  try { quiz.best = parseInt(localStorage.getItem(QUIZ_BEST_KEY), 10) || 0; } catch (e) {}
  quiz.on = true; quiz.score = quiz.tries = quiz.streak = 0; ++quiz.gen;
  document.body.classList.add('quiz-on');
  const dock = $('#quiz-dock'), btn = $('#quiz-btn');
  dock.hidden = false;
  btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
  if (typeof stopBuilding === 'function') stopBuilding();
  QUIZ_LOCKS.forEach(s => { const el = $(s); if (el) el.disabled = true; });   // both would light or pick the hidden note
  renderQuizKeys(); nextRound();
  if (dock.scrollIntoView) dock.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function quizStop() {
  if (!quiz.on) return;
  quiz.on = false; quiz.locked = false; ++quiz.gen;
  clearTarget();
  document.body.classList.remove('quiz-on');
  $('#quiz-dock').hidden = true;
  const btn = $('#quiz-btn');
  btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false');
  QUIZ_LOCKS.forEach(s => { const el = $(s); if (el) el.disabled = false; });
}

function toggleQuiz() { if (quiz.on) quizStop(); else quizStart(); }

// Runs at the end of refreshNotes(): keeps key labels in the chosen spelling, re-rolls if the target left the board
function quizRefresh() {
  if (!quiz.on) return;
  if (quiz.acc !== state.accidentals) renderQuizKeys();   // only on respell, so feedback colours survive a box/key change
  const t = quiz.target;
  if (!quiz.locked && (!t || t.classList.contains('dimmed') || !quizPool().includes(t))) nextRound();
}

(function wireQuiz() {
  const btn = $('#quiz-btn'), close = $('#quiz-close');
  if (btn) btn.addEventListener('click', toggleQuiz);
  if (close) close.addEventListener('click', quizStop);
})();
