// changelog.js — CHANGELOG data (newest first) + the changelog modal
// Depends on: (no other JS files beyond DOM access)

const CHANGELOG = [
  { version: 'v4.3.0', date: '2026-10-28', title: 'Drone, chromatic map, fresh look', items: [
    ['Root drone', 'The top-left button holds the key\'s root and fifth under everything you play. Press D to turn it on or off.'],
    ['Chromatic preset', 'A sixth classic shows all 12 notes on the whole neck. PLAY SCALE runs one octave up from the root and back.'],
    ['Presets keep your lens', 'Loading a preset in MAJOR no longer flips you back to MINOR. A minor shape moves to the relative minor instead.'],
    ['Fret side dots', 'Soft yellow dots under the neck mark frets 3, 5, 7, 9, 12, 15 and 17, like a real guitar.'],
    ['Cobalt blue note', 'The blue note is now a deep, true blue instead of purple.'],
    ['New theme fonts', 'Tropical Night uses Fredoka + Nunito, Mission Control uses Chakra Petch + IBM Plex Sans. Their title and note letters are cleaner too.'],
    ['Keycap buttons', 'The top-bar buttons are raised keys, and Practice and Help have labels.'],
    ['Changelog', 'This window: what changed in each version.'],
  ]},
  { version: 'v4.1.0', date: '2026-10-27', title: 'Top bar, pause, blue notes, patterns', items: [
    ['Sticky top bar', 'The theme menu, Practice Lab and Help stay in reach while you scroll.'],
    ['Global pause', 'Space or K freezes scales, the game, the metronome and the timer, then resumes at the same note.'],
    ['Sharps or flats', 'NOTE NAMES respells every note with ♯ or ♭.'],
    ['Blue note', '+ BLUE NOTE adds the blues note (♭5 in minor, ♭3 in major), drawn with a dashed ring.'],
    ['Custom patterns', 'Draw your own shape, save it by name, or load a classic. Patterns follow the key.'],
  ]},
  { version: 'v4.0.0', date: '2026-06-18', title: 'All sharps', items: [
    ['Sharp spelling', 'Every note name uses sharps (A#, D#, G#), so keys and labels always match.'],
  ]},
  { version: 'v3.8.0', date: '2026-06-18', title: 'Learning lessons', items: [
    ['LEARNING', 'Five short theory lessons with PREV / NEXT. Press L to open them.'],
  ]},
  { version: 'v3.6.0', date: '2026-06-18', title: 'New themes', items: [
    ['Tropical Night + Mission Control', 'Two new themes replace two older ones. Your pick is saved.'],
  ]},
  { version: 'v3.5.0', date: '2026-06-18', title: 'Tests and a box fix', items: [
    ['Test suite', 'Automated checks cover the scale math, the fretboard and the game.'],
    ['Box fix', 'Boxes in high keys no longer split across two parts of the neck.'],
    ['Finish, then judge', 'In the game you play the whole lick before you hear if it was right.'],
  ]},
  { version: 'v3.1.0', date: '2026-06-15', title: 'Parallel keys', items: [
    ['Own notes per lens', 'MINOR and MAJOR give each root its own 5 notes: C major is C D E G A.'],
    ['Game follows your box', 'Switch box or key mid-game and the lick restarts there.'],
  ]},
  { version: 'v3.0.0', date: '2026-06-15', title: 'Lick Attack', items: [
    ['Lick Attack game', 'Watch a short lick light up, then replay it from memory to earn XP.'],
  ]},
  { version: 'v2.0.0', date: '2026-06-15', title: 'All 12 keys', items: [
    ['12 keys', 'Pick any root from A to G# and the whole neck follows.'],
  ]},
  { version: 'v1.4.0', date: '2026-06-15', title: 'First release', items: [
    ['Foundations', 'Plucked-guitar sound, themes, keyboard shortcuts, help, and the Practice Lab with metronome and timer.'],
  ]},
];

function toggleChangelog() { document.getElementById('changelog-modal').classList.toggle('hidden'); }
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
  document.getElementById('changelog-list').innerHTML = CHANGELOG.map(r =>
    `<section class="cl-release"><h3><span class="kbd">${r.version}</span> ${r.title} <time>${r.date}</time></h3><ul>` +
    r.items.map(([name, text]) => `<li><b>${name}</b> ${text}</li>`).join('') +
    `</ul></section>`
  ).join('');
}
