# PLANNING — PENTATONIC ARCADE: LEVEL 2 UPGRADE

```
  ╔═══════════════════════════════════════════════════════╗
  ║   ▙▟ PENTATONIC ARCADE ▙▟ — THE GAMIFICATION UPDATE   ║
  ║                                                       ║
  ║   🎸 GUITAR PLUCK SOUND     [Karplus-Strong synth]    ║
  ║   🌺 3 SWITCHABLE WORLDS    [CRT / Hawaii / Space]    ║
  ║   🕹️ LICK ATTACK GAME       [Simon-style + XP/levels] ║
  ║                                                       ║
  ║          INSERT COIN ── PRESS START TO PLAN           ║
  ╚═══════════════════════════════════════════════════════╝
```

### 🎯 Objective

Upgrade the pentatonic lesson app with (1) a realistic plucked-guitar sound via Karplus-Strong synthesis, (2) three switchable visual themes, and (3) a Simon-style "repeat the lick" game with real pentatonic licks, levels mapped to boxes 1–5, XP/streaks, and localStorage persistence — shipped as atomic tasks, each ending in a manual smoke test and a git commit.

**Assumption stated:** build order is audio → backgrounds → game, because audio is the smallest change and benefits everything after it, and the game is the largest and depends on the final sound for its show-the-lick phase.

### 🗺️ Relevant Codebase Areas

- `app.js` — all behavior. Key landmarks:
  - `playNote()` (~line 91) — the piano-ish synth being replaced.
  - `state` object (~line 45) — gains `theme`, `mode`, and game fields.
  - `onNoteClick()` (~line 270) — must route clicks to the game when in GAME mode.
  - `playCurrentScale()` + `flashNote()` — reusable for the lick "show phase".
  - `wireControls()` (~line 315) — where new buttons get wired.
- `index.html` — HUD (theme selector goes here), controls section (mode toggle goes here), level card (game panel replaces/augments it in GAME mode).
- `styles.css` — `:root` color variables at the top are the entire theming surface; themes = override blocks on a `body.theme-*` class.

### 📋 Step-by-Step Plan

> **Step 1 — Replace `playNote()` with Karplus-Strong pluck** 🎸
> In `app.js`, swap the two-oscillator synth for Karplus-Strong (a noise burst fed through a short averaging delay loop — physically models a vibrating string). Implementation: compute the pluck **offline into an `AudioBuffer`** (plain JS loop filling samples), cache one buffer per MIDI note in a `Map`, play via `AudioBufferSourceNode`. No oscillators, no per-note CPU cost after first play. Keep the `playNote(midi, duration)` signature so all callers (`onNoteClick`, `playCurrentScale`) work untouched.
> **Test:** open `index.html`, click frets — every note sounds like a plucked string, low E sounds deep, high e bright. `▶ PLAY SCALE` still works. **Commit.**

> **Step 2 — Add theme variable blocks to `styles.css`** 🎨
> Keep the current CRT palette as the `:root` default. Add `body.theme-hawaii { ... }` (sunset oranges/teals, warm sand fretboard) and `body.theme-space { ... }` (deep blues, starfield gradient) blocks that override the same custom properties (`--bg`, `--cyan`, `--magenta`, `--fret-wood`, etc.) plus the `body` background gradient. Scanlines overlay stays in all themes (it's the arcade identity).
> **Test:** in DevTools, add `theme-hawaii` / `theme-space` to `<body>` — full visual switch, fretboard stays readable in both. Hard-refresh (Ctrl+Shift+R) to defeat CSS cache. **Commit.**

> **Step 3 — Theme selector buttons + persistence** 🌺
> Add three small buttons to the HUD in `index.html` (`data-theme="crt|hawaii|space"`). In `app.js`: add `state.theme`, wire clicks in `wireControls()` to set the body class, save the choice to `localStorage` (wrapped in `try/catch` — private/incognito mode throws), restore on boot.
> **Test:** click each theme → instant switch; refresh page → chosen theme persists. **Commit.**

> **Step 4 — Add curated `LICKS` data table** 🎼
> New data block in `app.js` near `BOXES`: `LICKS = { 1: [...], 2: [...], ... 5: [...] }`, ~3–4 hand-curated classic pentatonic licks per box. Each lick = `{ name, steps: [{ s, f }, ...] }` (string index + fret). Every step must be in-scale AND inside its box's fret range — add a temporary console self-check at boot that validates this and logs `LICKS OK`, removed after verification.
> **Test:** open console → `LICKS OK`, no validation errors. **Commit.**

> **Step 5 — EXPLORE ⇄ GAME mode toggle + game panel skeleton** 🕹️
> Add a prominent mode button in `index.html` (arcade style: `▶ START GAME` / `◀ BACK TO EXPLORE`) and a hidden game panel (level name, streak, lives/status message). In `app.js`: `state.mode = 'explore' | 'game'`; entering game mode locks lens/box controls (the game drives the box), shows the panel; leaving restores explore. No gameplay yet.
> **Test:** toggle both ways — panel shows/hides, box buttons disable in game mode, explore works exactly as before. **Commit.**

> **Step 6 — Lick playback ("show phase")** 📼
> Game engine part 1 in `app.js`: pick a lick from `LICKS[currentLevel]`, play it step-by-step reusing `playNote()` + `flashNote()` with a tempo delay, while input is ignored. A "WATCH..." status shows in the game panel. Triggered by the START button (user gesture → satisfies the browser autoplay policy, which blocks audio that wasn't initiated by a click).
> **Test:** press start in game mode → lick plays and lights up on the fretboard, clicking during playback does nothing. **Commit.**

> **Step 7 — Input phase + right/wrong judgment** 🎯
> Game engine part 2: after the show phase, status flips to "YOUR TURN". `onNoteClick` routes to the game handler when `state.mode === 'game'`: correct fret → pluck + green flash, advance; wrong fret → buzz (short low Karplus pluck or noise burst) + red flash, lose a life/retry the lick. Completing the lick → success fanfare + next lick.
> **Test:** play a round — correct sequence completes, deliberate wrong note is rejected with feedback. Explore-mode clicking still scores the old way. **Commit.**

> **Step 8 — XP, streaks, and levels = boxes** ⚡️
> Progression layer: completing a lick grants XP (× streak multiplier for consecutive no-miss licks). Enough XP in Level N (= Box N) → "LEVEL UP" → game advances to Box N+1's licks and the fretboard box highlight follows. Level 5 cleared → "YOU LEARNED THE NECK" win screen (arcade GAME OVER style, the good kind). HUD score shows game score while in game mode.
> **Test:** complete licks → XP climbs, streak resets on a miss, level-up moves to the next box. **Commit.**

> **Step 9 — Persist game progress in localStorage** 💾
> Save `{ xp, level, highScore }` under one key (same `try/catch` guard as Step 3), restore on boot so the player resumes at their level. High score shows in the HUD.
> **Test:** earn XP, refresh page → level/XP/high score survive. Incognito window → app still works (no crash, just no save). **Commit.**

### ⚠️ Risks & Gotchas

- **Browser autoplay policy:** an `AudioContext` created/resumed without a user gesture stays suspended → silent game. Every playback path (show phase included) must start from a click. The existing `ensureAudio()` pattern already handles this — keep routing through it.
- **Click-handler conflict (Step 7):** `onNoteClick` currently adds explore points on every click. If the mode guard is missed, playing the game would also inflate the explore score. Route by `state.mode` at the top of the handler.
- **Lick data vs box data:** `BOXES` fret ranges are hand-curated; a lick step outside its box renders dimmed and confuses the player. The Step 4 boot-time validator exists precisely to catch this — don't skip it.
- **CSS cache:** changes to `styles.css` need Ctrl+Shift+R (known machine-wide gotcha) — soft F5 will lie to you during Steps 2–3 testing.
- **Private/incognito mode:** `localStorage.setItem` throws. Both persistence steps wrap access in `try/catch` so the app degrades to no-save instead of crashing.
- **Slow connections:** only externals are the two Google Fonts (already `preconnect`ed); all new audio is synthesized, zero new network assets — no impact.
- **Karplus-Strong buffer memory:** one buffer per distinct MIDI note (~60 notes × ~2s × 44.1kHz × 4 bytes ≈ 21 MB worst case if all cached). Cap the cache or generate at a lower internal length; note in implementation.

### 🔍 Files That Will Change

- `app.js` — Steps 1, 3, 4, 5, 6, 7, 8, 9: new audio engine, theme wiring, `LICKS` data, game engine, progression, persistence.
- `styles.css` — Steps 2, 5, 7, 8: theme blocks, game panel styling, correct/wrong flash classes, level-up/win screens.
- `index.html` — Steps 3, 5: theme selector buttons, mode toggle button, game panel markup.

No new files — per project convention, all logic stays in `app.js` (no-build constraint).

### ✅ How to Verify It Works

No test framework — verification is the per-step manual smoke test listed inside each step, performed by opening `index.html` (`Start-Process index.html`) and clicking. Final end-to-end check after Step 9: fresh hard-refresh → pick Hawaii theme → press START GAME → complete two licks (one with a deliberate mistake) → refresh → theme, level, XP, and high score all persist.

### ❓ Clarifications That Would Improve This Plan

- **Lives/fail state:** assumed "lose a life on wrong note, retry the lick, streak resets" with infinite continues (it's a learning tool, not a punisher). If you want hard GAME OVER + restart-from-level-start arcade rules, say so before Step 7.
- **Explore score vs game score:** assumed they're separate (HUD shows whichever mode is active). Merge them if you prefer one lifetime score.
