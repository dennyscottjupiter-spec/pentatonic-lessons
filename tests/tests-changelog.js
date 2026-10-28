// ---
// purpose: Suite 15: CHANGELOG data is well-formed, newest first, and renders one block per release
// exports: none (registers suites)
// depends: tests-lib.js (window.T), changelog.js (CHANGELOG, renderChangelog, syncChangelogBadge, markChangelogSeen, spotlight)
// ---
(function () {
  'use strict';
  var T = window.T;
  var suite = T.suite, test = T.test, eq = T.eq, ok = T.ok;

  suite('15 · Changelog (data shape / order / render)', function() {
    test('every release has version vX.Y.Z, ISO date, title and at least one item', function() {
      CHANGELOG.forEach(function(r) {
        ok(/^v\d+\.\d+\.\d+$/.test(r.version), 'bad version ' + r.version);
        ok(/^\d{4}-\d{2}-\d{2}$/.test(r.date), 'bad date on ' + r.version);
        ok(r.title && r.items.length > 0, 'empty release ' + r.version);
      });
    });

    test('every item is [name, text] or [name, text, selector] of non-empty strings', function() {
      CHANGELOG.forEach(function(r) {
        r.items.forEach(function(it) {
          ok((it.length === 2 || it.length === 3) && it[0] && it[1], 'bad item in ' + r.version);
          if (it.length === 3) {
            ok(typeof it[2] === 'string' && it[2], 'empty selector in ' + r.version);
            document.querySelector(it[2]);   // throws on an invalid selector
          }
        });
      });
    });

    test('releases are newest first (dates never go up)', function() {
      for (var i = 1; i < CHANGELOG.length; i++) {
        ok(CHANGELOG[i].date <= CHANGELOG[i - 1].date, CHANGELOG[i].version + ' is out of order');
      }
    });

    test('renderChangelog() draws one section per release and one li per item', function() {
      var host = document.createElement('div');
      host.id = 'changelog-list';
      document.body.appendChild(host);
      try {
        renderChangelog();
        var total = CHANGELOG.reduce(function(n, r) { return n + r.items.length; }, 0);
        eq(host.querySelectorAll('.cl-release').length, CHANGELOG.length, 'sections');
        eq(host.querySelectorAll('li').length, total, 'items');
        var links = CHANGELOG.reduce(function(n, r) { return n + r.items.filter(function(it) { return it[2]; }).length; }, 0);
        eq(host.querySelectorAll('.cl-item').length, links, 'show-me rows');
      } finally {
        host.remove();
      }
    });

    test('spotlight() lights a hole on a real control, ignores a missing one', function() {
      var modal = document.createElement('div');
      modal.id = 'changelog-modal';
      var target = document.createElement('button');
      target.id = 'spot-test-target';
      document.body.append(modal, target);
      var old = document.getElementById('spotlight');
      if (old) old.remove();
      try {
        spotlight('#no-such-control', 'x');
        ok(!document.getElementById('spotlight'), 'spotlight shown for a missing control');
        spotlight('#spot-test-target', 'Root drone');
        var spot = document.getElementById('spotlight');
        ok(spot && spot.classList.contains('on'), 'spotlight not on');
        eq(spot.dataset.label, 'Root drone', 'caption');
        ok(modal.classList.contains('hidden'), 'changelog not closed');
      } finally {
        cancelAnimationFrame(_spotRaf);
        var s = document.getElementById('spotlight');
        if (s) s.remove();
        modal.remove(); target.remove();
      }
    });

    test('new-release dot shows until markChangelogSeen(), then hides', function() {
      var btn = document.createElement('button');
      btn.id = 'changelog-btn';
      document.body.appendChild(btn);
      var saved = localStorage.getItem('pent-changelog-seen');
      try {
        localStorage.removeItem('pent-changelog-seen');
        syncChangelogBadge();
        ok(btn.classList.contains('has-new'), 'dot missing before first open');
        markChangelogSeen();
        ok(!btn.classList.contains('has-new'), 'dot still shown after open');
      } finally {
        if (saved === null) localStorage.removeItem('pent-changelog-seen');
        else localStorage.setItem('pent-changelog-seen', saved);
        btn.remove();
      }
    });
  });
})();
