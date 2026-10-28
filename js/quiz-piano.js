// ---
// purpose: NOTE QUIZ mini piano: key render, music-app typing row, held-key light
// exports: QUIZ_WHITE, QUIZ_BLACK, QUIZ_TYPING, quizKeyChroma, renderQuizKeys, holdKey, quizKeyDown
// depends: app.js (state, $, $$), engine.js (spell), quiz.js (quiz, quizAnswer, quizReplay; called at runtime only)
// ---

const QUIZ_WHITE = [0, 2, 4, 5, 7, 9, 11];
const QUIZ_BLACK = [1, 3, 6, 8, 10];
// GarageBand-style row: home row = white keys, row above = black keys
const QUIZ_TYPING = { KeyA:0, KeyW:1, KeyS:2, KeyE:3, KeyD:4, KeyF:5, KeyT:6, KeyG:7, KeyY:8, KeyH:9, KeyU:10, KeyJ:11 };
const QUIZ_CAPS = Object.fromEntries(Object.entries(QUIZ_TYPING).map(([k, c]) => [c, k.slice(3)]));   // chroma -> keycap letter

// e.code is the physical key, so Shift never changes the note
function quizKeyChroma(e) { return e.code in QUIZ_TYPING ? QUIZ_TYPING[e.code] : null; }

function renderQuizKeys() {
  const key = (c, cls, style = '') =>
    `<button class="pk ${cls}" data-chroma="${c}" aria-label="${spell(c)}"${style}><kbd class="pk-cap" aria-hidden="true">${QUIZ_CAPS[c]}</kbd><span>${spell(c)}</span></button>`;
  const host = $('#quiz-keys');
  quiz.acc = state.accidentals;
  host.innerHTML = QUIZ_WHITE.map(c => key(c, 'white')).join('') +
    QUIZ_BLACK.map(c => key(c, 'black', ` style="--slot:${QUIZ_WHITE.filter(w => w < c).length}"`)).join('');
  host.querySelectorAll('.pk').forEach(b => b.addEventListener('click', () => quizAnswer(+b.dataset.chroma)));
}

// Lights a piano key while its typing key is held
function holdKey(chroma, on) {
  const k = $(`#quiz-keys .pk[data-chroma="${chroma}"]`);
  if (k) k.classList.toggle('held', on);
}

// Returns true when the key was ours (piano row or R), so app.js stops there
function quizKeyDown(e) {
  if (e.code === 'KeyR') { if (quiz.mode !== 'hear') return false; e.preventDefault(); if (!e.repeat) quizReplay(); return true; }
  const c = quizKeyChroma(e); if (c === null) return false;
  e.preventDefault(); holdKey(c, true); if (!e.repeat) quizAnswer(c);   // a held key never answers twice
  return true;
}

(function wireQuizPiano() {
  document.addEventListener('keyup', e => { const c = quizKeyChroma(e); if (c !== null) holdKey(c, false); });
  window.addEventListener('blur', () => $$('#quiz-keys .pk.held').forEach(k => k.classList.remove('held')));   // a key released outside the tab would stay lit
})();
