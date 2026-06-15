// game.js — Lick Attack game engine + boot validator
// Depends on: data.js, audio.js, engine.js, app.js (state, updateScore)

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
  const eligible = licks.filter(lick =>
    lick.steps.every(({f}) => { const tf = transposeFret(f, ao); return tf >= 0 && tf <= TOTAL_FRETS; })
  );
  const pool = eligible.length > 0 ? eligible : licks;
  return pool[state.gameLickIdx++ % pool.length];
}

function getFretEl(s, f) {
  return document.querySelector(`.fb-note[data-string="${s}"][data-fret="${f}"]`);
}

function showGamePhase() {
  const lick = pickLick();
  state.currentLick   = lick;
  state.gameInputStep = 0;
  state.lickAttempts  = 0;
  state.gamePhase     = 'show';
  updateGamePanel('👀 WATCH...');
  const gen = ++playGen;
  const STEP = getStepMs();
  const ao   = getAnchorOffset();
  lick.steps.forEach(({s,f}, i) => {
    setTimeout(() => {
      if (playGen !== gen) return;
      const tf = transposeFret(f, ao);
      playNote(fretMidi(s, tf), 0.5);
      const g = getFretEl(s, tf); if (g) flashNote(g);
    }, i * STEP);
  });
  setTimeout(() => {
    if (playGen !== gen) return;
    state.gamePhase = 'input';
    updateGamePanel('🎸 YOUR TURN!');
  }, lick.steps.length * STEP + 250);
}

function onGameNoteClick(g) {
  const si   = +g.dataset.string;
  const fret = +g.dataset.fret;
  const ao   = getAnchorOffset();
  const exp  = state.currentLick.steps[state.gameInputStep];
  const expF = transposeFret(exp.f, ao);

  if (si === exp.s && fret === expF) {
    playNote(+g.dataset.midi, 0.4); flashNote(g, 'correct');
    state.gameInputStep++;
    if (state.gameInputStep >= state.currentLick.steps.length) lickComplete();
  } else {
    playBuzz(); flashNote(g, 'wrong');
    state.lickAttempts++; state.gameStreak = 0;
    updateGameHUD();
    updateGamePanel(state.lickAttempts >= 2 ? '✗ MISSED — NEW LICK' : '✗ WRONG — WATCH AGAIN');
    setTimeout(() => { if (state.mode === 'game') showGamePhase(); }, 900);
  }
}

function lickComplete() {
  state.gameStreak++;
  const mult = Math.min(state.gameStreak, GAME.STREAK_MAX_MULT);
  const xp   = GAME.XP_PER_LICK * mult;
  state.gameScore += xp;
  state.highScore  = Math.max(state.highScore, state.gameScore);
  updateScore(); updateGameHUD(); playFanfare(); saveGame();
  updateGamePanel(`✓ +${xp} XP  ×${mult} STREAK`);
  setTimeout(() => showGamePhase(), 1000);
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
  state.exploreSavedBox = state.box;
  state.mode            = 'game';
  if (state.box === 'all') {
    state.box = '1';
    document.querySelectorAll('.box').forEach(b => b.classList.toggle('active', b.dataset.box==='1'));
  }
  state.lickAttempts = 0; state.gameStreak = 0;
  document.getElementById('game-panel').classList.add('visible');
  document.getElementById('game-toggle').textContent = '◀ EXPLORE';
  document.querySelectorAll('.lens').forEach(b => b.disabled = true);
  refreshNotes(); updateScore(); updateGameHUD();
  document.getElementById('highscore-label').style.display = '';
  document.getElementById('highscore').style.display = '';
  document.getElementById('highscore').textContent = String(state.highScore).padStart(4,'0');
  showGamePhase();
}

function exitGame() {
  ++playGen;
  state.mode = 'explore'; state.gamePhase = 'idle';
  state.box  = state.exploreSavedBox;
  document.getElementById('game-panel').classList.remove('visible');
  document.getElementById('game-toggle').textContent = '▶ START GAME';
  document.querySelectorAll('.box, .lens, #key-row .arc-btn').forEach(b => b.disabled = false);
  document.querySelectorAll('.box').forEach(b => b.classList.toggle('active', b.dataset.box===state.box));
  refreshNotes(); updateScore();
}

function saveGame() {
  try { localStorage.setItem('pent-game', JSON.stringify({xp:state.gameScore,highScore:state.highScore})); } catch(e) {}
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem('pent-game')||'{}');
    if (d.xp)        state.gameScore = d.xp;
    if (d.highScore) {
      state.highScore = d.highScore;
      document.getElementById('highscore-label').style.display = '';
      document.getElementById('highscore').style.display = '';
      document.getElementById('highscore').textContent = String(state.highScore).padStart(4,'0');
    }
  } catch(e) {}
}
