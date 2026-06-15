// practice.js — help modal, practice modal, 7-day challenge
// Depends on: (no other JS files beyond DOM access)

function toggleHelp()    { document.getElementById('help-modal').classList.toggle('hidden'); }
function closeHelp()     { document.getElementById('help-modal').classList.add('hidden'); }
function togglePractice(){ document.getElementById('practice-modal').classList.toggle('hidden'); }
function closePractice() { document.getElementById('practice-modal').classList.add('hidden'); }

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
