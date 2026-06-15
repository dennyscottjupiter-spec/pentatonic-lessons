// ============================================================
// PENTATONIC ARCADE — all 12 keys, 4 themes, help, practice,
// Karplus-Strong audio, Lick Attack game
// ============================================================

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const PENT_OFFSETS = [0, 3, 5, 7, 10]; // minor pentatonic intervals (semitones from root)

// Strings: index 0 = high e (top of display), 5 = low E (bottom)
const STRINGS = [
  { name: 'e', midi: 64, thick: false }, // high E
  { name: 'B', midi: 59, thick: false },
  { name: 'G', midi: 55, thick: false },
  { name: 'D', midi: 50, thick: true  },
  { name: 'A', midi: 45, thick: true  },
  { name: 'E', midi: 40, thick: true  }, // low E
];

const TOTAL_FRETS = 17;

// Am-anchored box positions (fret ranges per string, high e → low E)
const BOXES = {
  1: { e:[5,8],  B:[5,8],  G:[5,7],  D:[5,7],  A:[5,7],  E:[5,8]  },
  2: { e:[8,10], B:[8,10], G:[7,9],  D:[7,10], A:[7,10], E:[8,10] },
  3: { e:[10,12],B:[10,13],G:[9,12], D:[10,12],A:[10,12],E:[10,12] },
  4: { e:[12,15],B:[13,15],G:[12,14],D:[12,14],A:[12,15],E:[12,15] },
  5: { e:[15,17],B:[15,17],G:[14,17],D:[14,17],A:[15,17],E:[15,17] },
};

// ── All 12 keys (ordered from Am, offset = semitones from A) ──
const KEYS = [
  { minor:'Am',  major:'C',  chroma:9,  offset:0  },
  { minor:'A#m', major:'C#', chroma:10, offset:1  },
  { minor:'Bm',  major:'D',  chroma:11, offset:2  },
  { minor:'Cm',  major:'Eb', chroma:0,  offset:3  },
  { minor:'C#m', major:'E',  chroma:1,  offset:4  },
  { minor:'Dm',  major:'F',  chroma:2,  offset:5  },
  { minor:'D#m', major:'F#', chroma:3,  offset:6  },
  { minor:'Em',  major:'G',  chroma:4,  offset:7  },
  { minor:'Fm',  major:'Ab', chroma:5,  offset:8  },
  { minor:'F#m', major:'A',  chroma:6,  offset:9  },
  { minor:'Gm',  major:'Bb', chroma:7,  offset:10 },
  { minor:'G#m', major:'B',  chroma:8,  offset:11 },
];

// ── Lick Attack data — all frets relative to Am anchor ──
// Steps: s = string index (0=high e, 5=low E), f = fret for Am
const LICKS = {
  1: [
    { name:'Classic Descend',   steps:[{s:0,f:8},{s:0,f:5},{s:1,f:8},{s:1,f:5}] },
    { name:'Root Bounce',       steps:[{s:1,f:5},{s:2,f:7},{s:2,f:5},{s:3,f:7}] },
    { name:'E String Climb',    steps:[{s:5,f:5},{s:4,f:5},{s:4,f:7},{s:3,f:5},{s:3,f:7},{s:2,f:5}] },
  ],
  2: [
    { name:'VII Descend',       steps:[{s:0,f:10},{s:0,f:8},{s:1,f:10},{s:1,f:8}] },
    { name:'Cross Box',         steps:[{s:2,f:9},{s:2,f:7},{s:3,f:10},{s:3,f:7}] },
    { name:'Low String Run',    steps:[{s:5,f:10},{s:4,f:10},{s:4,f:7},{s:3,f:7},{s:2,f:9}] },
  ],
  3: [
    { name:'IX Roller',         steps:[{s:0,f:12},{s:0,f:10},{s:1,f:13},{s:1,f:10}] },
    { name:'Mid Climb',         steps:[{s:2,f:9},{s:2,f:12},{s:3,f:10},{s:3,f:12}] },
    { name:'Low Drive',         steps:[{s:5,f:10},{s:4,f:10},{s:4,f:12},{s:3,f:12},{s:2,f:12}] },
  ],
  4: [
    { name:'XII Slide',         steps:[{s:0,f:15},{s:0,f:12},{s:1,f:15},{s:1,f:13}] },
    { name:'High Zone',         steps:[{s:2,f:12},{s:2,f:14},{s:3,f:12},{s:3,f:14}] },
    { name:'High Climb',        steps:[{s:4,f:12},{s:4,f:15},{s:5,f:12},{s:5,f:15}] },
  ],
  5: [
    { name:'Top End Run',       steps:[{s:0,f:17},{s:0,f:15},{s:1,f:17},{s:1,f:15}] },
    { name:'Neck Climb',        steps:[{s:2,f:14},{s:2,f:17},{s:3,f:14},{s:3,f:17}] },
    { name:'Full Box 5',        steps:[{s:5,f:15},{s:4,f:15},{s:4,f:17},{s:3,f:14},{s:2,f:14}] },
  ],
};

// Game XP constants
const GAME = { XP_PER_LICK: 100, STREAK_MAX_MULT: 3, XP_PER_LEVEL: 500 };

// ── Apply saved theme before anything else (avoids CRT flash) ──
(function applyThemeEarly() {
  try {
    const t = localStorage.getItem('pent-theme');
    if (t && t !== 'crt') document.body.classList.add('theme-' + t);
  } catch(e) {}
})();

// ---------- State ----------
const state = {
  keyIdx:  0,        // index into KEYS (0 = Am/C)
  lens:    'minor',  // 'minor' | 'major'
  box:     '1',
  labels:  true,
  sound:   true,
  score:   0,
  theme:   'crt',
  // game
  mode:         'explore', // 'explore' | 'game'
  gameLevel:    1,
  gameLevelXP:  0,
  gameStreak:   0,
  gameLives:    3,
  gameScore:    0,
  highScore:    0,
  gameLickIdx:  0,
  gameInputStep:0,
  gamePhase:    'idle', // 'idle' | 'show' | 'input' | 'done'
  exploreSavedBox: '1',
  // computed from keyIdx (updated by setKey)
  scaleNotes:   new Set(['A','C','D','E','G']),
  activeBoxes:  null, // computed by setKey
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------- Music helpers ----------
function midiToName(midi) { return NOTE_NAMES[((midi % 12) + 12) % 12]; }
function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
function fretMidi(stringIdx, fret) { return STRINGS[stringIdx].midi + fret; }

function computeScaleNotes(keyIdx) {
  const root = KEYS[keyIdx].chroma;
  return new Set(PENT_OFFSETS.map(o => NOTE_NAMES[(root + o) % 12]));
}

// Shift Am-anchored box fret ranges by offset; octave-adjust to stay 0-17
function computeActiveBoxes(keyIdx) {
  const offset = KEYS[keyIdx].offset;
  if (offset === 0) return BOXES;
  const result = {};
  for (const pos in BOXES) {
    result[pos] = {};
    for (const strName in BOXES[pos]) {
      let [lo, hi] = BOXES[pos][strName];
      lo += offset; hi += offset;
      while (hi > TOTAL_FRETS) { lo -= 12; hi -= 12; }
      while (lo < 0) { lo += 12; hi += 12; }
      result[pos][strName] = [lo, hi];
    }
  }
  return result;
}

function setKey(keyIdx) {
  state.keyIdx = keyIdx;
  state.scaleNotes = computeScaleNotes(keyIdx);
  state.activeBoxes = computeActiveBoxes(keyIdx);
  // Update level-card title
  const k = KEYS[keyIdx];
  const root = state.lens === 'minor' ? k.minor : (k.major + ' MAJ');
  $('#level-title').textContent = `${k.minor.replace('m','')} MINOR / ${k.major} MAJOR PENTATONIC`;
}

function isInScale(noteName) { return state.scaleNotes.has(noteName); }

function isRoot(noteName) {
  const k = KEYS[state.keyIdx];
  if (state.lens === 'minor') return noteName === NOTE_NAMES[k.chroma];
  return noteName === NOTE_NAMES[(k.chroma + 3) % 12]; // relative major root
}

function isInBox(stringName, fret) {
  if (state.box === 'all') return true;
  const boxes = state.activeBoxes || BOXES;
  const box = boxes[state.box];
  if (!box) return true;
  const [lo, hi] = box[stringName];
  return fret >= lo && fret <= hi;
}

// Transpose an Am-anchor fret to the current key (same octave-adjust logic)
function transposeFret(f, keyOffset) {
  let tf = f + keyOffset;
  while (tf > TOTAL_FRETS) tf -= 12;
  while (tf < 0) tf += 12;
  return tf;
}

// ---------- Audio ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

const karplusCache = new Map();
function buildKarplusBuffer(ctx, freq) {
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const totalSamples = Math.round(sr * 1.5);
  const buf = ctx.createBuffer(1, totalSamples, sr);
  const out = buf.getChannelData(0);
  const delay = new Float32Array(N);
  for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;
  for (let i = 0, ptr = 0; i < totalSamples; i++) {
    out[i] = delay[ptr];
    delay[ptr] = 0.498 * (delay[ptr] + delay[(ptr + 1) % N]);
    ptr = (ptr + 1) % N;
  }
  return buf;
}

function playNote(midi, duration = 0.9) {
  if (!state.sound) return;
  const ctx = ensureAudio();
  if (!karplusCache.has(midi)) {
    karplusCache.set(midi, buildKarplusBuffer(ctx, midiToFreq(midi)));
  }
  const src = ctx.createBufferSource();
  src.buffer = karplusCache.get(midi);
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(1, now);
  gain.gain.setValueAtTime(1, now + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.05);
  src.connect(gain).connect(ctx.destination);
  src.start(now);
  src.stop(now + duration + 0.15);
}

function playBuzz() {
  const ctx = ensureAudio();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 80;
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g).connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);
}

function playFanfare() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  [60, 64, 67, 72].forEach((midi, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToFreq(midi);
    const t = now + i * 0.12;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.6);
  });
}

// ---------- Fretboard render ----------
const FB = { pad:{ left:44, top:14, right:14, bottom:24 }, fretW:50, stringH:30 };

function buildFretboard() {
  const root = $('#fretboard');
  const w = FB.pad.left + FB.fretW * (TOTAL_FRETS + 1) + FB.pad.right;
  const h = FB.pad.top + FB.stringH * STRINGS.length + FB.pad.bottom;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'fb-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Inlay markers
  [3,5,7,9,15].forEach(f => {
    const cx = fretCenterX(f);
    const cy = FB.pad.top + (FB.stringH * STRINGS.length) / 2;
    svg.appendChild(mkSvg('circle', { cx, cy, r:7, class:'fb-marker' }));
  });
  [12].forEach(f => {
    const cx = fretCenterX(f);
    svg.appendChild(mkSvg('circle', { cx, cy: FB.pad.top + FB.stringH * STRINGS.length * 0.32, r:7, class:'fb-marker' }));
    svg.appendChild(mkSvg('circle', { cx, cy: FB.pad.top + FB.stringH * STRINGS.length * 0.68, r:7, class:'fb-marker' }));
  });

  // Fret lines
  for (let f = 0; f <= TOTAL_FRETS + 1; f++) {
    const x = FB.pad.left + f * FB.fretW;
    svg.appendChild(mkSvg('line', {
      x1:x, y1:FB.pad.top - 2, x2:x, y2:FB.pad.top + STRINGS.length * FB.stringH + 2,
      class: f === 0 ? 'fb-fret-line nut' : 'fb-fret-line',
    }));
  }

  // Strings + labels
  STRINGS.forEach((s, i) => {
    const y = FB.pad.top + i * FB.stringH + FB.stringH / 2;
    svg.appendChild(mkSvg('line', {
      x1:FB.pad.left, y1:y, x2:FB.pad.left + (TOTAL_FRETS + 1) * FB.fretW, y2:y,
      class:'fb-string' + (s.thick ? ' thick' : ''),
    }));
    const label = mkSvg('text', { x:FB.pad.left - 8, y:y + 4, class:'fb-stringlabel' });
    label.textContent = s.name;
    svg.appendChild(label);
  });

  // Fret numbers
  for (let f = 1; f <= TOTAL_FRETS; f++) {
    const t = mkSvg('text', { x:fretCenterX(f), y:FB.pad.top + STRINGS.length * FB.stringH + 16, class:'fb-fretnum' });
    t.textContent = f;
    svg.appendChild(t);
  }

  // Notes
  STRINGS.forEach((s, si) => {
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const midi = fretMidi(si, f);
      const noteName = midiToName(midi);
      const cx = f === 0 ? FB.pad.left - 22 : fretCenterX(f);
      const cy = FB.pad.top + si * FB.stringH + FB.stringH / 2;
      const g = mkSvg('g', { class:'fb-note', 'data-string':si, 'data-fret':f, 'data-note':noteName, 'data-midi':midi });
      g.appendChild(mkSvg('circle', { cx, cy, r:12 }));
      const t = mkSvg('text', { x:cx, y:cy + 3 });
      t.textContent = noteName;
      g.appendChild(t);
      g.addEventListener('click', onNoteClick);
      svg.appendChild(g);
    }
  });

  root.innerHTML = '';
  root.appendChild(svg);
}

function fretCenterX(f) {
  if (f === 0) return FB.pad.left - 22;
  return FB.pad.left + (f - 0.5) * FB.fretW;
}
function mkSvg(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ---------- Note state refresh ----------
function refreshNotes() {
  $$('#fretboard .fb-note').forEach(g => {
    const noteName = g.dataset.note;
    const si = +g.dataset.string;
    const f = +g.dataset.fret;
    const inScale = isInScale(noteName);
    const root = isRoot(noteName);
    const stringName = STRINGS[si].name;
    const inBox = isInBox(stringName, f);

    g.classList.remove('in-scale','root','out','dimmed');

    if (!inScale) {
      g.classList.add('out');
      if (state.box !== 'all') g.classList.add('dimmed');
    } else {
      if (!inBox) {
        g.classList.add('in-scale','dimmed');
        if (root) g.classList.add('root');
      } else {
        g.classList.add(root ? 'root' : 'in-scale');
      }
    }

    const text = g.querySelector('text');
    text.style.display = state.labels ? '' : 'none';
  });
}

// ---------- Interactions ----------
let playGen = 0; // incremented on every mode/sequence change to kill stale timeouts

function onNoteClick(e) {
  const g = e.currentTarget;
  const midi = +g.dataset.midi;
  const note = g.dataset.note;

  if (state.mode === 'game' && state.gamePhase === 'input') {
    onGameNoteClick(g);
    return;
  }

  // Explore mode
  playNote(midi);
  flashNote(g);
  $('#last-note').textContent = `${note} (str ${STRINGS[+g.dataset.string].name}, fret ${g.dataset.fret})`;
  state.score += isInScale(note) ? (isRoot(note) ? 25 : 10) : 1;
  updateScore();
}

function flashNote(g, cls = 'playing') {
  g.classList.add(cls);
  setTimeout(() => g.classList.remove(cls), 200);
}

function updateScore() {
  const scoreEl = $('#score');
  if (state.mode === 'game') {
    scoreEl.textContent = String(state.gameScore).padStart(4, '0');
  } else {
    scoreEl.textContent = String(state.score).padStart(4, '0');
  }
}

// ---------- Play scale (ascending, with generation guard) ----------
function playCurrentScale() {
  ensureAudio();
  const gen = ++playGen;
  const notes = [];
  $$('#fretboard .fb-note').forEach(g => {
    if (!g.classList.contains('dimmed') &&
        (g.classList.contains('in-scale') || g.classList.contains('root'))) {
      const f = +g.dataset.fret;
      if (f === 0 && state.box !== 'all') return;
      notes.push({ el:g, midi:+g.dataset.midi });
    }
  });
  notes.sort((a, b) => a.midi - b.midi);
  notes.forEach((n, i) => {
    setTimeout(() => {
      if (playGen !== gen) return;
      playNote(n.midi, 0.5);
      flashNote(n.el);
    }, i * 240);
  });
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.body.classList.remove('theme-hawaii','theme-space','theme-vsc');
  if (theme !== 'crt') document.body.classList.add('theme-' + theme);
  state.theme = theme;
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  try { localStorage.setItem('pent-theme', theme); } catch(e) {}
}

// ---------- Help modal ----------
function toggleHelp() {
  const m = $('#help-modal');
  m.classList.toggle('hidden');
}
function closeHelp() { $('#help-modal').classList.add('hidden'); }

// ---------- Practice modal ----------
function togglePractice() {
  const m = $('#practice-modal');
  m.classList.toggle('hidden');
}
function closePractice() { $('#practice-modal').classList.add('hidden'); }

// Render 7-day challenge checkboxes
function renderChallenge() {
  const days = [
    'Solo 5 min over Am backing track (Box 1)',
    'Solo 5 min over Am backing track (Box 2)',
    'Solo 5 min — connect Box 1 + 2',
    'Solo 5 min (Box 3 — fret IX)',
    'Solo 5 min — boxes 1, 2, 3 in sequence',
    'Try a new key (Em or Dm)',
    'Free 10-min jam — all boxes, any key!',
  ];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('pent-challenge') || '{}'); } catch(e) {}

  const container = $('#challenge-days');
  container.innerHTML = '';
  days.forEach((text, i) => {
    const checked = !!saved[i];
    const div = document.createElement('div');
    div.className = 'day-check' + (checked ? ' done' : '');
    div.innerHTML = `<input type="checkbox" id="day${i}" ${checked ? 'checked' : ''} />
      <label for="day${i}">Day ${i+1}: ${text}</label>`;
    div.querySelector('input').addEventListener('change', function() {
      saved[i] = this.checked;
      div.classList.toggle('done', this.checked);
      try { localStorage.setItem('pent-challenge', JSON.stringify(saved)); } catch(e) {}
    });
    container.appendChild(div);
  });
}

// ---------- Metronome ----------
const metro = { bpm:80, running:false, nextBeat:0, beatCount:0, timerId:null };

function metroBeat(ctx, time, isAccent) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = isAccent ? 1000 : 700;
  osc.connect(g).connect(ctx.destination);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(isAccent ? 0.4 : 0.2, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.start(time); osc.stop(time + 0.08);
  // Visual beat indicator
  const delay = Math.max(0, (time - ctx.currentTime) * 1000);
  setTimeout(() => {
    const el = $('#metro-beat-indicator');
    if (!el) return;
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 60);
  }, delay);
}

function metroSchedule(ctx) {
  while (metro.nextBeat < ctx.currentTime + 0.12) {
    metroBeat(ctx, metro.nextBeat, metro.beatCount % 4 === 0);
    metro.nextBeat += 60 / metro.bpm;
    metro.beatCount++;
  }
  metro.timerId = setTimeout(() => { if (metro.running) metroSchedule(ctx); }, 25);
}

function metroStart() {
  const ctx = ensureAudio();
  metro.nextBeat = ctx.currentTime + 0.05;
  metro.beatCount = 0;
  metro.running = true;
  $('#metro-start').textContent = '■ STOP';
  metroSchedule(ctx);
}

function metroStop() {
  metro.running = false;
  clearTimeout(metro.timerId);
  $('#metro-start').textContent = '▶ START';
}

// ---------- Practice timer ----------
const timer = { remaining:300, running:false, intervalId:null };

function timerChime() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.25;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 2);
  });
}

function updateTimerDisplay() {
  const m = Math.floor(timer.remaining / 60);
  const s = timer.remaining % 60;
  $('#timer-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function timerStart() {
  if (timer.remaining <= 0) return;
  timer.running = true;
  $('#timer-toggle').textContent = '■ PAUSE';
  timer.intervalId = setInterval(() => {
    timer.remaining--;
    updateTimerDisplay();
    if (timer.remaining <= 0) {
      timerStop();
      timerChime();
      $('#timer-toggle').textContent = '▶ START';
    }
  }, 1000);
}

function timerStop() {
  timer.running = false;
  clearInterval(timer.intervalId);
  $('#timer-toggle').textContent = '▶ START';
}

function timerReset(minutes) {
  timerStop();
  timer.remaining = (minutes || Math.ceil(timer.remaining / 60) || 5) * 60;
  updateTimerDisplay();
}

// ---------- Boot validator for LICKS ----------
(function validateLicks() {
  const amNotes = new Set(['A','C','D','E','G']);
  for (const pos in LICKS) {
    LICKS[pos].forEach(lick => {
      lick.steps.forEach(({ s, f }) => {
        const note = midiToName(fretMidi(s, f));
        if (!amNotes.has(note)) {
          console.error(`LICK VALIDATOR: "${lick.name}" step (s=${s},f=${f}) note ${note} not in Am pentatonic`);
        }
        const box = BOXES[pos];
        const strName = STRINGS[s].name;
        const [lo, hi] = box[strName];
        if (f < lo || f > hi) {
          console.error(`LICK VALIDATOR: "${lick.name}" step (s=${s},f=${f}) out of Box ${pos} range [${lo},${hi}] on ${strName}`);
        }
      });
    });
  }
})();

// ---------- Game engine ----------
function pickLick(level, keyOffset) {
  const licks = LICKS[level];
  // Find licks that stay on-board after transposition
  const eligible = licks.filter(lick =>
    lick.steps.every(({ f }) => {
      let tf = f + keyOffset;
      while (tf > TOTAL_FRETS) tf -= 12;
      while (tf < 0) tf += 12;
      return tf >= 0 && tf <= TOTAL_FRETS;
    })
  );
  const pool = eligible.length > 0 ? eligible : licks;
  const idx = state.gameLickIdx % pool.length;
  state.gameLickIdx++;
  return pool[idx];
}

function getFretEl(s, f) {
  return document.querySelector(`.fb-note[data-string="${s}"][data-fret="${f}"]`);
}

function showGamePhase() {
  const keyOffset = KEYS[state.keyIdx].offset;
  const lick = pickLick(state.gameLevel, keyOffset);
  state.currentLick = lick;
  state.gameInputStep = 0;
  state.gamePhase = 'show';
  updateGamePanel('👀 WATCH...');
  const gen = ++playGen;
  const STEP_MS = 420;
  lick.steps.forEach(({ s, f }, i) => {
    setTimeout(() => {
      if (playGen !== gen) return;
      const tf = transposeFret(f, keyOffset);
      playNote(fretMidi(s, tf), 0.5);
      const g = getFretEl(s, tf);
      if (g) flashNote(g);
    }, i * STEP_MS);
  });
  setTimeout(() => {
    if (playGen !== gen) return;
    state.gamePhase = 'input';
    updateGamePanel('🎸 YOUR TURN!');
  }, lick.steps.length * STEP_MS + 250);
}

function onGameNoteClick(g) {
  const si = +g.dataset.string;
  const fret = +g.dataset.fret;
  const lick = state.currentLick;
  const keyOffset = KEYS[state.keyIdx].offset;
  const expected = lick.steps[state.gameInputStep];
  const expFret = transposeFret(expected.f, keyOffset);

  if (si === expected.s && fret === expFret) {
    playNote(+g.dataset.midi, 0.4);
    flashNote(g, 'correct');
    state.gameInputStep++;
    if (state.gameInputStep >= lick.steps.length) {
      lickComplete();
    }
  } else {
    playBuzz();
    flashNote(g, 'wrong');
    state.gameLives--;
    state.gameStreak = 0;
    updateGamePanel('✗ WRONG — WATCH AGAIN');
    updateGameHUD();
    setTimeout(() => {
      if (state.gamePhase === 'input') {
        state.gameLives = Math.max(state.gameLives, 0) || 3;
        state.gameLives = 3; // reset lives, infinite continues
        updateGameHUD();
        showGamePhase();
      }
    }, 800);
  }
}

function lickComplete() {
  state.gameStreak++;
  const mult = Math.min(state.gameStreak, GAME.STREAK_MAX_MULT);
  const xp = GAME.XP_PER_LICK * mult;
  state.gameScore += xp;
  state.gameLevelXP += xp;
  state.highScore = Math.max(state.highScore, state.gameScore);
  updateScore();
  updateGameHUD();
  playFanfare();

  if (state.gameLevelXP >= GAME.XP_PER_LEVEL) {
    state.gameLevelXP = 0;
    state.gameLevel++;
    saveGame();
    if (state.gameLevel > 5) {
      showWinScreen();
    } else {
      state.box = String(state.gameLevel);
      refreshNotes();
      updateGamePanel(`⬆️ LEVEL UP! BOX ${state.gameLevel}`);
      setTimeout(() => showGamePhase(), 1800);
    }
  } else {
    saveGame();
    updateGamePanel(`✓ +${xp} XP  ×${mult} STREAK`);
    setTimeout(() => showGamePhase(), 1000);
  }
}

function updateGamePanel(status) {
  if (status) $('#game-status').textContent = status;
  updateGameHUD();
}

function updateGameHUD() {
  $('#game-level').textContent = state.gameLevel;
  const mult = Math.min(state.gameStreak, GAME.STREAK_MAX_MULT);
  $('#game-streak').textContent = `×${mult || 1}`;
  $('#game-lives').textContent = '♥'.repeat(Math.max(0, state.gameLives));
  $('#game-level-xp').textContent = `${state.gameLevelXP}/${GAME.XP_PER_LEVEL}`;
}

function showWinScreen() {
  state.gamePhase = 'done';
  ++playGen;
  $('#win-score').textContent = `FINAL SCORE: ${state.gameScore}`;
  $('#win-screen').classList.add('visible');
}

function enterGame() {
  state.exploreSavedBox = state.box;
  state.mode = 'game';
  state.gameLevel = Math.max(1, state.gameLevel);
  state.box = String(state.gameLevel);
  state.gameLives = 3;
  $('#game-panel').classList.add('visible');
  $('#game-toggle').textContent = '◀ EXPLORE';
  $$('.box, .lens, [id="key-row"] .arc-btn').forEach(b => b.disabled = true);
  refreshNotes();
  updateScore();
  updateGameHUD();
  // load persisted high score into HUD
  $('#highscore-label').style.display = '';
  $('#highscore').style.display = '';
  $('#highscore').textContent = String(state.highScore).padStart(4, '0');
  showGamePhase();
}

function exitGame() {
  ++playGen;
  state.mode = 'explore';
  state.gamePhase = 'idle';
  state.box = state.exploreSavedBox;
  $('#game-panel').classList.remove('visible');
  $('#game-toggle').textContent = '▶ START GAME';
  $$('.box, .lens, [id="key-row"] .arc-btn').forEach(b => b.disabled = false);
  // restore explore box button active state
  $$('.box').forEach(b => b.classList.toggle('active', b.dataset.box === state.box));
  refreshNotes();
  updateScore();
}

// ---------- Persistence ----------
function saveGame() {
  try {
    localStorage.setItem('pent-game', JSON.stringify({
      level: state.gameLevel,
      xp: state.gameScore,
      levelXP: state.gameLevelXP,
      highScore: state.highScore,
    }));
  } catch(e) {}
}

function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem('pent-game') || '{}');
    if (d.level)     state.gameLevel    = Math.min(5, Math.max(1, d.level));
    if (d.xp)        state.gameScore    = d.xp;
    if (d.levelXP)   state.gameLevelXP  = d.levelXP;
    if (d.highScore) {
      state.highScore = d.highScore;
      $('#highscore-label').style.display = '';
      $('#highscore').style.display = '';
      $('#highscore').textContent = String(state.highScore).padStart(4, '0');
    }
  } catch(e) {}
}

// ---------- Wire controls ----------
function wireControls() {
  // Theme switcher
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
  // Restore saved theme (already applied by early IIFE; sync button state)
  try {
    const t = localStorage.getItem('pent-theme') || 'crt';
    state.theme = t;
    $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
  } catch(e) {}

  // Key selector (rendered from JS)
  const keyRow = $('#key-row');
  KEYS.forEach((k, i) => {
    const btn = document.createElement('button');
    btn.className = 'arc-btn key' + (i === 0 ? ' active' : '');
    btn.dataset.keyIdx = i;
    btn.textContent = k.minor.replace('m','');
    btn.addEventListener('click', () => {
      $$('.key').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      setKey(i);
      refreshNotes();
    });
    keyRow.appendChild(btn);
  });

  // Lens
  $$('.lens').forEach(b => b.addEventListener('click', () => {
    $$('.lens').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.lens = b.dataset.lens;
    refreshNotes();
  }));

  // Box
  $$('.box').forEach(b => b.addEventListener('click', () => {
    $$('.box').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.box = b.dataset.box;
    refreshNotes();
  }));

  // Toggle options
  $$('.toggle').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.toggle;
    state[key] = !state[key];
    b.classList.toggle('active', state[key]);
    if (key === 'labels') refreshNotes();
  }));

  $('#play-scale').addEventListener('click', playCurrentScale);

  // Game toggle
  $('#game-toggle').addEventListener('click', () => {
    if (state.mode === 'game') exitGame(); else enterGame();
  });

  // Help modal
  $('#help-btn').addEventListener('click', toggleHelp);
  $('#help-close').addEventListener('click', closeHelp);
  $('#help-modal').addEventListener('click', e => { if (e.target === $('#help-modal')) closeHelp(); });

  // Practice modal
  $('#practice-btn').addEventListener('click', () => { renderChallenge(); togglePractice(); });
  $('#practice-close').addEventListener('click', closePractice);
  $('#practice-modal').addEventListener('click', e => { if (e.target === $('#practice-modal')) closePractice(); });

  // Metronome controls
  const slider = $('#metro-slider');
  const bpmInput = $('#metro-bpm');
  slider.addEventListener('input', () => { metro.bpm = +slider.value; bpmInput.value = slider.value; });
  bpmInput.addEventListener('input', () => {
    const v = Math.max(40, Math.min(240, +bpmInput.value || 80));
    metro.bpm = v; slider.value = v;
  });
  $('#metro-start').addEventListener('click', () => {
    ensureAudio();
    if (metro.running) metroStop(); else metroStart();
  });

  // Timer controls
  $('#timer-5').addEventListener('click', () => { timerReset(5); });
  $('#timer-10').addEventListener('click', () => { timerReset(10); });
  $('#timer-toggle').addEventListener('click', () => {
    ensureAudio();
    if (timer.running) timerStop(); else timerStart();
  });
  $('#timer-reset').addEventListener('click', () => timerReset());

  // Win screen close
  $('#win-close').addEventListener('click', () => {
    $('#win-screen').classList.remove('visible');
    state.gameLevel = 1;
    state.gameScore = 0;
    state.gameLevelXP = 0;
    state.gameStreak = 0;
    exitGame();
  });

  // ── Global keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    // Ignore when typing in an input
    if (e.target.matches('input, textarea, select')) return;

    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      closePractice();
      toggleHelp();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      closeHelp();
      renderChallenge();
      togglePractice();
      return;
    }
    if (e.key === 'Escape') {
      closeHelp();
      closePractice();
      return;
    }
    if (e.key >= '1' && e.key <= '5') {
      const btn = document.querySelector(`.box[data-box="${e.key}"]`);
      if (btn && !btn.disabled) btn.click();
      return;
    }
    if (e.key === '0') {
      const btn = document.querySelector('.box[data-box="all"]');
      if (btn && !btn.disabled) btn.click();
      return;
    }
  });
}

// ---------- Boot ----------
setKey(0); // initialise Am state
buildFretboard();
refreshNotes();
wireControls();
loadGame();
updateScore();
updateTimerDisplay();
