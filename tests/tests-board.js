// ---
// purpose: Suites 6-8: rendered fretboard classes/labels, box transposition, box membership
// exports: none (registers suites)
// depends: tests-lib.js (window.T), engine.js, data.js
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok, throwsNot = T.throwsNot;
  var applyKey = T.applyKey;
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
})();
