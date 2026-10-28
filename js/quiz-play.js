// ---
// purpose: PLAY IT glue: mic on/off, sound hold, denied message, pause and hidden-tab guards
// exports: quizListen, quizHoldSound, quizMicNote, quizMicLevel, quizClickSounds, micDeniedText
// depends: quiz.js (quiz, quizAnswer, quizPlayPrompt), mic.js (micStart, micStop), drone.js (drone, droneStart, droneStop), audio.js (metro, metroStart, metroStop), player.js (pauseMemo), engine.js (spell), app.js (state, $)
// gotcha: the mic hears the drone and metronome, so quizListen holds them off until PLAY IT is left
// ---

// HEAR sounds any note, SEE only the target; PLAY IT stays silent so the speakers cannot answer for the guitar
function quizClickSounds(g) {
  return quiz.mode === 'hear' || (quiz.mode === 'see' && g.classList.contains('quiz-target'));
}

// on=true holds the drone and metronome off while the mic listens; on=false restarts what it held
function quizHoldSound(on) {
  if (on) {
    if (drone.running) { quiz.held.drone = true; droneStop(); }
    if (metro.running) { quiz.held.metro = true; metroStop(); }
    // Paused already: take the pause memo over, or resume would restart them under the mic
    if (state.paused && pauseMemo.drone) { quiz.held.drone = true; pauseMemo.drone = false; }
    if (state.paused && pauseMemo.metro) { quiz.held.metro = true; pauseMemo.metro = false; }
    return;
  }
  // Paused: the resume restarts them through pauseMemo, so only set the memo
  if (quiz.held.drone) { if (state.paused) pauseMemo.drone = true; else if (!drone.running) droneStart(); }
  if (quiz.held.metro) { if (state.paused) pauseMemo.metro = true; else if (!metro.running) metroStart(); }
  quiz.held.drone = quiz.held.metro = false;
}

// PLAY IT: hold the sound, then listen; a denied mic leaves its reason on the prompt
function quizListen() {
  quizHoldSound(true);
  micStart(quizMicNote, quizMicLevel).then(okay => {
    if (!quiz.on || quiz.mode !== 'play') return;
    quiz.micMsg = okay ? '' : micDeniedText();
    // a round showing its answer keeps that feedback until nextRound
    if (!quiz.locked) $('#quiz-prompt').textContent = quizPlayPrompt();
  });
}

// The mic heard a pitch class: show it, then answer like a click; a paused guitar is not an answer
function quizMicNote(chroma) {
  if (state.paused) return;
  $('#quiz-heard').textContent = '🎤 ' + spell(chroma); quizAnswer(chroma);
}

// Live level 0..1 drives the PLAY IT bars (CSS --lvl); RMS 0.125 is already full
function quizMicLevel(level) { $('#quiz-wave').style.setProperty('--lvl', Math.min(1, level * 8).toFixed(2)); }

// Why the mic failed: an insecure page cannot ask for the mic at all
function micDeniedText() {
  if (window.isSecureContext === false) return 'Mic needs https or a local file: open the page on this computer, or pick SEE IT';
  return 'Mic blocked: allow the microphone for this page, or pick SEE IT';
}

// Don't keep the mic open in a hidden tab; coming back takes it again
document.addEventListener('visibilitychange', () => {
  if (!quiz.on || quiz.mode !== 'play') return;
  if (document.hidden) micStop(); else quizListen();
});
