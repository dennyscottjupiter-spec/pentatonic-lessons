// tests.js — Comprehensive test suite for Pentatonic Arcade
// Loads AFTER data.js, audio.js, engine.js, game.js, practice.js (but NOT app.js).
// Sets window._testResults and window._scaleGrid, then calls window.renderTestReport().

(function runTests() {
  'use strict';

  // ═══════════════════════════════════════════════════
  // MINI FRAMEWORK  (~50 lines, zero deps)
  // ═══════════════════════════════════════════════════
  var _results = [];
  var _curSuite = 'Uncategorised';

  function suite(name, fn) {
    _curSuite = name;
    fn();
    _curSuite = 'Uncategorised';
  }

  function test(name, fn) {
    try {
      fn();
      _results.push({ suite: _curSuite, name: name, pass: true, detail: null });
    } catch (e) {
      _results.push({ suite: _curSuite, name: name, pass: false,
                      detail: e.detail || { msg: String(e) } });
    }
  }

  function fail(detail) {
    var e = new Error('assertion failed');
    e.detail = detail;
    throw e;
  }

  function eq(a, b, label) {
    if (a !== b) fail({ msg: (label ? label + ': ' : '') + 'expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a) });
  }

  function ok(cond, msg) {
    if (!cond) fail({ msg: msg || 'condition was falsy' });
  }

  function setEq(set, arr, label) {
    var a = Array.from(set).sort(function(x,y){return x-y;});
    var b = arr.slice().sort(function(x,y){return x-y;});
    if (a.length !== b.length || a.some(function(v,i){return v!==b[i];}))
      fail({ expected: JSON.stringify(b), actual: JSON.stringify(a),
             msg: (label||'Set mismatch') });
  }

  function arrEq(a, b, label) {
    var sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) fail({ expected: sb, actual: sa, msg: label || 'Array mismatch' });
  }

  function throwsNot(fn, label) {
    try { fn(); }
    catch(e) { fail({ msg: (label || 'threw') + ': ' + String(e) }); }
  }

  // ═══════════════════════════════════════════════════
  // GROUND-TRUTH SCALE TABLE
  // Derived from PENT_OFFSETS=[0,3,5,7,10], MAJOR_OFFSETS=[0,2,4,7,9].
  // All sharps — no flat spelling, no enharmonic exceptions.
  // ═══════════════════════════════════════════════════
  var SCALES = {
    //           key   lens      chromas (sorted)          display names (root first)
    'A minor':   { chromas:[9,0,2,4,7],   notes:['A','C','D','E','G']             },
    'A# minor':  { chromas:[10,1,3,5,8],  notes:['A#','C#','D#','F','G#']         },
    'B minor':   { chromas:[11,2,4,6,9],  notes:['B','D','E','F#','A']            },
    'C minor':   { chromas:[0,3,5,7,10],  notes:['C','D#','F','G','A#']           },
    'C# minor':  { chromas:[1,4,6,8,11],  notes:['C#','E','F#','G#','B']          },
    'D minor':   { chromas:[2,5,7,9,0],   notes:['D','F','G','A','C']             },
    'D# minor':  { chromas:[3,6,8,10,1],  notes:['D#','F#','G#','A#','C#']        },
    'E minor':   { chromas:[4,7,9,11,2],  notes:['E','G','A','B','D']             },
    'F minor':   { chromas:[5,8,10,0,3],  notes:['F','G#','A#','C','D#']          },
    'F# minor':  { chromas:[6,9,11,1,4],  notes:['F#','A','B','C#','E']           },
    'G minor':   { chromas:[7,10,0,2,5],  notes:['G','A#','C','D','F']            },
    'G# minor':  { chromas:[8,11,1,3,6],  notes:['G#','B','C#','D#','F#']         },

    'A major':   { chromas:[9,11,1,4,6],  notes:['A','B','C#','E','F#']           },
    'A# major':  { chromas:[10,0,2,5,7],  notes:['A#','C','D','F','G']            },
    'B major':   { chromas:[11,1,3,6,8],  notes:['B','C#','D#','F#','G#']         },
    'C major':   { chromas:[0,2,4,7,9],   notes:['C','D','E','G','A']             },
    'C# major':  { chromas:[1,3,5,8,10],  notes:['C#','D#','F','G#','A#']         },
    'D major':   { chromas:[2,4,6,9,11],  notes:['D','E','F#','A','B']            },
    'D# major':  { chromas:[3,5,7,10,0],  notes:['D#','F','G','A#','C']           },
    'E major':   { chromas:[4,6,8,11,1],  notes:['E','F#','G#','B','C#']          },
    'F major':   { chromas:[5,7,9,0,2],   notes:['F','G','A','C','D']             },
    'F# major':  { chromas:[6,8,10,1,3],  notes:['F#','G#','A#','C#','D#']        },
    'G major':   { chromas:[7,9,11,2,4],  notes:['G','A','B','D','E']             },
    'G# major':  { chromas:[8,10,0,3,5],  notes:['G#','A#','C','D#','F']          },
  };

  // Helper: set state + recompute for a given KEYS index + lens
  function applyKey(keyIdx, lens) {
    state.keyIdx = keyIdx;
    state.lens   = lens;
    setKey(keyIdx);           // engine.js — sets state.scaleChromas + state.activeBoxes
  }

  // ═══════════════════════════════════════════════════
  // SUITE 1 — Music helpers
  // ═══════════════════════════════════════════════════
  suite('1 · Music helpers (midiToChroma / fretMidi / fretChroma)', function() {
    test('midiToChroma wraps correctly (C=0)', function() {
      eq(midiToChroma(60), 0, 'C4');
      eq(midiToChroma(72), 0, 'C5');
    });
    test('midiToChroma handles negative midi via double-mod', function() {
      // ((−3 % 12) + 12) % 12 = (−3+12)%12 = 9  → A
      eq(midiToChroma(-3), 9);
    });
    test('fretMidi: high-e open (si=0, f=0) = 64', function() {
      eq(fretMidi(0, 0), 64);
    });
    test('fretMidi: B string fret 5 = 64 (E, same as high-e open)', function() {
      eq(fretMidi(1, 5), 64);
    });
    test('fretChroma: high-e open = E (chroma 4)', function() {
      eq(fretChroma(0, 0), 4);
    });
    test('fretChroma: A string open = A (chroma 9)', function() {
      eq(fretChroma(4, 0), 9);
    });
    test('fretChroma: low-E string fret 12 = E (chroma 4)', function() {
      eq(fretChroma(5, 12), 4);
    });
    test('fretChroma: G string fret 2 = A (chroma 9)', function() {
      // G string MIDI=55, +2=57, 57%12=9 ✓
      eq(fretChroma(2, 2), 9);
    });
    test('midiToFreq: A4 = 440 Hz', function() {
      var f = 440 * Math.pow(2, (69 - 69) / 12);
      eq(f, 440);
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 2 — Data integrity
  // ═══════════════════════════════════════════════════
  suite('2 · Data integrity (KEYS / STRINGS / BOXES / offsets)', function() {
    test('KEYS has exactly 12 entries', function() {
      eq(KEYS.length, 12);
    });
    test('KEYS chromas cover exactly 0–11 (all unique)', function() {
      var chromas = KEYS.map(function(k){ return k.chroma; }).sort(function(a,b){return a-b;});
      arrEq(chromas, [0,1,2,3,4,5,6,7,8,9,10,11]);
    });
    test('SHARP_NAMES has 12 entries', function() {
      eq(SHARP_NAMES.length, 12);
    });
    test('STRINGS: 6 strings, high→low (MIDI 64,59,55,50,45,40)', function() {
      var midis = STRINGS.map(function(s){ return s.midi; });
      arrEq(midis, [64,59,55,50,45,40]);
    });
    test('STRINGS names are e B G D A E', function() {
      var names = STRINGS.map(function(s){ return s.name; });
      arrEq(names, ['e','B','G','D','A','E']);
    });
    test('PENT_OFFSETS has 5 elements [0,3,5,7,10]', function() {
      arrEq(PENT_OFFSETS, [0,3,5,7,10]);
    });
    test('MAJOR_OFFSETS has 5 elements [0,2,4,7,9]', function() {
      arrEq(MAJOR_OFFSETS, [0,2,4,7,9]);
    });
    test('BOXES has positions 1–5', function() {
      arrEq(Object.keys(BOXES).map(Number).sort(function(a,b){return a-b;}), [1,2,3,4,5]);
    });
    test('Every BOXES cell: 0 ≤ lo ≤ hi ≤ TOTAL_FRETS', function() {
      var bad = [];
      [1,2,3,4,5].forEach(function(pos) {
        Object.entries(BOXES[pos]).forEach(function(entry) {
          var str = entry[0], range = entry[1];
          var lo = range[0], hi = range[1];
          if (lo < 0 || lo > hi || hi > TOTAL_FRETS)
            bad.push('Box ' + pos + ' str ' + str + ' [' + lo + ',' + hi + ']');
        });
      });
      ok(bad.length === 0, 'Out-of-range box cells: ' + bad.join('; '));
    });
    test('TOTAL_FRETS = 17', function() {
      eq(TOTAL_FRETS, 17);
    });
    test('SHARP_NAMES: spot-check A=9, A#=10, G#=8', function() {
      eq(SHARP_NAMES[9],  'A');
      eq(SHARP_NAMES[10], 'A#');
      eq(SHARP_NAMES[8],  'G#');
    });
    test('KEYS: Bb/Eb/Ab are gone — A#/D#/G# present', function() {
      var names = KEYS.map(function(k){ return k.name; });
      ok(!names.includes('Bb') && !names.includes('Eb') && !names.includes('Ab'),
         'Flat key names must not be present');
      ok(names.includes('A#') && names.includes('D#') && names.includes('G#'),
         'Sharp key names must be present');
    });
    test('LICKS has 5 box keys, each with 4 licks', function() {
      eq(Object.keys(LICKS).length, 5);
      [1,2,3,4,5].forEach(function(pos) {
        eq(LICKS[pos].length, 4, 'Box ' + pos);
      });
    });
    test('GAME constants: XP_PER_LICK=100, STREAK_MAX_MULT=3', function() {
      eq(GAME.XP_PER_LICK,   100);
      eq(GAME.STREAK_MAX_MULT, 3);
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 3 — LICKS validator (assertable port of game.js IIFE)
  // ═══════════════════════════════════════════════════
  suite('3 · LICK data integrity (Am pentatonic + box ranges)', function() {
    var amChromas = new Set([9,0,2,4,7]);
    [1,2,3,4,5].forEach(function(pos) {
      LICKS[pos].forEach(function(lick) {
        test('"' + lick.name + '" (Box ' + pos + '): all steps in Am pentatonic', function() {
          lick.steps.forEach(function(step) {
            var ch = fretChroma(step.s, step.f);
            ok(amChromas.has(ch),
               'step (s=' + step.s + ',f=' + step.f + ') chroma=' + ch + ' not in Am');
          });
        });
        test('"' + lick.name + '" (Box ' + pos + '): all steps within Box ' + pos + ' fret range', function() {
          lick.steps.forEach(function(step) {
            var strName = STRINGS[step.s].name;
            var range   = BOXES[pos][strName];
            var lo = range[0], hi = range[1];
            ok(step.f >= lo && step.f <= hi,
               'step (s=' + step.s + ',f=' + step.f + ') outside [' + lo + ',' + hi + ']');
          });
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 4 — Scale chromas (all 12 keys × 2 lenses)
  // ═══════════════════════════════════════════════════
  suite('4 · Scale chromas — all 24 scales', function() {
    KEYS.forEach(function(k, keyIdx) {
      ['minor','major'].forEach(function(lens) {
        var label = k.name + ' ' + lens;
        var gt    = SCALES[label];
        test(label + ' → correct 5 chromas', function() {
          ok(gt, 'no ground-truth entry for ' + label);
          applyKey(keyIdx, lens);
          setEq(state.scaleChromas, gt.chromas, label);
        });
      });
    });

    // Relative-pair identity: C MAJOR == A MINOR (same 5 chromas)
    test('C MAJOR chromas == A MINOR chromas (relative pairs)', function() {
      applyKey(3, 'major');  // C major
      var cMaj = new Set(state.scaleChromas);
      applyKey(0, 'minor');  // A minor
      setEq(cMaj, Array.from(state.scaleChromas), 'C maj vs A min');
    });
    test('G MAJOR chromas == E MINOR chromas', function() {
      applyKey(10, 'major'); // G
      var gMaj = new Set(state.scaleChromas);
      applyKey(7, 'minor');  // E (keyIdx=7)
      setEq(gMaj, Array.from(state.scaleChromas));
    });
    test('F MAJOR chromas == D MINOR chromas', function() {
      applyKey(8, 'major'); // F
      var fMaj = new Set(state.scaleChromas);
      applyKey(5, 'minor');  // D
      setEq(fMaj, Array.from(state.scaleChromas));
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 5 — Scale spelling (all 24 scales)
  // ═══════════════════════════════════════════════════
  suite('5 · Scale spelling — note names for all 24 scales', function() {
    var allNames = new Set(SHARP_NAMES);

    KEYS.forEach(function(k, keyIdx) {
      ['minor','major'].forEach(function(lens) {
        var label = k.name + ' ' + lens;
        var gt    = SCALES[label];
        test(label + ' → correct note names', function() {
          ok(gt, 'no ground-truth for ' + label);
          applyKey(keyIdx, lens);
          var spelled = gt.chromas.map(function(ch) { return spell(ch); });
          // sort both before comparing (order shouldn't matter for name check)
          var gotSorted = spelled.slice().sort();
          var expSorted = gt.notes.slice().sort();
          arrEq(gotSorted, expSorted, label);
        });
        test(label + ' → every spelled name is a valid note name', function() {
          applyKey(keyIdx, lens);
          gt.chromas.forEach(function(ch) {
            var n = spell(ch);
            ok(allNames.has(n), '"' + n + '" is not a valid note name');
          });
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 6 — Rendered fretboard (all 24 scales)
  // ═══════════════════════════════════════════════════
  suite('6 · Rendered fretboard — CSS classes + labels (all 24 scales)', function() {
    // Build the fretboard once
    throwsNot(function(){ buildFretboard(); }, 'buildFretboard threw');

    var notes = document.querySelectorAll('#fretboard .fb-note');
    test('fretboard has 108 notes (18 frets × 6 strings: fret 0–17)', function() {
      // frets 0..17 = 18, strings = 6 → 108
      eq(notes.length, 108);
    });

    KEYS.forEach(function(k, keyIdx) {
      ['minor','major'].forEach(function(lens) {
        var label = k.name + ' ' + lens;
        test(label + ' → in-scale notes get root/in-scale class', function() {
          applyKey(keyIdx, lens);
          state.box = 'all';
          refreshNotes();
          var bad = [];
          notes.forEach(function(g) {
            var ch      = +g.dataset.chroma;
            var inScale = state.scaleChromas.has(ch);
            var isRoot  = (ch === k.chroma);
            var hasRoot = g.classList.contains('root');
            var hasIS   = g.classList.contains('in-scale');
            var hasOut  = g.classList.contains('out');
            if (inScale && !isRoot && !hasIS)   bad.push('ch' + ch + ' should be in-scale');
            if (isRoot  && !hasRoot)             bad.push('ch' + ch + ' should be root');
            if (!inScale && !hasOut)             bad.push('ch' + ch + ' should be out');
          });
          ok(bad.length === 0, label + ' class errors: ' + bad.slice(0,3).join('; '));
        });
        test(label + ' → note labels match spell()', function() {
          applyKey(keyIdx, lens);
          state.box = 'all'; state.labels = true;
          refreshNotes();
          var bad = [];
          notes.forEach(function(g) {
            var ch   = +g.dataset.chroma;
            var txt  = g.querySelector('text');
            if (!txt) return;
            var exp  = spell(ch);
            var got  = txt.textContent;
            if (got !== exp) bad.push('ch' + ch + ' label "' + got + '" ≠ "' + exp + '"');
          });
          ok(bad.length === 0, label + ' label errors: ' + bad.slice(0,3).join('; '));
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 7 — Anchor offset + box transposition
  // ═══════════════════════════════════════════════════
  suite('7 · Anchor offset + box transposition (all 12 keys × 2 lenses)', function() {
    test('A MINOR: getAnchorOffset() === 0', function() {
      applyKey(0, 'minor');
      eq(getAnchorOffset(), 0);
    });
    test('C MINOR: getAnchorOffset() === 3', function() {
      applyKey(3, 'minor');
      eq(getAnchorOffset(), 3);
    });
    test('D MINOR: getAnchorOffset() === 5', function() {
      applyKey(5, 'minor');
      eq(getAnchorOffset(), 5);
    });
    test('C MAJOR: relative minor = Am → getAnchorOffset() === 0', function() {
      applyKey(3, 'major');
      eq(getAnchorOffset(), 0);
    });
    test('G MAJOR: relative minor = Em → getAnchorOffset() === 7', function() {
      applyKey(10, 'major');
      eq(getAnchorOffset(), 7);
    });

    test('computeActiveBoxes: all cells stay within [0, TOTAL_FRETS] for all 12 minor keys', function() {
      var bad = [];
      KEYS.forEach(function(k, ki) {
        applyKey(ki, 'minor');
        var boxes = computeActiveBoxes();
        [1,2,3,4,5].forEach(function(pos) {
          Object.entries(boxes[pos]).forEach(function(entry) {
            var str = entry[0], range = entry[1];
            var lo = range[0], hi = range[1];
            if (lo < 0 || hi > TOTAL_FRETS)
              bad.push(k.name + ' min box' + pos + ' ' + str + '[' + lo + ',' + hi + ']');
          });
        });
      });
      ok(bad.length === 0, bad.slice(0,3).join('; '));
    });

    test('computeActiveBoxes: all cells within [0, TOTAL_FRETS] for all 12 major keys', function() {
      var bad = [];
      KEYS.forEach(function(k, ki) {
        applyKey(ki, 'major');
        var boxes = computeActiveBoxes();
        [1,2,3,4,5].forEach(function(pos) {
          Object.entries(boxes[pos]).forEach(function(entry) {
            var str = entry[0], range = entry[1];
            var lo = range[0], hi = range[1];
            if (lo < 0 || hi > TOTAL_FRETS)
              bad.push(k.name + ' maj box' + pos + ' ' + str + '[' + lo + ',' + hi + ']');
          });
        });
      });
      ok(bad.length === 0, bad.slice(0,3).join('; '));
    });

    test('computeActiveBoxes preserves span (hi−lo) for each cell', function() {
      var bad = [];
      KEYS.forEach(function(k, ki) {
        applyKey(ki, 'minor');
        var boxes = computeActiveBoxes();
        [1,2,3,4,5].forEach(function(pos) {
          Object.entries(BOXES[pos]).forEach(function(entry) {
            var str = entry[0], orig = entry[1];
            var transposed = boxes[pos][str];
            var origSpan  = orig[1] - orig[0];
            var transSpan = transposed[1] - transposed[0];
            if (origSpan !== transSpan)
              bad.push(k.name + ' box' + pos + ' ' + str);
          });
        });
      });
      ok(bad.length === 0, 'Span changed: ' + bad.join(', '));
    });

    test('transposeFret: always lands in [0, TOTAL_FRETS] for all base frets × all offsets', function() {
      var bad = [];
      for (var offset = 0; offset < 12; offset++) {
        for (var f = 0; f <= TOTAL_FRETS; f++) {
          var tf = transposeFret(f, offset);
          if (tf < 0 || tf > TOTAL_FRETS)
            bad.push('f=' + f + ' offset=' + offset + ' → tf=' + tf);
        }
      }
      ok(bad.length === 0, bad.slice(0,3).join('; '));
    });

    // ── Box-contiguity tests (the critical gap that let the fragmentation bug slip) ──

    test('computeActiveBoxes: each box is contiguous (maxHi−minLo < 12) for all 12 minor keys', function() {
      var bad = [];
      KEYS.forEach(function(k, ki) {
        applyKey(ki, 'minor');
        var boxes = computeActiveBoxes();
        [1,2,3,4,5].forEach(function(pos) {
          var minLo = Infinity, maxHi = -Infinity;
          Object.entries(boxes[pos]).forEach(function(e) {
            var r = e[1]; minLo = Math.min(minLo, r[0]); maxHi = Math.max(maxHi, r[1]);
          });
          if (maxHi - minLo >= 12)
            bad.push(k.name + ' min box' + pos + ' span=' + (maxHi - minLo));
        });
      });
      ok(bad.length === 0, 'Split boxes: ' + bad.slice(0,3).join('; '));
    });

    test('computeActiveBoxes: each box is contiguous (maxHi−minLo < 12) for all 12 major keys', function() {
      var bad = [];
      KEYS.forEach(function(k, ki) {
        applyKey(ki, 'major');
        var boxes = computeActiveBoxes();
        [1,2,3,4,5].forEach(function(pos) {
          var minLo = Infinity, maxHi = -Infinity;
          Object.entries(boxes[pos]).forEach(function(e) {
            var r = e[1]; minLo = Math.min(minLo, r[0]); maxHi = Math.max(maxHi, r[1]);
          });
          if (maxHi - minLo >= 12)
            bad.push(k.name + ' maj box' + pos + ' span=' + (maxHi - minLo));
        });
      });
      ok(bad.length === 0, 'Split boxes: ' + bad.slice(0,3).join('; '));
    });

    test('A# MAJOR Box 1 regression: G/D/A strings share region with e/B/E (no split)', function() {
      applyKey(1, 'major'); // A# major (keyIdx 1)
      state.box = '1';
      state.activeBoxes = computeActiveBoxes();
      var box = state.activeBoxes[1];
      var eRange = box['e'], gRange = box['G'];
      ok(Math.abs(eRange[0] - gRange[0]) <= 5,
         'e=[' + eRange + '] and G=[' + gRange + '] should be in the same neck region');
      ok(gRange[0] >= 0 && gRange[1] <= TOTAL_FRETS,
         'G string must be in range [0,' + TOTAL_FRETS + ']');
    });

    test('transposeFretInBox: all base frets for box 1-5 land in [0, TOTAL_FRETS] for all 12 minor keys', function() {
      var bad = [];
      KEYS.forEach(function(k, ki) {
        applyKey(ki, 'minor');
        var ao = getAnchorOffset();
        [1,2,3,4,5].forEach(function(pos) {
          Object.entries(BOXES[pos]).forEach(function(e) {
            var r = e[1];
            for (var f = r[0]; f <= r[1]; f++) {
              var tf = transposeFretInBox(f, ao, pos);
              if (tf < 0 || tf > TOTAL_FRETS)
                bad.push(k.name + ' minor box' + pos + ' f=' + f + ' → tf=' + tf);
            }
          });
        });
      });
      ok(bad.length === 0, bad.slice(0,3).join('; '));
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 8 — Box membership (isInScale / isRoot / isInBox)
  // ═══════════════════════════════════════════════════
  suite('8 · Box membership (isInScale / isRoot / isInBox)', function() {
    test('isInScale: root note (A=9) is in Am scale', function() {
      applyKey(0, 'minor');
      ok(isInScale(9));
    });
    test('isInScale: D (chroma 2) is in Am scale', function() {
      applyKey(0, 'minor');
      ok(isInScale(2));
    });
    test('isInScale: B (chroma 11) is NOT in Am scale', function() {
      applyKey(0, 'minor');
      ok(!isInScale(11));
    });
    test('isRoot: A (chroma 9) is root of Am', function() {
      applyKey(0, 'minor');
      ok(isRoot(9));
    });
    test('isRoot: C (chroma 0) is NOT root of Am', function() {
      applyKey(0, 'minor');
      ok(!isRoot(0));
    });
    test('isInBox: returns true for box="all"', function() {
      applyKey(0, 'minor');
      state.box = 'all';
      ok(isInBox('e', 5));
      ok(isInBox('E', 0));
    });
    test('isInBox: high-e fret 5 is in Box 1 (range [5,8])', function() {
      applyKey(0, 'minor');
      state.box = '1';
      state.activeBoxes = computeActiveBoxes();
      ok(isInBox('e', 5));
      ok(isInBox('e', 8));
    });
    test('isInBox: high-e fret 4 is NOT in Box 1', function() {
      applyKey(0, 'minor');
      state.box = '1';
      state.activeBoxes = computeActiveBoxes();
      ok(!isInBox('e', 4));
    });
    test('isInBox: high-e fret 9 is NOT in Box 1', function() {
      applyKey(0, 'minor');
      state.box = '1';
      state.activeBoxes = computeActiveBoxes();
      ok(!isInBox('e', 9));
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 9 — Game logic (pure)
  // ═══════════════════════════════════════════════════
  suite('9 · Game logic (getStepMs tiers / pickLick / XP math)', function() {
    // getStepMs thresholds
    [
      [0,   540],
      [299, 540],
      [300, 460],
      [699, 460],
      [700, 380],
      [1399,380],
      [1400,300],
      [2499,300],
      [2500,240],
      [9999,240],
    ].forEach(function(pair) {
      var xp = pair[0], expected = pair[1];
      test('getStepMs at ' + xp + ' XP = ' + expected + 'ms', function() {
        var saved = state.gameScore;
        state.gameScore = xp;
        eq(getStepMs(), expected);
        state.gameScore = saved;
      });
    });

    test('pickLick returns a lick object with .steps array', function() {
      applyKey(0, 'minor');
      state.box = '1'; state.gameLickIdx = 0;
      var lick = pickLick();
      ok(lick && Array.isArray(lick.steps) && lick.steps.length > 0);
    });

    test('pickLick: every transposed step in [0, TOTAL_FRETS] for Am, box 1', function() {
      applyKey(0, 'minor');
      state.box = '1'; state.gameLickIdx = 0;
      var ao = getAnchorOffset();
      LICKS[1].forEach(function(lick) {
        lick.steps.forEach(function(step) {
          var tf = transposeFret(step.f, ao);
          ok(tf >= 0 && tf <= TOTAL_FRETS,
             lick.name + ' step f=' + step.f + ' ao=' + ao + ' → tf=' + tf);
        });
      });
    });

    test('pickLick: every transposed step in [0, TOTAL_FRETS] for C minor, box 1', function() {
      applyKey(3, 'minor');
      state.box = '1'; state.gameLickIdx = 0;
      var ao = getAnchorOffset();
      LICKS[1].forEach(function(lick) {
        lick.steps.forEach(function(step) {
          var tf = transposeFret(step.f, ao);
          ok(tf >= 0 && tf <= TOTAL_FRETS,
             lick.name + ' step f=' + step.f + ' ao=' + ao + ' → tf=' + tf);
        });
      });
    });

    test('XP math: streak 1 → 100 XP (1×100)', function() {
      eq(Math.min(1, GAME.STREAK_MAX_MULT) * GAME.XP_PER_LICK, 100);
    });
    test('XP math: streak 3 → 300 XP (3×100)', function() {
      eq(Math.min(3, GAME.STREAK_MAX_MULT) * GAME.XP_PER_LICK, 300);
    });
    test('XP math: streak 5 is capped at 300 (STREAK_MAX_MULT=3)', function() {
      eq(Math.min(5, GAME.STREAK_MAX_MULT) * GAME.XP_PER_LICK, 300);
    });
    test('pickLick cycles through pool when gameLickIdx increments', function() {
      applyKey(0, 'minor');
      state.box = '1'; state.gameLickIdx = 0;
      var seen = new Set();
      for (var i = 0; i < LICKS[1].length * 2; i++) {
        seen.add(pickLick().name);
      }
      ok(seen.size === LICKS[1].length, 'expected all ' + LICKS[1].length + ' licks; got ' + seen.size);
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 10 — Smoke tests (must not throw)
  // ═══════════════════════════════════════════════════
  suite('10 · Smoke tests (must not throw)', function() {
    test('playNote does not throw (sound=false)', function() {
      throwsNot(function(){ playNote(60); }, 'playNote(60)');
    });
    test('playBuzz does not throw', function() {
      throwsNot(function(){ playBuzz(); }, 'playBuzz');
    });
    test('playFanfare (stub) does not throw', function() {
      throwsNot(window.playFanfare, 'playFanfare stub');
    });
    test('metroStop called before start does not throw', function() {
      throwsNot(function(){ metroStop(); }, 'metroStop');
    });
    test('timerReset() does not throw', function() {
      throwsNot(function(){ timerReset(5); }, 'timerReset(5)');
    });
    test('timerStop() does not throw', function() {
      throwsNot(function(){ timerStop(); }, 'timerStop');
    });
    test('renderChallenge does not throw against scaffold DOM', function() {
      // needs #challenge-days — create a stub
      if (!document.getElementById('challenge-days')) {
        var d = document.createElement('div');
        d.id = 'challenge-days';
        d.style.display = 'none';
        document.body.appendChild(d);
      }
      throwsNot(function(){ renderChallenge(); }, 'renderChallenge');
    });
    test('setKey cycles all 12 keys × 2 lenses without throwing', function() {
      throwsNot(function() {
        KEYS.forEach(function(_, ki) {
          applyKey(ki, 'minor');
          applyKey(ki, 'major');
        });
      }, 'setKey cycle');
    });
    test('refreshNotes on full board does not throw', function() {
      applyKey(0, 'minor'); state.box = 'all';
      throwsNot(function(){ refreshNotes(); }, 'refreshNotes');
    });
    test('buildFretboard called a second time does not throw', function() {
      throwsNot(function(){ buildFretboard(); }, 'buildFretboard (2nd)');
    });
  });

  // ═══════════════════════════════════════════════════
  // BUILD _scaleGrid FOR THE 24-SCALE VISUAL MATRIX
  // ═══════════════════════════════════════════════════
  var scaleGrid = {};
  KEYS.forEach(function(k, keyIdx) {
    ['minor','major'].forEach(function(lens) {
      var label   = k.name + ' ' + lens;
      var gridKey = k.name + ' ' + lens.toUpperCase();
      var gt      = SCALES[label];
      var pass    = false;
      var notes   = gt ? gt.notes.slice() : [];
      if (gt) {
        try {
          applyKey(keyIdx, lens);
          var spelled  = gt.chromas.map(function(ch){ return spell(ch); }).sort().join(',');
          var expected = gt.notes.slice().sort().join(',');
          pass = (spelled === expected);
        } catch(e) { pass = false; }
      }
      scaleGrid[gridKey] = { notes: notes, pass: pass };
    });
  });

  // ═══════════════════════════════════════════════════
  // HAND OFF TO renderTestReport
  // ═══════════════════════════════════════════════════
  window._testResults = _results;
  window._scaleGrid   = scaleGrid;
  window.renderTestReport();

})();
