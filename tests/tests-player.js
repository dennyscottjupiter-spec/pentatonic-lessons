// ---
// purpose: Suite 14: resumable step player and global pause (synchronous checks only)
// exports: none (registers suites)
// depends: tests-lib.js (window.T), player.js (playSteps, playerTick, setPaused, togglePause, stopSteps), engine.js (playGen), audio.js (metro, timer)
// gotcha: playSteps arms a 100 s real timer; every test ends in reset() which clears it
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok, reset = T.reset;

  // Records every onStep call as [step, index]
  function recorder() {
    var calls = [];
    var fn = function(step, idx) { calls.push([step, idx]); };
    fn.calls = calls;
    return fn;
  }

  function bodyHas(cls) { return document.body.classList.contains(cls); }
  function pauseBtn()   { return document.getElementById('pause-btn'); }

  suite('14 · Player + pause (playSteps / setPaused / togglePause)', function() {
    var a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };

    test('playSteps: onStep fires synchronously once with (a,0) and sets is-playing', function() {
      try {
        var rec = recorder();
        playSteps([a, b, c], 100000, rec);
        eq(rec.calls.length, 1, 'onStep calls');
        ok(rec.calls[0][0] === a && rec.calls[0][1] === 0, 'first call is (a,0)');
        ok(bodyHas('is-playing'), 'is-playing not set');
      } finally { reset(); }
    });

    test('setPaused(true): paused flags, is-paused, no is-playing, timer cleared, aria-pressed true', function() {
      try {
        playSteps([a, b, c], 100000, recorder());
        setPaused(true);
        eq(state.paused, true, 'state.paused');
        ok(bodyHas('is-paused'), 'is-paused not set');
        ok(!bodyHas('is-playing'), 'is-playing still set');
        eq(player.tid, null, 'player.tid');
        eq(pauseBtn().getAttribute('aria-pressed'), 'true', 'aria-pressed');
      } finally { reset(); }
    });

    test('while paused, playerTick() does not call onStep', function() {
      try {
        var rec = recorder();
        playSteps([a, b, c], 100000, rec);
        setPaused(true);
        playerTick();
        eq(rec.calls.length, 1, 'onStep calls while paused');
      } finally { reset(); }
    });

    test('setPaused(false) resumes synchronously at the next step (b,1), not from the start', function() {
      try {
        var rec = recorder();
        playSteps([a, b, c], 100000, rec);
        setPaused(true);
        setPaused(false);
        eq(rec.calls.length, 2, 'onStep calls after resume');
        ok(rec.calls[1][0] === b && rec.calls[1][1] === 1, 'resume call is (b,1)');
        ok(!bodyHas('is-paused'), 'is-paused still set');
        eq(pauseBtn().getAttribute('aria-pressed'), 'false', 'aria-pressed after resume');
      } finally { reset(); }
    });

    test('after ++playGen the next playerTick() drops the sequence without calling onStep', function() {
      try {
        var rec = recorder();
        playSteps([a, b, c], 100000, rec);
        // Stand-in for the timer that just fired: a real timer id would otherwise be orphaned
        clearTimeout(player.tid); player.tid = null;
        ++playGen;
        playerTick();
        eq(player.steps, null, 'player.steps after superseded tick');
        eq(rec.calls.length, 1, 'onStep calls after superseded tick');
      } finally { reset(); }
    });

    test('togglePause() with nothing playing leaves state.paused false', function() {
      try {
        ok(!metro.running && !timer.running, 'metro/timer must be idle before the check');
        togglePause();
        eq(state.paused, false, 'state.paused');
      } finally { reset(); }
    });

    test('game mode: setPaused(true) shows PAUSED_TEXT in #game-status, setPaused(false) restores it', function() {
      var st = document.getElementById('game-status'), orig = st.textContent;
      try {
        state.mode = 'game';
        st.textContent = 'X';
        setPaused(true);
        eq(st.textContent, PAUSED_TEXT, 'status while paused');
        setPaused(false);
        eq(st.textContent, 'X', 'status after resume');
      } finally { st.textContent = orig; reset(); }
    });
  });
})();
