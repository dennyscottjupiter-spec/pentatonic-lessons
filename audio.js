// audio.js — Web Audio engine (Karplus-Strong, sound FX, metronome, timer)
// Depends on: data.js (GAME)

let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

const karplusCache = new Map();
function buildKarplusBuffer(ctx, freq) {
  const sr = ctx.sampleRate;
  const N  = Math.max(2, Math.round(sr / freq));
  const total = Math.round(sr * 1.5);
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);
  const delay = new Float32Array(N);
  for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;
  for (let i = 0, ptr = 0; i < total; i++) {
    out[i] = delay[ptr];
    delay[ptr] = 0.498 * (delay[ptr] + delay[(ptr + 1) % N]);
    ptr = (ptr + 1) % N;
  }
  return buf;
}

function playNote(midi, duration = 0.9) {
  if (!state.sound) return;
  const ctx = ensureAudio();
  if (!karplusCache.has(midi)) karplusCache.set(midi, buildKarplusBuffer(ctx, midiToFreq(midi)));
  const src  = ctx.createBufferSource();
  src.buffer = karplusCache.get(midi);
  const gain = ctx.createGain();
  const now  = ctx.currentTime;
  gain.gain.setValueAtTime(1, now);
  gain.gain.setValueAtTime(1, now + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.05);
  src.connect(gain).connect(ctx.destination);
  src.start(now); src.stop(now + duration + 0.15);
}

function playBuzz() {
  const ctx = ensureAudio();
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = 80;
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g).connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);
}

function playFanfare() {
  const ctx = ensureAudio(), now = ctx.currentTime;
  [60,64,67,72].forEach((midi, i) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = midiToFreq(midi);
    const t = now + i * 0.12;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.6);
  });
}

// ---------- Metronome ----------
const metro = {bpm:80, running:false, nextBeat:0, beatCount:0, timerId:null};

function metroBeat(ctx, time, isAccent) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.frequency.value = isAccent ? 1000 : 700;
  osc.connect(g).connect(ctx.destination);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(isAccent ? 0.4 : 0.2, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.start(time); osc.stop(time + 0.08);
  const delay = Math.max(0, (time - ctx.currentTime) * 1000);
  setTimeout(() => {
    const el = document.getElementById('metro-beat-indicator'); if (!el) return;
    el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 60);
  }, delay);
}

function metroSchedule(ctx) {
  while (metro.nextBeat < ctx.currentTime + 0.12) {
    metroBeat(ctx, metro.nextBeat, metro.beatCount % 4 === 0);
    metro.nextBeat += 60 / metro.bpm; metro.beatCount++;
  }
  metro.timerId = setTimeout(() => { if (metro.running) metroSchedule(ctx); }, 25);
}

function metroStart() {
  const ctx = ensureAudio();
  metro.nextBeat = ctx.currentTime + 0.05; metro.beatCount = 0; metro.running = true;
  document.getElementById('metro-start').textContent = '■ STOP';
  metroSchedule(ctx);
}
function metroStop() {
  metro.running = false; clearTimeout(metro.timerId);
  document.getElementById('metro-start').textContent = '▶ START';
}

// ---------- Practice timer ----------
const timer = {remaining:300, running:false, intervalId:null};

function timerChime() {
  const ctx = ensureAudio(), now = ctx.currentTime;
  [523,659,784].forEach((freq,i) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    const t = now + i * 0.25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t+1.8);
    osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t+2);
  });
}

function updateTimerDisplay() {
  const m = Math.floor(timer.remaining/60), s = timer.remaining%60;
  document.getElementById('timer-display').textContent =
    `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function timerStart() {
  if (timer.remaining <= 0) return;
  timer.running = true;
  document.getElementById('timer-toggle').textContent = '■ PAUSE';
  timer.intervalId = setInterval(() => {
    timer.remaining--;
    updateTimerDisplay();
    if (timer.remaining <= 0) {
      timerStop(); timerChime();
      document.getElementById('timer-toggle').textContent = '▶ START';
    }
  }, 1000);
}
function timerStop() {
  timer.running = false; clearInterval(timer.intervalId);
  document.getElementById('timer-toggle').textContent = '▶ START';
}
function timerReset(minutes) {
  timerStop();
  timer.remaining = (minutes || Math.ceil(timer.remaining/60) || 5) * 60;
  updateTimerDisplay();
}
