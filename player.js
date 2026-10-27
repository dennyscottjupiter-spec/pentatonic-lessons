// ---
// purpose: Resumable step sequencer + global pause (scale playback, game, metronome, timer)
// exports: playSteps(), stopSteps(), setPaused(), togglePause(), updatePlayingFlag()
// depends: audio.js (metro, timer, metroStart/Stop, timerStart/Stop), engine.js (playGen)
// ---

const player = { steps:null, i:0, ms:0, onStep:null, onDone:null, tid:null, gen:-1 };
const pauseMemo = { metro:false, timer:false, status:null };
const PAUSED_TEXT = '⏸ PAUSED — PRESS SPACE';

// Plays steps one every ms; onDone runs after the last one. Dropped if playGen moves on.
function playSteps(steps, ms, onStep, onDone) {
  clearTimeout(player.tid); player.tid = null;
  Object.assign(player, { steps, i:0, ms, onStep, onDone: onDone || null, gen: playGen });
  updatePlayingFlag();
  if (!state.paused) playerTick();
}

function playerTick() {
  player.tid = null;
  if (!player.steps) return;
  if (player.gen !== playGen) { stopSteps(); return; }   // superseded by a key/box/mode change
  if (state.paused) return;
  if (player.i >= player.steps.length) { const done = player.onDone; stopSteps(); if (done) done(); return; }
  const idx = player.i++;
  player.onStep(player.steps[idx], idx);
  player.tid = setTimeout(playerTick, player.ms);
}

function stopSteps() { clearTimeout(player.tid); player.tid = null; player.steps = null; updatePlayingFlag(); }

function setPaused(on) {
  if (state.paused === on) return;
  state.paused = on;
  const statusEl = document.getElementById('game-status');
  if (on) {
    clearTimeout(player.tid); player.tid = null;
    pauseMemo.metro = metro.running; pauseMemo.timer = timer.running;
    if (metro.running) metroStop();
    if (timer.running) timerStop();
    if (state.mode === 'game' && statusEl) { pauseMemo.status = statusEl.textContent; statusEl.textContent = PAUSED_TEXT; }
  } else {
    // Skip restart if the user already restarted that clock while paused (avoids a doubled timer chain)
    if (pauseMemo.metro && !metro.running) metroStart();
    if (pauseMemo.timer && !timer.running) timerStart();
    // Restore only if nothing else wrote a newer status while paused
    if (statusEl && pauseMemo.status !== null && statusEl.textContent === PAUSED_TEXT) statusEl.textContent = pauseMemo.status;
    pauseMemo.status = null;
    if (player.steps && player.tid === null) playerTick();
  }
  document.body.classList.toggle('is-paused', state.paused);
  const pb = document.getElementById('pause-btn');
  if (pb) { pb.setAttribute('aria-pressed', String(state.paused)); pb.setAttribute('aria-label', state.paused ? 'Resume' : 'Pause'); }
  updatePlayingFlag();
}

// Nothing running = nothing to pause; resume always allowed
function togglePause() {
  if (!state.paused && !document.body.classList.contains('is-playing')) return;
  setPaused(!state.paused);
}

function updatePlayingFlag() {
  const busy = !!player.steps || metro.running || timer.running || state.mode === 'game';
  document.body.classList.toggle('is-playing', busy && !state.paused);
}
