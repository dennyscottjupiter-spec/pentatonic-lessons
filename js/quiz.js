// ---
// purpose: NOTE QUIZ rounds: target pick, SEE/HEAR/PLAY modes, answers, score, interval line, board pool
// exports: quiz, quizStart, quizStop, toggleQuiz, quizAnswer, quizReplay, setQuizMode, quizPool, quizRefresh, intervalName
// depends: app.js (state, $, $$), data.js (KEYS, INTERVAL_NAMES), engine.js (spell, mkSvg, refreshNotes), audio.js (playNote, playBuzz), quiz-piano.js (renderQuizKeys), mic.js (micStop), quiz-play.js (quizListen, quizHoldSound)
// gotcha: quiz.gen drops stale next-round timers after stop/restart
// ---

const quiz = { on:false, target:null, score:0, tries:0, streak:0, best:0, locked:false, gen:0, acc:null, mode:'see', micMsg:'', held:{ drone:false, metro:false } };
const QUIZ_LIT = ['in-scale', 'root', 'blue', 'chromatic'];
const QUIZ_BEST_KEY = 'pent-quiz-best';
const QUIZ_LOCKS = ['#play-scale', '#pattern-build'];

// The notes the board shows right now (box, pattern and chromatic all count)
function quizPool() {
  return $$('#fretboard .fb-note').filter(g =>
    !g.classList.contains('dimmed') && QUIZ_LIT.some(c => g.classList.contains(c)));
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

// Glowing circle + reticle on the target, scrolled into view on phones
function markTarget(t) {
  const c = t.querySelector('circle');   // first circle is the note itself
  t.classList.add('quiz-target');
  t.appendChild(mkSvg('circle', { class: 'quiz-reticle', r: 17, cx: c.getAttribute('cx'), cy: c.getAttribute('cy') }));
  const wrap = t.closest('.fretboard-wrap');   // phones: the neck scrolls sideways, so bring the target into view
  if (wrap) {
    const r = t.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    if (r.left < w.left || r.right > w.right) wrap.scrollLeft += r.left - w.left - w.width / 2;
  }
}

function nextRound() {
  const prev = quiz.target;
  clearTarget();
  let cands = quizPool();
  if (!cands.length) cands = $$('#fretboard .fb-note');
  if (cands.length > 1) cands = cands.filter(g => g !== prev);
  const t = cands[Math.floor(Math.random() * cands.length)];
  quiz.target = t; quiz.locked = false;
  quizIntervalLine('');
  if (quiz.mode === 'hear') {   // HEAR IT: the note stays unmarked until the answer
    $('#quiz-prompt').textContent = state.sound ? 'Name the note you hear' : 'Turn SOUND on to hear the note';
    quizReplay();
  } else {   // SEE IT and PLAY IT both glow the note
    markTarget(t);
    $('#quiz-prompt').textContent = quiz.mode === 'play' ? (quiz.micMsg || 'Play the glowing note on your guitar') : 'Name the glowing note';
  }
  updateQuizStats();
}

// Plays the key's root, then the mystery note 600 ms later (HEAR IT)
function quizReplay() {
  if (!quiz.on || !quiz.target || quiz.locked) return;
  const t = quiz.target, midi = +t.dataset.midi;
  const root = midi - ((midi - KEYS[state.keyIdx].chroma) % 12 + 12) % 12;   // the key's root at or below the note: you hear the interval up from it
  playNote(root, 0.6);
  const wave = $('#quiz-wave');
  if (wave) { wave.classList.remove('playing'); void wave.offsetWidth; wave.classList.add('playing'); }
  const g = quiz.gen;
  setTimeout(() => { if (quiz.on && quiz.gen === g && quiz.target === t && !quiz.locked) playNote(midi); }, 600);
}

function updateQuizStats() {
  $('#quiz-score').textContent = `${quiz.score}/${quiz.tries}`;
  $('#quiz-streak').textContent = quiz.streak;
  $('#quiz-best').textContent = quiz.best;
}

// Semitones from the key's root (the key button, in both lenses), e.g. '5 · perfect 5th'
function intervalName(chroma) { return INTERVAL_NAMES[((chroma - KEYS[state.keyIdx].chroma) % 12 + 12) % 12]; }

// The interval line under the prompt; '' hides it
function quizIntervalLine(text) { const el = $('#quiz-interval'); el.textContent = text; el.classList.toggle('show', text !== ''); }

// Clicks, keys and the mic all land here; `locked` holds the board still while the feedback shows
function quizAnswer(chroma) {
  if (!quiz.on || quiz.locked || !quiz.target) return;
  const t = quiz.target, want = +t.dataset.chroma, right = chroma === want;
  quiz.locked = true; quiz.tries++;
  if (!right || quiz.mode !== 'play') playNote(+t.dataset.midi);   // PLAY IT: the guitar just rang it; a speaker copy would feed the mic
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
  if (!t.classList.contains('quiz-target')) markTarget(t);   // HEAR mode: show where it was
  t.classList.add('quiz-reveal');
  quizIntervalLine(intervalName(want) + ' from ' + spell(KEYS[state.keyIdx].chroma));
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
  syncQuizMode();
  renderQuizKeys(); nextRound();
  if (dock.scrollIntoView) dock.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function quizStop() {
  if (!quiz.on) return;
  quiz.on = false; quiz.locked = false; ++quiz.gen;
  clearTarget(); micStop(); quizHoldSound(false); quiz.micMsg = '';
  quizIntervalLine(''); $('#quiz-heard').textContent = '';
  document.body.classList.remove('quiz-on', 'quiz-hear', 'quiz-play');
  $$('#quiz-keys .pk.held').forEach(k => k.classList.remove('held'));
  $('#quiz-dock').hidden = true;
  const btn = $('#quiz-btn');
  btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false');
  QUIZ_LOCKS.forEach(s => { const el = $(s); if (el) el.disabled = false; });
}

function toggleQuiz() { if (quiz.on) quizStop(); else quizStart(); }

// Applies quiz.mode to the body classes, the mode buttons, REPLAY, and the mic (PLAY IT only)
function syncQuizMode() {
  document.body.classList.toggle('quiz-hear', quiz.mode === 'hear');
  document.body.classList.toggle('quiz-play', quiz.mode === 'play');
  $$('.qm').forEach(b => { const on = b.dataset.qmode === quiz.mode; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  const rep = $('#quiz-replay'); if (rep) rep.hidden = quiz.mode !== 'hear';
  if (quiz.on && quiz.mode === 'play') quizListen();
  else { micStop(); quizHoldSound(false); quiz.micMsg = ''; }
}

function setQuizMode(m) {
  if (!['see', 'hear', 'play'].includes(m)) return;
  quiz.mode = m; syncQuizMode();
  if (quiz.on) { ++quiz.gen; nextRound(); }   // ++gen drops the old round's pending timer
}

// Runs at the end of refreshNotes(): keeps key labels in the chosen spelling, re-rolls if the target left the board
function quizRefresh() {
  if (!quiz.on) return;
  if (quiz.acc !== state.accidentals) renderQuizKeys();   // only on respell, so feedback colours survive a box/key change
  const t = quiz.target;
  if (!quiz.locked && (!t || t.classList.contains('dimmed') || !quizPool().includes(t))) nextRound();
}

(function wireQuiz() {
  const btn = $('#quiz-btn'), close = $('#quiz-close'), replay = $('#quiz-replay');
  if (btn) btn.addEventListener('click', toggleQuiz);
  if (close) close.addEventListener('click', quizStop);
  if (replay) replay.addEventListener('click', quizReplay);
  $$('.qm').forEach(b => b.addEventListener('click', () => setQuizMode(b.dataset.qmode)));
})();
