// ---
// purpose: Suite 18: STAND mode (auto-start, steppers, viewBox zoom, wake lock) and WALK order with saved quiz choices
// exports: none (registers suites)
// depends: tests-lib.js (window.T), quiz-walk.js (quizWalkSeq, setQuizOrder, quizLoadPrefs), quiz.js (quiz, quizStart, quizStop, quizAnswer, nextRound, setQuizMode), stand.js (stand, standAuto, standOn, standOff, standFit, standStep, standKeyStep, standWake), engine.js (setKey, buildFretboard, refreshNotes, FB), data.js (BOXES, STRINGS, TOTAL_FRETS)
// gotcha: T.test is synchronous, so the wake-lock request is only checked in the browser, not here
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok;

  var PREFS = 'pent-quiz-prefs', STAND_KEY = 'pent-stand';

  // Key A, box 1, minor: the board the quiz and the stand draw from
  function boardA() { setKey(0); state.box = '1'; buildFretboard(); refreshNotes(); }

  function snapshot() { return { prefs: localStorage.getItem(PREFS), stand: localStorage.getItem(STAND_KEY) }; }

  // Leaves STAND and the quiz, resets the order and mode, then puts the saved keys back
  function quiet(saved) {
    stand.on = false; document.body.classList.remove('stand');
    quizStop(); setQuizMode('see'); setQuizOrder('random');
    standFit();
    T.reset();
    if (saved.prefs === null) localStorage.removeItem(PREFS); else localStorage.setItem(PREFS, saved.prefs);
    if (saved.stand === null) localStorage.removeItem(STAND_KEY); else localStorage.setItem(STAND_KEY, saved.stand);
  }

  // Wraps a test body so quiet() always runs, even when an assertion throws
  function guarded(fn) {
    return function () {
      var saved = snapshot();
      try { fn(); } finally { quiet(saved); }
    };
  }

  suite('18 · STAND mode + WALK', function() {
    test('quizWalkSeq: box 1 in A minor climbs 12 notes, top once, 22 long, starts lowest', guarded(function() {
      boardA();
      var seq = quizWalkSeq(), n = quizPool().length;
      var mids = seq.map(function(g) { return +g.dataset.midi; });
      eq(n, 12, 'pool size');
      eq(seq.length, 2 * n - 2, 'length');
      for (var i = 1; i < n; i++) ok(mids[i] > mids[i - 1], 'not ascending at ' + i);
      eq(mids[0], Math.min.apply(null, mids), 'first note is the lowest');
      eq(mids.filter(function(m) { return m === mids[n - 1]; }).length, 1, 'top note count');
    }));

    test('WALK: target starts at the lowest, a right answer moves on, a wrong one keeps the note', guarded(function() {
      boardA(); quizStart(); setQuizOrder('walk');
      var seq = quizWalkSeq();
      eq(quiz.target, seq[0], 'target at start');
      quizAnswer(+quiz.target.dataset.chroma); nextRound();
      eq(quiz.target, seq[1], 'target after a right answer');
      eq(quiz.score, 1, 'score');
      ok(seq[2].classList.contains('quiz-next'), 'next note not marked');
      eq(document.querySelectorAll('.fb-note.quiz-next').length, 1, 'quiz-next count');
      var keep = quiz.target;
      quizAnswer((+keep.dataset.chroma + 1) % 12); nextRound();
      eq(quiz.target, keep, 'a wrong answer changed the note');
      quizStop();
      eq(document.querySelectorAll('.fb-note.quiz-next').length, 0, 'quiz-next left after stop');
    }));

    test('setQuizOrder: RANDOM resets the step and the button; WALK sets them; junk is ignored', guarded(function() {
      boardA(); quizStart();
      setQuizOrder('walk'); quiz.step = 3;
      setQuizOrder('random');
      eq(quiz.step, 0, 'step after RANDOM');
      eq($('#quiz-order').textContent, '🔀 RANDOM', 'label in RANDOM');
      eq($('#quiz-order').getAttribute('aria-pressed'), 'false', 'pressed in RANDOM');
      setQuizOrder('walk');
      eq($('#quiz-order').textContent, '🪜 WALK', 'label in WALK');
      eq($('#quiz-order').getAttribute('aria-pressed'), 'true', 'pressed in WALK');
      ok($('#quiz-order').classList.contains('active'), 'active class in WALK');
      setQuizOrder('bogus');
      eq(quiz.order, 'walk', 'junk order changed the order');
    }));

    test('saved quiz choices: mode and order round-trip; junk JSON keeps the defaults', guarded(function() {
      setQuizMode('hear'); setQuizOrder('walk');   // both save
      quiz.mode = 'see'; quiz.order = 'random';   // changed in memory only
      quizLoadPrefs();
      eq(quiz.mode, 'hear', 'mode loaded');
      eq(quiz.order, 'walk', 'order loaded');
      localStorage.setItem(PREFS, '{not json');
      quiz.mode = 'see'; quiz.order = 'random';
      quizLoadPrefs();
      eq(quiz.mode, 'see', 'mode after junk');
      eq(quiz.order, 'random', 'order after junk');
      localStorage.setItem(PREFS, JSON.stringify({ mode: 'bogus', order: 'walk' }));
      quizLoadPrefs();
      eq(quiz.mode, 'see', 'bad mode accepted');
      eq(quiz.order, 'walk', 'valid order dropped');
    }));

    test('standAuto: a tablet starts in STAND unless the device chose otherwise', guarded(function() {
      var real = window.isTablet;
      try {
        window.isTablet = function() { return true; };
        localStorage.removeItem(STAND_KEY);
        ok(standAuto(), 'tablet, no choice');
        localStorage.setItem(STAND_KEY, '0');
        ok(!standAuto(), 'tablet, saved off');
        window.isTablet = function() { return false; };
        localStorage.setItem(STAND_KEY, '1');
        ok(standAuto(), 'desktop, saved on');
        localStorage.removeItem(STAND_KEY);
        ok(!standAuto(), 'desktop, no choice');
      } finally { window.isTablet = real; }
    }));

    test('standOn starts the quiz, flags the body and saves 1; standOff undoes it and saves 0', guarded(function() {
      boardA(); localStorage.removeItem(STAND_KEY);
      standOn();
      ok(stand.on, 'stand flag on');
      ok(document.body.classList.contains('stand'), 'body class on');
      ok(quiz.on, 'quiz not started');
      eq(localStorage.getItem(STAND_KEY), '1', 'saved on');
      standOff();
      ok(!stand.on, 'stand flag after off');
      ok(!document.body.classList.contains('stand'), 'body class after off');
      ok(!quiz.on, 'quiz still on after off');
      eq(localStorage.getItem(STAND_KEY), '0', 'saved off');
    }));

    test('standOn(false) saves nothing (an automatic start is not a choice)', guarded(function() {
      boardA(); localStorage.removeItem(STAND_KEY);
      standOn(false);
      ok(stand.on, 'stand flag not on');
      eq(localStorage.getItem(STAND_KEY), null, 'saved');
    }));

    test('closing the quiz while in STAND leaves STAND', guarded(function() {
      boardA(); standOn(false);
      quizStop();
      ok(!stand.on, 'stand still on');
      ok(!document.body.classList.contains('stand'), 'body class still on');
    }));

    test('standFit: STAND zooms onto box 1 (covers its frets, narrower than the neck); ALL and off show the whole neck', guarded(function() {
      boardA();
      var svg = document.querySelector('#fretboard .fb-svg');
      var W = FB.pad.left + FB.fretW * (TOTAL_FRETS + 1) + FB.pad.right;
      var H = FB.pad.top + FB.stringH * STRINGS.length + FB.pad.bottom;
      var lo = Infinity, hi = -Infinity, b = BOXES[1];
      Object.keys(b).forEach(function(s) { lo = Math.min(lo, b[s][0]); hi = Math.max(hi, b[s][1]); });
      stand.on = true; standFit();
      var v = svg.getAttribute('viewBox').split(' ').map(Number);
      ok(v[0] <= FB.pad.left + (lo - 1) * FB.fretW, 'left edge cuts the box');
      ok(v[0] + v[2] >= FB.pad.left + hi * FB.fretW, 'right edge cuts the box');
      ok(v[2] < W, 'box 1 not zoomed');
      eq(v[3], H, 'viewBox height');
      state.box = 'all'; standFit();
      eq(svg.getAttribute('viewBox'), '0 0 ' + W + ' ' + H, 'ALL view');
      state.box = '1'; stand.on = false; standFit();
      eq(svg.getAttribute('viewBox'), '0 0 ' + W + ' ' + H, 'view with STAND off');
    }));

    test('standStep and standKeyStep wrap through the box and key order (real buttons are clicked)', guarded(function() {
      var seen = [], undo = [];
      function spy(sel, tag) {
        var el = document.querySelector(sel), f = function() { seen.push(tag); };
        el.addEventListener('click', f);
        undo.push(function() { el.removeEventListener('click', f); });
      }
      try {
        spy('.box[data-box="all"]', 'all'); spy('.box[data-box="1"]', '1'); spy('#key-row .key[data-key-idx="11"]', 'key11');
        state.box = '5'; standStep(1);
        state.box = 'all'; standStep(1);
        state.box = '1'; standStep(-1);
        state.keyIdx = 0; standKeyStep(-1);
        eq(seen.join(','), 'all,1,all,key11', 'clicks');
      } finally { undo.forEach(function(u) { u(); }); }
    }));

    test('standWake: with no wake-lock API it does not throw and holds no lock', guarded(function() {
      stand.on = true;
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined });
      try {
        standWake(true);
        eq(stand.lock, null, 'lock held');
      } finally { delete navigator.wakeLock; stand.on = false; }
    }));
    // Not tested here: the granted-lock path is async; the browser check covers it.
  });
})();
