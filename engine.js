// ---
// purpose: Music helpers, note spelling, blue notes, fretboard SVG, note refresh
// exports: spell, setKey, isInBox, isBlue, refreshNotes, playCurrentScale
// depends: data.js, audio.js (playNote), player.js (playSteps), app.js (state), game.js (getFretEl)
// gotcha: spell() reads state.accidentals; undefined = sharps (tests stub)
// ---

function midiToChroma(midi)  { return ((midi % 12) + 12) % 12; }
function fretMidi(si, f)     { return STRINGS[si].midi + f; }
function fretChroma(si, f)   { return midiToChroma(fretMidi(si, f)); }

function spell(chroma) {
  return (state.accidentals === 'flat' ? FLAT_NAMES : SHARP_NAMES)[chroma];
}

function keyNameByChroma(chroma) { return spell(chroma); }

function getAnchorOffset() {
  const rc     = KEYS[state.keyIdx].chroma;
  const anchor = state.lens === 'minor' ? rc : (rc + 9) % 12;
  return (anchor - 9 + 12) % 12;
}

function computeScaleChromas(rootChroma, lens) {
  const offs = lens === 'minor' ? PENT_OFFSETS : MAJOR_OFFSETS;
  return new Set(offs.map(o => (rootChroma + o) % 12));
}

// Compute the single octave shift k so the whole box (all 6 strings) stays in [0, TOTAL_FRETS].
// Box spans are < 12 semitones, so one rigid shift always works.
function boxOctaveShift(boxRanges, offset) {
  let minLo = Infinity, maxHi = -Infinity;
  for (const str in boxRanges) {
    const [lo, hi] = boxRanges[str];
    minLo = Math.min(minLo, lo + offset);
    maxHi = Math.max(maxHi, hi + offset);
  }
  let k = 0;
  while (maxHi + k > TOTAL_FRETS) k -= 12;
  while (minLo + k < 0)           k += 12;
  return k;
}

function computeActiveBoxes() {
  const offset = getAnchorOffset();
  if (offset === 0) return BOXES;
  const result = {};
  for (const pos in BOXES) {
    const k = boxOctaveShift(BOXES[pos], offset);
    result[pos] = {};
    for (const str in BOXES[pos]) {
      const [lo, hi] = BOXES[pos][str];
      result[pos][str] = [lo + offset + k, hi + offset + k];
    }
  }
  return result;
}

// Transpose a lick fret using the same rigid shift as its box (keeps note inside box range).
function transposeFretInBox(f, anchorOffset, pos) {
  const k = boxOctaveShift(BOXES[pos], anchorOffset);
  return f + anchorOffset + k;
}

function setKey(keyIdx) {
  state.keyIdx       = keyIdx;
  const root         = KEYS[keyIdx];
  state.scaleChromas = computeScaleChromas(root.chroma, state.lens);
  state.activeBoxes  = computeActiveBoxes();
  let relName;
  if (state.lens === 'minor') {
    relName = keyNameByChroma((root.chroma + 3) % 12) + ' MAJ';
  } else {
    relName = keyNameByChroma((root.chroma + 9) % 12) + 'm';
  }
  const el = document.getElementById('level-title');
  if (el) el.textContent = `${spell(root.chroma)} ${state.lens.toUpperCase()} PENTATONIC (rel. ${relName})`;
}

function isInScale(chroma) { return state.scaleChromas.has(chroma); }
function isRoot(chroma)    { return chroma === KEYS[state.keyIdx].chroma; }
function blueChroma()      { return (KEYS[state.keyIdx].chroma + BLUE_OFFSETS[state.lens]) % 12; }
function isBlue(chroma)    { return !!state.blues && chroma === blueChroma(); }

// slack widens the box by N frets on each side (blue notes use 1 so box-edge blues still show)
function isInBox(stringName, fret, slack = 0) {
  if (state.box === 'all') return true;
  const boxes = state.activeBoxes || BOXES;
  const box   = boxes[state.box];
  if (!box) return true;
  const [lo, hi] = box[stringName];
  return fret >= lo - slack && fret <= hi + slack;
}

function transposeFret(f, anchorOffset) {
  let tf = f + anchorOffset;
  while (tf > TOTAL_FRETS) tf -= 12;
  while (tf < 0)           tf += 12;
  return tf;
}

// ---------- Fretboard SVG ----------
const FB = { pad:{left:44,top:14,right:14,bottom:24}, fretW:50, stringH:30 };

function buildFretboard() {
  const root = document.getElementById('fretboard');
  const w = FB.pad.left + FB.fretW * (TOTAL_FRETS + 1) + FB.pad.right;
  const h = FB.pad.top  + FB.stringH * STRINGS.length  + FB.pad.bottom;
  const svg = mkSvg('svg', {class:'fb-svg', viewBox:`0 0 ${w} ${h}`, preserveAspectRatio:'xMidYMid meet'});

  [3,5,7,9,15].forEach(f => {
    svg.appendChild(mkSvg('circle', {cx:fretCenterX(f), cy:FB.pad.top+(FB.stringH*STRINGS.length)/2, r:7, class:'fb-marker'}));
  });
  const cx12 = fretCenterX(12);
  svg.appendChild(mkSvg('circle', {cx:cx12, cy:FB.pad.top+FB.stringH*STRINGS.length*0.32, r:7, class:'fb-marker'}));
  svg.appendChild(mkSvg('circle', {cx:cx12, cy:FB.pad.top+FB.stringH*STRINGS.length*0.68, r:7, class:'fb-marker'}));

  for (let f = 0; f <= TOTAL_FRETS+1; f++) {
    const x = FB.pad.left + f * FB.fretW;
    svg.appendChild(mkSvg('line', {x1:x,y1:FB.pad.top-2,x2:x,y2:FB.pad.top+STRINGS.length*FB.stringH+2,
      class:f===0?'fb-fret-line nut':'fb-fret-line'}));
  }

  STRINGS.forEach((s,i) => {
    const y = FB.pad.top + i*FB.stringH + FB.stringH/2;
    svg.appendChild(mkSvg('line', {x1:FB.pad.left,y1:y,x2:FB.pad.left+(TOTAL_FRETS+1)*FB.fretW,y2:y,
      class:'fb-string'+(s.thick?' thick':'')}));
    const lbl = mkSvg('text', {x:FB.pad.left-8,y:y+4,class:'fb-stringlabel'});
    lbl.textContent = s.name; svg.appendChild(lbl);
  });

  for (let f = 1; f <= TOTAL_FRETS; f++) {
    const t = mkSvg('text', {x:fretCenterX(f),y:FB.pad.top+STRINGS.length*FB.stringH+16,class:'fb-fretnum'});
    t.textContent = f; svg.appendChild(t);
  }

  STRINGS.forEach((s,si) => {
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const midi   = fretMidi(si, f);
      const chroma = midiToChroma(midi);
      const cx = f===0 ? FB.pad.left-22 : fretCenterX(f);
      const cy = FB.pad.top + si*FB.stringH + FB.stringH/2;
      const g = mkSvg('g', {class:'fb-note','data-string':si,'data-fret':f,'data-chroma':chroma,'data-midi':midi});
      g.appendChild(mkSvg('circle', {cx,cy,r:12}));
      const t = mkSvg('text', {x:cx,y:cy+3}); t.textContent = spell(chroma);
      g.appendChild(t); g.addEventListener('click', onNoteClick); svg.appendChild(g);
    }
  });

  root.innerHTML = ''; root.appendChild(svg);
}

function fretCenterX(f) { return f===0 ? FB.pad.left-22 : FB.pad.left+(f-0.5)*FB.fretW; }
function mkSvg(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ---------- Note state refresh (hot path) ----------
function refreshNotes() {
  document.querySelectorAll('#fretboard .fb-note').forEach(g => {
    const chroma  = +g.dataset.chroma;
    const si      = +g.dataset.string;
    const f       = +g.dataset.fret;
    const root    = isRoot(chroma);
    const blue    = isBlue(chroma);
    const lit     = isInScale(chroma) || blue;
    const inBox   = isInBox(STRINGS[si].name, f, blue ? 1 : 0);

    g.classList.remove('in-scale','root','out','dimmed','blue');
    if (!lit) {
      g.classList.add('out');
      if (state.box !== 'all') g.classList.add('dimmed');
    } else {
      const cls = root ? 'root' : (blue ? 'blue' : 'in-scale');
      if (!inBox) g.classList.add('in-scale', cls, 'dimmed');
      else g.classList.add(cls);
    }

    const text = g.querySelector('text');
    if (text) { text.textContent = spell(chroma); text.style.display = state.labels ? '' : 'none'; }
  });
  if (typeof applyPattern === 'function') applyPattern();   // tests.html does not load patterns.js
}

// ---------- Play scale — ascending then descending ----------
let playGen = 0;

function playCurrentScale() {
  ensureAudio();
  ++playGen;   // before resume, so a paused old sequence is dropped instead of emitting one stray note
  if (state.paused) setPaused(false);
  if (state.pattern.length) {   // a built pattern plays in its click order, no reverse
    const seq = state.pattern.map(p => { const el = getFretEl(p.s, p.f); return { el, midi: +el.dataset.midi }; });
    playSteps(seq, 240, n => { playNote(n.midi, 0.5); flashNote(n.el); });
    return;
  }
  const notes = [];
  document.querySelectorAll('#fretboard .fb-note').forEach(g => {
    if (g.classList.contains('dimmed')) return;
    if (!g.classList.contains('in-scale') && !g.classList.contains('root') && !g.classList.contains('blue')) return;
    const f = +g.dataset.fret;
    if (f === 0 && state.box !== 'all') return;
    notes.push({el:g, midi:+g.dataset.midi});
  });
  notes.sort((a,b) => a.midi - b.midi);
  const seq = notes.concat(notes.slice(0,-1).reverse());
  playSteps(seq, 240, n => { playNote(n.midi, 0.5); flashNote(n.el); });
}
