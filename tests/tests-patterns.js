// ---
// purpose: Suite 13: classic presets, key-relative frets, root map, saved-item validation, pattern drawing
// exports: none (registers suites)
// depends: tests-lib.js (window.T), patterns.js (fromRef, toRef, rootMap, cleanSaved, applyPattern, syncPattern), data.js (PATTERN_PRESETS)
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok, arrEq = T.arrEq;
  var applyKey = T.applyKey, reset = T.reset;

  // Literal tables, independent of data.js
  var KEY_NAMES = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
  var ROOTS     = [9,10,11,0,1,2,3,4,5,6,7,8];
  var STR_MIDI  = [64,59,55,50,45,40];   // high e first
  var PRESET_NAMES = ['B.B. KING BOX','ALBERT KING BOX','BLUES SCALE BOX 1','MAJOR BLUES BOX 1','ROOT MAP'];
  // A-reference frets (key A), copied literally from PATTERN_PRESETS
  var REF = {
    'B.B. KING BOX':    [{s:2,f:12},{s:1,f:10},{s:1,f:13},{s:0,f:10},{s:0,f:12}],
    'ALBERT KING BOX':  [{s:2,f:9},{s:1,f:8},{s:1,f:10},{s:0,f:8},{s:0,f:10}],
    'BLUES SCALE BOX 1':[{s:5,f:5},{s:5,f:8},{s:4,f:5},{s:4,f:6},{s:4,f:7},{s:3,f:5},{s:3,f:7},{s:2,f:5},{s:2,f:7},{s:2,f:8},{s:1,f:5},{s:1,f:8},{s:0,f:5},{s:0,f:8}],
    'MAJOR BLUES BOX 1':[{s:5,f:2},{s:5,f:5},{s:4,f:2},{s:4,f:3},{s:4,f:4},{s:3,f:2},{s:3,f:4},{s:2,f:2},{s:2,f:4},{s:2,f:5},{s:1,f:2},{s:1,f:5},{s:0,f:2},{s:0,f:5}]
  };
  var HAND = [
    [{s:5,f:0},{s:4,f:0},{s:0,f:17}],                    // open strings + fret 17
    [{s:0,f:0},{s:1,f:0},{s:2,f:2},{s:3,f:0}],
    [{s:0,f:5},{s:0,f:8},{s:1,f:5},{s:1,f:8},{s:2,f:5},{s:2,f:7}],
    [{s:4,f:7},{s:3,f:9},{s:2,f:9},{s:1,f:12}],
    [{s:5,f:17},{s:0,f:1}]
  ];

  function chromaOf(s, f) { return ((STR_MIDI[s] + f) % 12 + 12) % 12; }

  function validItem(over) {
    var item = { name: 'X', lens: 'minor', blues: false, notes: [{s:0,f:5}] };
    for (var k in over) item[k] = over[k];
    return item;
  }

  suite('13 · Patterns (presets, key-relative frets, root map, validation, drawing)', function() {
    test('PATTERN_PRESETS has 5 items with the expected names', function() {
      arrEq(PATTERN_PRESETS.map(function(p) { return p.name; }), PRESET_NAMES);
    });

    test('preset notes equal the literal A-reference lists; ROOT MAP is the roots flag', function() {
      PRESET_NAMES.slice(0, 4).forEach(function(name, i) {
        arrEq(PATTERN_PRESETS[i].notes, REF[name], name);
      });
      eq(PATTERN_PRESETS[4].roots, true, 'ROOT MAP roots flag');
    });

    test('fromRef: count, string order, frets 0-17, chroma moves with key, span <= 5 (4 presets x 12 keys)', function() {
      var bad = [];
      try {
        for (var ki = 0; ki < 12; ki++) {
          applyKey(ki, 'minor');
          var delta = (ROOTS[ki] - 9 + 12) % 12;
          Object.keys(REF).forEach(function(name) {
            var ref = REF[name], disp = fromRef(ref), tag = KEY_NAMES[ki] + ' ' + name;
            if (disp.length !== ref.length) { bad.push(tag + ' count'); return; }
            var lo = 99, hi = -99;
            disp.forEach(function(n, i) {
              lo = Math.min(lo, n.f); hi = Math.max(hi, n.f);
              if (n.s !== ref[i].s) bad.push(tag + ' string at ' + i);
              if (n.f < 0 || n.f > 17) bad.push(tag + ' fret ' + n.f);
              var want = (chromaOf(ref[i].s, ref[i].f) + delta) % 12;
              if (chromaOf(n.s, n.f) !== want) bad.push(tag + ' chroma at ' + i);
            });
            if (hi - lo > 5) bad.push(tag + ' span ' + (hi - lo));
          });
        }
        ok(bad.length === 0, bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });

    test('rootMap() equals the literal root list for every key (low string first, frets ascending)', function() {
      var bad = [];
      try {
        for (var ki = 0; ki < 12; ki++) {
          applyKey(ki, 'minor');
          var exp = [];
          for (var s = 5; s >= 0; s--)
            for (var f = 0; f <= 17; f++)
              if (chromaOf(s, f) === ROOTS[ki]) exp.push({s: s, f: f});
          var got = rootMap();
          if (JSON.stringify(got) !== JSON.stringify(exp)) bad.push(KEY_NAMES[ki]);
          if (ki === 7 && !(got.some(function(n) { return n.s === 5 && n.f === 0; }) &&
                            got.some(function(n) { return n.s === 5 && n.f === 12; })))
            bad.push('E missing low-E fret 0 or 12');
        }
        ok(bad.length === 0, 'root map mismatch: ' + bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });

    test('round trip: fromRef(toRef(x)) deep-equals x for every key and hand-made patterns', function() {
      var bad = [];
      try {
        for (var ki = 0; ki < 12; ki++) {
          applyKey(ki, 'minor');
          HAND.forEach(function(x, i) {
            if (JSON.stringify(fromRef(toRef(x))) !== JSON.stringify(x))
              bad.push(KEY_NAMES[ki] + ' pattern ' + i);
          });
        }
        ok(bad.length === 0, bad.slice(0, 3).join('; '));
      } finally { reset(); }
    });

    test('syncPattern: patternRoots gives rootMap(); otherwise patternRef gives fromRef()', function() {
      try {
        applyKey(7, 'minor');
        state.patternRoots = true; syncPattern();
        arrEq(state.pattern, rootMap(), 'roots');
        state.patternRoots = false; state.patternRef = REF['B.B. KING BOX']; syncPattern();
        arrEq(state.pattern, fromRef(REF['B.B. KING BOX']), 'ref');
      } finally { reset(); }
    });

    [
      ['missing name',      validItem({ name: undefined })],
      ['25-char name',      validItem({ name: 'A'.repeat(25) })],
      ['bad lens',          validItem({ lens: 'dorian' })],
      ['non-boolean blues', validItem({ blues: 'yes' })],
      ['empty notes',       validItem({ notes: [] })],
      ['string s=6',        validItem({ notes: [{s:6,f:0}] })],
      ['non-integer f',     validItem({ notes: [{s:0,f:1.5}] })],
      ['f=18',              validItem({ notes: [{s:0,f:18}] })]
    ].forEach(function(c) {
      test('cleanSaved rejects ' + c[0], function() {
        eq(cleanSaved(c[1]), null, c[0]);
      });
    });

    test('cleanSaved accepts a valid item (24-char name kept, surrounding spaces trimmed)', function() {
      var got = cleanSaved(validItem({ name: '  my box  ', lens: 'major', blues: true, notes: [{s:0,f:5}] }));
      ok(got !== null, 'valid item rejected');
      eq(got.name, 'my box', 'trimmed name');
      eq(got.lens, 'major', 'lens');
      eq(got.blues, true, 'blues');
      arrEq(got.notes, [{s:0,f:5}], 'notes');
      ok(cleanSaved(validItem({ name: 'A'.repeat(24) })) !== null, '24-char name rejected');
    });

    test('applyPattern: 3 picked notes get picked + step numbers 1,2,3; all others dimmed', function() {
      try {
        applyKey(0, 'minor'); state.box = '1'; state.building = false;
        state.pattern = [{s:0,f:5},{s:1,f:8},{s:5,f:0}];
        refreshNotes();
        var picked = [], pickedDimmed = 0, otherDimmed = 0, others = 0;
        document.querySelectorAll('#fretboard .fb-note').forEach(function(g) {
          var key = g.dataset.string + ':' + g.dataset.fret;
          if (g.classList.contains('picked')) { picked.push(key); if (g.classList.contains('dimmed')) pickedDimmed++; }
          else { others++; if (g.classList.contains('dimmed')) otherDimmed++; }
        });
        arrEq(picked, ['0:5','1:8','5:0'], 'picked notes');
        eq(pickedDimmed, 0, 'picked notes dimmed');
        eq(otherDimmed, others, 'other notes dimmed');
        var steps = Array.from(document.querySelectorAll('#pattern-steps text')).map(function(t) { return t.textContent; });
        arrEq(steps, ['1','2','3'], 'step numbers');
      } finally { reset(); }
    });

    test('applyPattern: after clearing, no picked note and an empty step layer', function() {
      try {
        applyKey(0, 'minor'); state.box = '1';
        state.pattern = [{s:0,f:5},{s:1,f:8},{s:5,f:0}];
        refreshNotes();
        state.pattern = []; state.patternRef = null;
        refreshNotes();
        eq(document.querySelectorAll('#fretboard .fb-note.picked').length, 0, 'picked after clear');
        eq(document.querySelectorAll('#pattern-steps text').length, 0, 'steps after clear');
      } finally { reset(); }
    });

    // Regression: an empty pattern once stripped every `dimmed`, so box positions showed the whole neck
    test('applyPattern: no pattern keeps box dimming (box 1 = 2 lit notes per string)', function() {
      try {
        applyKey(0, 'minor'); state.box = '1'; state.building = false;
        state.pattern = []; state.patternRef = null; state.patternRoots = false;
        refreshNotes();
        var per = [0,0,0,0,0,0];
        document.querySelectorAll('#fretboard .fb-note').forEach(function(g) {
          if (!g.classList.contains('dimmed') && !g.classList.contains('out')) per[+g.dataset.string]++;
        });
        arrEq(per, [2,2,2,2,2,2], 'lit notes per string in box 1');
      } finally { reset(); }
    });
  });
})();
