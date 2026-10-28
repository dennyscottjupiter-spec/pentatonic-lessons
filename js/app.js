// ---
// purpose: Global state, note clicks, theme, prefs, control wiring, boot
// exports: state, onNoteClick, applyTheme, wireControls, loadPrefs, savePrefs
// depends: data.js → audio.js → drone.js → player.js → engine.js → game.js → practice.js
// gotcha: loadPrefs() must run before wireControls() (key labels use spell())
// ---

// ---------- State ----------
const state = {
  keyIdx:   0,
  lens:     'minor',
  box:      '1',
  labels:   true,
  sound:    true,
  theme:    'crt',
  mode:          'explore',
  gameStreak:    0,
  lickAttempts:  0,
  gameScore:     0,
  highScore:     0,
  gameLickIdx:   0,
  gameInputStep: 0,
  gamePhase:     'idle',
  lickHasError:  false,
  exploreSavedBox: '1',
  currentLick:   null,
  scaleChromas: new Set([9,0,2,4,7]),
  activeBoxes:  null,
  accidentals:  'sharp',
  blues:        false,
  paused:       false,
  patternRef:   null,
  patternRoots: false,
  patternChromatic: false,
  patternLens:  'minor',
  pattern:      [],
  building:     false,
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ---------- Interactions ----------
function onNoteClick(e) {
  if (state.paused && state.mode === 'game') return;
  const g      = e.currentTarget;
  const midi   = +g.dataset.midi;
  const chroma = +g.dataset.chroma;
  const si     = +g.dataset.string;

  if (state.mode === 'game' && state.gamePhase === 'input') {
    onGameNoteClick(g); return;
  }

  if (state.building) togglePick(g);
  playNote(midi); flashNote(g);
  $('#last-note').textContent = `${spell(chroma)} (str ${STRINGS[si].name}, fret ${g.dataset.fret})`;
}

function flashNote(g, cls = 'playing') {
  g.classList.add(cls);
  setTimeout(() => g.classList.remove(cls), 200);
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.body.classList.remove('theme-tropical','theme-mission','theme-blueprint');
  if (theme !== 'crt') document.body.classList.add('theme-' + theme);
  state.theme = theme;
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  try { localStorage.setItem('pent-theme', theme); } catch(e) {}
}

// ---------- Note names, blues, prefs ----------
function renderKeyLabels() {
  $$('#key-row .key').forEach(b => { b.textContent = spell(KEYS[+b.dataset.keyIdx].chroma); });
}

function updateBlueLegend() {
  $('#legend-blue').hidden = !state.blues;
  $('#legend-blue-text').textContent = 'BLUE NOTE ' + (state.lens === 'minor' ? '♭5' : '♭3');
}

function savePrefs() {
  try { localStorage.setItem('pent-prefs', JSON.stringify({accidentals: state.accidentals, blues: state.blues})); } catch(e) {}
}

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('pent-prefs') || '{}');
    if (p.accidentals === 'sharp' || p.accidentals === 'flat') state.accidentals = p.accidentals;
    if (typeof p.blues === 'boolean') state.blues = p.blues;
  } catch(e) {}
  $$('.acc').forEach(b => { const on = b.dataset.acc === state.accidentals; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  const bb = $('[data-toggle="blues"]');
  bb.classList.toggle('active', state.blues); bb.setAttribute('aria-pressed', String(state.blues));
  updateBlueLegend();
}

// ---------- Wire controls ----------
function wireControls() {
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
  try {
    const saved = localStorage.getItem('pent-theme') || 'crt';
    const valid = ['crt','tropical','mission','blueprint'];
    applyTheme(valid.includes(saved) ? saved : 'crt');
  } catch(e) { applyTheme('crt'); }

  // Key selector (JS-rendered)
  const keyRow = $('#key-row');
  KEYS.forEach((k, i) => {
    const btn = document.createElement('button');
    btn.className      = 'arc-btn key' + (i === 0 ? ' active' : '');
    btn.dataset.keyIdx = i;
    btn.textContent    = spell(k.chroma);
    btn.addEventListener('click', () => {
      $$('.key').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      setKey(i);
      droneRetune();
      if (typeof syncPattern === 'function') syncPattern();
      refreshNotes();
      if (state.mode === 'game') { ++playGen; showGamePhase(); }
    });
    keyRow.appendChild(btn);
  });

  // Lens — recomputes scale + boxes for the parallel model
  $$('.lens').forEach(b => b.addEventListener('click', () => {
    $$('.lens').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.lens = b.dataset.lens;
    setKey(state.keyIdx);
    if (typeof syncPattern === 'function') syncPattern();
    refreshNotes();
    updateBlueLegend();
    syncDroneUi();
  }));

  // Box — game restarts lick on switch
  $$('.box').forEach(b => b.addEventListener('click', () => {
    $$('.box').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.box = b.dataset.box;
    if (typeof clearPattern === 'function') { stopBuilding(); clearPattern(); }
    refreshNotes();
    if (state.mode === 'game') { ++playGen; showGamePhase(); }
  }));

  // Note names — refresh relabels the fretboard and key buttons
  $$('.acc').forEach(b => b.addEventListener('click', () => {
    state.accidentals = b.dataset.acc;
    $$('.acc').forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
    renderKeyLabels(); setKey(state.keyIdx); refreshNotes(); savePrefs(); syncDroneUi();
  }));

  $$('.toggle').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.toggle;
    state[key] = !state[key];
    b.classList.toggle('active', state[key]);
    b.setAttribute('aria-pressed', String(state[key]));
    if (key === 'labels' || key === 'blues') refreshNotes();
    if (key === 'blues') { updateBlueLegend(); savePrefs(); }
    if (key === 'sound') { if (!state.sound) droneStop(); syncDroneUi(); }
  }));

  $('#play-scale').addEventListener('click', playCurrentScale);
  $('#game-toggle').addEventListener('click', () => {
    if (state.mode === 'game') exitGame(); else enterGame();
  });

  const pb = $('#pause-btn'); if (pb) pb.addEventListener('click', togglePause);
  $('#drone-btn').addEventListener('click', toggleDrone);

  $('#help-btn').addEventListener('click', toggleHelp);
  $('#help-close').addEventListener('click', closeHelp);
  $('#help-modal').addEventListener('click', e => { if (e.target === $('#help-modal')) closeHelp(); });

  $('#practice-btn').addEventListener('click', () => { renderChallenge(); togglePractice(); });
  $('#practice-close').addEventListener('click', closePractice);
  $('#practice-modal').addEventListener('click', e => { if (e.target === $('#practice-modal')) closePractice(); });

  $('#learn-btn').addEventListener('click', () => { renderLesson(_learnIdx); toggleLearn(); });
  $('#learn-close').addEventListener('click', closeLearn);
  $('#learn-modal').addEventListener('click', e => { if (e.target === $('#learn-modal')) closeLearn(); });
  $('#learn-prev').addEventListener('click', () => renderLesson(_learnIdx - 1));
  $('#learn-next').addEventListener('click', () => renderLesson(_learnIdx + 1));

  $('#changelog-btn').addEventListener('click', () => { renderChangelog(); markChangelogSeen(); toggleChangelog(); });
  syncChangelogBadge();
  $('#changelog-close').addEventListener('click', closeChangelog);
  $('#changelog-modal').addEventListener('click', e => { if (e.target === $('#changelog-modal')) closeChangelog(); });

  const slider = $('#metro-slider'), bpmIn = $('#metro-bpm');
  slider.addEventListener('input', () => { metro.bpm = +slider.value; bpmIn.value = slider.value; });
  bpmIn.addEventListener('input', () => { const v=Math.max(40,Math.min(240,+bpmIn.value||80)); metro.bpm=v; slider.value=v; });
  $('#metro-start').addEventListener('click', () => { ensureAudio(); if(metro.running) metroStop(); else metroStart(); });

  $('#timer-5').addEventListener('click',      () => timerReset(5));
  $('#timer-10').addEventListener('click',     () => timerReset(10));
  $('#timer-toggle').addEventListener('click', () => { ensureAudio(); if(timer.running) timerStop(); else timerStart(); });
  $('#timer-reset').addEventListener('click',  () => timerReset());

  $('#win-close').addEventListener('click', () => {
    $('#win-screen').classList.remove('visible');
    state.gameScore=0; state.gameStreak=0; state.gameLickIdx=0;
    exitGame();
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea,select') || e.target.closest('#theme-menu')) return;
    if (e.code === 'Space' || e.key === 'k' || e.key === 'K') { e.preventDefault(); togglePause(); return; }
    if (e.key==='d'||e.key==='D') { toggleDrone(); return; }
    if (e.key==='?'||(e.key==='/'&&e.shiftKey)) { closePractice(); closeLearn(); toggleHelp(); return; }
    if (e.key==='p'||e.key==='P') { closeHelp(); closeLearn(); renderChallenge(); togglePractice(); return; }
    if (e.key==='l'||e.key==='L') { closeHelp(); closePractice(); renderLesson(_learnIdx); toggleLearn(); return; }
    if (e.key==='Escape') { closeHelp(); closePractice(); closeLearn(); closeChangelog(); return; }
    if (e.key>='1'&&e.key<='5') { const b=$$('.box[data-box="'+e.key+'"]')[0]; if(b&&!b.disabled)b.click(); return; }
    if (e.key==='0') { const b=$$('.box[data-box="all"]')[0]; if(b&&!b.disabled)b.click(); return; }
  });
}

// ---------- Boot ----------
loadPrefs();
setKey(0);
buildFretboard();
refreshNotes();
wireControls();
syncDroneUi();
loadGame();
updateTimerDisplay();
