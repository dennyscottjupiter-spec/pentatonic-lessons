// ---
// purpose: Suites 11-12: flat/sharp spelling, flat key titles, blue-note colour and box slack
// exports: none (registers suites)
// depends: tests-lib.js (window.T), engine.js (spell, setKey, refreshNotes, blueChroma, isBlue, isInBox)
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok, arrEq = T.arrEq;
  var applyKey = T.applyKey, reset = T.reset, SCALES = T.SCALES;

  // Literal tables, independent of data.js
  var SHARP     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var FLAT      = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  var KEY_NAMES = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
  var ROOTS     = [9,10,11,0,1,2,3,4,5,6,7,8];
  var STR_NAMES = ['e','B','G','D','A','E'];

  // Blue-chroma notes in one box that sit exactly 1 or 2 frets outside its range
  function blueSlack(boxName) {
    var box = state.activeBoxes[boxName], bc = (ROOTS[state.keyIdx] + 6) % 12;
    var out = { one: 0, two: 0, badOne: [], badTwo: [] };
    document.querySelectorAll('#fretboard .fb-note').forEach(function(g) {
      if (+g.dataset.chroma !== bc) return;
      var si = +g.dataset.string, f = +g.dataset.fret, r = box[STR_NAMES[si]];
      var where = STR_NAMES[si] + '@' + f, dimmed = g.classList.contains('dimmed');
      if (f === r[0] - 1 || f === r[1] + 1) { out.one++; if (dimmed) out.badOne.push(where); }
      if (f === r[0] - 2 || f === r[1] + 2) { out.two++; if (!dimmed) out.badTwo.push(where); }
    });
    return out;
  }

  // ═══════════════════════════════════════════════════
  // SUITE 11 — Note names: sharps / flats
  // ═══════════════════════════════════════════════════
  suite('11 · Note names — sharps / flats (spell, key title, fretboard labels)', function() {
    test('spell() with flats: chromas 0-11 give the literal flat list', function() {
      try {
        state.accidentals = 'flat';
        var got = [];
        for (var c = 0; c < 12; c++) got.push(spell(c));
        arrEq(got, FLAT, 'flat spell');
      } finally { reset(); }
    });
    test('spell() with sharps: chromas 0-11 give the literal sharp list', function() {
      try {
        state.accidentals = 'sharp';
        var got = [];
        for (var c = 0; c < 12; c++) got.push(spell(c));
        arrEq(got, SHARP, 'sharp spell');
      } finally { reset(); }
    });

    KEY_NAMES.forEach(function(name, ki) {
      ['minor','major'].forEach(function(lens) {
        var label = name + ' ' + lens;
        test(label + ' → flat spelling equals the ground-truth chromas mapped through FLAT', function() {
          try {
            state.accidentals = 'flat';
            applyKey(ki, lens);
            var gt  = SCALES[label];
            var got = gt.chromas.map(function(ch) { return spell(ch); });
            var exp = gt.chromas.map(function(ch) { return FLAT[ch]; });
            arrEq(got.slice().sort(), exp.slice().sort(), label);
          } finally { reset(); }
        });
      });
    });

    test('setKey flat title: A# minor → "Bb MINOR PENTATONIC (rel. Db MAJ)"', function() {
      try {
        state.accidentals = 'flat';
        applyKey(1, 'minor');
        eq(document.getElementById('level-title').textContent, 'Bb MINOR PENTATONIC (rel. Db MAJ)');
      } finally { reset(); }
    });
    test('setKey flat title: A major → "A MAJOR PENTATONIC (rel. Gbm)"', function() {
      try {
        state.accidentals = 'flat';
        applyKey(0, 'major');
        eq(document.getElementById('level-title').textContent, 'A MAJOR PENTATONIC (rel. Gbm)');
      } finally { reset(); }
    });
    test('setKey sharp title: A# minor → "A# MINOR PENTATONIC (rel. C# MAJ)"', function() {
      try {
        state.accidentals = 'sharp';
        applyKey(1, 'minor');
        eq(document.getElementById('level-title').textContent, 'A# MINOR PENTATONIC (rel. C# MAJ)');
      } finally { reset(); }
    });

    test('refreshNotes relabels all 108 notes to the flat name of their chroma', function() {
      try {
        state.accidentals = 'flat';
        applyKey(0, 'minor'); state.box = 'all';
        refreshNotes();
        var notes = document.querySelectorAll('#fretboard .fb-note'), bad = [];
        eq(notes.length, 108, 'note count');
        notes.forEach(function(g) {
          var txt = g.querySelector('text'), ch = +g.dataset.chroma;
          if (!txt || txt.textContent !== FLAT[ch]) bad.push('ch' + ch + ' "' + (txt && txt.textContent) + '"');
        });
        ok(bad.length === 0, 'label errors: ' + bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });
  });

  // ═══════════════════════════════════════════════════
  // SUITE 12 — Blue notes
  // ═══════════════════════════════════════════════════
  suite('12 · Blue notes (blueChroma / isBlue / refreshNotes class / box slack)', function() {
    test('blueChroma() = root+6 (minor) or root+3 (major) for all 24 scales', function() {
      try {
        var bad = [];
        KEY_NAMES.forEach(function(name, ki) {
          ['minor','major'].forEach(function(lens) {
            applyKey(ki, lens);
            var want = (ROOTS[ki] + (lens === 'minor' ? 6 : 3)) % 12;
            if (blueChroma() !== want) bad.push(name + ' ' + lens + ' got ' + blueChroma() + ' want ' + want);
          });
        });
        ok(bad.length === 0, bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });

    test('blue chroma is never a scale note (all 24 scales)', function() {
      try {
        KEY_NAMES.forEach(function(name, ki) {
          ['minor','major'].forEach(function(lens) {
            applyKey(ki, lens);
            ok(!state.scaleChromas.has(blueChroma()), name + ' ' + lens + ': blue chroma is in scale');
          });
        });
      } finally { reset(); }
    });

    test('isBlue() is false for every chroma when blues are off', function() {
      try {
        applyKey(0, 'minor'); state.blues = false;
        for (var c = 0; c < 12; c++) ok(!isBlue(c), 'isBlue(' + c + ') with blues off');
      } finally { reset(); }
    });

    test('isBlue() with blues on is true only for D# (A minor blue chroma 3)', function() {
      try {
        applyKey(0, 'minor'); state.blues = true;
        for (var c = 0; c < 12; c++) eq(isBlue(c), c === 3, 'isBlue(' + c + ')');
      } finally { reset(); }
    });

    test('refreshNotes (box all, blues on): class blue on exactly the blue-chroma notes, never out', function() {
      try {
        applyKey(0, 'minor'); state.box = 'all'; state.blues = true;
        refreshNotes();
        var bc = (ROOTS[0] + 6) % 12, count = 0, bad = [];
        document.querySelectorAll('#fretboard .fb-note').forEach(function(g) {
          var isB = g.classList.contains('blue');
          if (+g.dataset.chroma === bc) {
            count++;
            if (!isB) bad.push('missing blue ' + g.dataset.string + ':' + g.dataset.fret);
            if (g.classList.contains('out')) bad.push('blue is out ' + g.dataset.string + ':' + g.dataset.fret);
          } else if (isB) bad.push('extra blue ' + g.dataset.string + ':' + g.dataset.fret);
        });
        ok(count > 0, 'no blue-chroma notes found');
        ok(bad.length === 0, bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });

    test('refreshNotes (box all, blues off): no note has class blue', function() {
      try {
        applyKey(0, 'minor'); state.box = 'all'; state.blues = false;
        refreshNotes();
        eq(document.querySelectorAll('#fretboard .fb-note.blue').length, 0);
      } finally { reset(); }
    });

    test('box slack (A minor, box 1): a blue note 1 fret outside the box is not dimmed', function() {
      try {
        applyKey(0, 'minor'); state.box = '1'; state.blues = true;
        refreshNotes();
        var r = blueSlack('1');
        ok(r.one >= 1, 'no 1-outside blue note found in A minor box 1');
        ok(r.badOne.length === 0, 'dimmed 1-outside blue: ' + r.badOne.join('; '));
      } finally { reset(); }
    });

    // Real BOXES never put a blue note exactly 2 frets outside (checked by hand for all 5 boxes),
    // so the 2-outside rule is covered by the synthetic test below; this one covers 1-outside everywhere.
    test('box slack (all 12 minor keys, boxes 1-5): 1 fret outside is lit, nothing dimmed wrongly', function() {
      try {
        var one = 0, bad = [];
        KEY_NAMES.forEach(function(name, ki) {
          applyKey(ki, 'minor'); state.blues = true;
          ['1','2','3','4','5'].forEach(function(bn) {
            state.box = bn;
            refreshNotes();
            var r = blueSlack(bn);
            one += r.one;
            r.badOne.forEach(function(w) { bad.push(name + ' box' + bn + ' 1-out dimmed ' + w); });
            r.badTwo.forEach(function(w) { bad.push(name + ' box' + bn + ' 2-out lit ' + w); });
          });
        });
        ok(one > 0, 'need 1-outside samples (' + one + ')');
        ok(bad.length === 0, bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });

    test('box slack: a blue note exactly 2 frets outside is dimmed (synthetic: e range shrunk to [5,9])', function() {
      try {
        applyKey(0, 'minor'); state.box = '1'; state.blues = true;
        state.activeBoxes = JSON.parse(JSON.stringify(state.activeBoxes));   // clone: BOXES must not change
        state.activeBoxes['1'].e = [5, 9];                                   // blue D# is at e-fret 11 = hi + 2
        refreshNotes();
        var g = document.querySelector('#fretboard .fb-note[data-string="0"][data-fret="11"]');
        ok(g && g.classList.contains('blue'), 'e-fret 11 should be the blue note');
        ok(g.classList.contains('dimmed'), 'e-fret 11 (2 outside) should be dimmed');
      } finally { reset(); }
    });

    test('isInBox(name, f, 1) widens box 1 by one fret on each side (A minor, e string [5,8])', function() {
      try {
        applyKey(0, 'minor'); state.box = '1';
        ok(isInBox('e', 4, 1), 'fret 4 with slack 1');
        ok(!isInBox('e', 4), 'fret 4 without slack');
        ok(isInBox('e', 9, 1), 'fret 9 with slack 1');
        ok(!isInBox('e', 9), 'fret 9 without slack');
        ok(!isInBox('e', 3, 1), 'fret 3 is 2 outside: not with slack 1');
        ok(!isInBox('e', 10, 1), 'fret 10 is 2 outside: not with slack 1');
      } finally { reset(); }
    });
  });
})();
