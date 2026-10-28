// ---
// purpose: registers sw.js for offline use and Home Screen install
// exports: none (side effect at load)
// gotcha: registers only on https; file:// and http skip it so dev never serves stale files
// ---
// Only https (GitHub Pages): a cached service worker on localhost would hide your edits.
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
