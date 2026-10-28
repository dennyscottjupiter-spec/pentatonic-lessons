// ---
// purpose: STAND mode: music-stand layout (zoomed box, quiz, key/box steppers), tablet auto-start, screen wake lock
// exports: stand, isTablet, standAuto, standOn, standOff, toggleStand, standFit, standStep, standKeyStep, syncStandUi, standWake, standQuizStopped
// depends: app.js (state, $), data.js (KEYS, BOXES, STRINGS, TOTAL_FRETS), engine.js (FB, spell), game.js (exitGame), quiz.js (quiz, quizStart, quizStop), audio.js (ensureAudio)
// gotcha: standFit only changes the SVG viewBox, never rebuilds it; boot is the last line so every quiz script is loaded
// ---

const STAND_KEY = 'pent-stand';
const STAND_BOXES = ['1', '2', '3', '4', '5', 'all'];
const stand = { on: false, lock: null };

// iPad Safari reports a Mac user agent, so touch points tell it apart from a Mac
function isTablet() {
  return (/Macintosh|iPad/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) >= 600);
}

// A saved '1' or '0' wins; with no choice yet, tablets start in stand
function standAuto() {
  let saved = null;
  try { saved = localStorage.getItem(STAND_KEY); } catch (e) {}
  return saved === '1' || (saved === null && isTablet());
}

function saveStand(v) { try { localStorage.setItem(STAND_KEY, v); } catch (e) {} }

// save=false for automatic starts: only a real choice is remembered
function standOn(save = true) {
  if (stand.on) return;
  if (state.mode === 'game') exitGame();   // the lick game owns the board
  stand.on = true;
  document.body.classList.add('stand');
  quizStart();
  standFit(); standWake(true);
  if (save) saveStand('1');
  window.scrollTo(0, 0);
}

function standOff(save = true) {
  if (!stand.on) return;
  stand.on = false;   // before quizStop: its standQuizStopped call must not loop back here
  document.body.classList.remove('stand');
  quizStop();
  standFit(); standWake(false);
  if (save) saveStand('0');
}

function toggleStand() { if (stand.on) standOff(); else standOn(); }

// Closing the quiz (✕, Q, Esc) leaves STAND too
function standQuizStopped() { if (stand.on) standOff(); }

// Clicks the real box button so the usual box logic runs
function standStep(dir) {
  const next = STAND_BOXES[(STAND_BOXES.indexOf(state.box) + dir + 6) % 6];
  const b = document.querySelector(`.box[data-box="${next}"]`);
  if (b) b.click();
  syncStandUi();
}

// Clicks the real key button (its handler retunes the drone and refreshes the board)
function standKeyStep(dir) {
  const next = (state.keyIdx + dir + 12) % 12;
  const b = document.querySelector(`#key-row .key[data-key-idx="${next}"]`);
  if (b) b.click();
  syncStandUi();
}

// Keeps the HUD button and the stand bar labels in step with key, lens and box
function syncStandUi() {
  const btn = document.getElementById('stand-btn');
  if (btn) { btn.classList.toggle('active', stand.on); btn.setAttribute('aria-pressed', String(stand.on)); }
  const key = document.getElementById('stand-key');
  if (key) key.textContent = `${spell(KEYS[state.keyIdx].chroma)} ${state.lens === 'minor' ? 'min' : 'maj'}`;
  const box = document.getElementById('stand-box');
  if (box) box.textContent = state.box === 'all' ? 'ALL' : 'BOX ' + state.box;
}

// Zooms the neck onto the chosen box by changing only the viewBox (the SVG is never rebuilt)
function standFit() {
  syncStandUi();
  const svg = document.querySelector('#fretboard .fb-svg');
  if (!svg) return;
  const W = FB.pad.left + FB.fretW * (TOTAL_FRETS + 1) + FB.pad.right;
  const H = FB.pad.top + FB.stringH * STRINGS.length + FB.pad.bottom;
  if (!stand.on || state.box === 'all' || state.patternChromatic || state.pattern.length) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); return;
  }
  const box = (state.activeBoxes || BOXES)[state.box];
  let lo = Infinity, hi = -Infinity;
  for (const s in box) { lo = Math.min(lo, box[s][0]); hi = Math.max(hi, box[s][1]); }
  // one spare fret each side: a blue note may sit one fret outside the box
  let x0 = lo <= 1 ? 0 : FB.pad.left + (lo - 2) * FB.fretW;
  let x1 = Math.min(W, FB.pad.left + (hi + 1) * FB.fretW);
  // widen to the element's aspect so the neck fills the space instead of letterboxing
  const r = svg.getBoundingClientRect();
  if (r.width && r.height) {
    const extra = Math.max(0, H * r.width / r.height - (x1 - x0)) / 2;
    x0 -= extra; x1 += extra;
    if (x0 < 0) { x1 = Math.min(W, x1 - x0); x0 = 0; }
    if (x1 > W) { x0 = Math.max(0, x0 - (x1 - W)); x1 = W; }
  }
  const f = v => Math.round(v * 10) / 10;
  svg.setAttribute('viewBox', `${f(x0)} 0 ${f(x1 - x0)} ${H}`);
}

// Holds the screen awake while STAND is on; the OS drops the lock when the page hides
async function standWake(on) {
  try {
    if (!on) { const l = stand.lock; stand.lock = null; if (l) await l.release(); return; }
    if (!stand.on || stand.lock || !('wakeLock' in navigator) || document.hidden) return;
    const l = await navigator.wakeLock.request('screen');
    if (!stand.on || stand.lock) { l.release(); return; }   // left STAND, or a second request won the race
    stand.lock = l;
    l.addEventListener('release', () => { if (stand.lock === l) stand.lock = null; });
  } catch (e) { stand.lock = null; }
}

window.addEventListener('resize', standFit);
window.addEventListener('orientationchange', standFit);
document.addEventListener('visibilitychange', () => { if (stand.on && !document.hidden) standWake(true); });
document.addEventListener('pointerdown', () => {
  if (!stand.on) return;
  if (!stand.lock) standWake(true);   // Safari may want a tap first
  if (quiz.mode === 'play') ensureAudio();   // an auto-start in PLAY IT had no tap, so the mic's audio context waits for this one
});

document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select') || e.target.closest('#theme-menu')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'm' || e.key === 'M') { toggleStand(); return; }
  if (!stand.on) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); standStep(e.key === 'ArrowLeft' ? -1 : 1); }
});

(function wireStand() {
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('stand-btn', toggleStand);
  bind('stand-exit', () => standOff());
  bind('stand-key-prev', () => standKeyStep(-1));
  bind('stand-key-next', () => standKeyStep(1));
  bind('stand-box-prev', () => standStep(-1));
  bind('stand-box-next', () => standStep(1));
})();

// tests.html has no HUD, so it never auto-starts; false = an automatic start is not a user choice, nothing saved
if (document.querySelector('header.hud') && standAuto()) standOn(false);
