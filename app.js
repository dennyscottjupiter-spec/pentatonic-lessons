// ============================================================
// PENTATONIC ARCADE — parallel 12-key model, 4 themes,
// Karplus-Strong audio, Lick Attack game, Practice Lab
// ============================================================

const PENT_OFFSETS  = [0, 3, 5, 7, 10]; // minor pentatonic intervals
const MAJOR_OFFSETS = [0, 2, 4, 7, 9];  // major pentatonic intervals

// Enharmonic spelling — choose by key signature context
const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
// Roots (by chroma) that prefer flat spelling
const FLAT_MINOR_ROOTS = new Set([0, 2, 3, 5, 7, 10]); // Cm Dm Ebm Fm Gm Bbm
const FLAT_MAJOR_ROOTS = new Set([1, 3, 5, 6, 8, 10]);  // Db Eb F  Gb Ab Bb

// Strings: index 0 = high e, 5 = low E
const STRINGS = [
  { name:'e', midi:64, thick:false },
  { name:'B', midi:59, thick:false },
  { name:'G', midi:55, thick:false },
  { name:'D', midi:50, thick:true  },
  { name:'A', midi:45, thick:true  },
  { name:'E', midi:40, thick:true  },
];

const TOTAL_FRETS = 17;

// Am-anchored box positions (fret ranges per string, high e → low E)
const BOXES = {
  1: { e:[5,8],   B:[5,8],   G:[5,7],   D:[5,7],   A:[5,7],   E:[5,8]   },
  2: { e:[8,10],  B:[8,10],  G:[7,9],   D:[7,10],  A:[7,10],  E:[8,10]  },
  3: { e:[10,12], B:[10,13], G:[9,12],  D:[10,12], A:[10,12], E:[10,12] },
  4: { e:[12,15], B:[13,15], G:[12,14], D:[12,14], A:[12,15], E:[12,15] },
  5: { e:[15,17], B:[15,17], G:[14,17], D:[14,17], A:[15,17], E:[15,17] },
};

// 12 root keys — PARALLEL model: MINOR/MAJOR selects THAT root's pentatonic
// Ordered A-first so default (index 0) = Am home base
const KEYS = [
  { name:'A',  chroma:9  },
  { name:'Bb', chroma:10 },
  { name:'B',  chroma:11 },
  { name:'C',  chroma:0  },
  { name:'C#', chroma:1  },
  { name:'D',  chroma:2  },
  { name:'Eb', chroma:3  },
  { name:'E',  chroma:4  },
  { name:'F',  chroma:5  },
  { name:'F#', chroma:6  },
  { name:'G',  chroma:7  },
  { name:'Ab', chroma:8  },
];

// Lick Attack data — Am-anchored frets (s=string idx 0=high e, f=fret)
const LICKS = {
  1: [
    { name:'Classic Descend',  steps:[{s:0,f:8},{s:0,f:5},{s:1,f:8},{s:1,f:5}] },
    { name:'Root Bounce',      steps:[{s:1,f:5},{s:2,f:7},{s:2,f:5},{s:3,f:7}] },
    { name:'E String Climb',   steps:[{s:5,f:5},{s:4,f:5},{s:4,f:7},{s:3,f:5},{s:3,f:7},{s:2,f:5}] },
    { name:'Box 1 Runner',     steps:[{s:0,f:5},{s:0,f:8},{s:1,f:5},{s:1,f:8},{s:2,f:5},{s:2,f:7}] },
  ],
  2: [
    { name:'VII Descend',      steps:[{s:0,f:10},{s:0,f:8},{s:1,f:10},{s:1,f:8}] },
    { name:'Cross Box',        steps:[{s:2,f:9},{s:2,f:7},{s:3,f:10},{s:3,f:7}] },
    { name:'Low String Run',   steps:[{s:5,f:10},{s:4,f:10},{s:4,f:7},{s:3,f:7},{s:2,f:9}] },
    { name:'Box 2 Flow',       steps:[{s:0,f:8},{s:0,f:10},{s:1,f:8},{s:1,f:10},{s:2,f:7},{s:2,f:9},{s:3,f:7}] },
  ],
  3: [
    { name:'IX Roller',        steps:[{s:0,f:12},{s:0,f:10},{s:1,f:13},{s:1,f:10}] },
    { name:'Mid Climb',        steps:[{s:2,f:9},{s:2,f:12},{s:3,f:10},{s:3,f:12}] },
    { name:'Low Drive',        steps:[{s:5,f:10},{s:4,f:10},{s:4,f:12},{s:3,f:12},{s:2,f:12}] },
    { name:'Box 3 Cascade',    steps:[{s:0,f:12},{s:1,f:13},{s:1,f:10},{s:2,f:12},{s:2,f:9},{s:3,f:10},{s:3,f:12}] },
  ],
  4: [
    { name:'XII Slide',        steps:[{s:0,f:15},{s:0,f:12},{s:1,f:15},{s:1,f:13}] },
    { name:'High Zone',        steps:[{s:2,f:12},{s:2,f:14},{s:3,f:12},{s:3,f:14}] },
    { name:'High Climb',       steps:[{s:4,f:12},{s:4,f:15},{s:5,f:12},{s:5,f:15}] },
    { name:'Box 4 Phrase',     steps:[{s:0,f:15},{s:1,f:15},{s:1,f:13},{s:2,f:14},{s:2,f:12},{s:3,f:14},{s:3,f:12}] },
  ],
  5: [
    { name:'Top End Run',      steps:[{s:0,f:17},{s:0,f:15},{s:1,f:17},{s:1,f:15}] },
    { name:'Neck Climb',       steps:[{s:2,f:14},{s:2,f:17},{s:3,f:14},{s:3,f:17}] },
    { name:'Full Box 5',       steps:[{s:5,f:15},{s:4,f:15},{s:4,f:17},{s:3,f:14},{s:2,f:14}] },
    { name:'Box 5 Solo',       steps:[{s:0,f:17},{s:1,f:17},{s:1,f:15},{s:2,f:17},{s:2,f:14},{s:3,f:17},{s:3,f:14},{s:4,f:15}] },
  ],
};

const GAME = { XP_PER_LICK:100, STREAK_MAX_MULT:3 };

// ── Apply saved theme before first paint (no CRT flash) ──
(function applyThemeEarly() {
  try {
    const t = localStorage.getItem('pent-theme');
    if (t && t !== 'crt') document.body.classList.add('theme-' + t);
  } catch(e) {}
})();

// ---------- State ----------
const state = {
  keyIdx:   0,       // index into KEYS (0 = A)
  lens:     'minor', // 'minor' | 'major'
  box:      '1',
  labels:   true,
  sound:    true,
  score:    0,
  theme:    'crt',
  // game
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
  // computed — updated by setKey()
  scaleChromas: new Set([9,0,2,4,7]), // Am pentatonic chromas
  activeBoxes:  null,
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ---------- Music helpers ----------
function midiToFreq(midi)    { return 440 * Math.pow(2, (midi - 69) / 12); }
function midiToChroma(midi)  { return ((midi % 12) + 12) % 12; }
function fretMidi(si, f)     { return STRINGS[si].midi + f; }
function fretChroma(si, f)   { return midiToChroma(fretMidi(si, f)); }

// Spelled note name for current key context
function spell(chroma) {
  const rc = KEYS[state.keyIdx].chroma;
  const flat = state.lens === 'minor' ? FLAT_MINOR_ROOTS.has(rc) : FLAT_MAJOR_ROOTS.has(rc);
  return flat ? FLAT_NAMES[chroma] : SHARP_NAMES[chroma];
}

function keyNameByChroma(chroma) {
  return KEYS.find(k => k.chroma === chroma)?.name ?? SHARP_NAMES[chroma];
}

// Semitone offset from Am-anchor for the current key+lens combination.
// Minor: anchor at root. Major: anchor at relative minor (root+9).
function getAnchorOffset() {
  const rc = KEYS[state.keyIdx].chroma;
  const anchor = state.lens === 'minor' ? rc : (rc + 9) % 12;
  return (anchor - 9 + 12) % 12;
}

function computeScaleChromas(rootChroma, lens) {
  const offs = lens === 'minor' ? PENT_OFFSETS : MAJOR_OFFSETS;
  return new Set(offs.map(o => (rootChroma + o) % 12));
}

function computeActiveBoxes() {
  const offset = getAnchorOffset();
  if (offset === 0) return BOXES;
  const result = {};
  for (const pos in BOXES) {
    result[pos] = {};
    for (const str in BOXES[pos]) {
      let [lo, hi] = BOXES[pos][str];
      lo += offset; hi += offset;
      while (hi > TOTAL_FRETS) { lo -= 12; hi -= 12; }
      while (lo < 0)           { lo += 12; hi += 12; }
      result[pos][str] = [lo, hi];
    }
  }
  return result;
}

function setKey(keyIdx) {
  state.keyIdx     = keyIdx;
  const root       = KEYS[keyIdx];
  state.scaleChromas = computeScaleChromas(root.chroma, state.lens);
  state.activeBoxes  = computeActiveBoxes();

  // Level-card title with relative key info
  let relName;
  if (state.lens === 'minor') {
    relName = keyNameByChroma((root.chroma + 3) % 12) + ' MAJ';
  } else {
    relName = keyNameByChroma((root.chroma + 9) % 12) + 'm';
  }
  const el = $('#level-title');
  if (el) el.textContent = `${root.name} ${state.lens.toUpperCase()} PENTATONIC (rel. ${relName})`;
}

function isInScale(chroma) { return state.scaleChromas.has(chroma); }
function isRoot(chroma)    { return chroma === KEYS[state.keyIdx].chroma; }

function isInBox(stringName, fret) {
  if (state.box === 'all') return true;
  const boxes = state.activeBoxes || BOXES;
  const box   = boxes[state.box];
  if (!box) return true;
  const [lo, hi] = box[stringName];
  return fret >= lo && fret <= hi;
}

// Transpose an Am-anchor fret by the current key anchor offset
function transposeFret(f, anchorOffset) {
  let tf = f + anchorOffset;
  while (tf > TOTAL_FRETS) tf -= 12;
  while (tf < 0)           tf += 12;
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
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = 80;
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g).connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);
}

function playFanfare() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  [60,64,67,72].forEach((midi, i) => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = midiToFreq(midi);
    const t = now + i * 0.12;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.6);
  });
}

// ---------- Fretboard render ----------
const FB = { pad:{left:44,top:14,right:14,bottom:24}, fretW:50, stringH:30 };

function buildFretboard() {
  const root = $('#fretboard');
  const w = FB.pad.left + FB.fretW * (TOTAL_FRETS + 1) + FB.pad.right;
  const h = FB.pad.top  + FB.stringH * STRINGS.length  + FB.pad.bottom;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'fb-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  [3,5,7,9,15].forEach(f => {
    const cx = fretCenterX(f), cy = FB.pad.top + (FB.stringH * STRINGS.length) / 2;
    svg.appendChild(mkSvg('circle', {cx, cy, r:7, class:'fb-marker'}));
  });
  const cx12 = fretCenterX(12);
  svg.appendChild(mkSvg('circle', {cx:cx12, cy:FB.pad.top + FB.stringH * STRINGS.length * 0.32, r:7, class:'fb-marker'}));
  svg.appendChild(mkSvg('circle', {cx:cx12, cy:FB.pad.top + FB.stringH * STRINGS.length * 0.68, r:7, class:'fb-marker'}));

  for (let f = 0; f <= TOTAL_FRETS + 1; f++) {
    const x = FB.pad.left + f * FB.fretW;
    svg.appendChild(mkSvg('line', {
      x1:x, y1:FB.pad.top - 2, x2:x, y2:FB.pad.top + STRINGS.length * FB.stringH + 2,
      class: f === 0 ? 'fb-fret-line nut' : 'fb-fret-line',
    }));
  }

  STRINGS.forEach((s, i) => {
    const y = FB.pad.top + i * FB.stringH + FB.stringH / 2;
    svg.appendChild(mkSvg('line', {
      x1:FB.pad.left, y1:y, x2:FB.pad.left + (TOTAL_FRETS+1) * FB.fretW, y2:y,
      class:'fb-string' + (s.thick ? ' thick' : ''),
    }));
    const lbl = mkSvg('text', {x:FB.pad.left - 8, y:y + 4, class:'fb-stringlabel'});
    lbl.textContent = s.name; svg.appendChild(lbl);
  });

  for (let f = 1; f <= TOTAL_FRETS; f++) {
    const t = mkSvg('text', {x:fretCenterX(f), y:FB.pad.top + STRINGS.length * FB.stringH + 16, class:'fb-fretnum'});
    t.textContent = f; svg.appendChild(t);
  }

  // Note dots — store data-chroma for scale membership; text updated by refreshNotes
  STRINGS.forEach((s, si) => {
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const midi   = fretMidi(si, f);
      const chroma = midiToChroma(midi);
      const cx = f === 0 ? FB.pad.left - 22 : fretCenterX(f);
      const cy = FB.pad.top + si * FB.stringH + FB.stringH / 2;
      const g = mkSvg('g', {'class':'fb-note','data-string':si,'data-fret':f,'data-chroma':chroma,'data-midi':midi});
      g.appendChild(mkSvg('circle', {cx, cy, r:12}));
      const t = mkSvg('text', {x:cx, y:cy + 3});
      t.textContent = SHARP_NAMES[chroma];
      g.appendChild(t);
      g.addEventListener('click', onNoteClick);
      svg.appendChild(g);
    }
  });

  root.innerHTML = ''; root.appendChild(svg);
}

function fretCenterX(f) {
  return f === 0 ? FB.pad.left - 22 : FB.pad.left + (f - 0.5) * FB.fretW;
}
function mkSvg(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ---------- Note state refresh (hot path — class toggles only) ----------
function refreshNotes() {
  $$('#fretboard .fb-note').forEach(g => {
    const chroma     = +g.dataset.chroma;
    const si         = +g.dataset.string;
    const f          = +g.dataset.fret;
    const inScale    = isInScale(chroma);
    const root       = isRoot(chroma);
    const inBox      = isInBox(STRINGS[si].name, f);

    g.classList.remove('in-scale','root','out','dimmed');
    if (!inScale) {
      g.classList.add('out');
      if (state.box !== 'all') g.classList.add('dimmed');
    } else if (!inBox) {
      g.classList.add('in-scale','dimmed');
      if (root) g.classList.add('root');
    } else {
      g.classList.add(root ? 'root' : 'in-scale');
    }

    const text = g.querySelector('text');
    if (text) {
      text.textContent = spell(chroma);
      text.style.display = state.labels ? '' : 'none';
    }
  });
}

// ---------- Interactions ----------
let playGen = 0;

function onNoteClick(e) {
  const g      = e.currentTarget;
  const midi   = +g.dataset.midi;
  const chroma = +g.dataset.chroma;
  const si     = +g.dataset.string;

  if (state.mode === 'game' && state.gamePhase === 'input') {
    onGameNoteClick(g); return;
  }

  playNote(midi);
  flashNote(g);
  $('#last-note').textContent = `${spell(chroma)} (str ${STRINGS[si].name}, fret ${g.dataset.fret})`;
  state.score += isInScale(chroma) ? (isRoot(chroma) ? 25 : 10) : 1;
  updateScore();
}

function flashNote(g, cls = 'playing') {
  g.classList.add(cls);
  setTimeout(() => g.classList.remove(cls), 200);
}

function updateScore() {
  $('#score').textContent = String(state.mode === 'game' ? state.gameScore : state.score).padStart(4, '0');
}

// ---------- Play scale — ascending then descending ----------
function playCurrentScale() {
  ensureAudio();
  const gen = ++playGen;
  const notes = [];
  $$('#fretboard .fb-note').forEach(g => {
    if (g.classList.contains('dimmed')) return;
    if (!g.classList.contains('in-scale') && !g.classList.contains('root')) return;
    const f = +g.dataset.fret;
    if (f === 0 && state.box !== 'all') return;
    notes.push({el:g, midi:+g.dataset.midi});
  });
  notes.sort((a,b) => a.midi - b.midi);
  const seq = notes.concat(notes.slice(0,-1).reverse()); // up then down
  seq.forEach((n, i) => {
    setTimeout(() => {
      if (playGen !== gen) return;
      playNote(n.midi, 0.5); flashNote(n.el);
    }, i * 240);
  });
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.body.classList.remove('theme-hawaii','theme-space','theme-vsc','theme-synthwave','theme-blueprint');
  if (theme !== 'crt') document.body.classList.add('theme-' + theme);
  state.theme = theme;
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  try { localStorage.setItem('pent-theme', theme); } catch(e) {}
}

// ---------- Modals ----------
function toggleHelp()    { $('#help-modal').classList.toggle('hidden'); }
function closeHelp()     { $('#help-modal').classList.add('hidden'); }
function togglePractice(){ $('#practice-modal').classList.toggle('hidden'); }
function closePractice() { $('#practice-modal').classList.add('hidden'); }

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
    div.innerHTML = `<input type="checkbox" id="day${i}" ${checked?'checked':''} />
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
    const el = $('#metro-beat-indicator'); if (!el) return;
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
  $('#metro-start').textContent = '■ STOP'; metroSchedule(ctx);
}
function metroStop() {
  metro.running = false; clearTimeout(metro.timerId);
  $('#metro-start').textContent = '▶ START';
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
  $('#timer-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function timerStart() {
  if (timer.remaining <= 0) return;
  timer.running = true; $('#timer-toggle').textContent = '■ PAUSE';
  timer.intervalId = setInterval(() => {
    timer.remaining--;
    updateTimerDisplay();
    if (timer.remaining <= 0) { timerStop(); timerChime(); $('#timer-toggle').textContent = '▶ START'; }
  }, 1000);
}
function timerStop() {
  timer.running = false; clearInterval(timer.intervalId);
  $('#timer-toggle').textContent = '▶ START';
}
function timerReset(minutes) {
  timerStop();
  timer.remaining = (minutes || Math.ceil(timer.remaining/60) || 5) * 60;
  updateTimerDisplay();
}

// ---------- LICK boot validator (permanent) ----------
(function validateLicks() {
  const amChromas = new Set([9,0,2,4,7]); // A C D E G
  for (const pos in LICKS) {
    LICKS[pos].forEach(lick => {
      lick.steps.forEach(({s, f}) => {
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

// ---------- Game engine ----------

// Playback tempo ramps faster as total XP grows
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
  return $$(`.fb-note[data-string="${s}"][data-fret="${f}"]`)[0] || null;
}

function showGamePhase() {
  const lick = pickLick();
  state.currentLick    = lick;
  state.gameInputStep  = 0;
  state.lickAttempts   = 0;
  state.gamePhase      = 'show';
  updateGamePanel('👀 WATCH...');
  const gen    = ++playGen;
  const STEP   = getStepMs();
  const ao     = getAnchorOffset();
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
    playNote(+g.dataset.midi, 0.4);
    flashNote(g, 'correct');
    state.gameInputStep++;
    if (state.gameInputStep >= state.currentLick.steps.length) lickComplete();
  } else {
    playBuzz(); flashNote(g, 'wrong');
    state.lickAttempts++;
    state.gameStreak = 0;
    updateGameHUD();
    if (state.lickAttempts >= 2) {
      updateGamePanel('✗ MISSED — NEW LICK');
    } else {
      updateGamePanel('✗ WRONG — WATCH AGAIN');
    }
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
  if (status) $('#game-status').textContent = status;
  updateGameHUD();
}

function updateGameHUD() {
  const tiers = ['BEGINNER','RHYTHM','GROOVE','FLOW','SHRED'];
  const xp    = state.gameScore;
  const tier  = xp < 300 ? 0 : xp < 700 ? 1 : xp < 1400 ? 2 : xp < 2500 ? 3 : 4;
  $('#game-level').textContent    = tiers[tier];
  $('#game-streak').textContent   = `×${Math.min(state.gameStreak, GAME.STREAK_MAX_MULT) || 1}`;
  const tries = 2 - Math.min(state.lickAttempts, 2);
  $('#game-lives').textContent    = '🎸'.repeat(tries) || '—';
  $('#game-level-xp').textContent = `${state.gameScore} XP`;
}

function enterGame() {
  state.exploreSavedBox = state.box;
  state.mode            = 'game';
  if (state.box === 'all') { state.box = '1'; $$('.box').forEach(b => b.classList.toggle('active', b.dataset.box==='1')); }
  state.lickAttempts    = 0;
  state.gameStreak      = 0;
  $('#game-panel').classList.add('visible');
  $('#game-toggle').textContent = '◀ EXPLORE';
  // Box + key buttons stay live; only lens is locked (changing 5 notes mid-lick is confusing)
  $$('.lens').forEach(b => b.disabled = true);
  refreshNotes(); updateScore(); updateGameHUD();
  $('#highscore-label').style.display = '';
  $('#highscore').style.display = '';
  $('#highscore').textContent = String(state.highScore).padStart(4,'0');
  showGamePhase();
}

function exitGame() {
  ++playGen;
  state.mode      = 'explore';
  state.gamePhase = 'idle';
  state.box       = state.exploreSavedBox;
  $('#game-panel').classList.remove('visible');
  $('#game-toggle').textContent = '▶ START GAME';
  $$('.box, .lens, #key-row .arc-btn').forEach(b => b.disabled = false);
  $$('.box').forEach(b => b.classList.toggle('active', b.dataset.box === state.box));
  refreshNotes(); updateScore();
}

// ---------- Persistence ----------
function saveGame() {
  try { localStorage.setItem('pent-game', JSON.stringify({xp:state.gameScore, highScore:state.highScore})); } catch(e) {}
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem('pent-game') || '{}');
    if (d.xp)        state.gameScore  = d.xp;
    if (d.highScore) {
      state.highScore = d.highScore;
      $('#highscore-label').style.display = '';
      $('#highscore').style.display = '';
      $('#highscore').textContent = String(state.highScore).padStart(4,'0');
    }
  } catch(e) {}
}

// ---------- Wire controls ----------
function wireControls() {
  // Theme
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
  try {
    const saved = localStorage.getItem('pent-theme') || 'crt';
    const valid = ['crt','hawaii','synthwave','blueprint','space','vsc'];
    // migrate old removed themes
    const t = valid.includes(saved) ? saved : 'crt';
    applyTheme(t);
  } catch(e) { applyTheme('crt'); }

  // Key selector (JS-rendered)
  const keyRow = $('#key-row');
  KEYS.forEach((k, i) => {
    const btn = document.createElement('button');
    btn.className   = 'arc-btn key' + (i === 0 ? ' active' : '');
    btn.dataset.keyIdx = i;
    btn.textContent = k.name;
    btn.addEventListener('click', () => {
      $$('.key').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      setKey(i); refreshNotes();
      if (state.mode === 'game') { ++playGen; showGamePhase(); }
    });
    keyRow.appendChild(btn);
  });

  // Lens — also recomputes active boxes (parallel model)
  $$('.lens').forEach(b => b.addEventListener('click', () => {
    $$('.lens').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.lens = b.dataset.lens;
    setKey(state.keyIdx); // recompute scale chromas + active boxes for new lens
    refreshNotes();
  }));

  // Box — game restarts lick on box switch
  $$('.box').forEach(b => b.addEventListener('click', () => {
    $$('.box').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.box = b.dataset.box;
    refreshNotes();
    if (state.mode === 'game') { ++playGen; showGamePhase(); }
  }));

  // Toggles
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

  // Help modal
  $('#help-btn').addEventListener('click', toggleHelp);
  $('#help-close').addEventListener('click', closeHelp);
  $('#help-modal').addEventListener('click', e => { if (e.target === $('#help-modal')) closeHelp(); });

  // Practice modal
  $('#practice-btn').addEventListener('click', () => { renderChallenge(); togglePractice(); });
  $('#practice-close').addEventListener('click', closePractice);
  $('#practice-modal').addEventListener('click', e => { if (e.target === $('#practice-modal')) closePractice(); });

  // Metronome
  const slider = $('#metro-slider'), bpmIn = $('#metro-bpm');
  slider.addEventListener('input', () => { metro.bpm = +slider.value; bpmIn.value = slider.value; });
  bpmIn.addEventListener('input', () => { const v = Math.max(40,Math.min(240,+bpmIn.value||80)); metro.bpm=v; slider.value=v; });
  $('#metro-start').addEventListener('click', () => { ensureAudio(); if (metro.running) metroStop(); else metroStart(); });

  // Timer
  $('#timer-5').addEventListener('click',      () => timerReset(5));
  $('#timer-10').addEventListener('click',     () => timerReset(10));
  $('#timer-toggle').addEventListener('click', () => { ensureAudio(); if (timer.running) timerStop(); else timerStart(); });
  $('#timer-reset').addEventListener('click',  () => timerReset());

  // Win screen
  $('#win-close').addEventListener('click', () => {
    $('#win-screen').classList.remove('visible');
    state.gameScore = 0; state.gameStreak = 0; state.gameLickIdx = 0;
    exitGame();
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea,select')) return;
    if (e.key==='?' || (e.key==='/' && e.shiftKey)) { closePractice(); toggleHelp(); return; }
    if (e.key==='p' || e.key==='P') { closeHelp(); renderChallenge(); togglePractice(); return; }
    if (e.key==='Escape') { closeHelp(); closePractice(); return; }
    if (e.key>='1' && e.key<='5') { const b=$$(`.box[data-box="${e.key}"]`)[0]; if(b&&!b.disabled)b.click(); return; }
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
