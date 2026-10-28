// ---
// purpose: Lick Attack game engine + boot-time lick validator
// exports: showGamePhase, onGameNoteClick, enterGame, exitGame, saveGame
// depends: data.js, audio.js, engine.js, player.js (playSteps), app.js (state), patterns.js (clearPattern, stopBuilding)
// ---

// ---------- Boot validator (permanent) ----------
(function validateLicks() {
  const amChromas = new Set([9,0,2,4,7]);
  for (const pos in LICKS) {
    LICKS[pos].forEach(lick => {
      lick.steps.forEach(({s,f}) => {
        const ch = fretChroma(s, f);
        if (!amChromas.has(ch))
          console.error(`LICK VALIDATOR: "${lick.name}" step (s=${s},f=${f}) chroma ${ch} not in Am pentatonic`);
        const [lo,hi] = BOXES[pos][STRINGS[s].name];
        if (f < lo || f > hi)
          console.error(`LICK VALIDATOR: "${lick.name}" step (s=${s},f=${f}) out of Box ${pos} range [${lo},${hi}]`);
      });
    });
  }
})();

// ---------- Game helpers ----------
function getStepMs() {
  const xp = state.gameScore;
  if (xp < 300)  return 540;
  if (xp < 700)  return 460;
  if (xp < 1400) return 380;
  if (xp < 2500) return 300;
  return 240;
}

function pickLick() {
  const box   = state.box === 'all' ? '1' : state.box;
  const licks = LICKS[box] || LICKS[1];
  const ao    = getAnchorOffset();
  const posNum = parseInt(box, 10);
  const eligible = licks.filter(lick =>
    lick.steps.every(({f}) => { const tf = transposeFretInBox(f, ao, posNum); return tf >= 0 && tf <= TOTAL_FRETS; })
  );
  const pool = eligible.length > 0 ? eligible : licks;
  return pool[state.gameLickIdx++ % pool.length];
}

function getFretEl(s, f) {
  return document.querySelector(`.fb-note[data-string="${s}"][data-fret="${f}"]`);
}

// replay = same lick again after a first miss (keeps the attempt count)
function showGamePhase(replay) {
  const lick = replay && state.currentLick ? state.currentLick : pickLick();
  state.currentLick   = lick;
  state.gameInputStep = 0;
  if (!replay) state.lickAttempts = 0;
  state.lickHasError  = false;
  state.gamePhase     = 'show';
  updateGamePanel('👀 WATCH...');
  // A between-licks timer can land while paused: keep PAUSED shown, restore WATCH on resume
  if (state.paused) { pauseMemo.status = '👀 WATCH...'; updateGamePanel(PAUSED_TEXT); }
  ++playGen;
  const STEP   = getStepMs();
  const ao     = getAnchorOffset();
  const posNum = parseInt(state.box === 'all' ? '1' : state.box, 10);
  playSteps(lick.steps, STEP, ({s,f}) => {
    const tf = transposeFretInBox(f, ao, posNum);
    playNote(fretMidi(s, tf), 0.5);
    const g = getFretEl(s, tf); if (g) flashNote(g);
  }, () => {
    state.gamePhase = 'input';
    updateGamePanel('🎸 YOUR TURN!');
  });
}

function onGameNoteClick(g) {
  const si     = +g.dataset.string;
  const fret   = +g.dataset.fret;
  const ao     = getAnchorOffset();
  const posNum = parseInt(state.box === 'all' ? '1' : state.box, 10);
  const exp    = state.currentLick.steps[state.gameInputStep];
  const expF   = transposeFretInBox(exp.f, ao, posNum);

  if (si === exp.s && fret === expF) {
    playNote(+g.dataset.midi, 0.4); flashNote(g, 'correct');
  } else {
    playBuzz(); flashNote(g, 'wrong');
    state.lickHasError = true;
    updateGamePanel('✗ WRONG NOTE — KEEP GOING');
  }

  // Always advance — let the player finish the full sequence
  state.gameInputStep++;
  if (state.gameInputStep >= state.currentLick.steps.length) {
    state.gamePhase = 'judge';   // clicks during the gap before the next lick must not read past the lick
    if (!state.lickHasError) {
      lickComplete();
    } else {
      state.lickAttempts++;
      state.gameStreak = 0;
      updateGameHUD();
      updateGamePanel(state.lickAttempts >= 2 ? '✗ MISSED — NEW LICK' : '✗ TRY AGAIN — WATCH CAREFULLY');
      nextLickAfter(1800, state.lickAttempts < 2);
    }
  }
}

function lickComplete() {
  state.gameStreak++;
  const mult = Math.min(state.gameStreak, GAME.STREAK_MAX_MULT);
  const xp   = GAME.XP_PER_LICK * mult;
  state.gameScore += xp;
  state.highScore  = Math.max(state.highScore, state.gameScore);
  document.getElementById('game-best').textContent = String(state.highScore);
  updateGameHUD(); playFanfare(); saveGame();
  updateGamePanel(`✓ +${xp} XP  ×${mult} STREAK`);
  nextLickAfter(1000, false);
}

// Skipped if the game was left or a key/box change already started a new lick (playGen moved on)
function nextLickAfter(ms, replay) {
  const gen = playGen;
  setTimeout(() => { if (state.mode === 'game' && gen === playGen) showGamePhase(replay); }, ms);
}

function updateGamePanel(status) {
  if (status) document.getElementById('game-status').textContent = status;
  updateGameHUD();
}

function updateGameHUD() {
  const tiers = ['BEGINNER','RHYTHM','GROOVE','FLOW','SHRED'];
  const xp    = state.gameScore;
  const tier  = xp<300?0: xp<700?1: xp<1400?2: xp<2500?3: 4;
  document.getElementById('game-level').textContent    = tiers[tier];
  document.getElementById('game-streak').textContent   = `×${Math.min(state.gameStreak, GAME.STREAK_MAX_MULT)||1}`;
  const tries = 2 - Math.min(state.lickAttempts, 2);
  document.getElementById('game-lives').textContent    = '🎸'.repeat(tries) || '—';
  document.getElementById('game-level-xp').textContent = `${state.gameScore} XP`;
}

function showWinScreen() {
  state.gamePhase = 'done'; ++playGen;
  document.getElementById('win-score').textContent = `FINAL SCORE: ${state.gameScore}`;
  document.getElementById('win-screen').classList.add('visible');
}

function enterGame() {
  if (typeof clearPattern === 'function') { stopBuilding(); clearPattern(); }
  state.exploreSavedBox = state.box;
  state.mode            = 'game';
  updatePlayingFlag();
  if (state.box === 'all') {
    state.box = '1';
    document.querySelectorAll('.box').forEach(b => b.classList.toggle('active', b.dataset.box==='1'));
  }
  state.lickAttempts = 0; state.gameStreak = 0;
  document.getElementById('game-panel').classList.add('visible');
  document.getElementById('game-toggle').textContent = '◀ EXPLORE';
  // PLAY SCALE would bump playGen and strand the lick in its 'show' phase
  document.querySelectorAll('.lens, #play-scale, #pattern-build, #pattern-select, #pattern-save, #pattern-delete, #pattern-clear, #pattern-name').forEach(b => b.disabled = true);
  refreshNotes(); updateGameHUD();
  document.getElementById('game-best').textContent = String(state.highScore);
  showGamePhase();
}

function exitGame() {
  ++playGen;
  state.mode = 'explore'; state.gamePhase = 'idle';
  stopSteps();
  state.box  = state.exploreSavedBox;
  document.getElementById('game-panel').classList.remove('visible');
  document.getElementById('game-toggle').textContent = '▶ START GAME';
  // #pattern-delete stays disabled: it re-enables only when a saved pattern is selected
  document.querySelectorAll('.box, .lens, #key-row .arc-btn, #play-scale, #pattern-build, #pattern-select, #pattern-save, #pattern-clear, #pattern-name').forEach(b => b.disabled = false);
  document.querySelectorAll('.box').forEach(b => b.classList.toggle('active', b.dataset.box===state.box));
  refreshNotes();
}

function saveGame() {
  try { localStorage.setItem('pent-game', JSON.stringify({xp:state.gameScore,highScore:state.highScore})); } catch(e) {}
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem('pent-game')||'{}');
    if (d.xp)        state.gameScore = d.xp;
    if (d.highScore) state.highScore = d.highScore;
    document.getElementById('game-best').textContent = String(state.highScore);
  } catch(e) {}
}
