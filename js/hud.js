// ---
// purpose: Sticky HUD behaviour: theme dropdown menu + compact-on-scroll
// exports: syncThemeTrigger()
// depends: app.js (state.theme, applyTheme wiring on .theme-btn)
// ---

// Mirrors state.theme onto the trigger: checked item, swatch copy, short name
function syncThemeTrigger() {
  const theme = state.theme;
  $$('.theme-btn').forEach(b => b.setAttribute('aria-checked', String(b.dataset.theme === theme)));
  $('#theme-swatch').replaceChildren($(`.theme-btn[data-theme="${theme}"] .swatch`).cloneNode(true));
  $('#theme-name').textContent = { crt: 'CRT', tropical: 'Tropical', mission: 'Mission', blueprint: 'Blueprint' }[theme];
}

(function wireHud() {
  const menu = $('#theme-menu');
  const trigger = $('#theme-trigger');
  const NAV_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

  // app.js registers its applyTheme click listener first, so state.theme is already current here
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => {
    syncThemeTrigger();
    menu.hidePopover();
    trigger.focus();
  }));

  menu.addEventListener('toggle', e => {
    const open = e.newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    if (!open) return;
    // Right-align to the trigger, clamped inside the viewport (on phones the rail wraps to the left).
    // clientWidth excludes the scrollbar; innerWidth would shift the menu ~15px left
    const r = trigger.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, vw - menu.offsetWidth - 8)) + 'px';
    const checked = $('#theme-menu [aria-checked="true"]');
    if (checked) checked.focus();
  });

  menu.addEventListener('keydown', e => {
    if (!NAV_KEYS.includes(e.key)) return;
    const items = $$('#theme-menu .theme-btn');
    const i = items.indexOf(document.activeElement);
    const target = { ArrowDown: (i + 1) % items.length, ArrowUp: (i - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[e.key];
    e.preventDefault();
    items[target].focus();
  });

  window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 8), { passive: true });
  syncThemeTrigger();
})();
