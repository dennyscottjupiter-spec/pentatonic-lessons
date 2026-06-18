# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Static, no-build HTML/CSS/JS app that teaches guitar pentatonic scales across all 12 keys with an interactive fretboard, Karplus-Strong plucked-guitar audio, 4 visual themes, a Practice Lab (metronome + timer), a Lick Attack game, and a 5-lesson LEARNING modal.

## How to run
Open `index.html` directly in a browser — no server, no bundler, no install step. From PowerShell: `Start-Process index.html`. Hard-refresh with **Ctrl+Shift+R** after edits to bypass browser CSS cache (see global LEARNINGS).

There is no build, lint, or test command. Verification = open the page and interact: click frets, switch keys/themes, open Practice Lab, start the game.

## Test suite

Open `tests.html` directly in Chrome (or via `python3 -m http.server` + localhost). **~240 tests, zero dependencies.**

- `tests.js` — zero-dep framework + 10 suites loaded after the real source scripts
- `tests.html` — CRT-arcade "SYSTEM DIAGNOSTICS" report shell; loads `data.js → audio.js → engine.js → game.js → practice.js` then `tests.js`. **Does NOT load `app.js`** (would boot the full DOM); provides a minimal `state` stub instead.

### What is covered

| Suite | What it tests |
|-------|--------------|
| 1 · Music helpers | `midiToChroma`, `fretMidi`, `fretChroma` — pure math, edge cases |
| 2 · Data integrity | `KEYS`/`STRINGS`/`BOXES`/`PENT_OFFSETS`/`MAJOR_OFFSETS`/`LICKS`/`GAME` constants; verifies A#/D#/G# present, Bb/Eb/Ab absent |
| 3 · LICK validator | Every lick step: chroma ∈ Am pentatonic + fret within its Box range |
| 4 · Scale chromas | All 24 scales (12 keys × MINOR/MAJOR): correct 5-chroma sets + relative-pair identity |
| 5 · Scale spelling | Correct note names for all 24 scales (all-sharps, no enharmonic exceptions) |
| 6 · Rendered fretboard | Every `.fb-note` CSS class (`root`/`in-scale`/`out`) + label matches `spell()` for all 24 scales |
| 7 · Box transposition | `getAnchorOffset`, `computeActiveBoxes` (all 12×2), `transposeFret`, **box contiguity** (maxHi−minLo < 12 across all strings), `transposeFretInBox`, A# MAJOR Box 1 regression |
| 8 · Box membership | `isInScale`, `isRoot`, `isInBox` correctness |
| 9 · Game logic | `getStepMs` tiers, `pickLick` transposition, XP/streak math |
| 10 · Smoke | `playNote`/`metroStop`/`timerReset`/`renderChallenge` must not throw |

### All-sharps note spelling
Every key and every fretboard label uses sharps only. `spell(chroma)` always returns `SHARP_NAMES[chroma]`. No flat machinery (`FLAT_NAMES`, `FLAT_MINOR_ROOTS`, `FLAT_MAJOR_ROOTS` were removed). No enharmonic exceptions.

## Architecture

Six plain JS files loaded in order by `index.html` (no ES modules — `file://` compatible). All share global scope.

```
data.js → audio.js → engine.js → game.js → practice.js → app.js
```

- **`index.html`** — structure: HUD (score + theme switcher + 🏋️ + ❓), level card with live title, controls (KEY row / LENS / BOX / OPTIONS including ▶ PLAY SCALE / ▶ START GAME / 📚 LEARNING), game panel, fretboard div, help modal, practice modal, learn modal, win screen. Has a tiny inline `<script>` in `<head>` to apply the saved theme before first paint (avoids CRT flash). JS renders the KEY row at boot via `wireControls`.
- **`styles.css`** — all styling. `:root` vars are the entire theming surface (`--font-display`, `--font-body`, `--scanline-alpha`, color vars). `body.theme-*` blocks override `:root` per theme. Note states (`in-scale`, `root`, `out`, `dimmed`, `playing`, `correct`, `wrong`) are CSS classes toggled per `<g class="fb-note">`.

### File responsibilities

| File | Owns |
|------|------|
| `data.js` | Constants: `PENT_OFFSETS`, `MAJOR_OFFSETS`, `SHARP_NAMES`, `STRINGS`, `TOTAL_FRETS`, `BOXES`, `KEYS` (A A# B C C# D D# E F F# G G#), `LICKS`, `GAME` |
| `audio.js` | `ensureAudio`, Karplus-Strong (`karplusCache`, `buildKarplusBuffer`, `playNote`), `playBuzz`, `playFanfare`, metronome (`metro`, `metroStart/Stop`), timer (`timer`, `timerStart/Stop/Reset`, `updateTimerDisplay`) |
| `engine.js` | Music helpers (`midiToChroma`, `fretMidi`, `fretChroma`, `spell`, `getAnchorOffset`, `computeScaleChromas`, `boxOctaveShift`, `computeActiveBoxes`, `transposeFretInBox`, `setKey`, `isInScale`, `isRoot`, `isInBox`, `transposeFret`), fretboard SVG (`buildFretboard`, `refreshNotes`), `playCurrentScale`, `playGen` |
| `game.js` | Boot validator IIFE, game engine (`pickLick`, `showGamePhase`, `onGameNoteClick`, `lickComplete`, `updateGamePanel`, `updateGameHUD`, `enterGame`, `exitGame`), persistence (`saveGame`, `loadGame`) |
| `practice.js` | Modal helpers (`toggleHelp`, `closeHelp`, `togglePractice`, `closePractice`, `renderChallenge`), learning modal (`LESSONS`, `toggleLearn`, `closeLearn`, `renderLesson`) |
| `app.js` | `state` object, `onNoteClick`, `flashNote`, `updateScore`, `applyTheme`, `wireControls`, boot sequence |

### Key model — PARALLEL (v3.1+)

Each KEY button selects a **root note**; MINOR/MAJOR picks that root's own pentatonic. The two lenses give **different 5 notes** (not the same shapes with a different root highlight).

- `C` + MAJOR → C D E G A (no accidentals) ✓
- `C` + MINOR → C D# F G A#
- `A` + MINOR → A C D E G (classic blues)

**Box/lick anchoring** still uses the Am-anchored `BOXES`/`LICKS` data via `getAnchorOffset()`:
- Minor: `anchorChroma = rootChroma`; offset = `(root - 9 + 12) % 12`
- Major: `anchorChroma = (rootChroma + 9) % 12` (relative minor); same offset formula

**Scale membership** is tested by **chroma** (integer 0–11), never by note name. `spell(chroma)` always returns `SHARP_NAMES[chroma]`.

**Lens change must call `setKey(state.keyIdx)` again** — the anchor offset changes, so `state.activeBoxes` must be recomputed.

### Other key design points

- **One SVG, class toggles only.** `refreshNotes()` is the hot path; `buildFretboard()` runs once at boot. Never rebuild the SVG for state changes.
- **String order is high→low** in `STRINGS[]` (index 0 = high e). `BOXES`, `LICKS`, MIDI math all assume this.
- **`BOXES` and `LICKS` data are Am-anchored.** `boxOctaveShift(boxRanges, offset)` finds a single octave-shift `k` so the **whole box** (all 6 strings) fits in [0, TOTAL_FRETS] as a **rigid unit** — this prevents the fragmentation bug where per-string wrapping split the box across two neck regions. `transposeFretInBox(f, ao, pos)` applies the same rigid shift for lick notes.
- **Generation counter (`playGen`).** Incremented on every mode/sequence/box/key change. All `setTimeout` callbacks in `showGamePhase` and `playCurrentScale` capture the generation and bail if stale.
- **Game follows user's box.** Box buttons stay live in game mode; switching box or key restarts the lick with `++playGen`. Lens is locked during game. After a full sequence with any wrong note: 1.8 s pause then new lick. 2 misses → new lick.
- **Finish-then-judge.** Wrong notes no longer abort the lick mid-sequence — the player finishes the whole sequence, then gets feedback.
- **Autoplay policy.** Every audio path routes through `ensureAudio()` from a user click.
- **localStorage is always wrapped in try/catch** (throws in private/incognito mode).

## Themes

| Name | Class | Font | Scanline |
|------|-------|------|----------|
| CRT Arcade (default) | `:root` | Press Start 2P + VT323 | 0.18 |
| Tropical Night 🌴 | `theme-tropical` | Press Start 2P (both) | 0.07 |
| Mission Control 🛰️ | `theme-mission` | Press Start 2P (both) | 0.09 |
| Blueprint 📐 | `theme-blueprint` | JetBrains Mono (both) | 0.02 |

Editing any theme = its `body.theme-*` override block in `styles.css`. New theme = copy that block, add a button in `.hud-right` in `index.html`, add class to the `classList.remove(...)` call in `applyTheme()` in `app.js`, add to the `valid` array.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Select box position |
| `0` | ALL positions |
| `?` | Toggle help modal |
| `P` | Toggle Practice Lab |
| `L` | Toggle LEARNING modal |
| `Esc` | Close any modal |

## Git tags

| Tag | Milestone |
|-----|-----------|
| `v1.1.0-audio` | Karplus-Strong pluck audio |
| `v1.2.0-themes` | 4 themes + per-theme fonts |
| `v1.3.0-help-keys` | Help overlay + keyboard shortcuts |
| `v1.4.0-practice` | Practice Lab (metronome + timer) |
| `v2.0.0-scales` | All 12 keys + relative lens |
| `v3.0.0-game` | Lick Attack game complete |
| `v3.1.0-parallel-keys` | Parallel key model + game follows box + bidirectional scale |
| `v3.2.0-themes` | Synthwave Neon + Blueprint replace Space/VSC |
| `v3.4.0-modularized` | app.js split into 6 ordered plain scripts |
| `v3.5.0-test-suite` | Comprehensive test suite: 232 tests, CRT-arcade SYSTEM DIAGNOSTICS report |
| `v3.5.1-box-bug-fix` | Fix box fragmentation bug (rigid per-box shift) + finish-then-judge game UX |
| `v3.6.0-themes` | Tropical Night + Mission Control replace Hawaii + Synthwave |
| `v3.8.0-learning` | LEARNING modal — 5 lessons, prev/next nav, L keybind |
| `v4.0.0-all-sharps` | All-sharps spelling, tests + docs sync |

## Conventions
- Surgical changes only. No build step, no framework, no dependencies beyond CDN fonts.
- Split across 6 plain `<script>` files (not ES modules — no server needed). Boot order matters: `data → audio → engine → game → practice → app`.
- Arcade/retro theme is intentional. Don't migrate to "modern clean" without asking.
- The boot-time LICK validator stays in `game.js` permanently — it costs nothing at runtime.
- All key and note names use sharps exclusively. Never re-introduce flat spelling.
