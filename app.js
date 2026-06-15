// app.js — state, interactions, theme, wireControls, boot
// Loaded last; depends on data.js → audio.js → engine.js → game.js → practice.js

// ---------- State ----------
const state = {
  keyIdx:   0,
  lens:     'minor',
  box:      '1',
  labels:   true,
  sound:    true,
  score:    0,
  theme:    'crt',
  mode:          'explore',
  gameStreak:    0,
  lickAttempts:  0,
  gameScore:     0,
  highScore:     0,
  gameLickIdx:   0,
  gameInputStep: 0,
  gamePhase:     'idle',
  exploreSavedBox: '1',
  currentLick:   null,
  scaleChromas: new Set([9,0,2,4,7]),
  activeBoxes:  null,
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ---------- Interactions ----------
function onNoteClick(e) {
  const g      = e.currentTarget;
  const midi   = +g.dataset.midi;
  const chroma = +g.dataset.chroma;
  const si     = +g.dataset.string;

  if (state.mode === 'game' && state.gamePhase === 'input') {
    onGameNoteClick(g); return;
  }

  playNote(midi); flashNote(g);
  $('#last-note').textContent = `${spell(chroma)} (str ${STRINGS[si].name}, fret ${g.dataset.fret})`;
  state.score += isInScale(chroma) ? (isRoot(chroma) ? 25 : 10) : 1;
  updateScore();
}

function flashNote(g, cls = 'playing') {
  g.classList.add(cls);
  setTimeout(() => g.classList.remove(cls), 200);
}

function updateScore() {
  $('#score').textContent = String(state.mode === 'game' ? state.gameScore : state.score).padStart(4,'0');
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.body.classList.remove('theme-hawaii','theme-space','theme-vsc','theme-synthwave','theme-blueprint');
  if (theme !== 'crt') document.body.classList.add('theme-' + theme);
  state.theme = theme;
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  try { localStorage.setItem('pent-theme', theme); } catch(e) {}
}

// ---------- Wire controls ----------
function wireControls() {
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
  try {
    const saved = localStorage.getItem('pent-theme') || 'crt';
    const valid = ['crt','hawaii','synthwave','blueprint'];
    applyTheme(valid.includes(saved) ? saved : 'crt');
  } catch(e) { applyTheme('crt'); }

  // Key selector (JS-rendered)
  const keyRow = $('#key-row');
  KEYS.forEach((k, i) => {
    const btn = document.createElement('button');
    btn.className      = 'arc-btn key' + (i === 0 ? ' active' : '');
    btn.dataset.keyIdx = i;
    btn.textContent    = k.name;
    btn.addEventListener('click', () => {
      $$('.key').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      setKey(i); refreshNotes();
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
    refreshNotes();
  }));

  // Box — game restarts lick on switch
  $$('.box').forEach(b => b.addEventListener('click', () => {
    $$('.box').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.box = b.dataset.box;
    refreshNotes();
    if (state.mode === 'game') { ++playGen; showGamePhase(); }
  }));

  $$('.toggle').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.toggle;
    state[key] = !state[key];
    b.classList.toggle('active', state[key]);
    if (key === 'labels') refreshNotes();
  }));

  $('#play-scale').addEventListener('click', playCurrentScale);
  $('#game-toggle').addEventListener('click', () => {
    if (state.mode === 'game') exitGame(); else enterGame();
  });

  $('#help-btn').addEventListener('click', toggleHelp);
  $('#help-close').addEventListener('click', closeHelp);
  $('#help-modal').addEventListener('click', e => { if (e.target === $('#help-modal')) closeHelp(); });

  $('#practice-btn').addEventListener('click', () => { renderChallenge(); togglePractice(); });
  $('#practice-close').addEventListener('click', closePractice);
  $('#practice-modal').addEventListener('click', e => { if (e.target === $('#practice-modal')) closePractice(); });

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
    if (e.target.matches('input,textarea,select')) return;
    if (e.key==='?'||(e.key==='/'&&e.shiftKey)) { closePractice(); toggleHelp(); return; }
    if (e.key==='p'||e.key==='P') { closeHelp(); renderChallenge(); togglePractice(); return; }
    if (e.key==='Escape') { closeHelp(); closePractice(); return; }
    if (e.key>='1'&&e.key<='5') { const b=$$('.box[data-box="'+e.key+'"]')[0]; if(b&&!b.disabled)b.click(); return; }
    if (e.key==='0') { const b=$$('.box[data-box="all"]')[0]; if(b&&!b.disabled)b.click(); return; }
  });
}

// ---------- Boot ----------
setKey(0);
buildFretboard();
refreshNotes();
wireControls();
loadGame();
updateScore();
updateTimerDisplay();
