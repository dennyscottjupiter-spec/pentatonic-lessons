// ---
// purpose: Zero-dep test framework, ground-truth SCALES table, applyKey/resetState helpers
// exports: window.T { suite, test, fail, eq, ok, setEq, arrEq, throwsNot, SCALES, applyKey, reset, results }
// depends: tests.html stub (window.state), engine.js (setKey)
// gotcha: suite() runs its fn immediately at file load; file order = report order
// ---

(function () {
  'use strict';

  var _results = [];
  var _curSuite = 'Uncategorised';

  function suite(name, fn) {
    _curSuite = name;
    fn();
    _curSuite = 'Uncategorised';
  }

  function test(name, fn) {
    try {
      fn();
      _results.push({ suite: _curSuite, name: name, pass: true, detail: null });
    } catch (e) {
      _results.push({ suite: _curSuite, name: name, pass: false,
                      detail: e.detail || { msg: String(e) } });
    }
  }

  function fail(detail) {
    var e = new Error('assertion failed');
    e.detail = detail;
    throw e;
  }

  function eq(a, b, label) {
    if (a !== b) fail({ msg: (label ? label + ': ' : '') + 'expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a) });
  }

  function ok(cond, msg) {
    if (!cond) fail({ msg: msg || 'condition was falsy' });
  }

  function setEq(set, arr, label) {
    var a = Array.from(set).sort(function(x,y){return x-y;});
    var b = arr.slice().sort(function(x,y){return x-y;});
    if (a.length !== b.length || a.some(function(v,i){return v!==b[i];}))
      fail({ expected: JSON.stringify(b), actual: JSON.stringify(a),
             msg: (label||'Set mismatch') });
  }

  function arrEq(a, b, label) {
    var sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) fail({ expected: sb, actual: sa, msg: label || 'Array mismatch' });
  }

  function throwsNot(fn, label) {
    try { fn(); }
    catch(e) { fail({ msg: (label || 'threw') + ': ' + String(e) }); }
  }

  // ═══════════════════════════════════════════════════
  // GROUND-TRUTH SCALE TABLE
  // Derived from PENT_OFFSETS=[0,3,5,7,10], MAJOR_OFFSETS=[0,2,4,7,9].
  // All sharps — no flat spelling, no enharmonic exceptions.
  // ═══════════════════════════════════════════════════
  var SCALES = {
    //           key   lens      chromas (sorted)          display names (root first)
    'A minor':   { chromas:[9,0,2,4,7],   notes:['A','C','D','E','G']             },
    'A# minor':  { chromas:[10,1,3,5,8],  notes:['A#','C#','D#','F','G#']         },
    'B minor':   { chromas:[11,2,4,6,9],  notes:['B','D','E','F#','A']            },
    'C minor':   { chromas:[0,3,5,7,10],  notes:['C','D#','F','G','A#']           },
    'C# minor':  { chromas:[1,4,6,8,11],  notes:['C#','E','F#','G#','B']          },
    'D minor':   { chromas:[2,5,7,9,0],   notes:['D','F','G','A','C']             },
    'D# minor':  { chromas:[3,6,8,10,1],  notes:['D#','F#','G#','A#','C#']        },
    'E minor':   { chromas:[4,7,9,11,2],  notes:['E','G','A','B','D']             },
    'F minor':   { chromas:[5,8,10,0,3],  notes:['F','G#','A#','C','D#']          },
    'F# minor':  { chromas:[6,9,11,1,4],  notes:['F#','A','B','C#','E']           },
    'G minor':   { chromas:[7,10,0,2,5],  notes:['G','A#','C','D','F']            },
    'G# minor':  { chromas:[8,11,1,3,6],  notes:['G#','B','C#','D#','F#']         },

    'A major':   { chromas:[9,11,1,4,6],  notes:['A','B','C#','E','F#']           },
    'A# major':  { chromas:[10,0,2,5,7],  notes:['A#','C','D','F','G']            },
    'B major':   { chromas:[11,1,3,6,8],  notes:['B','C#','D#','F#','G#']         },
    'C major':   { chromas:[0,2,4,7,9],   notes:['C','D','E','G','A']             },
    'C# major':  { chromas:[1,3,5,8,10],  notes:['C#','D#','F','G#','A#']         },
    'D major':   { chromas:[2,4,6,9,11],  notes:['D','E','F#','A','B']            },
    'D# major':  { chromas:[3,5,7,10,0],  notes:['D#','F','G','A#','C']           },
    'E major':   { chromas:[4,6,8,11,1],  notes:['E','F#','G#','B','C#']          },
    'F major':   { chromas:[5,7,9,0,2],   notes:['F','G','A','C','D']             },
    'F# major':  { chromas:[6,8,10,1,3],  notes:['F#','G#','A#','C#','D#']        },
    'G major':   { chromas:[7,9,11,2,4],  notes:['G','A','B','D','E']             },
    'G# major':  { chromas:[8,10,0,3,5],  notes:['G#','A#','C','D#','F']          },
  };

  // Helper: set state + recompute for a given KEYS index + lens
  function applyKey(keyIdx, lens) {
    state.keyIdx = keyIdx;
    state.lens   = lens;
    setKey(keyIdx);           // engine.js — sets state.scaleChromas + state.activeBoxes
  }

  // Restores every field the feature suites touch, so later suites start clean
  function reset() {
    state.accidentals = 'sharp';
    state.blues = false;
    state.box = '1';
    state.labels = true;
    state.mode = 'explore';
    state.pattern = [];
    state.patternRef = null;
    state.patternRoots = false;
    state.building = false;
    applyKey(0, 'minor');
    stopSteps();
    setPaused(false);
    document.body.classList.remove('is-playing', 'is-paused');
  }

  window.T = {
    suite: suite, test: test, fail: fail, eq: eq, ok: ok, setEq: setEq,
    arrEq: arrEq, throwsNot: throwsNot, SCALES: SCALES, applyKey: applyKey,
    reset: reset, results: _results
  };
})();
