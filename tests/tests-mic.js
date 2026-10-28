// ---
// purpose: Suite 17: PLAY IT pitch detection, onset rule, interval names, PLAY IT quiz lifecycle
// exports: none (registers suites)
// depends: tests-lib.js (window.T), mic.js (detectPitch, micFeed, micReset, hzToMidi), quiz.js (intervalName, setQuizMode, quizStart, quizStop, quiz), quiz-play.js (quizMicNote, quizMicLevel), engine.js (setKey, buildFretboard, refreshNotes, spell)
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok;

  // Key A, box 1, minor: the board the quiz draws from
  function boardA() { setKey(0); state.box = '1'; buildFretboard(); refreshNotes(); }

  // Sum of harmonics; parts = [[harmonic, amplitude], ...]
  function tone(hz, n, rate, parts) {
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0;
      parts.forEach(function(p) { s += p[1] * Math.sin(2 * Math.PI * hz * p[0] * i / rate); });
      out[i] = s;
    }
    return out;
  }

  // Deterministic noise (fixed LCG) so the test never flakes
  function noise(n, amp) {
    var out = new Float32Array(n), seed = 1;
    for (var i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; out[i] = (seed / 2147483647 * 2 - 1) * amp; }
    return out;
  }

  suite('17 · Mic + intervals', function() {
    test('hzToMidi maps A4, low E and high E to MIDI 69, 40 and 64', function() {
      eq(hzToMidi(440), 69, 'A4');
      eq(hzToMidi(82.41), 40, 'low E');
      eq(hzToMidi(329.63), 64, 'high E');
    });

    test('detectPitch reads pure tones within 1%', function() {
      [82.41, 110, 196, 440, 987.77].forEach(function(hz) {
        var got = detectPitch(tone(hz, 4096, 48000, [[1, 0.5]]), 48000);
        ok(Math.abs(got / hz - 1) < 0.01, hz + ' Hz read as ' + got);
      });
    });

    test('detectPitch reads a harmonic-rich 110 Hz tone at 110, not an octave away', function() {
      var got = detectPitch(tone(110, 4096, 48000, [[1, 1], [2, 0.5], [3, 0.33], [4, 0.25]]), 48000);
      ok(Math.abs(got / 110 - 1) < 0.01, '110 Hz read as ' + got);
    });

    test('detectPitch returns -1 for silence and very quiet noise', function() {
      eq(detectPitch(new Float32Array(4096), 48000), -1, 'silence');
      eq(detectPitch(noise(4096, 0.001), 48000), -1, 'quiet noise');
    });

    test('micFeed: a ringing note answers once; a new note answers after 3 polls', function() {
      micReset();
      eq(micFeed(9, 0.1), -1, 'poll 1');
      eq(micFeed(9, 0.1), -1, 'poll 2');
      eq(micFeed(9, 0.1), 9, 'poll 3 answers');
      eq(micFeed(9, 0.1), -1, 'still ringing');
      eq(micFeed(9, 0.1), -1, 'still ringing 2');
      eq(micFeed(4, 0.1), -1, 'new note poll 1');
      eq(micFeed(4, 0.1), -1, 'new note poll 2');
      eq(micFeed(4, 0.1), 4, 'new note answers');
    });

    test('micFeed: silence re-arms the note; only a big level jump re-answers a ringing one', function() {
      micReset();
      micFeed(9, 0.1); micFeed(9, 0.1);
      eq(micFeed(9, 0.1), 9, 'first pluck');
      eq(micFeed(-1, 0), -1, 'silence');
      micFeed(9, 0.1); micFeed(9, 0.1);
      eq(micFeed(9, 0.1), 9, 'same note after silence');
      eq(micFeed(9, 0.12), -1, 'small rise is not a new pluck');
      eq(micFeed(9, 0.2), 9, 'big rise is a new pluck');
    });

    test('micFeed: an unreadable poll mid-ring does not re-arm the note', function() {
      micReset();
      micFeed(9, 0.1); micFeed(9, 0.1);
      eq(micFeed(9, 0.1), 9, 'first pluck');
      eq(micFeed(-1, 0.08), -1, 'no pitch, still loud');
      micFeed(9, 0.08); micFeed(9, 0.08);
      eq(micFeed(9, 0.08), -1, 'same ringing note answered twice');
    });

    test('intervalName counts semitones from the key root', function() {
      boardA();
      eq(intervalName(4), '5 · perfect 5th', 'E from A');
      eq(intervalName(9), '1 · root', 'A from A');
      eq(intervalName(0), '♭3 · minor 3rd', 'C from A');
    });

    test('intervalName follows the key button, not the lens', function() {
      try {
        state.lens = 'major';
        setKey(3);   // C
        eq(intervalName(4), '3 · major 3rd', 'E from C');
        eq(intervalName(7), '5 · perfect 5th', 'G from C');
      } finally { state.lens = 'minor'; boardA(); }
    });

    test('quizMicLevel maps the mic level to the --lvl bar variable', function() {
      var wave = document.getElementById('quiz-wave');
      quizMicLevel(0.05);
      eq(wave.style.getPropertyValue('--lvl'), '0.40', 'quiet');
      quizMicLevel(1);
      eq(wave.style.getPropertyValue('--lvl'), '1.00', 'loud clamps to 1');
      wave.style.removeProperty('--lvl');
    });

    test('PLAY IT: the mic runs only in PLAY; a heard note answers and names its interval', function() {
      var savedBest = localStorage.getItem('pent-quiz-best');
      var realStart = window.micStart, realStop = window.micStop, starts = 0, stops = 0;
      window.micStart = function() { starts++; return Promise.resolve(true); };
      window.micStop = function() { stops++; };
      boardA();
      try {
        quizStart();
        setQuizMode('play');
        eq(starts, 1, 'micStart calls');
        ok(document.body.classList.contains('quiz-play'), 'body not flagged');
        eq(document.querySelectorAll('.quiz-target').length, 1, 'target not glowing in PLAY');
        ok(document.getElementById('quiz-replay').hidden, 'REPLAY shown in PLAY');
        var c = +document.querySelector('.quiz-target').dataset.chroma;
        quizMicNote(c);
        eq(quiz.score, 1, 'heard note not scored');
        eq(document.getElementById('quiz-heard').textContent, '🎤 ' + spell(c), 'heard readout');
        ok(document.getElementById('quiz-interval').classList.contains('show'), 'interval line not shown');
        stops = 0;
        quizStop();
        eq(stops, 1, 'micStop on stop');
        ok(!document.body.classList.contains('quiz-play'), 'quiz-play left on body');
        eq(document.getElementById('quiz-heard').textContent, '', 'heard readout not cleared');
      } finally {
        quizStop();
        window.micStart = realStart; window.micStop = realStop;
        setQuizMode('see');
        if (savedBest === null) localStorage.removeItem('pent-quiz-best');
        else localStorage.setItem('pent-quiz-best', savedBest);
      }
    });
  });
})();
