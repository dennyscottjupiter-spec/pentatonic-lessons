// ---
// purpose: Builds the 24-scale matrix data and hands results to renderTestReport (load last)
// exports: none (sets window._testResults, window._scaleGrid, calls renderTestReport)
// depends: tests-lib.js (window.T), engine.js (spell), data.js (KEYS)
// ---
(function () {
  'use strict';
  var T = window.T;
  var applyKey = T.applyKey, SCALES = T.SCALES;
  var scaleGrid = {};
  KEYS.forEach(function(k, keyIdx) {
    ['minor','major'].forEach(function(lens) {
      var label   = k.name + ' ' + lens;
      var gridKey = k.name + ' ' + lens.toUpperCase();
      var gt      = SCALES[label];
      var pass    = false;
      var notes   = gt ? gt.notes.slice() : [];
      if (gt) {
        try {
          applyKey(keyIdx, lens);
          var spelled  = gt.chromas.map(function(ch){ return spell(ch); }).sort().join(',');
          var expected = gt.notes.slice().sort().join(',');
          pass = (spelled === expected);
        } catch(e) { pass = false; }
      }
      scaleGrid[gridKey] = { notes: notes, pass: pass };
    });
  });

  window._testResults = T.results;
  window._scaleGrid   = scaleGrid;
  window.renderTestReport();

})();