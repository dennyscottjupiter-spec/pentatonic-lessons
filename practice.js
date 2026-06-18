// practice.js — help modal, practice modal, 7-day challenge, learning modal
// Depends on: (no other JS files beyond DOM access)

function toggleHelp()    { document.getElementById('help-modal').classList.toggle('hidden'); }
function closeHelp()     { document.getElementById('help-modal').classList.add('hidden'); }
function togglePractice(){ document.getElementById('practice-modal').classList.toggle('hidden'); }
function closePractice() { document.getElementById('practice-modal').classList.add('hidden'); }

// ---------- Learning Modal ----------
const LESSONS = [
  {
    title: '🎸 LESSON 1 — WHAT IS A PENTATONIC SCALE?',
    body: `<p>A <b>pentatonic scale</b> is just 5 notes ("penta" = 5, "tonic" = notes). Out of the 12 possible notes in Western music, we pick 5 that always sound great together.</p>
<p>Why 5? Because these 5 avoid the notes that tend to clash. The result: <b>every note you play sounds musical</b>, even if you're just noodling around. That's why it's the #1 scale for beginners <em>and</em> pros.</p>
<p><b>Try it now:</b> pick A + MINOR, click any glowing note on the fretboard. Impossible to sound wrong! 🔥</p>
<ul><li>🔵 Cyan = scale note (sounds great)</li><li>🩷 Pink = ROOT note (the "home base" — sounds best)</li><li>⚫ Dim = out of scale (avoid for now)</li></ul>`,
  },
  {
    title: '🔀 LESSON 2 — MINOR vs MAJOR',
    body: `<p>Same root, different 5 notes, completely different vibe:</p>
<ul>
<li><b>MINOR pentatonic</b> → darker, bluesier, emotional. <em>A + MINOR = A C D E G</em>. This is classic rock, blues, metal.</li>
<li><b>MAJOR pentatonic</b> → brighter, happier, country/pop. <em>A + MAJOR = A B C# E F#</em>.</li>
</ul>
<p>These are NOT the same shapes shifted — they're <b>different sets of 5 notes</b> from the same root. Toggle MINOR/MAJOR with the same key selected and watch the fretboard change.</p>
<p><b>Key insight:</b> C MAJOR and A MINOR share the exact same 5 notes — they're "relatives." Toggle between <em>C + MAJOR</em> and <em>A + MINOR</em> and see for yourself. The notes don't change, only the <em>home base</em> shifts.</p>`,
  },
  {
    title: '🏠 LESSON 3 — THE ROOT IS YOUR HOME',
    body: `<p>The <b>pink/magenta notes</b> are the ROOT — the tonal center. It's the note that feels like "home," the one your ear wants to resolve to.</p>
<p>🎯 <b>Pro tip:</b> Start phrases on the root. End phrases on the root. Land on it on beat 1. Your solos will immediately sound intentional, not random.</p>
<p>In A MINOR: the root is <b>A</b>. Find it on every string — it's scattered all over the neck, which is why you can play in any position.</p>
<p>Practice: click the root, play some other notes, then come back to the root. Hear how satisfying that resolution feels? That's music theory in action, right there on the fretboard. 🎵</p>`,
  },
  {
    title: '📦 LESSON 4 — THE 5 BOX POSITIONS',
    body: `<p>The 5 boxes divide the same pentatonic scale into <b>5 playable regions</b> up the neck. Each box covers roughly 4 frets and all 6 strings.</p>
<ul>
<li><b>Box 1</b> (frets 5-8 for A minor) — the most popular. Start here!</li>
<li><b>Box 2</b> starts where Box 1 ends — they share 2 overlap frets.</li>
<li>…and so on all the way to Box 5 near fret 17.</li>
</ul>
<p>The boxes are connected — a note at the top of Box 1 is also at the bottom of Box 2. Together they tile the <b>entire neck</b>.</p>
<p><b>Press keys 1–5</b> on your keyboard to jump between boxes. Try pressing ALL to see all 5 boxes at once and spot the connections. 🗺️</p>`,
  },
  {
    title: '🎮 LESSON 5 — FROM SCALE TO LICKS',
    body: `<p>Knowing the scale is step one. Playing <b>licks</b> (short musical phrases) is how you turn notes into music.</p>
<p>A lick has rhythm, direction, and attitude — it's a sentence, not just a list of words.</p>
<p>🏋️ <b>How to practice effectively:</b></p>
<ol>
<li>Choose a box (start with Box 1)</li>
<li>Press ▶ PLAY SCALE to hear the notes in order</li>
<li>Press ▶ START GAME — watch the lick light up, then replay it</li>
<li>Earn XP, level up through all 5 boxes</li>
<li>Slow practice → muscle memory → speed comes naturally</li>
</ol>
<p>🎯 Goal: internalize Box 1 so well you don't have to think. Then move to Box 2. In a few weeks you'll own the whole neck. Let's go! 🚀</p>`,
  },
];

let _learnIdx = 0;

function toggleLearn() { document.getElementById('learn-modal').classList.toggle('hidden'); }
function closeLearn()  { document.getElementById('learn-modal').classList.add('hidden'); }

function renderLesson(idx) {
  _learnIdx = Math.max(0, Math.min(LESSONS.length - 1, idx));
  const lesson = LESSONS[_learnIdx];
  document.getElementById('learn-content').innerHTML =
    `<h2>${lesson.title}</h2><div class="lesson-body">${lesson.body}</div>`;
  // dots
  const dots = document.getElementById('learn-dots');
  dots.innerHTML = LESSONS.map((_, i) =>
    `<span class="learn-dot${i === _learnIdx ? ' active' : ''}" data-idx="${i}"></span>`
  ).join('');
  dots.querySelectorAll('.learn-dot').forEach(d =>
    d.addEventListener('click', () => renderLesson(+d.dataset.idx))
  );
  document.getElementById('learn-prev').disabled = _learnIdx === 0;
  document.getElementById('learn-next').disabled = _learnIdx === LESSONS.length - 1;
}

function renderChallenge() {
  const days = [
    'Solo 5 min over Am backing track (Box 1)',
    'Solo 5 min over Am backing track (Box 2)',
    'Solo 5 min — connect Box 1 + 2',
    'Solo 5 min (Box 3 — fret IX)',
    'Solo 5 min — boxes 1, 2, 3 in sequence',
    'Try a new key (Em or Dm)',
    'Free 10-min jam — all boxes, any key!',
  ];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('pent-challenge')||'{}'); } catch(e) {}
  const container = document.getElementById('challenge-days');
  container.innerHTML = '';
  days.forEach((text, i) => {
    const checked = !!saved[i];
    const div = document.createElement('div');
    div.className = 'day-check' + (checked ? ' done' : '');
    div.innerHTML = `<input type="checkbox" id="day${i}" ${checked?'checked':''} />
      <label for="day${i}">Day ${i+1}: ${text}</label>`;
    div.querySelector('input').addEventListener('change', function() {
      saved[i] = this.checked;
      div.classList.toggle('done', this.checked);
      try { localStorage.setItem('pent-challenge', JSON.stringify(saved)); } catch(e) {}
    });
    container.appendChild(div);
  });
}
