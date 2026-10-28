// ---
// purpose: WALK quiz order (box notes up and back down) and saved quiz choices (mode, order)
// exports: quizWalkSeq, quizWalkTarget, setQuizOrder, syncQuizOrder, quizSavePrefs, quizLoadPrefs
// depends: quiz.js (quiz, quizPool, nextRound), app.js ($)
// gotcha: prefs load only in the app (header.hud); tests.html must never read saved choices on load
// ---

const QUIZ_PREFS_KEY = 'pent-quiz-prefs';

// Box notes low to high, then back down; the top and bottom appear once each
function quizWalkSeq() {
  const pool = quizPool();
  if (pool.length < 2) return pool;
  const up = pool.sort((a, b) => (+a.dataset.midi - +b.dataset.midi) || (+b.dataset.string - +a.dataset.string));   // same pitch: lower string first
  return up.concat(up.slice(1, -1).reverse());
}

// The walk's current note; the one after it gets .quiz-next so the player sees what comes
function quizWalkTarget() {
  const seq = quizWalkSeq();
  if (!seq.length) return null;
  if (seq.length > 1) seq[(quiz.step + 1) % seq.length].classList.add('quiz-next');
  return seq[quiz.step % seq.length];
}

function setQuizOrder(o) {
  if (!['random', 'walk'].includes(o)) return;
  quiz.order = o; quiz.step = 0;
  quizSavePrefs(); syncQuizOrder();
  if (quiz.on) { ++quiz.gen; nextRound(); }   // ++gen drops the old round's pending timer
}

// Label, pressed state and tooltip of the WALK / RANDOM button
function syncQuizOrder() {
  const b = $('#quiz-order');
  if (!b) return;
  const walk = quiz.order === 'walk';
  b.textContent = walk ? '🪜 WALK' : '🔀 RANDOM';
  b.setAttribute('aria-pressed', String(walk));
  b.classList.toggle('active', walk);
  b.dataset.tip = walk ? 'Notes in scale order, up and back down' : 'Random notes from the board';
}

function quizSavePrefs() {
  try { localStorage.setItem(QUIZ_PREFS_KEY, JSON.stringify({ mode: quiz.mode, order: quiz.order })); } catch (e) {}
}

// Bad or missing saved JSON leaves the defaults as they are
function quizLoadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(QUIZ_PREFS_KEY) || '{}');
    if (['see', 'hear', 'play'].includes(p.mode)) quiz.mode = p.mode;
    if (['random', 'walk'].includes(p.order)) quiz.order = p.order;
  } catch (e) {}
  syncQuizOrder();
}

(function wireQuizOrder() {
  const b = $('#quiz-order');
  if (b) b.addEventListener('click', () => setQuizOrder(quiz.order === 'walk' ? 'random' : 'walk'));
})();

// quiz-walk.js loads after app.js's boot, so the app loads its choices here
if (document.querySelector('header.hud')) quizLoadPrefs();
