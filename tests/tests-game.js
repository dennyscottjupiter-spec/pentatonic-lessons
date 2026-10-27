// ---
// purpose: Suites 9-10: step-tier math, lick picking, XP math, smoke tests
// exports: none (registers suites)
// depends: tests-lib.js (window.T), game.js, audio.js, engine.js, data.js
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok, throwsNot = T.throwsNot;
  var applyKey = T.applyKey;
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

    // Regressions: a miss must replay the SAME lick, and the last click must leave the 'input' phase
    // (a click in the gap before the next lick used to read steps[length] and throw)
    test('showGamePhase(true) replays the same lick and keeps attempts; () picks a new one', function() {
      var savedSound = state.sound;
      try {
        state.sound = false; state.mode = 'game'; applyKey(0, 'minor'); state.box = '1';
        showGamePhase();
        var first = state.currentLick;
        state.lickAttempts = 1;
        showGamePhase(true);
        ok(state.currentLick === first, 'replay changed the lick');
        eq(state.lickAttempts, 1, 'attempts after replay');
        showGamePhase();
        eq(state.lickAttempts, 0, 'attempts after new lick');
      } finally { state.sound = savedSound; T.reset(); }
    });

    test('finishing a lick with a miss leaves the input phase (judge) and counts the attempt', function() {
      var savedSound = state.sound;
      try {
        state.sound = false; state.mode = 'game'; applyKey(0, 'minor'); state.box = '1';
        state.currentLick = { name: 't', steps: [{ s: 0, f: 5 }] };
        state.gamePhase = 'input'; state.gameInputStep = 0; state.lickAttempts = 0; state.lickHasError = false;
        onGameNoteClick(document.querySelector('.fb-note[data-string="0"][data-fret="8"]'));
        eq(state.gamePhase, 'judge', 'phase after last click');
        eq(state.lickAttempts, 1, 'attempts after miss');
      } finally { state.sound = savedSound; T.reset(); }
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
})();
