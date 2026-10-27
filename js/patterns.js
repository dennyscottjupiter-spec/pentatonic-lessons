// ---
// purpose: Custom note patterns: build by clicking, save/load by name, classic presets
// exports: applyPattern(), togglePick(), clearPattern(), syncPattern(), stopBuilding()
// depends: data.js (PATTERN_PRESETS), engine.js (refreshNotes, mkSvg, fretChroma), game.js (getFretEl), app.js (state, $, $$)
// gotcha: saved frets are key-A reference (raw, may be negative); state.pattern is the current-key copy
// ---

const PATTERN_KEY  = 'pent-patterns';
const PATTERN_HINT = 'Load a classic or press BUILD and click notes.';
const BUILD_HINT   = 'BUILD: click notes to add or remove them. Order = play order.';

// ---------- Key-relative frets ----------
function patternDelta() { return (KEYS[state.keyIdx].chroma - 9 + 12) % 12; }

// Octave-wrap one fret into 0..TOTAL_FRETS (fallback when a rigid move cannot fit)
function wrapFret(f) { while (f > TOTAL_FRETS) f -= 12; while (f < 0) f += 12; return f; }

// First shift (in preference order) that keeps every fret on the neck; null when none fits
function rigidShift(frets, shifts) {
  const fit = shifts.find(s => frets.every(f => f + s >= 0 && f + s <= TOTAL_FRETS));
  return fit === undefined ? null : fit;
}

// First occurrence wins
function dedupe(notes) {
  const seen = new Set();
  return notes.filter(n => { const k = n.s + ':' + n.f; return !seen.has(k) && seen.add(k); });
}

// Saved A-reference frets -> display frets for the current key.
// Prefers the plain shift (same rule as boxOctaveShift), so the key a pattern was built in gets it back exactly.
function fromRef(ref) {
  const d = patternDelta(), sh = rigidShift(ref.map(n => n.f), [d, d - 12, d + 12]);
  return dedupe(ref.map(n => ({ s: n.s, f: sh !== null ? n.f + sh : wrapFret(n.f + d) })));
}

// Display frets -> A-reference frets. Kept raw (may be -11..-1) so the octave is never lost.
function toRef(display) {
  const d = patternDelta();
  return display.map(n => ({ s: n.s, f: n.f - d }));
}

// Every fret of the current key's root, low string first, frets ascending
function rootMap() {
  const out = [], root = KEYS[state.keyIdx].chroma;
  for (let s = STRINGS.length - 1; s >= 0; s--)
    for (let f = 0; f <= TOTAL_FRETS; f++) if (fretChroma(s, f) === root) out.push({ s, f });
  return out;
}

function syncPattern() {
  state.pattern = state.patternRoots ? rootMap() : (state.patternRef ? fromRef(state.patternRef) : []);
}

// ---------- Fretboard drawing ----------
// Picked notes get `picked` and a step number, others dim. Runs at the end of refreshNotes().
function applyPattern() {
  const empty = !state.pattern.length && !state.building;
  const picks = new Set(state.pattern.map(p => p.s + ':' + p.f));
  $$('#fretboard .fb-note').forEach(g => {
    const on = !empty && picks.has(g.dataset.string + ':' + g.dataset.fret);
    g.classList.toggle('picked', on);
    // No pattern: leave refreshNotes' box dimming alone
    if (!empty) g.classList.toggle('dimmed', !on);
  });
  drawSteps();
}

// Step numbers = click order; the layer is re-appended so it stays on top of the notes
function drawSteps() {
  let layer = document.getElementById('pattern-steps');
  if (!state.pattern.length) { if (layer) layer.replaceChildren(); return; }
  if (!layer) layer = mkSvg('g', { id: 'pattern-steps', 'pointer-events': 'none' });
  $('#fretboard svg').appendChild(layer);
  layer.replaceChildren(...state.pattern.map((p, i) => {
    const c = $(`.fb-note[data-string="${p.s}"][data-fret="${p.f}"] circle`);
    const t = mkSvg('text', { class: 'fb-step', x: +c.getAttribute('cx') + 10, y: +c.getAttribute('cy') - 9 });
    t.textContent = i + 1;
    return t;
  }));
}

// ---------- Build / pick ----------
function setBuildUi() {
  const b = $('#pattern-build');
  b.classList.toggle('active', state.building); b.setAttribute('aria-pressed', String(state.building));
}

function idleHint() { return state.building ? BUILD_HINT : PATTERN_HINT; }
function setInfo(text) { $('#pattern-info').textContent = text; }

// Delete is only enabled while a saved (user) pattern is selected
function setSelect(value) {
  $('#pattern-select').value = value;
  $('#pattern-delete').disabled = !value.startsWith('user:');
}

function toggleBuild() {
  state.building = !state.building;
  setBuildUi(); setInfo(idleHint()); refreshNotes();
}

// Box clicks and game entry end BUILD mode
function stopBuilding() { state.building = false; setBuildUi(); }

// Click toggles a note in/out of the pattern; first-pick order = play order
function togglePick(g) {
  const p = { s: +g.dataset.string, f: +g.dataset.fret };
  const i = state.pattern.findIndex(n => n.s === p.s && n.f === p.f);
  if (i >= 0) state.pattern.splice(i, 1); else state.pattern.push(p);
  state.patternRoots = false;
  state.patternRef = toRef(state.pattern);
  setSelect(''); refreshNotes();
}

function clearPattern() {
  state.patternRef = null; state.patternRoots = false; state.pattern = [];
  setSelect(''); setInfo(idleHint()); refreshNotes();
}

// ---------- Saved patterns (localStorage) ----------
// Keeps only well-formed saved patterns; anything else is dropped silently
function cleanSaved(p) {
  const name = p && typeof p.name === 'string' ? p.name.trim() : '';
  const ok = p && name.length > 0 && name.length <= 24 && (p.lens === 'minor' || p.lens === 'major')
    && typeof p.blues === 'boolean' && Array.isArray(p.notes) && p.notes.length > 0
    && p.notes.every(n => n && Number.isInteger(n.s) && n.s >= 0 && n.s <= 5
      && Number.isInteger(n.f) && n.f >= -12 && n.f <= TOTAL_FRETS);
  return ok ? { name, lens: p.lens, blues: p.blues, notes: p.notes.map(n => ({ s: n.s, f: n.f })) } : null;
}

function readSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(PATTERN_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(cleanSaved).filter(Boolean) : [];
  } catch (e) { return []; }
}

function writeSaved(list) {
  try { localStorage.setItem(PATTERN_KEY, JSON.stringify(list)); } catch (e) {}
}

// Select = placeholder + CLASSICS + MY PATTERNS (group omitted when empty)
function rebuildOptions() {
  const opt = (value, label) => new Option(label, value);
  const group = (label, opts) => { const g = document.createElement('optgroup'); g.label = label; g.append(...opts); return g; };
  const sel = $('#pattern-select'), saved = readSaved();
  sel.replaceChildren(opt('', 'LOAD PATTERN…'), group('CLASSICS', PATTERN_PRESETS.map((p, i) => opt('preset:' + i, p.name))));
  if (saved.length) sel.appendChild(group('MY PATTERNS', saved.map(p => opt('user:' + p.name, p.name))));
  sel.value = '';
}

function loadSelected(value) {
  if (!value) return;
  if (state.mode === 'game') { setSelect(''); setInfo('Exit the game to use patterns.'); return; }
  const isPreset = value.startsWith('preset:');
  const item = isPreset ? PATTERN_PRESETS[+value.slice(7)] : readSaved().find(p => 'user:' + p.name === value);
  if (!item) return;
  // The existing lens/blues handlers recompute scale, boxes and blue legend
  if (item.lens !== state.lens) $(`.lens[data-lens="${item.lens}"]`).click();
  if (item.blues !== state.blues) $('.toggle[data-toggle="blues"]').click();
  state.patternRoots = !!item.roots;
  state.patternRef = item.roots ? null : item.notes;
  syncPattern(); setSelect(value); refreshNotes();
  setInfo(isPreset ? item.tip : `${item.name}: ${item.notes.length} notes. ▶ PLAY SCALE plays them in order.`);
}

function savePattern() {
  const name = $('#pattern-name').value.trim().toUpperCase();
  if (!name) { setInfo('Type a name first.'); return; }
  if (!state.pattern.length) { setInfo('Pick some notes first.'); return; }
  const item = { name, lens: state.lens, blues: state.blues, notes: toRef(state.pattern) };
  const list = readSaved(), i = list.findIndex(p => p.name === name);
  if (i >= 0) list[i] = item; else list.push(item);
  writeSaved(list); rebuildOptions(); setSelect('user:' + name);
  $('#pattern-name').value = '';
  setInfo(`Saved ${name}.`);
}

function deletePattern() {
  const value = $('#pattern-select').value;
  if (!value.startsWith('user:')) return;
  const name = value.slice(5);
  writeSaved(readSaved().filter(p => p.name !== name));
  rebuildOptions(); clearPattern();
  setInfo(`Deleted ${name}.`);
}

(function wirePatterns() {
  rebuildOptions();
  $('#pattern-build').addEventListener('click', toggleBuild);
  $('#pattern-select').addEventListener('change', e => loadSelected(e.target.value));
  $('#pattern-save').addEventListener('click', savePattern);
  $('#pattern-name').addEventListener('keydown', e => { if (e.key === 'Enter') savePattern(); });
  $('#pattern-delete').addEventListener('click', deletePattern);
  $('#pattern-clear').addEventListener('click', clearPattern);
})();
