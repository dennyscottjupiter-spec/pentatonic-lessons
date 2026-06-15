# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Static, no-build HTML/CSS/JS app that teaches guitar pentatonic scales across all 12 keys with an interactive fretboard, Karplus-Strong plucked-guitar audio, 4 visual themes, a Practice Lab (metronome + timer), and a Lick Attack game.

## How to run
Open `index.html` directly in a browser — no server, no bundler, no install step. From PowerShell: `Start-Process index.html`. Hard-refresh with **Ctrl+Shift+R** after edits to bypass browser CSS cache (see global LEARNINGS).

There is no build, lint, or test command. Verification = open the page and interact: click frets, switch keys/themes, open Practice Lab, start the game.

## Architecture

Six plain JS files loaded in order by `index.html` (no ES modules — `file://` compatible). All share global scope.

```
data.js → audio.js → engine.js → game.js → practice.js → app.js
```

- **`index.html`** — structure: HUD (score + theme switcher + 🏋️ + ❓), level card with live title, controls (KEY row / LENS / BOX / OPTIONS), game panel, fretboard div, help modal, practice modal, win screen. Has a tiny inline `<script>` in `<head>` to apply the saved theme before first paint (avoids CRT flash). JS renders the KEY row at boot via `wireControls`.
- **`styles.css`** — all styling. `:root` vars are the entire theming surface (`--font-display`, `--font-body`, `--scanline-alpha`, color vars). `body.theme-*` blocks override `:root` per theme. Note states (`in-scale`, `root`, `out`, `dimmed`, `playing`, `correct`, `wrong`) are CSS classes toggled per `<g class="fb-note">`.

### File responsibilities

| File | Owns |
|------|------|
| `data.js` | Constants: `PENT_OFFSETS`, `MAJOR_OFFSETS`, `SHARP_NAMES`, `FLAT_NAMES`, flat-preference sets, `STRINGS`, `TOTAL_FRETS`, `BOXES`, `KEYS`, `LICKS`, `GAME` |
| `audio.js` | `ensureAudio`, Karplus-Strong (`karplusCache`, `buildKarplusBuffer`, `playNote`), `playBuzz`, `playFanfare`, metronome (`metro`, `metroStart/Stop`), timer (`timer`, `timerStart/Stop/Reset`, `updateTimerDisplay`) |
| `engine.js` | Music helpers (`midiToChroma`, `fretMidi`, `fretChroma`, `spell`, `getAnchorOffset`, `computeScaleChromas`, `computeActiveBoxes`, `setKey`, `isInScale`, `isRoot`, `isInBox`, `transposeFret`), fretboard SVG (`buildFretboard`, `refreshNotes`), `playCurrentScale`, `playGen` |
| `game.js` | Boot validator IIFE, game engine (`pickLick`, `showGamePhase`, `onGameNoteClick`, `lickComplete`, `updateGamePanel`, `updateGameHUD`, `enterGame`, `exitGame`), persistence (`saveGame`, `loadGame`) |
| `practice.js` | Modal helpers (`toggleHelp`, `closeHelp`, `togglePractice`, `closePractice`, `renderChallenge`) |
| `app.js` | `state` object, `onNoteClick`, `flashNote`, `updateScore`, `applyTheme`, `wireControls`, boot sequence |

### Key model — PARALLEL (v3.1+)

Each KEY button selects a **root note**; MINOR/MAJOR picks that root's own pentatonic. The two lenses give **different 5 notes** (not the same shapes with a different root highlight).

- `C` + MAJOR → C D E G A (no accidentals) ✓
- `C` + MINOR → C Eb F G Bb
- `A` + MINOR → A C D E G (classic blues)

**Box/lick anchoring** still uses the Am-anchored `BOXES`/`LICKS` data via `getAnchorOffset()`:
- Minor: `anchorChroma = rootChroma`; offset = `(root - 9 + 12) % 12`
- Major: `anchorChroma = (rootChroma + 9) % 12` (relative minor); same offset formula

**Scale membership** is tested by **chroma** (integer 0–11), never by note name — eliminates sharp/flat mismatches. `spell(chroma)` returns the correctly-spelled display name per current key context.

**Lens change must call `setKey(state.keyIdx)` again** — the anchor offset changes, so `state.activeBoxes` must be recomputed.

### Other key design points

- **One SVG, class toggles only.** `refreshNotes()` is the hot path; `buildFretboard()` runs once at boot. Never rebuild the SVG for state changes.
- **String order is high→low** in `STRINGS[]` (index 0 = high e). `BOXES`, `LICKS`, MIDI math all assume this.
- **`BOXES` and `LICKS` data are Am-anchored.** `computeActiveBoxes()` and `transposeFret(f, anchorOffset)` apply `getAnchorOffset()` with octave-adjust (±12) to keep everything within frets 0–17.
- **Generation counter (`playGen`).** Incremented on every mode/sequence/box/key change. All `setTimeout` callbacks in `showGamePhase` and `playCurrentScale` capture the generation and bail if stale.
- **Game follows user's box.** Box buttons stay live in game mode; switching box or key restarts the lick with `++playGen`. Lens is locked during game. 2 misses → new lick (not same lick indefinitely).
- **Autoplay policy.** Every audio path routes through `ensureAudio()` from a user click.
- **localStorage is always wrapped in try/catch** (throws in private/incognito mode).

## Themes

| Name | Class | Font | Scanline |
|------|-------|------|----------|
| CRT Arcade (default) | `:root` | Press Start 2P + VT323 | 0.18 |
| Hawaii 🌺 | `theme-hawaii` | Press Start 2P + VT323 | 0.10 |
| Synthwave Neon 🌅 | `theme-synthwave` | Press Start 2P + VT323 | 0.14 |
| Blueprint 📐 | `theme-blueprint` | JetBrains Mono (both) | 0.02 |

Editing any theme = its `body.theme-*` override block in `styles.css`. New theme = copy that block, add a button in `.hud-right` in `index.html`, add class to the `classList.remove(...)` call in `applyTheme()` in `app.js`.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Select box position |
| `0` | ALL positions |
| `?` | Toggle help modal |
| `P` | Toggle Practice Lab |
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

## Conventions
- Surgical changes only. No build step, no framework, no dependencies beyond CDN fonts.
- Split across 6 plain `<script>` files (not ES modules — no server needed). Boot order matters: `data → audio → engine → game → practice → app`.
- Arcade/retro theme is intentional. Don't migrate to "modern clean" without asking.
- The boot-time LICK validator stays in `game.js` permanently — it costs nothing at runtime.
