// ---
// purpose: Suite 16: NOTE QUIZ key mapping, board pool, piano render, round lifecycle
// exports: none (registers suites)
// depends: tests-lib.js (window.T), quiz.js (quiz, quizStart, quizStop, quizAnswer, quizKeyChroma, quizPool, renderQuizKeys), engine.js (setKey, buildFretboard, refreshNotes)
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok;

  // Key A, box 1, minor: the board the quiz draws from
  function boardA() { setKey(0); state.box = '1'; buildFretboard(); refreshNotes(); }

  suite('16 · Note quiz (keys / pool / rounds)', function() {
    test('quizKeyChroma maps letters, Shift and the accidentals mode', function() {
      try {
        state.accidentals = 'sharp';
        eq(quizKeyChroma({ code: 'KeyC', shiftKey: false }), 0, 'C');
        eq(quizKeyChroma({ code: 'KeyA', shiftKey: false }), 9, 'A');
        eq(quizKeyChroma({ code: 'KeyF', shiftKey: true }), 6, 'Shift+F sharp');
        eq(quizKeyChroma({ code: 'Digit1', shiftKey: false }), null, 'Digit1');
        state.accidentals = 'flat';
        eq(quizKeyChroma({ code: 'KeyB', shiftKey: true }), 10, 'Shift+B flat');
        eq(quizKeyChroma({ code: 'KeyC', shiftKey: true }), 11, 'Shift+C flat');
      } finally { state.accidentals = 'sharp'; }
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
        eq(document.querySelector('#quiz-keys .pk[data-chroma="10"]').textContent, FLAT_NAMES[10], 'flat label');
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
  });
})();
