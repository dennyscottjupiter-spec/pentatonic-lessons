// changelog.js — CHANGELOG data (newest first) + the changelog modal + "show me" spotlight
// Depends on: (no other JS files beyond DOM access)

// Items are [name, text] or [name, text, selector]; a selector makes the row a "show me" link
const CHANGELOG = [
  { version: 'v4.6.1', date: '2026-10-28', title: 'PLAY IT fixes', items: [
    ['Sound hold', 'In PLAY IT the drone and metronome pause while the mic listens and come back after, so the mic hears only your string.', '#quiz-btn'],
    ['Silent clicks', 'In PLAY IT a fret click makes no sound, so the speakers cannot answer for the guitar.', '#quiz-btn'],
    ['Mic message', 'If the mic is blocked, the reason stays on the prompt. On a plain http page it says the mic needs https.', '#quiz-btn'],
    ['Hidden tab and pause', 'The mic turns off in a hidden tab and comes back when you return. While paused, it ignores what it hears.', '#quiz-btn'],
  ]},
  { version: 'v4.6.0', date: '2026-10-28', title: 'Guitar mic quiz, interval names', items: [
    ['PLAY IT', 'In the note quiz, pick 🎸 PLAY IT: play the glowing note on your real guitar. The app listens through the mic, any octave counts, and nothing is recorded or saved.', '#quiz-btn'],
    ['Interval names', 'After every answer the quiz names how far the note sits from the root, like "5 · perfect 5th".', '#quiz-btn'],
  ]},
  { version: 'v4.5.0', date: '2026-10-28', title: 'Ear quiz, piano typing, wider panels', items: [
    ['Hear it', 'In the note quiz, pick 👂 HEAR IT: you hear the root, then a mystery note, and name it. REPLAY (or R) plays both again.', '#quiz-btn'],
    ['Piano typing', 'Play the quiz piano on your keyboard like a music app: A S D F G H J are the white keys, W E T Y U the black ones. A held key lights up.', '#quiz-btn'],
    ['Wider panels', 'Help, Practice Lab, Learning and this changelog open much wider. Practice Lab splits into two columns.', '#practice-btn'],
  ]},
  { version: 'v4.4.0', date: '2026-10-28', title: 'Note quiz, show me, shortcut keys', items: [
    ['Note quiz', 'Press 🎯 NOTE QUIZ (or Q). One note glows with its name hidden: name it on the mini piano or type the letter. Shift adds a sharp.', '#quiz-btn'],
    ['Show me', 'Click a change in this list and the app points straight at it.', '#changelog-btn'],
    ['Shortcut keys', 'Help shows every shortcut as a keycap, and C now opens this changelog.', '#help-btn'],
  ]},
  { version: 'v4.3.0', date: '2026-10-28', title: 'Drone, chromatic map, fresh look', items: [
    ['Root drone', 'The top-left button holds the key\'s root and fifth under everything you play. Press D to turn it on or off.', '#drone-btn'],
    ['Chromatic preset', 'A sixth classic shows all 12 notes on the whole neck. PLAY SCALE runs one octave up from the root and back.', '#pattern-select'],
    ['Presets keep your lens', 'Loading a preset in MAJOR no longer flips you back to MINOR. A minor shape moves to the relative minor instead.', 'fieldset:has(.lens)'],
    ['Fret side dots', 'Soft yellow dots under the neck mark frets 3, 5, 7, 9, 12, 15 and 17, like a real guitar.', '#fretboard'],
    ['Cobalt blue note', 'The blue note is now a deep, true blue instead of purple.', '[data-toggle="blues"]'],
    ['New theme fonts', 'Tropical Night uses Fredoka + Nunito, Mission Control uses Chakra Petch + IBM Plex Sans. Their title and note letters are cleaner too.', '#theme-trigger'],
    ['Keycap buttons', 'The top-bar buttons are raised keys, and Practice and Help have labels.', '.hud-rail'],
    ['Changelog', 'This window: what changed in each version.', '#changelog-btn'],
  ]},
  { version: 'v4.1.0', date: '2026-10-27', title: 'Top bar, pause, blue notes, patterns', items: [
    ['Sticky top bar', 'The theme menu, Practice Lab and Help stay in reach while you scroll.', 'header.hud'],
    ['Global pause', 'Space or K freezes scales, the game, the metronome and the timer, then resumes at the same note.', '#pause-btn'],
    ['Sharps or flats', 'NOTE NAMES respells every note with ♯ or ♭.', 'fieldset:has(.acc)'],
    ['Blue note', '+ BLUE NOTE adds the blues note (♭5 in minor, ♭3 in major), drawn with a dashed ring.', '[data-toggle="blues"]'],
    ['Custom patterns', 'Draw your own shape, save it by name, or load a classic. Patterns follow the key.', '.pattern-group'],
  ]},
  { version: 'v4.0.0', date: '2026-06-18', title: 'All sharps', items: [
    ['Sharp spelling', 'Every note name uses sharps (A#, D#, G#), so keys and labels always match.', '#key-row'],
  ]},
  { version: 'v3.8.0', date: '2026-06-18', title: 'Learning lessons', items: [
    ['LEARNING', 'Five short theory lessons with PREV / NEXT. Press L to open them.', '#learn-btn'],
  ]},
  { version: 'v3.6.0', date: '2026-06-18', title: 'New themes', items: [
    ['Tropical Night + Mission Control', 'Two new themes replace two older ones. Your pick is saved.', '#theme-trigger'],
  ]},
  { version: 'v3.5.0', date: '2026-06-18', title: 'Tests and a box fix', items: [
    ['Test suite', 'Automated checks cover the scale math, the fretboard and the game.'],
    ['Box fix', 'Boxes in high keys no longer split across two parts of the neck.', '#box-row'],
    ['Finish, then judge', 'In the game you play the whole lick before you hear if it was right.', '#game-toggle'],
  ]},
  { version: 'v3.1.0', date: '2026-06-15', title: 'Parallel keys', items: [
    ['Own notes per lens', 'MINOR and MAJOR give each root its own 5 notes: C major is C D E G A.', 'fieldset:has(.lens)'],
    ['Game follows your box', 'Switch box or key mid-game and the lick restarts there.', '#box-row'],
  ]},
  { version: 'v3.0.0', date: '2026-06-15', title: 'Lick Attack', items: [
    ['Lick Attack game', 'Watch a short lick light up, then replay it from memory to earn XP.', '#game-toggle'],
  ]},
  { version: 'v2.0.0', date: '2026-06-15', title: 'All 12 keys', items: [
    ['12 keys', 'Pick any root from A to G# and the whole neck follows.', '#key-row'],
  ]},
  { version: 'v1.4.0', date: '2026-06-15', title: 'First release', items: [
    ['Foundations', 'Plucked-guitar sound, themes, keyboard shortcuts, help, and the Practice Lab with metronome and timer.', '#practice-btn'],
  ]},
];

function toggleChangelog() { document.getElementById('changelog-modal').classList.toggle('hidden'); }
function openChangelog()   { renderChangelog(); markChangelogSeen(); toggleChangelog(); }
function closeChangelog()  { document.getElementById('changelog-modal').classList.add('hidden'); }

// Glowing dot on the button until the newest release has been opened once
function syncChangelogBadge() {
  let seen = null;
  try { seen = localStorage.getItem('pent-changelog-seen'); } catch (e) {}
  document.getElementById('changelog-btn').classList.toggle('has-new', seen !== CHANGELOG[0].version);
}
function markChangelogSeen() {
  try { localStorage.setItem('pent-changelog-seen', CHANGELOG[0].version); } catch (e) {}
  syncChangelogBadge();
}

function renderChangelog() {
  const list = document.getElementById('changelog-list');
  list.innerHTML = CHANGELOG.map((r, ri) =>
    `<section class="cl-release"><h3><span class="kbd">${r.version}</span> ${r.title} <time>${r.date}</time></h3><ul>` +
    r.items.map(([name, text, sel], ii) => sel
      ? `<li><button class="cl-item" data-r="${ri}" data-i="${ii}"><b>${name}</b> ${text}<span class="cl-go" aria-hidden="true"></span></button></li>`
      : `<li><b>${name}</b> ${text}</li>`).join('') +
    `</ul></section>`
  ).join('');
  list.querySelectorAll('.cl-item').forEach(b => b.addEventListener('click', () => {
    const [name, , sel] = CHANGELOG[+b.dataset.r].items[+b.dataset.i];
    spotlight(sel, name);
  }));
}

// Coach-mark: close the list, scroll to the control, cut a glowing hole around it for a moment
let _spotRaf = 0;
function spotlight(sel, label) {
  const el = document.querySelector(sel);
  if (!el) return;
  closeChangelog();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  let spot = document.getElementById('spotlight');
  if (!spot) { spot = document.createElement('div'); spot.id = 'spotlight'; spot.setAttribute('aria-hidden', 'true'); document.body.appendChild(spot); }
  spot.dataset.label = label;
  spot.classList.remove('on'); void spot.offsetWidth; spot.classList.add('on');   // restart the animation
  cancelAnimationFrame(_spotRaf);
  const end = performance.now() + 2800;
  const track = now => {   // follow the control while the page scrolls under it
    const r = el.getBoundingClientRect();
    Object.assign(spot.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    if (now < end) _spotRaf = requestAnimationFrame(track); else spot.classList.remove('on');
  };
  track(performance.now());
  setTimeout(() => document.addEventListener('pointerdown', () => { cancelAnimationFrame(_spotRaf); spot.classList.remove('on'); }, { once: true }), 0);
}
