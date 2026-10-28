// ---
// purpose: Suite 16: NOTE QUIZ key mapping, board pool, piano render, round lifecycle
// exports: none (registers suites)
// depends: tests-lib.js (window.T), quiz-piano.js (quizKeyChroma, quizKeyDown, renderQuizKeys), quiz.js (quiz, quizStart, quizStop, quizAnswer, quizPool, setQuizMode), engine.js (setKey, buildFretboard, refreshNotes)
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok;

  // Key A, box 1, minor: the board the quiz draws from
  function boardA() { setKey(0); state.box = '1'; buildFretboard(); refreshNotes(); }

  suite('16 · Note quiz (keys / pool / rounds)', function() {
    test('quizKeyChroma maps the music-app row', function() {
      eq(quizKeyChroma({ code: 'KeyA', shiftKey: false }), 0, 'KeyA');
      eq(quizKeyChroma({ code: 'KeyW', shiftKey: false }), 1, 'KeyW');
      eq(quizKeyChroma({ code: 'KeyS', shiftKey: false }), 2, 'KeyS');
      eq(quizKeyChroma({ code: 'KeyD', shiftKey: false }), 4, 'KeyD');
      eq(quizKeyChroma({ code: 'KeyH', shiftKey: false }), 9, 'KeyH');
      eq(quizKeyChroma({ code: 'KeyJ', shiftKey: false }), 11, 'KeyJ');
      eq(quizKeyChroma({ code: 'KeyA', shiftKey: true }), 0, 'Shift ignored');
      eq(quizKeyChroma({ code: 'KeyC', shiftKey: false }), null, 'KeyC unmapped');
      eq(quizKeyChroma({ code: 'Digit1', shiftKey: false }), null, 'Digit1');
    });

    test('quizPool holds only lit, undimmed notes of the board', function() {
      boardA();
      var pool = quizPool();
      ok(pool.length > 0, 'pool is empty');
      pool.forEach(function(g) {
        ok(!g.classList.contains('dimmed'), 'dimmed note in pool');
        ok(['in-scale', 'root', 'blue', 'chromatic'].some(function(c) { return g.classList.contains(c); }), 'unlit note in pool');
      });
    });

    test('renderQuizKeys draws 12 keys (7 white, 5 black) labelled per accidentals', function() {
      try {
        state.accidentals = 'flat';
        renderQuizKeys();
        eq(document.querySelectorAll('#quiz-keys .pk').length, 12, 'keys');
        eq(document.querySelectorAll('#quiz-keys .pk.white').length, 7, 'white keys');
        eq(document.querySelectorAll('#quiz-keys .pk.black').length, 5, 'black keys');
        eq(document.querySelector('#quiz-keys .pk[data-chroma="10"] span').textContent, FLAT_NAMES[10], 'flat label');
        eq(document.querySelectorAll('#quiz-keys .pk > .pk-cap').length, 12, 'every key has a keycap');
        eq(document.querySelector('#quiz-keys .pk[data-chroma="0"] .pk-cap').textContent, 'A', 'cap of chroma 0');
        eq(document.querySelector('#quiz-keys .pk[data-chroma="11"] .pk-cap').textContent, 'J', 'cap of chroma 11');
      } finally { state.accidentals = 'sharp'; renderQuizKeys(); }
    });

    test('start shows one target and reticle; a right answer scores; stop clears all', function() {
      var savedBest = localStorage.getItem('pent-quiz-best');
      boardA();
      try {
        quizStart();
        ok(document.body.classList.contains('quiz-on'), 'body not flagged');
        eq(document.querySelectorAll('.quiz-target').length, 1, 'targets');
        eq(document.querySelectorAll('.quiz-reticle').length, 1, 'reticles');
        ok(document.getElementById('pattern-build').disabled, 'BUILD not locked during quiz');
        quizAnswer(+document.querySelector('.quiz-target').dataset.chroma);
        eq(quiz.score, 1, 'score');
        eq(quiz.tries, 1, 'tries');
        eq(quiz.streak, 1, 'streak');
        eq(document.getElementById('quiz-score').textContent, '1/1', 'score text');
        quizStop();
        eq(document.querySelectorAll('.quiz-target').length, 0, 'target left after stop');
        ok(!document.body.classList.contains('quiz-on'), 'body still flagged after stop');
        eq(quiz.on, false, 'quiz still on');
        ok(!document.getElementById('pattern-build').disabled, 'BUILD still locked after stop');
      } finally {
        quizStop();
        if (savedBest === null) localStorage.removeItem('pent-quiz-best');
        else localStorage.setItem('pent-quiz-best', savedBest);
      }
    });

    test('a wrong answer resets the streak and reveals the right key', function() {
      boardA();
      try {
        quizStart();
        var c = +document.querySelector('.quiz-target').dataset.chroma;
        quizAnswer((c + 1) % 12);
        eq(quiz.streak, 0, 'streak');
        eq(quiz.tries, 1, 'tries');
        ok(document.querySelector('#quiz-keys .pk[data-chroma="' + c + '"]').classList.contains('reveal'), 'right key not revealed');
      } finally { quizStop(); }
    });

    test('quizStart does nothing during a lick game', function() {
      var saved = state.mode;
      try {
        state.mode = 'game';
        quizStart();
        eq(quiz.on, false, 'quiz started in game');
        ok(!document.body.classList.contains('quiz-on'), 'body flagged in game');
      } finally { state.mode = saved; quizStop(); }
    });

    test('a held key lights its piano key; a repeat never answers', function() {
      boardA();
      try {
        quizStart();
        var tries = quiz.tries;
        ok(quizKeyDown({ code: 'KeyS', repeat: true, preventDefault: function() {} }) === true, 'mapped key not handled');
        ok(document.querySelector('#quiz-keys .pk[data-chroma="2"]').classList.contains('held'), 'key not lit');
        eq(quiz.tries, tries, 'repeat answered');
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
        ok(!document.querySelector('#quiz-keys .pk[data-chroma="2"]').classList.contains('held'), 'key still lit after keyup');
        eq(quizKeyDown({ code: 'KeyC', repeat: false, preventDefault: function() {} }), false, 'KeyC handled');
      } finally { quizStop(); }
    });

    test('HEAR IT hides the target until the answer, then marks it', function() {
      var savedBest = localStorage.getItem('pent-quiz-best');
      boardA();
      try {
        setQuizMode('hear');
        quizStart();
        ok(quiz.target, 'no target');
        eq(document.querySelectorAll('.quiz-target').length, 0, 'target visible in HEAR');
        eq(document.querySelectorAll('.quiz-reticle').length, 0, 'reticle in HEAR');
        ok(document.body.classList.contains('quiz-hear'), 'body not flagged');
        ok(!document.getElementById('quiz-replay').hidden, 'REPLAY hidden in HEAR');
        var t = quiz.target;
        quizAnswer(+t.dataset.chroma);
        eq(document.querySelectorAll('.quiz-target').length, 1, 'target not marked after answer');
        eq(document.querySelectorAll('.quiz-reticle').length, 1, 'reticle not shown after answer');
        ok(t.classList.contains('quiz-reveal'), 'answer not revealed');
        eq(quiz.score, 1, 'score');
      } finally {
        quizStop(); setQuizMode('see');
        if (savedBest === null) localStorage.removeItem('pent-quiz-best');
        else localStorage.setItem('pent-quiz-best', savedBest);
      }
      ok(!document.body.classList.contains('quiz-hear'), 'quiz-hear left on body');
      ok(document.getElementById('quiz-replay').hidden, 'REPLAY still shown in SEE');
    });

    test('R replays only in HEAR IT', function() {
      boardA();
      var ev = function() { return { code: 'KeyR', repeat: false, preventDefault: function() {} }; };
      try {
        quizStart();
        eq(quizKeyDown(ev()), false, 'R handled in SEE');
        setQuizMode('hear');
        eq(quizKeyDown(ev()), true, 'R ignored in HEAR');
      } finally { quizStop(); setQuizMode('see'); }
    });
  });
})();
