// ---
// purpose: Suites 1-5: music helpers, data integrity, lick data, scale chromas and spelling
// exports: none (registers suites)
// depends: tests-lib.js (window.T), data.js, engine.js
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok, arrEq = T.arrEq, setEq = T.setEq;
  var applyKey = T.applyKey, SCALES = T.SCALES;
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
})();
