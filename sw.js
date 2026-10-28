// ---
// purpose: service worker: offline app shell, network-first so updates still arrive online
// exports: none (install, activate and fetch listeners)
// depends: index.html, manifest.webmanifest, icons/*.png, css/*.css, js/*.js (listed in FILES)
// gotcha: a new css/js file must be added to FILES or it is missing offline
// ---
const CACHE = 'pent-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'css/themes.css', 'css/styles.css', 'css/hud.css', 'css/modals.css', 'css/changelog.css',
  'css/features.css', 'css/quiz.css', 'css/quiz-cue.css', 'css/quiz-piano.css', 'css/stand.css',
  'js/data.js', 'js/audio.js', 'js/drone.js', 'js/player.js', 'js/engine.js', 'js/game.js',
  'js/practice.js', 'js/changelog.js', 'js/app.js', 'js/patterns.js', 'js/quiz-piano.js',
  'js/mic.js', 'js/quiz.js', 'js/quiz-play.js', 'js/hud.js', 'js/pwa.js', 'js/stand.js', 'js/quiz-walk.js',
];

// Each add() is caught on its own so one missing file cannot fail the whole install.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !/^https?:/.test(req.url)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
