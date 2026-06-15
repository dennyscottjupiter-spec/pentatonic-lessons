// ============================================================
// PENTATONIC ARCADE — A minor / C major pentatonic
// Standard tuning. 18 frets. Web Audio synth.
// ============================================================

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Strings: index 0 = high e (top of display), 5 = low E (bottom)
// MIDI open-string values
const STRINGS = [
  { name: 'e', midi: 64, thick: false }, // high E
  { name: 'B', midi: 59, thick: false },
  { name: 'G', midi: 55, thick: false },
  { name: 'D', midi: 50, thick: true  },
  { name: 'A', midi: 45, thick: true  },
  { name: 'E', midi: 40, thick: true  }, // low E
];

const TOTAL_FRETS = 17;          // show frets 0..17
const SCALE_PITCHES = [0, 3, 5, 7, 10]; // A, C, D, E, G expressed as semitones from A → relative to A
// Easier: define scale by note-name set
const SCALE_NOTES = new Set(['A', 'C', 'D', 'E', 'G']);

// Box positions: for each box, the fret each string is allowed to play on.
// Order matches STRINGS (high e first, low E last).
const BOXES = {
  1: { // pos V
    e: [5, 8],  B: [5, 8],  G: [5, 7],  D: [5, 7],  A: [5, 7],  E: [5, 8],
  },
  2: { // pos VII
    e: [8, 10], B: [8, 10], G: [7, 9],  D: [7, 10], A: [7, 10], E: [8, 10],
  },
  3: { // pos IX
    e: [10, 12], B: [10, 13], G: [9, 12],  D: [10, 12], A: [10, 12], E: [10, 12],
  },
  4: { // pos XII
    e: [12, 15], B: [13, 15], G: [12, 14], D: [12, 14], A: [12, 15], E: [12, 15],
  },
  5: { // pos XIV
    e: [15, 17], B: [15, 17], G: [14, 17], D: [14, 17], A: [15, 17], E: [15, 17],
  },
};

// ---------- State ----------
const state = {
  lens: 'Am',        // 'Am' or 'C'
  box: '1',          // '1'..'5' or 'all'
  labels: true,
  sound: true,
  score: 0,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------- Music helpers ----------
function midiToName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function fretMidi(stringIdx, fret) {
  return STRINGS[stringIdx].midi + fret;
}
function isInScale(noteName) {
  return SCALE_NOTES.has(noteName);
}
function isRoot(noteName) {
  return (state.lens === 'Am' && noteName === 'A') ||
         (state.lens === 'C'  && noteName === 'C');
}
function isInBox(stringName, fret) {
  if (state.box === 'all') return true;
  const box = BOXES[state.box];
  if (!box) return true;
  const [lo, hi] = box[stringName];
  return fret >= lo && fret <= hi;
}

// ---------- Audio ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Karplus-Strong: offline buffer per MIDI note, lazy-cached
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

// ---------- Fretboard render ----------
const FB = {
  pad: { left: 44, top: 14, right: 14, bottom: 24 },
  fretW: 50,
  stringH: 30,
};

function buildFretboard() {
  const root = $('#fretboard');
  const w = FB.pad.left + FB.fretW * (TOTAL_FRETS + 1) + FB.pad.right;
  const h = FB.pad.top + FB.stringH * STRINGS.length + FB.pad.bottom;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'fb-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Inlay markers
  const inlaySingle = [3, 5, 7, 9, 15];
  const inlayDouble = [12];
  inlaySingle.forEach(f => {
    const cx = fretCenterX(f);
    const cy = FB.pad.top + (FB.stringH * STRINGS.length) / 2;
    const c = mkSvg('circle', { cx, cy, r: 7, class: 'fb-marker' });
    svg.appendChild(c);
  });
  inlayDouble.forEach(f => {
    const cx = fretCenterX(f);
    const cyTop = FB.pad.top + (FB.stringH * STRINGS.length) * 0.32;
    const cyBot = FB.pad.top + (FB.stringH * STRINGS.length) * 0.68;
    svg.appendChild(mkSvg('circle', { cx, cy: cyTop, r: 7, class: 'fb-marker' }));
    svg.appendChild(mkSvg('circle', { cx, cy: cyBot, r: 7, class: 'fb-marker' }));
  });

  // Fret lines
  for (let f = 0; f <= TOTAL_FRETS + 1; f++) {
    const x = FB.pad.left + f * FB.fretW;
    const cls = f === 0 ? 'fb-fret-line nut' : 'fb-fret-line';
    svg.appendChild(mkSvg('line', {
      x1: x, y1: FB.pad.top - 2,
      x2: x, y2: FB.pad.top + STRINGS.length * FB.stringH + 2,
      class: cls,
    }));
  }

  // Strings
  STRINGS.forEach((s, i) => {
    const y = FB.pad.top + i * FB.stringH + FB.stringH / 2;
    svg.appendChild(mkSvg('line', {
      x1: FB.pad.left, y1: y,
      x2: FB.pad.left + (TOTAL_FRETS + 1) * FB.fretW, y2: y,
      class: 'fb-string' + (s.thick ? ' thick' : ''),
    }));
    // String label
    const label = mkSvg('text', {
      x: FB.pad.left - 8, y: y + 4, class: 'fb-stringlabel',
    });
    label.textContent = s.name;
    svg.appendChild(label);
  });

  // Fret numbers (under board)
  for (let f = 1; f <= TOTAL_FRETS; f++) {
    const t = mkSvg('text', {
      x: fretCenterX(f),
      y: FB.pad.top + STRINGS.length * FB.stringH + 16,
      class: 'fb-fretnum',
    });
    t.textContent = f;
    svg.appendChild(t);
  }

  // Notes (every fret on every string)
  STRINGS.forEach((s, si) => {
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const midi = fretMidi(si, f);
      const noteName = midiToName(midi);
      const cx = f === 0
        ? FB.pad.left - 22
        : fretCenterX(f);
      const cy = FB.pad.top + si * FB.stringH + FB.stringH / 2;

      const g = mkSvg('g', {
        class: 'fb-note',
        'data-string': si,
        'data-fret': f,
        'data-note': noteName,
        'data-midi': midi,
      });
      const c = mkSvg('circle', { cx, cy, r: 12 });
      const t = mkSvg('text', { x: cx, y: cy + 3 });
      t.textContent = noteName;
      g.appendChild(c);
      g.appendChild(t);
      g.addEventListener('click', onNoteClick);
      svg.appendChild(g);
    }
  });

  root.innerHTML = '';
  root.appendChild(svg);
}

function fretCenterX(f) {
  // For fret 0 (open) we'll draw notes to the left of the nut.
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

    g.classList.remove('in-scale', 'root', 'out', 'dimmed');

    if (!inScale) {
      g.classList.add('out');
      if (state.box !== 'all') g.classList.add('dimmed');
    } else {
      if (!inBox) {
        g.classList.add('in-scale', 'dimmed');
        if (root) g.classList.add('root');
      } else {
        g.classList.add(root ? 'root' : 'in-scale');
      }
    }

    // Label toggle
    const text = g.querySelector('text');
    text.style.display = state.labels ? '' : 'none';
  });
}

// ---------- Interactions ----------
function onNoteClick(e) {
  const g = e.currentTarget;
  const midi = +g.dataset.midi;
  const note = g.dataset.note;
  playNote(midi);
  flashNote(g);
  $('#last-note').textContent = `${note} (str ${STRINGS[+g.dataset.string].name}, fret ${g.dataset.fret})`;
  state.score += isInScale(note) ? (isRoot(note) ? 25 : 10) : 1;
  updateScore();
}

function flashNote(g) {
  g.classList.add('playing');
  setTimeout(() => g.classList.remove('playing'), 180);
}

function updateScore() {
  $('#score').textContent = String(state.score).padStart(4, '0');
}

// ---------- Play scale (ascending through current box) ----------
function playCurrentScale() {
  ensureAudio();
  // Collect all in-scale, in-box notes; play low → high by MIDI
  const notes = [];
  $$('#fretboard .fb-note').forEach(g => {
    if (!g.classList.contains('dimmed') &&
        (g.classList.contains('in-scale') || g.classList.contains('root'))) {
      const f = +g.dataset.fret;
      if (f === 0 && state.box !== 'all') return; // skip open strings unless ALL
      notes.push({ el: g, midi: +g.dataset.midi });
    }
  });
  notes.sort((a, b) => a.midi - b.midi);

  const step = 240; // ms
  notes.forEach((n, i) => {
    setTimeout(() => {
      playNote(n.midi, 0.5);
      flashNote(n.el);
    }, i * step);
  });
}

// ---------- Wire controls ----------
function wireControls() {
  $$('.lens').forEach(b => b.addEventListener('click', () => {
    $$('.lens').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.lens = b.dataset.lens;
    refreshNotes();
  }));

  $$('.box').forEach(b => b.addEventListener('click', () => {
    $$('.box').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.box = b.dataset.box;
    refreshNotes();
  }));

  $$('.toggle').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.toggle;
    state[key] = !state[key];
    b.classList.toggle('active', state[key]);
    if (key === 'labels') refreshNotes();
  }));

  $('#play-scale').addEventListener('click', playCurrentScale);
}

// ---------- Boot ----------
buildFretboard();
refreshNotes();
wireControls();
updateScore();
