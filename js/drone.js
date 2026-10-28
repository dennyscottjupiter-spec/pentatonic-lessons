// ---
// purpose: Root drone: sustained root + fifth of the current key, toggled from the HUD chip
// exports: drone, droneMidi, droneStart, droneStop, droneRetune, toggleDrone, syncDroneUi
// depends: data.js (KEYS), audio.js (ensureAudio, midiToFreq), engine.js (spell), app.js (state), player.js (pauseMemo, updatePlayingFlag)
// gotcha: toggleDrone clears pauseMemo.drone so a manual toggle beats a stale pause memo
// ---

const drone = { running:false, oscs:null, gain:null };

// Root in octave 2 (E2 = 40, so A = 45, C = 48)
function droneMidi() {
  return 40 + ((KEYS[state.keyIdx].chroma - 4 + 12) % 12);
}

// Triangle root + triangle fifth + detuned saw, low-passed and faded in
function droneStart() {
  if (!state.sound || drone.running) return;
  const ctx = ensureAudio(), now = ctx.currentTime, m = droneMidi();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.6);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 0.7;
  filter.connect(gain).connect(ctx.destination);

  const root = ctx.createOscillator(), fifth = ctx.createOscillator(), saw = ctx.createOscillator();
  root.type = 'triangle';  root.frequency.value = midiToFreq(m);
  fifth.type = 'triangle'; fifth.frequency.value = midiToFreq(m + 7);
  saw.type = 'sawtooth';   saw.frequency.value = midiToFreq(m); saw.detune.value = 6;
  const fifthGain = ctx.createGain(); fifthGain.gain.value = 0.6;
  const sawGain   = ctx.createGain(); sawGain.gain.value = 0.25;
  root.connect(filter);
  fifth.connect(fifthGain).connect(filter);
  saw.connect(sawGain).connect(filter);

  const oscs = [root, fifth, saw];
  oscs.forEach(o => o.start(now));
  Object.assign(drone, { running: true, oscs, gain });
  syncDroneUi();
  if (typeof updatePlayingFlag === 'function') updatePlayingFlag();
}

function droneStop() {
  if (!drone.running) return;
  const now = drone.gain.context.currentTime;
  // Cancel first: a stop inside the 0.6 s fade-in would otherwise ramp back up
  drone.gain.gain.cancelScheduledValues(now);
  drone.gain.gain.setTargetAtTime(0, now, 0.08);
  drone.oscs.forEach(o => o.stop(now + 0.4));
  Object.assign(drone, { running: false, oscs: null, gain: null });
  syncDroneUi();
  if (typeof updatePlayingFlag === 'function') updatePlayingFlag();
}

// Glides the sounding pitches to the current key without a restart
function droneRetune() {
  if (drone.running) {
    const now = drone.gain.context.currentTime, m = droneMidi();
    const [root, fifth, saw] = drone.oscs;
    root.frequency.setTargetAtTime(midiToFreq(m), now, 0.05);
    fifth.frequency.setTargetAtTime(midiToFreq(m + 7), now, 0.05);
    saw.frequency.setTargetAtTime(midiToFreq(m), now, 0.05);
  }
  syncDroneUi();
}

function toggleDrone() {
  pauseMemo.drone = false; // a manual toggle must not be undone by resume
  if (drone.running) droneStop(); else droneStart();
}

// Shows drone state, key and lens on the chip; no-op where the chip is absent (tests)
function syncDroneUi() {
  const btn = document.getElementById('drone-btn'), key = document.getElementById('drone-key'), lens = document.getElementById('drone-lens');
  if (!btn || !key || !lens) return;
  btn.setAttribute('aria-pressed', String(drone.running));
  document.body.classList.toggle('drone-on', drone.running);
  key.textContent  = spell(KEYS[state.keyIdx].chroma);
  lens.textContent = state.lens === 'minor' ? 'min' : 'maj';
  btn.disabled     = !state.sound;   // a silent click would look broken
  btn.dataset.tip  = !state.sound ? 'Sound is off' : (drone.running ? 'Stop drone' : 'Root drone') + ' · D';
  btn.setAttribute('aria-label', `Root drone, ${key.textContent} ${state.lens}`);
}
