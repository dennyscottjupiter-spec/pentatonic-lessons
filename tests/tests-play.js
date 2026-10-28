// ---
// purpose: Suite 17b: PLAY IT glue (drone/metronome hold, silent clicks, denied mic, hidden tab, pause)
// exports: none (registers suites)
// depends: tests-lib.js (window.T), quiz-play.js (quizListen, quizMicNote, quizClickSounds, micDeniedText), quiz.js (quiz, quizStart, quizStop, setQuizMode, quizAnswer, nextRound), mic.js (micStart, micStop), drone.js (drone, droneStart, droneStop), audio.js (metro, metroStart, metroStop), player.js (pauseMemo, setPaused), engine.js (setKey, buildFretboard, refreshNotes)
// gotcha: a test that enters PLAY must stub micStart first, or the real one asks for the microphone
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok;

  // Key A, box 1, minor: the board the quiz draws from
  function boardA() { setKey(0); state.box = '1'; buildFretboard(); refreshNotes(); }

  // Sync thenable: micStart "resolves" at once with `okay`
  function micStub(okay) { return function() { return { then: function(f) { f(okay); } }; }; }

  // Stops every side effect a PLAY IT test can leave behind
  function quiet() { quizStop(); setQuizMode('see'); droneStop(); metroStop(); }

  // Clean slate, then a snapshot of what the tests change; the returned function puts it all back
  function savePlay() {
    quiet();
    var saved = { start: window.micStart, stop: window.micStop, sound: state.sound, best: localStorage.getItem('pent-quiz-best') };
    return function restore() {
      window.micStart = saved.start; window.micStop = saved.stop;
      quiet();   // before the sound and pause reset: quizStop may restart a held drone, and droneStop then silences it
      state.sound = saved.sound; state.paused = false;
      pauseMemo.drone = false; pauseMemo.metro = false;
      if (saved.best === null) localStorage.removeItem('pent-quiz-best');
      else localStorage.setItem('pent-quiz-best', saved.best);
      T.reset();
    };
  }

  suite('17b · PLAY IT glue (hold, clicks, denied mic, hidden tab, pause)', function() {
    test('PLAY IT holds the drone: off while the mic listens, back on after SEE IT', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        state.sound = true; boardA(); droneStart();
        quizStart(); setQuizMode('play');
        ok(!drone.running, 'drone on in PLAY');
        setQuizMode('see');
        ok(drone.running, 'drone not back after SEE');
      } finally { restore(); }
    });

    test('PLAY IT holds the drone: quizStop brings it back too', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        state.sound = true; boardA(); droneStart();
        quizStart(); setQuizMode('play');
        ok(!drone.running, 'drone on in PLAY');
        quizStop();
        ok(drone.running, 'drone not back after quizStop');
      } finally { restore(); }
    });

    test('PLAY IT holds the metronome: off while the mic listens, back on after SEE IT', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        boardA(); metroStart();
        quizStart(); setQuizMode('play');
        ok(!metro.running, 'metronome on in PLAY');
        setQuizMode('see');
        ok(metro.running, 'metronome not back after SEE');
      } finally { restore(); }
    });

    test('PLAY IT holds the metronome: quizStop brings it back too', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        boardA(); metroStart();
        quizStart(); setQuizMode('play');
        ok(!metro.running, 'metronome on in PLAY');
        quizStop();
        ok(metro.running, 'metronome not back after quizStop');
      } finally { restore(); }
    });

    test('PLAY IT hold while paused: the drone stays off, then resumes on unpause', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        state.sound = true; boardA(); droneStart();
        quizStart(); setQuizMode('play');
        setPaused(true);
        setQuizMode('see');
        ok(!drone.running, 'drone on while paused');
        eq(pauseMemo.drone, true, 'pauseMemo.drone');
        setPaused(false);
        ok(drone.running, 'drone not back after unpause');
      } finally { restore(); }
    });

    test('PLAY IT entered while paused: unpause keeps the drone off until PLAY IT is left', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        state.sound = true; boardA(); droneStart();
        setPaused(true);
        quizStart(); setQuizMode('play');
        setPaused(false);
        ok(!drone.running, 'unpause restarted the drone under the mic');
        setQuizMode('see');
        ok(drone.running, 'drone not back after SEE');
      } finally { setPaused(false); restore(); }
    });

    test('quizClickSounds: in SEE only the target sounds', function() {
      var restore = savePlay();
      try {
        boardA(); quizStart();
        ok(!quizClickSounds(document.querySelector('#fretboard .fb-note:not(.quiz-target)')), 'a non-target note sounds in SEE');
        ok(quizClickSounds(quiz.target), 'the target is silent in SEE');
      } finally { restore(); }
    });

    test('quizClickSounds: in HEAR any note sounds; in PLAY the target stays silent', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        boardA(); quizStart(); setQuizMode('hear');
        ok(quizClickSounds(document.querySelector('#fretboard .fb-note')), 'a note is silent in HEAR');
        setQuizMode('play');
        ok(!quizClickSounds(quiz.target), 'the target sounds in PLAY');
      } finally { restore(); }
    });

    test('denied mic: the reason stays on the prompt through nextRound, and an allowed mic clears it', function() {
      var restore = savePlay();
      try {
        var denied = micDeniedText();
        window.micStart = micStub(false);
        boardA(); quizStart(); setQuizMode('play');
        eq($('#quiz-prompt').textContent, denied, 'prompt after denial');
        quizAnswer(+quiz.target.dataset.chroma);
        nextRound();
        eq($('#quiz-prompt').textContent, denied, 'prompt after nextRound');
        window.micStart = micStub(true);
        setQuizMode('play');
        eq($('#quiz-prompt').textContent, 'Play the glowing note on your guitar', 'prompt after allow');
        eq(quiz.micMsg, '', 'micMsg after allow');
      } finally { restore(); }
    });

    test('PLAY IT retry: the old denied message clears once the allowed mic answers', function() {
      var restore = savePlay(), pending = null;
      try {
        window.micStart = function() { return { then: function(f) { pending = f; } }; };
        boardA(); quizStart(); setQuizMode('play');
        pending(false);
        eq($('#quiz-prompt').textContent, micDeniedText(), 'denied prompt');
        setQuizMode('play');   // retry: the message stays until the mic answers
        eq($('#quiz-prompt').textContent, micDeniedText(), 'prompt while retrying');
        pending(true);
        eq($('#quiz-prompt').textContent, 'Play the glowing note on your guitar', 'prompt after allow');
        eq(quiz.micMsg, '', 'micMsg after allow');
      } finally { restore(); }
    });

    test('hidden tab: PLAY IT releases the mic on hide and takes it again on return', function() {
      var restore = savePlay(), starts = 0, stops = 0, isHidden = false;
      try {
        window.micStart = function() { starts++; return { then: function(f) { f(true); } }; };
        window.micStop = function() { stops++; };
        Object.defineProperty(document, 'hidden', { configurable: true, get: function() { return isHidden; } });
        boardA(); quizStart(); setQuizMode('play');
        starts = 0; stops = 0;
        isHidden = true; document.dispatchEvent(new Event('visibilitychange'));
        eq(stops, 1, 'micStop on hide');
        isHidden = false; document.dispatchEvent(new Event('visibilitychange'));
        eq(starts, 1, 'micStart on return');
        eq(stops, 1, 'micStop after return');
      } finally { delete document.hidden; restore(); }
    });

    test('hidden tab: SEE IT never touches the mic', function() {
      var restore = savePlay(), calls = 0, isHidden = false;
      try {
        window.micStart = function() { calls++; return { then: function() {} }; };
        window.micStop = function() { calls++; };
        Object.defineProperty(document, 'hidden', { configurable: true, get: function() { return isHidden; } });
        boardA(); quizStart();
        calls = 0;
        isHidden = true; document.dispatchEvent(new Event('visibilitychange'));
        isHidden = false; document.dispatchEvent(new Event('visibilitychange'));
        eq(calls, 0, 'mic calls in SEE');
      } finally { delete document.hidden; restore(); }
    });

    test('paused: a heard note is ignored (no readout, no answer)', function() {
      var restore = savePlay();
      try {
        window.micStart = micStub(true);
        boardA(); quizStart(); setQuizMode('play');
        $('#quiz-heard').textContent = '';
        state.paused = true;
        quizMicNote(+quiz.target.dataset.chroma);
        eq(quiz.score, 0, 'score while paused');
        eq($('#quiz-heard').textContent, '', 'readout while paused');
      } finally { restore(); }
    });
  });
})();
