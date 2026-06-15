# PLANNING — PENTATONIC ARCADE: LEVEL 2 UPGRADE (12-STEP PLAN)

```
  ╔════════════════════════════════════════════════════════════╗
  ║  ▙▟ PENTATONIC ARCADE ▙▟ — THE BIG UPGRADE (v1.0 → v3.0)   ║
  ║                                                            ║
  ║   🎸 KARPLUS PLUCK    🎨 4 THEMES+FONTS   ⌨️ HOTKEYS 1-5   ║
  ║   ❓ HELP OVERLAY     🎼 ALL 12 KEYS      🏋️ PRACTICE LAB  ║
  ║   🕹️ LICK ATTACK GAME (key-aware)        🏷️ TAGGED DROPS   ║
  ║                                                            ║
  ║          INSERT COIN ── PRESS START TO SHIP                ║
  ╚════════════════════════════════════════════════════════════╝
```

### 🎯 Objective

Upgrade the pentatonic lesson app across three phases (12 atomic steps), each ending in a manual smoke test + git commit. Headline milestones get annotated git tags. Phases ship lowest-risk first: non-breaking wins → music engine → game.

**Decisions locked:**
1. **Themes:** 4 total — CRT (default), Hawaii, Space, VSC Dark. Each also changes the font.
2. **Scales:** all 12 keys, relative lens (same 5 shapes, just root moves between minor/major of the pair).
3. **Exercises:** guided Practice Lab panel + working Web Audio metronome + countdown timer.
4. **Game:** licks follow the selected key (transposed); auto-skip if transposed lick runs past fret 17.

### 🗺️ Codebase areas

- `app.js` — all behavior. Key landmarks: `playNote()`, `state`, `BOXES`, `isInScale`/`isRoot`, `refreshNotes()`, `wireControls()`.
- `styles.css` — `:root` vars = theming surface; `.scanlines`; note state classes.
- `index.html` — HUD (top right = theme switcher + ❓ + 🏋️), `.controls` (key/lens/box/options), modals appended before `<script>`.

---

### 📋 Step-by-step plan

#### ── PHASE 1 · Non-breaking wins ──

> **Step 1 — Karplus-Strong pluck audio** 🎸  → tag `v1.1.0-audio`
> Replace 2-oscillator `playNote()` with Karplus-Strong (noise burst through a short averaging delay loop). Render offline into an `AudioBuffer` (length from `audioCtx.sampleRate`, not hardcoded 44100), cache one ~1.5s natural-decay buffer per MIDI note in a `Map` (lazy), shape shorter durations with a `GainNode` fade-out on playback. Keep `playNote(midi, duration)` signature.
> **Test:** click frets — plucked-string tone; PLAY SCALE works (shorter notes). **Commit + tag.**

> **Step 2 — 4 themes + fonts + switcher + persistence** 🎨  → tag `v1.2.0-themes`
> Add `--font-display`, `--font-body`, `--scanline-alpha` to `:root`. Refactor CSS to use these vars. Add `body.theme-hawaii` (sunset orange/teal), `body.theme-space` (deep blue/starfield), `body.theme-vsc` (VS Code dark + JetBrains Mono font). Add compact theme switcher (CRT / 🌺 / 🚀 / VSC) in `.hud` top-right. In `app.js`: `state.theme`, wire clicks, `localStorage` save (try/catch), restore on boot as first action.
> **Test:** all 4 themes switch fully; choice survives hard-refresh. **Commit + tag.**

> **Step 3 — Help overlay (❓ button + `?` key)** ❓
> Add `❓` button in `.hud` top-right and `#help-modal` to `index.html` with: 5 notes, lens/box/key explainer, keyboard shortcuts list, theme tip. In `app.js`: `toggleHelp()`; open via button or `?` key; close via X / Esc / outside click.
> **Test:** click ❓ and press `?` → modal opens; Esc/X/outside closes. **Commit.**

> **Step 4 — Keyboard shortcuts (boxes 1–5, 0=ALL)** ⌨️  → (tagged together with Step 3 as `v1.3.0-help-keys`)
> One global `keydown` in `wireControls()`: `1`–`5` trigger the existing `.box` buttons (DRY); `0` triggers ALL; `?` opens help; `Esc` closes any open modal. Guard: ignore when `e.target` is `input`/`textarea` (metronome BPM field).
> **Test:** press 1–5 → box switches; 0 → ALL; typing in BPM doesn't trigger box. **Commit + tag `v1.3.0-help-keys`.**

> **Step 5 — Practice Lab: drills + 7-day challenge + metronome + timer** 🏋️  → tag `v1.4.0-practice`
> `🏋️ PRACTICE` button in HUD opens `#practice-modal` with: (a) daily drills list; (b) 7-day challenge checkboxes (localStorage-persisted); (c) backing track suggestions (text + YouTube search links); (d) Web Audio lookahead metronome (40–240 BPM, accent on beat 1); (e) countdown timer (5/10 min presets + custom, chime on zero).
> **Test:** metronome clicks + accent; timer counts down + chimes; checkbox survives refresh. **Commit + tag.**

#### ── PHASE 2 · Music engine ──

> **Step 6 — All 12 keys + relative lens + `transposeBoxes`** 🎼  → tag `v2.0.0-scales`
> Add `KEYS` table (12 pairs: minor root name, major name, minor chroma, offset from Am). Add `transposeBoxes(keyIdx)` (shifts A-anchored `BOXES` fret ranges, octave-adjusts to stay within 0–17). Replace fixed `SCALE_NOTES` / `isInScale` / `isRoot` with dynamic versions reading `state.keyIdx` + `state.lens`. Render 12 key selector buttons from JS into a new `#key-row`. Change lens buttons to MINOR / MAJOR. Update level-card title to the live key. `refreshNotes()` stays the hot path.
> **Test:** all 12 keys switch shapes; MINOR/MAJOR flips root; box hotkeys + positions still work. **Commit + tag.**

#### ── PHASE 3 · Lick Attack game ──

> **Step 7 — Curated `LICKS` data + boot validator** 🎼
> `LICKS = {1:[…],…,5:[…]}` near `BOXES`, 3 hand-curated licks per box, stored as `{ name, steps:[{s,f}] }` relative to the Am anchor (so `transposeBoxes` also transposes lick frets). Permanent boot validator (~12 lines): every step in-scale AND in-box-range → silent; else `console.error` names the offending lick/step.
> **Test:** console clean; corrupt a fret → error fires; revert. **Commit.**

> **Step 8 — EXPLORE ⇄ GAME mode toggle + panel skeleton** 🕹️
> `▶ START GAME` / `◀ EXPLORE` button + hidden `#game-panel` (level, streak, status, lives). `state.mode`; entering game locks key/lens/box *buttons* but game drives `state.box` + `refreshNotes()`; leaving restores prior explore selection.
> **Test:** toggle both ways; panel shows/hides; buttons disable in game; explore unchanged. **Commit.**

> **Step 9 — Lick playback (show phase, key-aware)** 📼
> Pick a lick from `LICKS[level]`, transpose to `state.keyIdx` (skip if any step > fret 17 after transposition). Play step-by-step via `playNote` + `flashNote` while input is ignored ("WATCH…"). Single **generation counter** bumped on every mode/sequence change; stale `setTimeout` callbacks bail (retrofits `playCurrentScale` too).
> **Test:** START → lick plays + lights up; clicking during playback does nothing; exit mid-play kills ghost notes. **Commit.**

> **Step 10 — Input phase + right/wrong judgment** 🎯
> After show, status → "YOUR TURN". `onNoteClick` routes to game handler when `state.mode==='game'`: correct fret → pluck + green flash, advance; wrong → buzz + red flash, lose a life, reset `gameInputStep`, retry show. Lick complete → fanfare + next lick. Explore clicks score the old way (route by `state.mode` at handler top).
> **Test:** correct sequence completes; wrong note rejected with feedback; explore scoring intact. **Commit.**

> **Step 11 — XP, streaks, and levels = boxes** ⚡️
> Tunable constants at top of game section: `100 XP × streak multiplier` (×1 base, +1 per no-miss lick, cap ×3); any miss resets streak. `500 XP in Level N (=Box N)` → "LEVEL UP" → game advances to Box N+1. Level 5 cleared → "YOU LEARNED THE NECK" win screen. HUD shows game score in game mode.
> **Test:** XP climbs; streak resets on miss; level-up moves box. **Commit.**

> **Step 12 — Persist game progress** 💾  → tag `v3.0.0-game`
> Save `{ xp, level, highScore, levelXP }` under one key (try/catch); restore on boot; high score in HUD.
> **Test:** earn XP, refresh → level/XP/high score survive; incognito → no crash. **Commit + tag.**

---

### 🏷️ Tag scheme

| Tag | Closes |
|-----|--------|
| `v1.1.0-audio` | Step 1 — Karplus pluck |
| `v1.2.0-themes` | Step 2 — 4 themes + fonts |
| `v1.3.0-help-keys` | Steps 3–4 — help overlay + hotkeys |
| `v1.4.0-practice` | Step 5 — Practice Lab |
| `v2.0.0-scales` | Step 6 — all 12 keys |
| `v3.0.0-game` | Steps 7–12 — game complete |

### ⚠️ Key risks

- **Autoplay policy:** every playback path routes through `ensureAudio()` from a click.
- **Box transpose off-board:** `transposeBoxes` octave-adjusts to stay 0–17; game auto-skips licks that still overflow.
- **Orphaned timeouts:** generation counter in show-phase + `playCurrentScale`.
- **Keydown vs text inputs:** hotkey listener guards on `e.target.matches('input, textarea')`.
- **CSS cache:** Ctrl+Shift+R required after style edits (known machine gotcha).
- **localStorage in incognito:** every persistence path wrapped in try/catch.

### 🔍 Files changed

- `app.js` — Steps 1–12
- `styles.css` — Steps 2, 5–12
- `index.html` — Steps 2–8, 11–12

No new files.
